/* 捆绑设备 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/device-bind"]) {
window.__p0Modules.installed["modals/device-bind"]=true;

/* Business: completePurchasedDeviceBindTransition */
window.__p0Modules.factories["modals/device-bind#completePurchasedDeviceBindTransition:0360ede52ebd7b888014bff3"]=function(__p0Scope){"use strict";return (function completePurchasedDeviceBindTransition() {
    if (__p0Scope.state.pendingDeviceBound) return;
    __p0Scope.state.pendingDeviceBound = true;
    __p0Scope.state.recentDeviceId = __p0Scope.pendingPurchasedDevice.id;
    __p0Scope.deviceCatalog[__p0Scope.pendingPurchasedDevice.id] = Object.assign({}, __p0Scope.pendingPurchasedDevice);
    (0,__p0Scope.refreshRightView)();
  }); };

/* Business: runPurchasedDeviceBind */
window.__p0Modules.factories["modals/device-bind#runPurchasedDeviceBind:01401bd39d188c5c51968329"]=function(__p0Scope){"use strict";return (async function runPurchasedDeviceBind(button) {
    if (__p0Scope.state.pendingDeviceBound || button.disabled) return;
    button.disabled = true;
    button.textContent = "正在调用 Skill";
    var bindDevice = { id: __p0Scope.pendingPurchasedDevice.id, name: __p0Scope.pendingPurchasedDevice.name, product: __p0Scope.pendingPurchasedDevice.product, sn: __p0Scope.pendingPurchasedDevice.sn };
    if (typeof window.__lxSubmitDeviceActionQuery === "function") {
      window.__lxSubmitDeviceActionQuery("bind", "一键绑定小新 Pro 16", bindDevice);
      window.setTimeout(function () {
        if (!__p0Scope.state.pendingDeviceBound) (0,__p0Scope.completePurchasedDeviceBindTransition)();
      }, 2000);
      return;
    }
    var task = (0,__p0Scope.taskEnvelope)("device-bind-purchased", { deviceId: __p0Scope.pendingPurchasedDevice.id, source: "recognized-order" });
    document.body.dataset.activeRequest = task.requestId;
    (0,__p0Scope.enterChat)();
    var turn = (0,__p0Scope.appendTurn)("绑定刚购买的小新 Pro 16");
    turn.dataset.requestId = task.requestId;
    await (0,__p0Scope.nextFrame)();
    turn.scrollIntoView({ behavior: (0,__p0Scope.prefersReduced)() ? "auto" : "smooth", block: "start" });
    await (0,__p0Scope.streamAnswer)(turn, '<p>设备资产服务已返回成功回执。<strong>小新 Pro 16 已完成绑定</strong>，已加入你的设备列表。</p>');
    (0,__p0Scope.appendTrace)(turn, "已收到设备资产服务绑定回执");
    (0,__p0Scope.appendDisclaimer)(turn);
    __p0Scope.state.pendingDeviceBound = true;
    __p0Scope.state.recentDeviceId = __p0Scope.pendingPurchasedDevice.id;
    __p0Scope.deviceCatalog[__p0Scope.pendingPurchasedDevice.id] = Object.assign({}, __p0Scope.pendingPurchasedDevice);
    task.state = "success";
    (0,__p0Scope.refreshRightView)();
  }); };

/* Business: runAddDeviceTask */
window.__p0Modules.factories["modals/device-bind#runAddDeviceTask:b1ed2c41fd2ba8dd07009321"]=function(__p0Scope){"use strict";return (async function runAddDeviceTask() {
    if (__p0Scope.embeddedHost && typeof window.__lxRunNewDeviceBindTask === "function") {
      await window.__lxRunNewDeviceBindTask();
      return;
    }
    var task = (0,__p0Scope.taskEnvelope)("device-bind-new", { source: "member-device-center" });
    document.body.dataset.activeRequest = task.requestId;
    (0,__p0Scope.enterChat)();
    var turn = (0,__p0Scope.appendTurn)("绑定一台新设备");
    turn.dataset.requestId = task.requestId;
    await (0,__p0Scope.nextFrame)();
    turn.scrollIntoView({ behavior: (0,__p0Scope.prefersReduced)() ? "auto" : "smooth", block: "start" });
    await (0,__p0Scope.streamAnswer)(turn, '<p>可以绑定新设备。请准备<strong>设备序列号（SN）</strong>和便于识别的设备名称，提交时会由设备资产服务校验归属关系。</p>');
    (0,__p0Scope.appendTrace)(turn, "已完成登录与设备绑定资格校验");
    turn.insertAdjacentHTML("beforeend", (0,__p0Scope.actionCard)("modal:deviceBind", "填写设备信息", "SN、设备名称与购买渠道"));
    (0,__p0Scope.appendDisclaimer)(turn);
    task.state = "ready_to_confirm";
  }); };

/* Business: submitDeviceBindModal */
window.__p0Modules.factories["modals/device-bind#submitDeviceBindModal:653a761139f8012a56e3a4d3"]=function(__p0Scope){"use strict";return (async function submitDeviceBindModal(trigger) {
    var sn = (0,__p0Scope.el)("#leaiField0").value.trim();
    var name = (0,__p0Scope.el)("#leaiField1").value.trim();
    var channel = (0,__p0Scope.el)("#leaiField2").value;
    (0,__p0Scope.closeModal)();
    var cardTitle = trigger && trigger.querySelector(".leai-card-title");
    var cardDescription = trigger && trigger.querySelector(".leai-card-desc");
    if (cardTitle && cardDescription) {
      trigger.disabled = true;
      cardTitle.textContent = "已提交设备绑定";
      cardDescription.textContent = name + " · 正在同步到我的设备";
    }
    var id = "manual" + __p0Scope.state.requestSequence;
    __p0Scope.deviceCatalog[id] = {
      id: id,
      name: name,
      product: name,
      sn: sn.slice(0, 4) + "****",
      image: "/assets/img/thinkpad.jpg",
      warranty: "保障状态待同步",
      purchased: "来自" + channel,
      service: "已绑定"
    };
    __p0Scope.state.recentDeviceId = id;
    if (__p0Scope.embeddedHost && typeof window.__lxCompleteDeviceBindFromMember === "function") {
      await window.__lxCompleteDeviceBindFromMember({ name: name, sn: sn.slice(0, 4) + "****", channel: channel });
    } else if (!__p0Scope.embeddedHost) {
      var turn = (0,__p0Scope.appendTurn)("确认绑定" + name);
      await (0,__p0Scope.streamAnswer)(turn, '<p>设备资产服务已返回成功回执。<strong>新设备已绑定</strong>：' + (0,__p0Scope.escapeHtml)(name) + '，已同步到右侧“我的设备”。</p>');
      (0,__p0Scope.appendTrace)(turn, "已收到设备资产服务绑定回执");
      (0,__p0Scope.appendDisclaimer)(turn);
    }
    (0,__p0Scope.openRightView)("devices");
  }); };
}
window.__p0Modules.dispatch(document.currentScript);
