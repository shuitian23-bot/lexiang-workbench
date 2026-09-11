/**
 * @typedef {{ id: string, name?: string, skillId?: string, task?: string, fixedRequirements?: string, expectedOutput?: string, inputDescription?: string, predecessorId?: string|null, kind?: string }} ContractStep
 * @typedef {{ kind: 'run'|'upstream', nodeId?: string, name: string, description: string, conditional?: boolean }} ScenarioNodeInput
 */

const text = value => typeof value === 'string' ? value : ''

/** Resolve legacy records without rewriting their published snapshots. @param {ContractStep} step */
export function getScenarioNodeContract(step) {
  return {
    task: step.task === undefined ? `使用${step.name || step.skillId || '当前 Skill'}完成本节点任务` : text(step.task),
    fixedRequirements: text(step.fixedRequirements),
    expectedOutput: text(step.expectedOutput)
  }
}

/**
 * Describe only connected ancestors; positions never imply a data dependency.
 * Incomplete canvas drafts remain inspectable. Invalid cycles expose no upstream data.
 * @param {ContractStep[]} steps
 * @param {string} stepId
 * @returns {ScenarioNodeInput[]}
 */
export function getScenarioNodeInputs(steps, stepId) {
  const target = steps.find(step => step.id === stepId)
  if (!target) return []
  const legacy = steps.every(step => step.predecessorId === undefined)
  const byId = new Map(steps.map((step, index) => [step.id, { step, index }]))
  const ancestors = []
  const seen = new Set([target.id])
  let current = target
  while (current) {
    const entry = byId.get(current.id)
    const previousId = legacy ? steps[(entry?.index ?? 0) - 1]?.id : current.predecessorId
    if (!previousId) break
    if (seen.has(previousId)) {
      ancestors.length = 0
      break
    }
    const previous = byId.get(previousId)?.step
    if (!previous) break
    seen.add(previousId)
    ancestors.unshift(previous)
    current = previous
  }
  return [
    { kind: 'run', name: '本次运行输入', description: text(target.inputDescription) || '本次任务提供的目标、对象和筛选条件，运行时填写。' },
    ...ancestors.map(step => ({
      kind: /** @type {'upstream'} */ ('upstream'),
      nodeId: step.id,
      name: step.name || step.skillId || step.id,
      description: text(step.expectedOutput).trim() || '上游尚未声明预期输出。',
      conditional: step.kind === 'conditional'
    }))
  ]
}
