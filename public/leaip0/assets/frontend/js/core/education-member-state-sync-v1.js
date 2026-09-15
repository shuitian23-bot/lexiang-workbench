/* Synchronize the existing education result with the member-center presentation. */
(() => {
  if (window.__lxEducationMemberStateSyncV1) return;
  window.__lxEducationMemberStateSyncV1 = true;
  const legacyKey = 'lexiang.student.v1';
  const currentKey = 'lexiang.student.v2';
  const get = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const parse = raw => { try { const value = JSON.parse(raw); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; } catch { return null; } };
  const status = value => value?.status === 'verified' ? 'verified' : ['pending', 'reviewing'].includes(value?.status) ? 'pending' : 'unverified';
  // One-time verified state requested for the P0 education demonstration. Later state changes persist.
  const resetKey = 'lexiang.education.demo-reset.v1';
  const resetVersion = '2026-09-15-verified-1';
  if (get(resetKey) !== resetVersion) {
    try {
      const existing = { ...(parse(get(currentKey)) || {}), ...(parse(get(legacyKey)) || {}) };
      const verified = JSON.stringify({ ...existing, status: 'verified' });
      localStorage.setItem(legacyKey, verified);
      localStorage.setItem(currentKey, verified);
      localStorage.setItem(resetKey, resetVersion);
    } catch { /* Keep the page usable when browser storage is unavailable. */ }
  }
  let lastLegacy = get(legacyKey), lastCurrent = get(currentKey);
  const remember = () => { lastLegacy = get(legacyKey); lastCurrent = get(currentKey); };
  function sync(sourceKey) {
    const raw = get(sourceKey), source = parse(raw);
    if (raw !== null && !source) { remember(); return; }
    if (source && !['verified', 'pending', 'reviewing', 'none', 'unverified'].includes(source.status)) { remember(); return; }
    const targetKey = sourceKey === legacyKey ? currentKey : legacyKey;
    const before = get(targetKey);
    const target = parse(before) || {};
    const nextStatus = status(source);
    const next = { ...target, ...(source || {}), status: nextStatus === 'unverified' && targetKey === legacyKey ? 'none' : nextStatus };
    if (!source && !before) { remember(); return; }
    try {
      const after = JSON.stringify(next);
      if (after !== before) localStorage.setItem(targetKey, after);
    } catch { remember(); return; }
    remember();
    if (targetKey === currentKey && lastCurrent !== before) {
      window.dispatchEvent(new StorageEvent('storage', { key: currentKey, oldValue: before, newValue: lastCurrent, storageArea: localStorage, url: location.href }));
    }
  }
  function check() {
    if (get(legacyKey) !== lastLegacy) sync(legacyKey);
    else if (get(currentKey) !== lastCurrent) sync(currentKey);
  }
  // Preserve existing completed results when installing the bridge for the first time.
  const legacy = parse(lastLegacy), current = parse(lastCurrent);
  if (legacy || current) {
    const legacyTime = Number(legacy?.submittedAt) || 0;
    const currentTime = Number(current?.submittedAt) || 0;
    const legacyWins = !current || (legacy && (legacyTime > currentTime || (legacyTime === currentTime && status(legacy) === 'verified' && status(current) !== 'verified')));
    sync(legacyWins ? legacyKey : currentKey);
  }
  // Flush same-tab updates before routing a new query, including the existing demo review timer.
  window.__lxReadEducationState = () => {
    check();
    const state = parse(get(legacyKey)) || { status: 'none' };
    if (state.status === 'pending' && state.submittedAt && Date.now() - Number(state.submittedAt) > 12000) {
      state.status = 'verified';
      try { localStorage.setItem(legacyKey, JSON.stringify(state)); sync(legacyKey); } catch {}
    }
    return state;
  };
  window.addEventListener('storage', event => { if (!event.key || event.key === legacyKey || event.key === currentKey) check(); });
  window.addEventListener('focus', check);
  window.addEventListener('pageshow', check);
  window.setInterval(check, 400);
})();
