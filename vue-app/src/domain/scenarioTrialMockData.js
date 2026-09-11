// Incomplete data for the repeatable local trial. These are not live Skill responses.
const INCOMPLETE_SAMPLES = {
  'product-knowledge': {
    version: 'v1.0.7',
    output: '模拟样例：机型 A 重视便携。',
    reason: '本轮反馈仅包含机型 A，缺少机型 B 的对比和选择理由。',
    expectedOutput: '对比机型 A 和机型 B 的配置与适用场景，并说明选择理由。'
  },
  'voucher-recommend': {
    version: 'v0.1.3',
    output: '模拟样例：推荐券包 A。',
    reason: '本轮反馈只有券包名称，缺少包含的权益和适用范围。',
    expectedOutput: '列出推荐券包包含的权益、适用范围和推荐理由。'
  },
  'gmv-daily-summary': {
    version: 'v1.2.0',
    output: '模拟样例：样例日期共有 3 笔订单。',
    reason: '本轮反馈只有订单数，缺少 GMV 和渠道贡献。',
    expectedOutput: '按日期汇总订单数、GMV 和各渠道贡献。'
  },
  'employee-certification-insight': {
    version: 'v1.0.0',
    output: '模拟样例：职场 A 共有 3 名员工。',
    reason: '本轮反馈仅包含员工总人数，缺少已认证和待补充材料的人数分类。',
    expectedOutput: '按认证状态汇总人数，分别列出已认证和待补充材料人数。'
  },
  'workplace-segment-operations': {
    version: 'v1.2.0',
    output: '模拟样例：已认证人群中 1 人完成购买。',
    reason: '本轮反馈只有购买人数，缺少待跟进人群和对应运营建议。',
    expectedOutput: '汇总已认证人群经营表现，列出待跟进人群和对应运营建议。'
  },
  'enterprise-customer-followup': {
    version: 'v1.0.0',
    output: '模拟样例：建议联系企业客户 A。',
    reason: '本轮反馈只有联系建议，缺少需确认的信息和下一步跟进行动。',
    expectedOutput: '列出需确认的采购人数、预算信息和下一步跟进行动。'
  }
}

/**
 * Use the second executed node for a repairable data example. The caller supplies
 * resolved chain order. Retry requests use complete fixtures; a declared output
 * also skips this initial example. No natural-language scoring or live execution
 * takes place, and retry does not bypass the caller's execution checks.
 * @param {import('./scenarioSkillPackages.js').PinnedScenarioStep[]} orderedSteps
 * @param {import('./scenarioPackageTesting.js').ScenarioSimulationRequest} request
 * @returns {{nodeId:string,output:string,reason:string,suggestion:string}|null}
 */
export function getScenarioMockDataFailure(orderedSteps, request) {
  if (request?.mockDataMode !== 'mixed-feedback') return null
  if (request.mockDataPhase === 'retry') return null
  const active = new Set(request.activeOptionalStepIds || [])
  const step = orderedSteps.filter(item => item.kind !== 'conditional' || active.has(item.id))[1]
  if (!step || (typeof step.expectedOutput === 'string' && step.expectedOutput.trim())) return null
  const sample = INCOMPLETE_SAMPLES[step.skillId]
  if (!sample || sample.version !== step.pinnedVersion) return null
  return {
    nodeId: step.id,
    output: sample.output,
    reason: sample.reason,
    suggestion: `返回修改，在“预期输出”中补充：“${sample.expectedOutput}”然后重新试运行。`
  }
}
