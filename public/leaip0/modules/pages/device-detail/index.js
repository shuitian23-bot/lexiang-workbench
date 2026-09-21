/* 设备详情 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/device-detail"]) {
window.__p0Modules.installed["pages/device-detail"]=true;

/* Business: openDeviceDetail */
window.__p0Modules.factories["pages/device-detail#openDeviceDetail:692f3ed207d398a38d66c481"]=function(__p0Scope){"use strict";return (function openDeviceDetail(deviceId) {
    if (!__p0Scope.deviceCatalog[deviceId]) return;
    if (__p0Scope.embeddedHost && typeof window.__lxOpenDeviceDetailTab === "function") {
      window.__lxOpenDeviceDetailTab({id:deviceId,name:__p0Scope.deviceCatalog[deviceId].name});
      return;
    }
    var host = (0,__p0Scope.el)("#leaiAuiView");
    __p0Scope.state.deviceListScrollTop = host ? host.scrollTop : 0;
    __p0Scope.state.deviceDetailOrigin = __p0Scope.state.rightView === "devices" ? "devices" : "member";
    __p0Scope.state.deviceFocusId = deviceId;
    (0,__p0Scope.openRightView)("devices");
  }); };

/* Business: memberDeviceSpecificationsHtml */
window.__p0Modules.factories["pages/device-detail#memberDeviceSpecificationsHtml:cf4b96b7063d7eb3b6369db7"]=function(__p0Scope){"use strict";return (function memberDeviceSpecificationsHtml(device) {
    var profile = __p0Scope.memberDeviceSpecifications.profiles[device.id];
    var rows = [
      ['产品型号', device.product],
      ['设备编号', device.sn],
      ['购买时间', device.purchased],
      ['绑定关系', '已绑定当前 Lenovo ID'],
      ['保障信息', device.service],
      ['基础保修', device.warranty.replace('基础保修至 ', '至 ')],
      ['保障范围', '以设备资产服务实时回执为准'],
      ['可用服务', device.extensionEligible ? '维保方案、官方维修与支持' : '官方维修与支持']
    ];
    if (profile) {
      __p0Scope.memberDeviceSpecifications.groups.forEach(function (group) {
        group[1].forEach(function (label) {
          if (Object.prototype.hasOwnProperty.call(profile.values, label)) rows.push([label, profile.values[label]]);
        });
      });
    }
    var note = profile ? '以下为当前机型的演示配置，实际配置以设备出厂信息为准。' : '暂无该设备的详细配置，请以设备出厂信息为准。';
    return '<section class="leai-panel leai-device-specifications" data-device-specifications' + (profile ? ' data-device-spec-kind="' + (0,__p0Scope.escapeHtml)(profile.kind) + '"' : '') + '><h2 class="leai-panel-title">基本参数</h2><p class="leai-device-spec-note">' + note + '</p><dl class="leai-device-detail-list leai-device-spec-grid">' + rows.map(function (row) {
      return '<div><dt>' + (0,__p0Scope.escapeHtml)(row[0]) + '</dt><dd>' + (0,__p0Scope.escapeHtml)(row[1]) + '</dd></div>';
    }).join('') + '</dl></section>';
  }); };

/* Business: memberDeviceDetailPage */
window.__p0Modules.factories["pages/device-detail#memberDeviceDetailPage:6869c20a588e262ac9e1e1e7"]=function(__p0Scope){"use strict";return (function memberDeviceDetailPage(id) {
    var device = __p0Scope.deviceCatalog[id] || __p0Scope.deviceCatalog.thinkbook16p;
    var deviceBackView = __p0Scope.state.deviceDetailOrigin === "member" ? "member" : "devices";
    var deviceBackLabel = deviceBackView === "member" ? "会员中心" : "我的设备";
    return '<section class="leai-page" data-member-device-detail-page data-device-detail-id="' + device.id + '" data-device-warranty-eligible="' + Boolean(device.extensionEligible) + '" aria-labelledby="leaiDeviceDetailTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">设备详情</p><div class="leai-page-title-row"><button class="leai-page-back" type="button" data-secondary-back="' + (0,__p0Scope.escapeHtml)(deviceBackView) + '" aria-label="返回' + (0,__p0Scope.escapeHtml)(deviceBackLabel) + '"><img src="' + __p0Scope.icons.next + '" alt=""></button><h1 class="leai-page-title" id="leaiDeviceDetailTitle">' + (0,__p0Scope.escapeHtml)(device.name) + '</h1></div><p class="leai-page-desc">查看当前 Lenovo ID 下的资产关系、购买信息、官方保障与可用服务。</p></div><span class="leai-status-pill"><img src="' + __p0Scope.icons.check + '" alt="">' + (0,__p0Scope.escapeHtml)(device.service) + '</span></header>' +
      '<section class="leai-panel leai-device-detail-hero"><div class="leai-device-detail-visual"><img src="' + device.image + '" alt="' + (0,__p0Scope.escapeHtml)(device.name) + '"></div><div class="leai-device-detail-summary"><span>已绑定当前 Lenovo ID</span><h2>' + (0,__p0Scope.escapeHtml)(device.product) + '</h2><p>设备编号 ' + (0,__p0Scope.escapeHtml)(device.sn) + '</p><strong>' + (0,__p0Scope.escapeHtml)(device.warranty) + '</strong>' + (device.extensionEligible && !__p0Scope.embeddedHost ? '<button class="leai-secondary" type="button" data-device-warranty="' + device.id + '">查看维保方案</button>' : '') + '</div></section>' +
      (0,__p0Scope.memberDeviceSpecificationsHtml)(device) +
      '</section>';
  }); };

