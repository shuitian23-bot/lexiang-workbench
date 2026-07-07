import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const mainFile = join(projectRoot, 'src/main.ts')
const assetsDir = join(projectRoot, 'src/assets')
const lockFile = join(projectRoot, 'design-baseline.lock.json')
const warnings = []
const notices = []
const config = loadJson(join(projectRoot, 'design-skill.guard.json'), {})
const baseline = loadJson(lockFile, null)

const allowedCssImports = baseline?.allowedGlobalCssImports || [
  './assets/workbench.css',
  './assets/workbench-original-lock.css',
  './assets/workbench-prd-modules.css',
  './assets/workbench-ui-polish.css',
  './assets/workbench-preview-overrides.css',
  './assets/vue-shell-adapter.css',
]
const approvedDesignSkillCssFiles = baseline?.approvedDesignSkillCssFiles || []

if (!baseline) {
  warnings.push('未找到 design-baseline.lock.json，无法确认当前项目的封板设计基线。')
} else {
  for (const field of ['projectId', 'requiredSkillId', 'requiredSkillVersion']) {
    if (!baseline[field]) warnings.push(`design-baseline.lock.json 缺少 ${field}。`)
  }
}

const mainText = readFileSync(mainFile, 'utf8')
const blockedCssPatterns = (baseline?.blockedGlobalCssPatterns || ['ui-*-design-skill.css']).map(globToRegExp)
const cssImports = [...mainText.matchAll(/import\s+['"]([^'"]+\.css)['"]/g)].map(match => match[1])

for (const cssImport of cssImports) {
  const fileName = basename(cssImport)
  if (isDesignSkillCss(fileName) && !approvedDesignSkillCssFiles.includes(fileName)) {
    warnings.push(`src/main.ts 引入了未登记的 design-skill 全局 CSS：${cssImport}。`)
  }
  if (!allowedCssImports.includes(cssImport)) {
    warnings.push(`发现未登记的全局 CSS import：${cssImport}。新增样式建议优先放入 Vue scoped style；确需全局时请更新设计基线锁并说明影响 selector。`)
  }
}

if (cssImports.join('\n') !== allowedCssImports.join('\n')) {
  warnings.push('全局 CSS import 顺序与封板样式栈不一致，后加载样式可能覆盖顶部、侧栏、Agent composer 等已确认样式。')
}

for (const fileName of listCssFiles(assetsDir)) {
  if (isDesignSkillCss(fileName) && !approvedDesignSkillCssFiles.includes(fileName)) {
    notices.push(`src/assets 中存在未登记的 design-skill CSS：${fileName}。如需运行时使用，建议登记到 design-baseline.lock.json 并说明影响范围。`)
  }
}

const skillMatches = findDesignSkillMetas()
const preferredSkill = selectPreferredSkill(skillMatches)

if (skillMatches.length === 0) {
  warnings.push('未检测到外部设计 skill 元信息 skill.meta.json；请确认 PM 是否同时拿到了项目文件夹和设计 skill 文件夹。')
} else {
  if (skillMatches.length > 1) {
    notices.push(`检测到 ${skillMatches.length} 个设计 skill 元信息，当前使用：${preferredSkill.dir}。如不符合预期，可通过 PORTAL_WORKBENCH_UI_SKILL_DIR 指定。`)
  }
  compareSkillMeta(preferredSkill)
}

for (const notice of notices) console.warn(`[Design Skill Notice] ${notice}`)

if (warnings.length > 0) {
  console.warn('\n[Design Skill Warning] 当前项目存在设计 skill / 封板样式风险：')
  for (const warning of warnings) console.warn(`- ${warning}`)
  const protectedSurfaces = (baseline?.protectedSurfaces || []).join(', ')
  console.warn(`\n项目会继续启动；继续新增需求前，请确认是否使用了项目随附的最新设计 skill，并避免影响封板样式：${protectedSurfaces || 'topbar, sidebar, Agent, tabs, shared components'}。\n`)
} else {
  const baselineLabel = baseline?.baselineName || baseline?.requiredSkillVersion || 'unknown'
  console.log(`[Design Skill Check] OK: ${baseline?.requiredSkillId || 'design-skill'} ${baselineLabel}`)
}

