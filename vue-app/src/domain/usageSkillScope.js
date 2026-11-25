/** Shared business scope for Skill analytics; source snapshots stay intact. */
/** @param {{ creatorId?: string, creator?: string, creatorKnown?: boolean }} row */
export function isExcludedUsageCreator(row) {
  const id = (row.creatorId || '').trim().toLowerCase()
  return row.creatorKnown === false || !id || ['xinghy4', 'unattributed', '未标注'].includes(id) || row.creator === '未标注'
}

/**
 * Count the online enabled catalog at its own cutoff. An editing workflow may
 * be under review while the existing published online version remains enabled.
 * @param {{ id: string, publishedAt: string, onlineStatus: string, creatorId?: string, creator?: string, creatorKnown?: boolean }[]} skills
 * @param {string} asOfDate
 */
export function countEnabledUsageSkills(skills, asOfDate) {
  return new Set(skills.filter(skill => skill.id.trim()
    && skill.onlineStatus === 'published' && skill.publishedAt <= asOfDate
    && !isExcludedUsageCreator(skill)).map(skill => skill.id)).size
}

/** @param {number|null|undefined} called @param {number|null|undefined} stock */
export function getSkillCallRate(called, stock) {
  return typeof called !== 'number' || !Number.isFinite(called) || called < 0
    || typeof stock !== 'number' || !Number.isFinite(stock) || stock <= 0 || called > stock
    ? null : called / stock
}
