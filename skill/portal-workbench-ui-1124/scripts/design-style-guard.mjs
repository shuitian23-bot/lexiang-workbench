import { execFileSync } from 'node:child_process'
import { relative, sep } from 'node:path'
import { lstatSync, realpathSync } from 'node:fs'

// This is a conservative declaration audit, not a CSS compiler or visual test.
export function styleViolations(source, vue = false) {
  const blocks = vue
    ? [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => ({ text: m[1], offset: m.index + m[0].indexOf(m[1]) }))
    : [{ text: source, offset: 0 }]
  const result = []
  for (const block of blocks) {
    const text = block.text.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    const stack = []
    let start = 0
    let quote = ''
    let depth = 0
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (c === '\\') { i++; continue }
      if (quote) { if (c === quote) quote = ''; continue }
      if (c === '"' || c === "'") { quote = c; continue }
      if (c === '(') depth++
      if (c === ')') depth--
      if (depth) continue
      if (c === '{') { stack.push(text.slice(start, i).trim()); start = i + 1 }
      if (c === ';' || c === '}') {
        const declaration = text.slice(start, i)
        const match = declaration.match(/^\s*([\w-]+)\s*:\s*([\s\S]*?)\s*$/)
        if (match && stack.length) {
          const property = match[1].toLowerCase()
          const value = match[2]
          const selector = stack.join(' ').replace(/\s+/g, ' ')
          const line = source.slice(0, block.offset + start + declaration.search(/\S/)).split('\n').length
          for (const reason of declarationViolations(property, value)) {
            result.push({ property, value, line, selector, reason, key: JSON.stringify([selector, property, value.replace(/\s+/g, ' '), reason]) })
          }
        }
        start = i + 1
        if (c === '}') stack.pop()
      }
    }
  }
  return result
}

function declarationViolations(property, value) {
  if (property.startsWith('--')) return [] // Token values require semantic review.
  const reasons = []
  if (/^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|fill|stroke|box-shadow|text-shadow)$/.test(property)
      && /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\(/i.test(value)) reasons.push('硬编码颜色；请使用语义 token')
  // Strip only complete var() expressions; a token elsewhere must not hide a literal.
  let literal = value
  let previous
  do { previous = literal; literal = literal.replace(/var\([^()]*\)/g, '') } while (literal !== previous)
  const pixels = [...literal.matchAll(/(-?\d+(?:\.\d+)?)px\b/g)].map(m => Number(m[1]))
  if (/^(?:margin|padding)(?:-(?:top|right|bottom|left|inline|block)(?:-start|-end)?)?$|^(?:gap|row-gap|column-gap)$/.test(property)
      && pixels.some(n => ![0, 4, 8, 12, 16, 20, 24, 32, 40, 48].includes(n))) reasons.push('非登记间距；请使用命名专项 token')
  if (/^border(?:-(?:top-left|top-right|bottom-left|bottom-right))?-radius$/.test(property)
      && pixels.some(n => ![0, 4, 8, 12, 9999].includes(n))) reasons.push('圆角不在 0/4/8/12/9999px 闭集')
  const fontPixels = property === 'font'
    ? [...literal.split('/')[0].matchAll(/(-?\d+(?:\.\d+)?)px\b/g)].map(m => Number(m[1])).slice(0, 1)
    : pixels
  if (['font', 'font-size'].includes(property) && fontPixels.some(n => ![12, 13, 14, 16, 18, 20, 24, 30].includes(n))) reasons.push('字号不在设计阶梯；专项尺寸使用命名 token')
  return reasons
}

export function compareViolations(current, baseline) {
  const remaining = new Map()
  for (const item of baseline) remaining.set(item.key, (remaining.get(item.key) || 0) + 1)
  return current.map(item => {
    const count = remaining.get(item.key) || 0
    if (count) remaining.set(item.key, count - 1)
    return { ...item, inherited: count > 0 }
  })
}

export function gitBaseline(projectRoot, ref) {
  const root = execFileSync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const commit = execFileSync('git', ['-C', root, 'rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  return file => {
    const real = realpathSync(file)
    const rel = relative(realpathSync(root), real)
    if (rel.startsWith(`..${sep}`) || rel === '..' || lstatSync(file).isSymbolicLink()) throw new Error('基线检查不接受越界或符号链接文件')
    const path = rel.split(sep).join('/')
    // A missing path is a new file; other Git errors must never become a pass.
    const exists = execFileSync('git', ['-C', root, 'ls-tree', '-z', '--name-only', commit, '--', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    if (!exists) return ''
    return execFileSync('git', ['-C', root, 'show', `${commit}:${path}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  }
}
