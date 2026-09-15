/* Synchronize the existing education result with the member-center presentation. */
(() => {
  if (window.__lxEducationMemberStateSyncV1) return;
  window.__lxEducationMemberStateSyncV1 = true;
  const legacyKey = 'lexiang.student.v1';
  const currentKey = 'lexiang.student.v2';
  const get = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const parse = raw => { try { const value = JSON.parse(raw); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; } catch { return null; } };
  const status = value => value?.status === 'verified' ? 'verified' : ['pending', 'reviewing'].includes(value?.status) ? 'pending' : 'unverified';
  // One-time reset requested for the P0 education demonstration. Later certifications persist.
  const resetKey = 'lexiang.education.demo-reset.v1';
  const resetVersion = '2026-09-15-unverified-1';
  if (get(resetKey) !== resetVersion) {
    try {
      localStorage.setItem(legacyKey, JSON.stringify({ status: 'none' }));
      localStorage.setItem(currentKey, JSON.stringify({ status: 'unverified' }));
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
  window.addEventListener('storage', event => { if (!event.key || event.key === legacyKey || event.key === currentKey) check(); });
  window.addEventListener('focus', check);
  window.addEventListener('pageshow', check);
  window.setInterval(check, 400);
})();
