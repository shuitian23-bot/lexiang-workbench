<script setup lang="ts">
import { computed } from 'vue'
import { getScenarioNodeContract, getScenarioNodeInputs } from '../../domain/scenarioNodeContracts.js'
import type { ScenarioPinnedStep } from '../../stores/scenarioSkillPackages'

const props = defineProps<{ steps: ScenarioPinnedStep[] }>()

const nodeContracts = computed(() => props.steps.map(step => ({
  step,
  contract: getScenarioNodeContract(step),
  inputs: getScenarioNodeInputs(props.steps, step.id)
})))
</script>

<template>
  <section class="node-contract-summary" aria-label="节点执行约定" data-node-contract-summary>
    <h3>节点执行约定</h3>
    <p v-if="!nodeContracts.length" class="node-contract-empty">暂无节点执行约定。</p>
    <details
      v-for="({ step, contract, inputs }, index) in nodeContracts"
      :key="step.id"
      class="node-contract"
      :data-contract-node="step.id"
      open
    >
      <summary class="node-contract-heading">
        <span class="node-contract-chevron" aria-hidden="true">›</span>
        <span class="node-contract-index">节点 {{ index + 1 }}</span>
        <strong>{{ step.name?.trim() || '未命名节点' }}</strong>
      </summary>

      <dl class="node-contract-fields">
        <div class="node-contract-field" data-node-contract-field="task">
          <dt>本节点任务</dt>
          <dd>{{ contract.task.trim() || '未补充' }}</dd>
        </div>
        <div class="node-contract-field" data-node-contract-field="fixedRequirements">
          <dt>固定要求</dt>
          <dd>{{ contract.fixedRequirements.trim() || '未设置额外要求' }}</dd>
        </div>
        <div class="node-contract-field" data-node-contract-field="expectedOutput">
          <dt>预期输出</dt>
          <dd>{{ contract.expectedOutput.trim() || '未补充' }}</dd>
        </div>
        <div class="node-contract-field" data-node-contract-field="inputs">
          <dt>输入来源</dt>
          <dd>
            <ul v-if="inputs.length" class="node-contract-inputs">
              <li
                v-for="(input, inputIndex) in inputs"
                :key="`${input.kind}-${input.nodeId || inputIndex}`"
                class="node-contract-input"
                :data-input-kind="input.kind"
              >
                <strong>{{ input.name }}</strong>
                <p v-if="input.description">{{ input.description }}</p>
                <p v-if="input.conditional" class="node-contract-input-note">该条件节点跳过时，不会产生本次输出。</p>
              </li>
            </ul>
            <span v-else>暂无可用输入来源。</span>
          </dd>
        </div>
      </dl>
    </details>
  </section>
</template>

<style scoped>
.node-contract-summary {
  display: grid;
  gap: 12px;
  width: 100%;
  min-width: 0;
  color: var(--color-text);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.node-contract-summary h3 { margin: 0; font-size: 14px; font-weight: 600; }
.node-contract-empty { margin: 0; color: var(--color-text-secondary); }
.node-contract { min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); }
.node-contract-heading { display: flex; align-items: baseline; gap: 8px; min-width: 0; padding: 12px; border-radius: var(--radius-md); list-style: none; cursor: pointer; }
.node-contract-heading::-webkit-details-marker { display: none; }
.node-contract-heading:hover { background: var(--color-bg-subtle); }
.node-contract-heading:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.node-contract-chevron { flex: 0 0 12px; align-self: center; color: var(--color-text-secondary); font-size: 18px; line-height: 1; text-align: center; }
.node-contract[open] > .node-contract-heading .node-contract-chevron { transform: rotate(90deg); }
.node-contract-index { flex: 0 0 auto; color: var(--color-text-secondary); }
.node-contract-heading strong { min-width: 0; font-weight: 500; }
.node-contract-fields { display: grid; gap: 12px; min-width: 0; margin: 0; padding: 12px; border-top: 1px solid var(--color-border-subtle); }
.node-contract-field { display: grid; gap: 4px; min-width: 0; }
.node-contract-field dt { color: var(--color-text-secondary); }
.node-contract-field dd { min-width: 0; margin: 0; white-space: pre-wrap; }
.node-contract-inputs { display: grid; gap: 8px; min-width: 0; margin: 0; padding: 0; list-style: none; }
.node-contract-input { display: grid; gap: 4px; min-width: 0; }
.node-contract-input strong { font-weight: 500; }
.node-contract-input p { min-width: 0; margin: 0; }
.node-contract-input-note { color: var(--color-text-secondary); }
</style>
