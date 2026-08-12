#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const projectArgIndex = args.indexOf('--project')
const projectRoot = projectArgIndex >= 0
  ? resolve(args[projectArgIndex + 1] || '')
  : process.env.PORTAL_WORKBENCH_PROJECT_DIR
    ? resolve(process.env.PORTAL_WORKBENCH_PROJECT_DIR)
    : null

const errors = []
const notices = []
const expectedSkillName = 'portal-workbench-ui-0803'
const expectedSkillVersion = '2026-08-03'
const expectedSkillRelease = '0803'

const requiredTemplates = new Map([
  ['content-list-template.html', ['page-stack', 'field-grid--4', 'data-table']],
  ['content-long-filter-list-template.html', ['page-stack', 'field-grid--4', 'filter-details', 'data-table']],
  ['content-dashboard-template.html', ['page-stack', 'kpi-grid', 'dashboard-grid']],
  ['content-form-template.html', ['page-stack', 'form-shell', 'field-grid', 'sticky-actions']],
  ['content-task-import-template.html', ['page-stack', 'progress-steps', 'result-grid']],
  ['content-split-settings-template.html', ['page-stack', 'split-layout', 'settings-row']],
  ['content-config-list-template.html', ['page-stack', 'field-grid--4', 'data-table']],
  ['content-workflow-template.html', ['page-stack', 'workflow-shell', 'workflow-body']],
  ['content-report-detail-template.html', ['page-stack', 'report-layout', 'report-metrics']],
])

checkRequiredFiles()
checkPortability()
checkAssetInventory()
checkStaticTemplates()
checkVisualAcceptance()
if (projectRoot) checkProjectRoutes()
else notices.push('未提供 --project；已跳过当前 Vue 路由与视觉记录的交叉检查。')

