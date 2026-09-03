/** @typedef {'page' | 'api'} SkillContextSourceType */
/** @typedef {'affected' | 'optional'} SkillContextChangeRole */
/**
 * @typedef {object} SkillContextItem
 * @property {string} code
 * @property {string} name
 * @property {string} subtitle
 * @property {string} source
 * @property {string} menuPath
 * @property {SkillContextSourceType=} sourceType
 * @property {string=} version
 * @property {string=} currentVersion
 * @property {string=} targetVersion
 * @property {SkillContextChangeRole=} changeRole
 * @property {boolean} selected
 * @property {boolean} recommended
 */

/**
 * @typedef {object} PagelessSkillContext
 * @property {string} contextId
 * @property {string} name
 * @property {string} description
 * @property {SkillContextSourceType} sourceType
 */

/**
 * @typedef {object} PagelessSkillContextGroup
 * @property {string} groupId
 * @property {string} groupLabel
 * @property {PagelessSkillContext[]} contexts
 */

/** @type {PagelessSkillContextGroup[]} */
export const PAGELESS_SKILL_CONTEXT_GROUPS = [
  {
    groupId: 'private-customization',
    groupLabel: '私人订制',
    contexts: [
      {
        contextId: 'customization.top-ranking',
        name: '私定 TOP 榜单',
        description: '用户针对私定官方喷绘中TOP 甄选榜进行图片或顺序调整',
        sourceType: 'api'
      }
    ]
  }
]

/**
 * @returns {string[]}
 */
export function getPagelessSkillMenuLabels() {
  return PAGELESS_SKILL_CONTEXT_GROUPS.map(group => group.groupLabel)
}

/**
 * @param {string} [activeMenu='']
 * @returns {SkillContextItem[]}
 */
export function createPagelessContextItems(activeMenu = '') {
  return PAGELESS_SKILL_CONTEXT_GROUPS.flatMap(group => group.contexts.map(context => ({
    code: context.contextId,
    name: context.name,
    subtitle: context.description,
    source: group.groupLabel,
    menuPath: `${group.groupLabel} / ${context.name}`,
    sourceType: context.sourceType,
    selected: false,
    recommended: activeMenu === group.groupLabel
  })))
}
