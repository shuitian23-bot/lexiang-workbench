/* 设备列表 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/device-list"]) {
window.__p0Modules.installed["pages/device-list"]=true;

/* Business: openMemberDevices */
window.__p0Modules.factories["pages/device-list#openMemberDevices:1f0f795c118123c7f203f163"]=function(__p0Scope){"use strict";return (async function openMemberDevices(trigger) {
    var displayMode = !trigger || trigger.matches(".leai-action-card") ? "tab" : "secondary";
    (0,__p0Scope.openRightView)("devices", displayMode);
    if (trigger) (0,__p0Scope.setSelected)(trigger);
  }); };

/* Business: memberDevicesPage */
window.__p0Modules.factories["pages/device-list#memberDevicesPage:3dde0544d1e4b5c66331bb54"]=function(__p0Scope){"use strict";return (function memberDevicesPage() {
    var keys = (0,__p0Scope.orderedDeviceKeys)();
    var isQueryEmbed = new URLSearchParams(window.location.search).get("origin") === "query";
    if (__p0Scope.state.deviceFocusId && __p0Scope.deviceCatalog[__p0Scope.state.deviceFocusId]) return (0,__p0Scope.memberDeviceDetailPage)(__p0Scope.state.deviceFocusId);
    var eligibleKeys = keys.filter(function (key) { return Boolean(__p0Scope.deviceCatalog[key].extensionEligible); });
    var normalKeys = keys.filter(function (key) { return !__p0Scope.deviceCatalog[key].extensionEligible; });
    var pendingCount = __p0Scope.state.pendingDeviceBound ? 0 : 1;
    var filterLabels = {
      all: ["全部", keys.length + pendingCount],
      attention: ["待处理", eligibleKeys.length + pendingCount],
      normal: ["保障正常", normalKeys.length],
      extension: ["可购延保", eligibleKeys.length]
    };
    var filter = filterLabels[__p0Scope.state.deviceFilter] ? __p0Scope.state.deviceFilter : "all";
    var visibleKeys = keys.filter(function (key) {
      if (filter === "normal") return !__p0Scope.deviceCatalog[key].extensionEligible;
      if (filter === "attention" || filter === "extension") return Boolean(__p0Scope.deviceCatalog[key].extensionEligible);
      return true;
    });
    var pending = !__p0Scope.state.pendingDeviceBound && (filter === "all" || filter === "attention") ? (0,__p0Scope.pendingDeviceListRow)() : "";
    var list = pending + visibleKeys.map(function (key) { return (0,__p0Scope.memberDeviceListRow)(__p0Scope.deviceCatalog[key]); }).join("");
    var pageHeading = isQueryEmbed ? '' : '<h1 class="leai-page-title" id="leaiDevicesTitle">我的设备</h1>';
    var pageLabel = isQueryEmbed ? ' aria-label="我的设备列表"' : ' aria-labelledby="leaiDevicesTitle"';
    return '<section class="leai-page" data-member-device-page' + pageLabel + '><header class="leai-page-header"><div>' + pageHeading + '<p class="leai-page-desc">查看 Lenovo ID 下的绑定设备、保修信息和可用服务。</p></div><span class="leai-status-pill"><img src="' + __p0Scope.icons.check + '" alt="">' + keys.length + ' 台已绑定 · ' + pendingCount + ' 台待绑定</span></header>' +
      '<section class="leai-panel leai-device-center"><div class="leai-panel-head"><div><h2 class="leai-panel-title">设备列表</h2><p>按节点筛选设备，查看保障状态与可用维保方案。</p></div><button class="leai-secondary" type="button" data-device-add>绑定新设备</button></div>' +
      '<div class="leai-device-filters" role="group" aria-label="设备筛选">' + Object.keys(filterLabels).map(function (key) { return (0,__p0Scope.deviceFilterButton)(key, filterLabels[key][0], filterLabels[key][1], filter); }).join("") + '</div>' +
      '<div class="leai-device-list" data-device-unified-list aria-live="polite">' + list + '</div>' +
      (list ? "" : '<div class="leai-device-empty"><strong>当前筛选下暂无设备</strong><span>可切换到“全部”查看设备。</span></div>') +
      '<p class="leai-member-disclaimer">当前为 Mock 设备数据；设备关系、保修信息与维保方案以 Lenovo ID 设备资产服务和服务商品系统实时结果为准。</p></section></section>';
  }); };

/* Business: memberDeviceListRow */
window.__p0Modules.factories["pages/device-list#memberDeviceListRow:1f681012d610f9029463277b"]=function(__p0Scope){"use strict";return (function memberDeviceListRow(device) {
    var maintenance = device.extensionEligible ? '<button class="leai-secondary leai-maintenance-button" type="button" data-device-warranty="' + device.id + '">查看维保方案</button><small>' + (0,__p0Scope.escapeHtml)(device.maintenanceReason || "保障节点推荐") + '</small>' : "";
    return '<article class="leai-device-list-row" data-device-list-item data-member-device="' + device.id + '"><img src="' + device.image + '" alt=""><span class="leai-device-list-copy"><strong>' + (0,__p0Scope.escapeHtml)(device.name) + '</strong><small>' + (0,__p0Scope.escapeHtml)(device.product) + ' · ' + (0,__p0Scope.escapeHtml)(device.sn) + '</small></span><span class="leai-device-row-warranty"><small>保修至</small><strong>' + (0,__p0Scope.escapeHtml)(device.warranty.replace("基础保修至 ", "")) + '</strong></span><span class="leai-device-row-actions"><button class="leai-secondary" type="button" data-device-detail="' + device.id + '">查看详情</button>' + maintenance + '</span></article>';
  }); };
}
window.__p0Modules.dispatch(document.currentScript);
