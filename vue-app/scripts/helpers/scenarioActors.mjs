/** Explicit test permissions for supplied Skills; never infer unlisted Skills or use policy wildcards. */
export function scenarioPmPermissions(skills, packageIds = []) {
  if (!Array.isArray(skills)) throw new TypeError('Pass the exact Skill IDs, catalog entries or pinned steps for this PM fixture')
  const permissions = ['scenario-package:create', 'scenario-package:compose:cross-menu']
  for (const skill of skills) {
    const id = typeof skill === 'string' ? skill : skill.skillId || skill.id
    if (typeof id !== 'string' || !id.trim()) throw new TypeError('Every PM fixture Skill needs an explicit ID')
    permissions.push(`skill:${id}:metadata:read`, `skill:${id}:reference`)
    if (typeof skill !== 'string') {
      for (const bucket of ['menu', 'skill', 'data', 'action']) permissions.push(...(skill.permissions?.[bucket] || []))
    }
  }
  for (const id of packageIds) {
    if (typeof id !== 'string' || !id.trim()) throw new TypeError('Package runtime grants need exact IDs')
    permissions.push(`scenario-package:${id}:use`)
  }
  if (permissions.includes('*') || permissions.includes('scenario-package:review')) throw new Error('A PM fixture cannot receive administrator policy permissions')
  return [...new Set(permissions)]
}

export function scenarioPmActor(id, skills, packageIds = []) {
  return { id, permissions: scenarioPmPermissions(skills, packageIds) }
}
