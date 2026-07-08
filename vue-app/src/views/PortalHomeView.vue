<template>
  <!-- 对应原 renderPortalHomePage() 输出的 HTML，class 一字不改 -->
  <div class="portal-home portal-home-v2">
    <section class="portal-home-command portal-home-command-solo">
      <div class="portal-home-command-copy">
        <div class="portal-home-kicker">LEAIBOT WORKBENCH</div>
        <div class="page-title">联想门户工作台</div>
        <div class="page-desc">统一承载运营看板、业务后台、风险审核与 AI 助手能力，让团队在一个入口完成查询、分析、处理和协作。</div>
        <div class="portal-home-actions">
          <button class="btn btn-secondary" @click="openSkillManager">管理技能包</button>
          <button class="btn btn-primary" @click="router.push('/agent/skill-create')">创建 Skill</button>
        </div>
      </div>
    </section>

    <div class="portal-home-grid portal-home-spotlight">
      <button class="portal-home-card" @click="aiStore.toggleOpen(true)">
        <span>AI</span><b>全局 AI 助手</b>
        <p>右侧助手独立存在，可用自然语言发起数据查询、报告生成、知识维护、商品配置等任务。</p>
      </button>
      <button class="portal-home-card" @click="router.push('/dashboard/overview')">
        <span>OP</span><b>运营分析</b>
        <p>聚合乐享运营、Query、质量、流量和 GMV 数据，支持按业务视角查看趋势和异常。</p>
      </button>
      <button class="portal-home-card" @click="router.push('/agent/skill-create')">
        <span>PM</span><b>Skill 创建</b>
        <p>平台侧和 PM 可从账号入口创建 Skill，并在 Skill Hub 中跟踪提交、审批、启停和发布状态。</p>
      </button>
      <button class="portal-home-card" @click="openSkillManager">
        <span>SK</span><b>技能包管理</b>
        <p>业务用户通过右上角管理技能查看并启停技能包，通过 AI 助手调用已开启能力。</p>
      </button>
    </div>

    <div class="portal-home-layout portal-home-workgrid">
      <div class="card portal-home-entry-card">
        <div class="card-header">
          <div class="card-title">常用入口</div>
          <button class="btn btn-secondary btn-sm" @click="router.push('/dashboard/overview')">进入运营总览</button>
        </div>
        <div class="portal-home-entry-list">
          <button @click="router.push('/employee/overview')"><i>01</i><b>在职员工管理</b><span>职场员工概览、职场员工审核、认证方式分布</span></button>
          <button @click="router.push('/dashboard/overview')"><i>02</i><b>乐享运营</b><span>经营指标、流量质量、GMV 分析</span></button>
          <button @click="router.push('/lead/dashboard')"><i>03</i><b>企业客户管理</b><span>线索看板、线索池和分配跟进</span></button>
        </div>
      </div>

      <div class="card portal-home-flow-card">
        <div class="card-header"><div class="card-title">基础操作流程</div></div>
        <div class="portal-home-flow">
          <div><span>1</span><p>从左侧菜单进入确定性的后台页面，完成固定流程和人工审核。</p></div>
          <div><span>2</span><p>在右侧 AI 助手输入任务，补充查询、分析、生成和配置类工作。</p></div>
          <div><span>3</span><p>涉及写入、发布、导出等高影响操作时，先展示影响范围，再确认执行并留下任务记录。</p></div>
          <div><span>4</span><p>PM 从左下角账号入口进入 Skill Hub 管理提交状态；业务从右上角管理技能使用技能包。</p></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAIStore } from '@/stores/ai'
import { useAppStore } from '@/stores/app'
import { ensureNativeWorkbenchRuntime } from '@/adapters/legacyWorkbench/nativeWorkbenchRuntime'

const router   = useRouter()
const aiStore  = useAIStore()
const appStore = useAppStore()

async function openSkillManager() {
  try {
    await ensureNativeWorkbenchRuntime(router)
    window.openSkillManagerOverlay?.()
  } catch {
    appStore.ensureStaticTab('agent.skills')
    appStore.setActiveStaticTab('agent.skills')
    router.push('/agent/skills')
  }
}

onMounted(() => {
  // 首页自动打开 AI 面板（对应原 switchPage 逻辑）
  aiStore.toggleOpen(true)
  // 记录页签
  appStore.ensureStaticTab('portal.home')
  appStore.setActiveStaticTab('portal.home')
})
</script>

<style lang="scss" scoped>
.portal-home-v2 {
  --portal-card-shadow: 0 1px 2px rgba(15, 23, 42, 0.035);
  --portal-card-hover-shadow: 0 10px 24px rgba(31, 35, 41, 0.075);

  min-width: 0;
}

.portal-home-command-copy {
  position: relative;
  overflow: hidden;
  background: #fff !important;
}

.portal-home-kicker,
.page-title,
.page-desc,
.portal-home-actions {
  position: relative;
  z-index: 1;
}

.portal-home-spotlight .portal-home-card {
  min-width: 0;
  display: grid;
  grid-template-rows: auto auto 1fr;
  align-content: start;
  gap: 0;
  border-color: rgba(222, 224, 227, 0.86);
  box-shadow: var(--portal-card-shadow);
}

.portal-home-spotlight .portal-home-card span {
  box-shadow: inset 0 0 0 1px rgba(51, 112, 255, 0.06);
}

.portal-home-spotlight .portal-home-card b {
  line-height: 1.35;
}

.portal-home-spotlight .portal-home-card p {
  margin: 0;
}

.portal-home-card,
.portal-home-entry-list button,
.portal-home-flow div {
  outline: none;
}

.portal-home-card:focus-visible,
.portal-home-entry-list button:focus-visible {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(51, 112, 255, 0.14), var(--portal-card-hover-shadow);
}

.portal-home-entry-card,
.portal-home-flow-card {
  min-width: 0;
}

.portal-home-entry-list button {
  min-width: 0;
  color: var(--text);
  transition:
    transform 0.14s ease,
    border-color 0.14s ease,
    box-shadow 0.14s ease,
    background 0.14s ease;
}

.portal-home-entry-list button b,
.portal-home-entry-list button span {
  min-width: 0;
}

.portal-home-entry-list button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.portal-home-entry-list button:active,
.portal-home-card:active {
  transform: translateY(0);
}

.portal-home-flow div {
  min-width: 0;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  transition:
    transform 0.14s ease,
    border-color 0.14s ease,
    box-shadow 0.14s ease,
    background 0.14s ease;
}

.portal-home-flow span {
  align-self: center;
}

.portal-home-flow p {
  min-width: 0;
}

@media (max-width: 1360px) {
  .portal-home-entry-list button {
    grid-template-columns: 34px minmax(96px, 0.36fr) minmax(0, 1fr);
  }
}

@media (max-width: 980px) {
  .portal-home-entry-list button {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .portal-home-entry-list button span {
    grid-column: 2;
    text-align: left;
  }
}
</style>