for (const notice of notices) console.log(`[NOTICE] ${notice}`)
if (errors.length) {
  console.error(`[FAIL] ${expectedSkillName} consistency errors=${errors.length}`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`[OK] ${expectedSkillName} metadata, assets, templates, matrix and evidence are internally consistent.`)

function checkRequiredFiles() {
  for (const file of [
    'SKILL.md',
    'manifest.txt',
    'skill.meta.json',
    'references/asset-inventory.md',
    'references/brand-assets.md',
    'references/page-spec-coverage-matrix.md',
    'references/page-visual-acceptance.json',
    'assets/content-template.css',
  ]) check(existsSync(join(skillRoot, file)), `缺少必需文件：${file}`)

  const skill = read('SKILL.md')
  const agent = read('agents/openai.yaml')
  const meta = parseJson('skill.meta.json')
  check(skill.includes(`name: ${expectedSkillName}`), `SKILL.md name 必须为 ${expectedSkillName}。`)
  check(skill.includes('references/unified-role-workflow.md') || skill.includes('`unified-role-workflow.md`'), 'SKILL.md 未路由统一角色工作流。')
  check(agent.includes(`$${expectedSkillName}`), `agents/openai.yaml 未调用 $${expectedSkillName}。`)
  if (meta) {
    check(meta.skillId === 'portal-workbench-ui', 'skill.meta.json skillId 必须保持 portal-workbench-ui。')
    check(meta.skillVersion === expectedSkillVersion, `skill.meta.json skillVersion 必须为 ${expectedSkillVersion}。`)
    check(meta.skillRelease === expectedSkillRelease, `skill.meta.json skillRelease 必须为 ${expectedSkillRelease}。`)
    check(meta.distributionPolicy === 'single-authoritative-skill', 'skill.meta.json 缺少单一权威源分发策略。')
    check(meta.compatibilityPolicy === 'portable-target-repository', 'skill.meta.json 缺少可移植目标仓库策略。')
    check(!Object.hasOwn(meta, 'fingerprint'), 'skill.meta.json 不得包含 Skill 指纹。')
    check(!Object.hasOwn(meta, 'sourceProjectPath'), 'skill.meta.json 不得包含本机项目绝对路径。')
  }
}

function checkPortability() {
  const forbidden = [
    ['macOS 用户目录', /\/Users\/[^/\s"'`]+/],
    ['Linux 用户目录', /\/home\/[^/\s"'`]+/],
    ['Windows 用户目录', /[A-Za-z]:\\Users\\[^\\\s"'`]+/],
    ['file URL', /file:\/\//],
    ['本地调试 URL', /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/],
  ]
  const textFiles = walk(skillRoot).filter(file =>
    /\.(?:md|json|ya?ml|txt|html|css)$/i.test(file)
  )
  for (const file of textFiles) {
    const content = readFileSync(file, 'utf8')
    for (const [label, pattern] of forbidden) {
      check(!pattern.test(content), `${portable(relative(skillRoot, file))} 包含${label}，不符合可移植交付要求。`)
    }
  }
}

function checkAssetInventory() {
  const inventory = read('references/asset-inventory.md')
  const brand = read('references/brand-assets.md')
  const manifest = read('manifest.txt')
  const inventoryRefs = codeAssetPaths(inventory)
  const documentedRefs = new Set([...inventoryRefs, ...codeAssetPaths(brand)])
  const manifestRefs = new Set(
    manifest.split('\n')
      .map(line => line.match(/^\s*-\s+(assets\/\S+)\s*$/)?.[1])
      .filter(Boolean)
  )

  for (const ref of documentedRefs) check(existsSync(join(skillRoot, ref)), `文档引用的资产不存在：${ref}`)
  for (const ref of manifestRefs) {
    check(!ref.includes('*'), `manifest 必须逐文件登记资产，不能使用通配符：${ref}`)
    check(existsSync(join(skillRoot, ref)), `manifest 引用的资产不存在：${ref}`)
  }

  const actualAssets = walk(join(skillRoot, 'assets'))
    .map(file => portable(relative(skillRoot, file)))
    .filter(file => !file.endsWith('/.DS_Store'))
  for (const asset of actualAssets) {
    check(inventoryRefs.has(asset), `真实资产未登记到 asset-inventory.md：${asset}`)
    check(manifestRefs.has(asset), `真实资产未逐文件登记到 manifest.txt：${asset}`)
  }
  for (const ref of inventoryRefs) check(actualAssets.includes(ref), `asset-inventory.md 存在非真实映射：${ref}`)
}

function checkStaticTemplates() {
  const shell = read('assets/page-template.html')
  const shellMarkers = [
    '--template-sidebar: 168px',
    '--template-sidebar-collapsed: 58px',
    '--template-topbar: 56px',
    '--template-ai: 380px',
    '--template-ai-max: 492px',
    'class="temp-tab-switcher"',
    'id="ai-toggle-btn"',
    'id="ai-resize-handle"',
    'container-type: inline-size',
    'width <= 1320',
    'width >= 1480',
  ]
  for (const marker of shellMarkers) check(shell.includes(marker), `assets/page-template.html 缺少当前壳层标记：${marker}`)
  check(!shell.includes('0702 Vue Shell Template'), 'assets/page-template.html 仍标记为 0702 旧壳层。')
  check(!shell.includes('class="workspace-tabs"'), 'assets/page-template.html 仍使用第二行 AI 动态页签。')
  check(!shell.includes('切换浅色或深色模式'), 'assets/page-template.html 仍暴露当前发布已隐藏的主题切换。')
  check(!/<aside class="ai-panel open"/.test(shell), 'assets/page-template.html 不得默认展开 Agent。')
  check(/<aside class="ai-panel"[^>]*aria-hidden="true"[^>]*inert/.test(shell), 'assets/page-template.html 的默认收起 Agent 缺少 aria-hidden/inert。')

  const css = read('assets/content-template.css')
  check(/\.page-stack\s*\{[\s\S]*?container-type:\s*inline-size/.test(css), 'Container Query 容器必须挂在 .page-stack。')
  for (const threshold of [1039, 899, 879, 959, 719]) {
    check(css.includes(`@container (max-width: ${threshold}px)`), `缺少静态模板 Container Query：${threshold}px`)
  }
  check(!/@container\s*\(max-width:\s*(?:920|620)px\)/.test(css), '仍存在 920/620px 通用 Container Query。')
  check(!/@media\s*\(max-width:\s*620px\)/.test(css), '仍存在 620px 通用 viewport media query。')

  const responsiveBlocks = splitContainerBlocks(css)
  requireSelectors(responsiveBlocks.get(1039), 1039, ['.field-grid--4', '.kpi-grid', '.result-grid', '.report-metrics', '.workflow-body'])
  requireSelectors(responsiveBlocks.get(899), 899, ['.form-shell .field-grid', '.form-shell .field--span-2'])
  requireSelectors(responsiveBlocks.get(879), 879, ['.dashboard-grid'])
  requireSelectors(responsiveBlocks.get(959), 959, ['.workflow-shell', '.report-layout', '.report-toc'])
  requireSelectors(responsiveBlocks.get(719), 719, ['.field-grid', '.field-grid--4', '.kpi-grid', '.result-grid', '.split-layout', '.progress-steps', '.workflow-body', '.report-metrics'])

  for (const [fileName, markers] of requiredTemplates) {
    const rel = `assets/${fileName}`
    const html = read(rel)
    check(/href=["']content-template\.css["']/.test(html), `${rel} 未引用共享 content-template.css。`)
    for (const marker of markers) check(html.includes(marker), `${rel} 缺少页型标记：${marker}`)
  }
}

function checkVisualAcceptance() {
  const matrix = read('references/page-spec-coverage-matrix.md')
  const visual = parseJson('references/page-visual-acceptance.json')
  if (!visual) return

  check(visual.schemaVersion === 1, 'page-visual-acceptance.json schemaVersion 必须为 1。')
  check(visual.evidenceRole === 'historical-reference-only', '0728 截图必须明确标记为历史参考证据。')
  check(visual.sourceProject === 'lexiang-new-0728', '历史截图 sourceProject 必须保留真实来源 lexiang-new-0728。')
  check(!JSON.stringify(visual).includes('/Users/'), '视觉证据记录不得包含机器绝对路径。')
  check(Boolean(visual.capturedAt && visual.review?.reviewedAt), '视觉证据缺少 capturedAt 或 review.reviewedAt。')
  check(Boolean(visual.environment?.frontend && visual.environment?.backend && visual.environment?.acceptanceBoundary), '视觉证据缺少运行环境或验收边界。')
  check(visual.review?.reviewedCaptures === visual.pages?.length * visual.profiles?.length, 'reviewedCaptures 与页面/组合数量不一致。')

  const profileIds = new Set((visual.profiles || []).map(profile => profile.id))
  for (const required of ['wide', 'squeezed']) check(profileIds.has(required), `视觉证据缺少响应式组合：${required}`)

  const pageIds = new Set()
  const routes = new Set()
  const referencedShots = new Set()
  const matrixSection = between(matrix, '## 3. 当前 0803 项目页面矩阵', '## 4. 当前页面与 Figma 04 / UAT 证据关系')

  for (const page of visual.pages || []) {
    check(!pageIds.has(page.pageId), `视觉记录 pageId 重复：${page.pageId}`)
    check(!routes.has(page.route), `视觉记录 route 重复：${page.route}`)
    pageIds.add(page.pageId)
    routes.add(page.route)
    check(['VA-0', 'VA-R1', 'VA-R2', 'VA-PASS', 'VA-FAIL'].includes(page.visualStatus), `${page.pageId} 使用未知视觉状态：${page.visualStatus}`)

    const matrixRow = matrixSection.split('\n').find(line => line.startsWith('|') && line.includes(`\`${page.route}\``))
    check(Boolean(matrixRow), `页面矩阵缺少当前 route：${page.route}`)
    if (matrixRow) check(matrixRow.includes(`[${page.visualStatus}]`), `${page.route} 的矩阵状态与视觉记录不一致。`)

    const captureProfiles = new Set()
    for (const capture of page.captures || []) {
      captureProfiles.add(capture.profileId)
      check(profileIds.has(capture.profileId), `${page.pageId} 使用未登记 profile：${capture.profileId}`)
      check(Boolean(capture.screenshot), `${page.pageId}/${capture.profileId} 缺少截图路径。`)
      if (capture.screenshot) {
        referencedShots.add(capture.screenshot)
        const shot = join(skillRoot, capture.screenshot)
        check(existsSync(shot), `截图不存在：${capture.screenshot}`)
        if (existsSync(shot)) check(statSync(shot).size > 10_000, `截图文件异常小：${capture.screenshot}`)
      }
    }

    if (['VA-R2', 'VA-PASS', 'VA-FAIL'].includes(page.visualStatus)) {
      for (const profileId of profileIds) check(captureProfiles.has(profileId), `${page.pageId} 缺少 ${profileId} 截图。`)
    }
    if (['VA-R2', 'VA-PASS'].includes(page.visualStatus)) {
      for (const capture of page.captures || []) {
        const metrics = capture.metrics || {}
        check(capture.httpStatus === 200, `${page.pageId}/${capture.profileId} HTTP 非 200。`)
        check((metrics.pageContentOverflowX ?? 1) === 0, `${page.pageId}/${capture.profileId} 页面内容横向溢出。`)
        check((metrics.documentOverflowX ?? 1) === 0, `${page.pageId}/${capture.profileId} document 横向溢出。`)
        check(!metrics.isLogin && !metrics.isWip, `${page.pageId}/${capture.profileId} 未进入真实业务页。`)
        check((capture.pageErrors || []).length === 0, `${page.pageId}/${capture.profileId} 存在 page error。`)
      }
    }
    if (page.visualStatus === 'VA-FAIL') {
      check((page.findings || []).length > 0, `${page.pageId} 为 VA-FAIL 但没有 findings。`)
      const measurableFailure = (page.captures || []).some(capture =>
        capture.httpStatus !== 200 ||
        (capture.metrics?.pageContentOverflowX || 0) > 0 ||
        (capture.metrics?.documentOverflowX || 0) > 0 ||
        (capture.pageErrors || []).length > 0
      )
      check(measurableFailure, `${page.pageId} 为 VA-FAIL，但证据中没有可测量失败。`)
      notices.push(`${page.pageId} 保持 VA-FAIL：${(page.findings || []).join(' ')}`)
    }
  }

  for (const dynamic of visual.dynamicPages || []) {
    check(['VA-0', 'VA-R1', 'VA-R2', 'VA-PASS', 'VA-FAIL', 'VA-BLOCKED'].includes(dynamic.visualStatus), `${dynamic.pageId} 使用未知视觉状态：${dynamic.visualStatus}`)
    check(matrixSection.includes(`[${dynamic.visualStatus}]`), `页面矩阵缺少 ${dynamic.pageId} 的 ${dynamic.visualStatus}。`)
    if (dynamic.visualStatus === 'VA-BLOCKED') {
      check(Boolean(dynamic.blocker), `${dynamic.pageId} 缺少 blocker。`)
      notices.push(`${dynamic.pageId} 保持 VA-BLOCKED：${dynamic.blocker}`)
    }
    const captureProfiles = new Set()
    for (const capture of dynamic.captures || []) {
      captureProfiles.add(capture.profileId)
      check(profileIds.has(capture.profileId), `${dynamic.pageId} 使用未登记 profile：${capture.profileId}`)
      check(Boolean(capture.screenshot), `${dynamic.pageId}/${capture.profileId} 缺少截图路径。`)
      if (capture.screenshot) referencedShots.add(capture.screenshot)
      const shot = capture.screenshot ? join(skillRoot, capture.screenshot) : ''
      if (shot) {
        check(existsSync(shot), `截图不存在：${capture.screenshot}`)
        if (existsSync(shot)) check(statSync(shot).size > 10_000, `截图文件异常小：${capture.screenshot}`)
      }
      if (['VA-R2', 'VA-PASS'].includes(dynamic.visualStatus)) {
        const metrics = capture.metrics || {}
        check(capture.httpStatus === 200, `${dynamic.pageId}/${capture.profileId} HTTP 非 200。`)
        check((metrics.pageContentOverflowX ?? 1) === 0, `${dynamic.pageId}/${capture.profileId} 页面内容横向溢出。`)
        check((metrics.documentOverflowX ?? 1) === 0, `${dynamic.pageId}/${capture.profileId} document 横向溢出。`)
        check(!metrics.isLogin && !metrics.isWip, `${dynamic.pageId}/${capture.profileId} 未进入真实动态页。`)
        check((capture.pageErrors || []).length === 0, `${dynamic.pageId}/${capture.profileId} 存在 page error。`)
      }
    }
    if (['VA-R2', 'VA-PASS'].includes(dynamic.visualStatus)) {
      for (const profileId of profileIds) check(captureProfiles.has(profileId), `${dynamic.pageId} 缺少 ${profileId} 截图。`)
    }
  }

  for (const evidence of visual.supersededEvidence || []) {
    check(Boolean(evidence.screenshot && evidence.reason), '历史替换证据缺少 screenshot 或 reason。')
    if (!evidence.screenshot) continue
    referencedShots.add(evidence.screenshot)
    const shot = join(skillRoot, evidence.screenshot)
    check(existsSync(shot), `历史替换截图不存在：${evidence.screenshot}`)
    if (existsSync(shot)) check(statSync(shot).size > 10_000, `历史替换截图文件异常小：${evidence.screenshot}`)
  }

  const actualShots = walk(join(skillRoot, 'references/visual-evidence'))
    .filter(file => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(file).toLowerCase()))
    .map(file => portable(relative(skillRoot, file)))
  for (const shot of actualShots) check(referencedShots.has(shot), `存在未被视觉记录引用的截图：${shot}`)
  for (const shot of referencedShots) check(actualShots.includes(shot), `视觉记录引用的截图不在证据目录：${shot}`)
}

function checkProjectRoutes() {
  const routerFile = join(projectRoot, 'src/router/index.ts')
  const visual = parseJson('references/page-visual-acceptance.json')
  if (!visual) return
  check(existsSync(routerFile), `项目路由文件不存在：${routerFile}`)
  if (!existsSync(routerFile)) return

  const router = readFileSync(routerFile, 'utf8')
  const sourceRoutes = new Map()
  for (const match of router.matchAll(/\{\s*path:\s*'([^']+)'[^\n]*meta:\s*\{[^\n}]*pageId:\s*'([^']+)'/g)) {
    const route = match[1].startsWith('/') ? match[1] : `/${match[1]}`
    sourceRoutes.set(match[2], route)
  }
  const evidenceRoutes = new Map((visual.pages || []).map(page => [page.pageId, page.route]))
  check(sourceRoutes.size === evidenceRoutes.size, `项目 pageId 数量 ${sourceRoutes.size} 与视觉记录 ${evidenceRoutes.size} 不一致。`)
  for (const [pageId, route] of sourceRoutes) {
    check(evidenceRoutes.has(pageId), `项目 route 未登记视觉记录：${pageId} ${route}`)
    if (evidenceRoutes.has(pageId)) check(evidenceRoutes.get(pageId) === route, `${pageId} 路由漂移：项目 ${route}，视觉记录 ${evidenceRoutes.get(pageId)}`)
  }
  for (const [pageId, route] of evidenceRoutes) check(sourceRoutes.has(pageId), `视觉记录包含项目不存在的 route：${pageId} ${route}`)
}

function requireSelectors(block, threshold, selectors) {
  check(Boolean(block), `无法读取 ${threshold}px Container Query 内容。`)
  if (!block) return
  for (const selector of selectors) check(block.includes(selector), `${threshold}px Container Query 缺少专项降级：${selector}`)
}

function splitContainerBlocks(css) {
  const matches = [...css.matchAll(/@container\s*\(max-width:\s*(\d+)px\)/g)]
  const blocks = new Map()
  matches.forEach((match, index) => {
    const start = match.index
    const end = matches[index + 1]?.index ?? css.length
    blocks.set(Number(match[1]), css.slice(start, end))
  })
  return blocks
}

function codeAssetPaths(text) {
  return new Set([...text.matchAll(/`(assets\/[^`]+)`/g)].map(match => match[1]))
}

function parseJson(rel) {
  try {
    return JSON.parse(read(rel))
  } catch (error) {
    errors.push(`${rel} 不是合法 JSON：${error.message}`)
    return null
  }
}

function read(rel) {
  const file = join(skillRoot, rel)
  if (!existsSync(file)) return ''
  return readFileSync(file, 'utf8')
}

function walk(dir) {
  if (!existsSync(dir)) return []
  const result = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) result.push(...walk(full))
    else if (entry.isFile()) result.push(full)
  }
  return result
}

function between(text, start, end) {
  const from = text.indexOf(start)
  const to = text.indexOf(end, from + start.length)
  return from >= 0 ? text.slice(from, to >= 0 ? to : text.length) : ''
}

function portable(value) {
  return value.split('\\').join('/')
}

function check(condition, message) {
  if (!condition) errors.push(message)
}