function compareSkillMeta(skillMatch) {
  if (!baseline || !skillMatch?.meta) return

  const { meta, dir } = skillMatch
  if (meta.projectId && meta.projectId !== baseline.projectId) {
    warnings.push(`外部设计 skill projectId=${meta.projectId}，与项目基线 ${baseline.projectId} 不一致。`)
  }
  if (meta.skillId !== baseline.requiredSkillId) {
    warnings.push(`设计 skill 类型不一致：项目要求 ${baseline.requiredSkillId}，检测到 ${meta.skillId || '未声明'}。`)
  }
  if (meta.skillVersion !== baseline.requiredSkillVersion) {
    warnings.push(`设计 skill 版本不一致：项目建议 ${baseline.requiredSkillVersion}，检测到 ${meta.skillVersion || '未声明'}。`)
  }
  if (baseline.requiredSkillFingerprint) {
    const actualFingerprint = getSkillFingerprint(dir)
    const metaFingerprint = meta.fingerprint
    if (metaFingerprint && metaFingerprint !== baseline.requiredSkillFingerprint) {
      warnings.push(`设计 skill 元信息指纹不一致：项目绑定 ${baseline.requiredSkillFingerprint}，meta 声明 ${metaFingerprint}。`)
    }
    if (actualFingerprint && actualFingerprint !== baseline.requiredSkillFingerprint) {
      warnings.push(`设计 skill 内容指纹不一致：项目绑定 ${baseline.requiredSkillFingerprint}，实际检测 ${actualFingerprint}。请确认 skill 内容是否被改过或是否需要更新项目基线锁。`)
    }
  }
}

function loadJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (error) {
    warnings.push(`${basename(filePath)} 不是合法 JSON：${error.message}`)
    return fallback
  }
}

function listCssFiles(dirPath) {
  if (!existsSync(dirPath)) return []
  return readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.css'))
    .map(entry => entry.name)
}

function findDesignSkillMetas() {
  const candidateFiles = []
  const explicitDir = process.env.PORTAL_WORKBENCH_UI_SKILL_DIR

  if (explicitDir) candidateFiles.push(join(resolve(explicitDir), 'skill.meta.json'))

  for (const dir of config.skillSearchDirs || []) {
    candidateFiles.push(join(resolve(projectRoot, dir), 'skill.meta.json'))
  }

  const siblingRoot = dirname(dirname(projectRoot))
  for (const entry of safeReadDir(siblingRoot)) {
    if (entry.isDirectory()) candidateFiles.push(join(siblingRoot, entry.name, 'skill.meta.json'))
  }

  return unique(candidateFiles)
    .filter(existsSync)
    .map(file => ({ file, dir: dirname(file), meta: loadJson(file, null) }))
    .filter(match => match.meta)
}

function selectPreferredSkill(matches) {
  if (matches.length === 0) return null
  if (!baseline) return matches[0]

  const exact = matches.find(match =>
    match.meta.skillId === baseline.requiredSkillId &&
    match.meta.skillVersion === baseline.requiredSkillVersion
  )
  if (exact) return exact

  return matches.find(match => match.meta.skillId === baseline.requiredSkillId) || matches[0]
}

function getSkillFingerprint(skillDir) {
  const files = listSkillFingerprintFiles(skillDir)
  if (files.length === 0) return null

  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(relative(skillDir, file))
    hash.update('\n')
    hash.update(normalizeFingerprintContent(file))
    hash.update('\n')
  }
  return `sha256-${hash.digest('hex').slice(0, 16)}`
}

function listSkillFingerprintFiles(skillDir) {
  const result = []
  walk(skillDir, result)
  return result
    .filter(file => /\.(md|json|ya?ml)$/i.test(file))
    .filter(file => !file.includes('/node_modules/'))
    .sort()
}

function walk(dir, result) {
  for (const entry of safeReadDir(dir)) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['.git', 'node_modules'].includes(entry.name)) walk(fullPath, result)
    } else if (entry.isFile()) {
      result.push(fullPath)
    }
  }
}

function normalizeFingerprintContent(file) {
  if (basename(file) !== 'skill.meta.json') return readFileSync(file, 'utf8')
  const meta = loadJson(file, {})
  delete meta.fingerprint
  return JSON.stringify(meta, Object.keys(meta).sort(), 2)
}

function safeReadDir(dirPath) {
  try {
    statSync(dirPath)
    return readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return []
  }
}

function unique(values) {
  return [...new Set(values)]
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')
  return new RegExp(`^${escaped}$`)
}

function isDesignSkillCss(fileName) {
  return blockedCssPatterns.some(pattern => pattern.test(fileName))
}