/* Business: openDeviceDetail */
window.__p0Modules.factories["pages/device-detail#openDeviceDetail:5291eef28637ae3d97b6e839"]=function(__p0Scope){"use strict";return (function openDeviceDetail(deviceId) {
    if (!__p0Scope.deviceCatalog[deviceId]) return;
    var host = (0,__p0Scope.el)("#leaiAuiView");
    __p0Scope.state.deviceListScrollTop = host ? host.scrollTop : 0;
    __p0Scope.state.deviceDetailOrigin = __p0Scope.state.rightView === "devices" ? "devices" : "member";
    __p0Scope.state.deviceFocusId = deviceId;
    (0,__p0Scope.openRightView)("devices");
  }); };

/* Business: memberDeviceDetailPage */
window.__p0Modules.factories["pages/device-detail#memberDeviceDetailPage:90fca015decbe9591fc1b42b"]=function(__p0Scope){"use strict";return (function memberDeviceDetailPage(id) {
    var device = __p0Scope.deviceCatalog[id] || __p0Scope.deviceCatalog.thinkbook16p;
    var deviceBackView = __p0Scope.state.deviceDetailOrigin === "member" ? "member" : "devices";
    var deviceBackLabel = deviceBackView === "member" ? "会员中心" : "我的设备";
    return '<section class="leai-page" data-member-device-detail-page data-device-detail-id="' + device.id + '" aria-labelledby="leaiDeviceDetailTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">设备详情</p><div class="leai-page-title-row"><button class="leai-page-back" type="button" data-secondary-back="' + (0,__p0Scope.escapeHtml)(deviceBackView) + '" aria-label="返回' + (0,__p0Scope.escapeHtml)(deviceBackLabel) + '"><img src="' + __p0Scope.icons.next + '" alt=""></button><h1 class="leai-page-title" id="leaiDeviceDetailTitle">' + (0,__p0Scope.escapeHtml)(device.name) + '</h1></div><p class="leai-page-desc">查看当前 Lenovo ID 下的资产关系、购买信息、官方保障与可用服务。</p></div><span class="leai-status-pill"><img src="' + __p0Scope.icons.check + '" alt="">' + (0,__p0Scope.escapeHtml)(device.service) + '</span></header>' +
      '<section class="leai-panel leai-device-detail-hero"><div class="leai-device-detail-visual"><img src="' + device.image + '" alt="' + (0,__p0Scope.escapeHtml)(device.name) + '"></div><div class="leai-device-detail-summary"><span>已绑定当前 Lenovo ID</span><h2>' + (0,__p0Scope.escapeHtml)(device.product) + '</h2><p>设备编号 ' + (0,__p0Scope.escapeHtml)(device.sn) + '</p><strong>' + (0,__p0Scope.escapeHtml)(device.warranty) + '</strong>' + (device.extensionEligible ? '<button class="leai-secondary" type="button" data-device-warranty="' + device.id + '">查看维保方案</button>' : '') + '</div></section>' +
      '<section class="leai-panel leai-device-detail-sections"><div><h2 class="leai-panel-title">设备资产信息</h2><dl class="leai-device-detail-list"><div><dt>产品型号</dt><dd>' + (0,__p0Scope.escapeHtml)(device.product) + '</dd></div><div><dt>设备编号</dt><dd>' + (0,__p0Scope.escapeHtml)(device.sn) + '</dd></div><div><dt>购买时间</dt><dd>' + (0,__p0Scope.escapeHtml)(device.purchased) + '</dd></div><div><dt>绑定关系</dt><dd>已绑定当前 Lenovo ID</dd></div></dl></div><div><h2 class="leai-panel-title">官方保障与服务</h2><dl class="leai-device-detail-list"><div><dt>保障信息</dt><dd>' + (0,__p0Scope.escapeHtml)(device.service) + '</dd></div><div><dt>基础保修</dt><dd>' + (0,__p0Scope.escapeHtml)(device.warranty.replace("基础保修至 ", "至 ")) + '</dd></div><div><dt>保障范围</dt><dd>以设备资产服务实时回执为准</dd></div><div><dt>可用服务</dt><dd>' + (device.extensionEligible ? "维保方案、官方维修与支持" : "官方维修与支持") + '</dd></div></dl></div></section>' +
      '<p class="leai-device-capability-note">联想乐享当前展示的是账号设备资产信息，不代表对设备实时硬件状态的检测结果。</p><p class="leai-member-disclaimer">当前为 Mock 设备数据，设备关系与保障信息以 Lenovo ID 设备资产服务实时结果为准。</p></section>';
  }); };
}
window.__p0Modules.dispatch(document.currentScript);
