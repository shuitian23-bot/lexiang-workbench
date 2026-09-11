/**
 * Direct canvas edges only. Ancestor inputs stay visible on the receiving node.
 * A received payload is transport evidence, not a claim about business correctness.
 * @param {import('./scenarioSkillPackages.js').PinnedScenarioStep[]} steps
 * @param {import('./scenarioPackageTesting.js').ScenarioSimulationNode[]} nodes
 * @param {string} stepId
 * @returns {import('./scenarioPackageTesting.js').ScenarioSimulationTransfer[]}
 */
export function getScenarioTrialTransfers(steps, nodes, stepId) {
  const legacy = steps.every(step => step.predecessorId === undefined)
  const source = nodes.find(node => node.id === stepId)
  return steps.filter((step, index) => (legacy ? steps[index - 1]?.id : step.predecessorId) === stepId).map(step => {
    const target = nodes.find(node => node.id === step.id)
    const receipts = (Array.isArray(target?.inputs) ? target.inputs : []).filter(input => input?.source === 'upstream' && input.nodeId === stepId)
    const sentValue = source?.status === 'completed' && target?.status !== 'skipped' && typeof source?.output === 'string' ? source.output : ''
    const receivedValue = receipts.length === 1 && typeof receipts[0].value === 'string' ? receipts[0].value : ''
    let status = /** @type {'received'|'blocked'|'skipped'} */ ('blocked')
    let detail = '下游未收到完整的上游输出，请检查节点执行结果后重新试运行。'
    if (source?.status === 'skipped' || target?.status === 'skipped') {
      status = 'skipped'
      detail = source?.status === 'skipped'
        ? '本节点条件未命中，没有生成或传递输出；后续节点仍可使用更早已完成节点的输入。'
        : '下游节点条件未命中，本次未向该节点传递输出。'
    } else if (source?.status !== 'completed' || !sentValue.trim()) {
      detail = '本节点未完成，尚无可传给下游的输出。'
    } else if (receipts.length === 1 && receivedValue === sentValue) {
      status = 'received'
      detail = target?.status === 'blocked'
        ? '下游已收到相同内容，但下游节点执行报错，请继续查看该节点。'
        : '下游已收到本节点的完整输出，传递内容一致。'
    } else if (receipts.length) {
      detail = '下游接收内容或来源数量与本节点输出不一致，请重新试运行。'
    }
    return { nodeId: step.id, name: target?.name || step.name, status, sentValue, receivedValue, detail }
  })
}
