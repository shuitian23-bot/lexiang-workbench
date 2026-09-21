/* 预约到店确认 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/store-appointment-confirm"]) {
window.__p0Modules.installed["modals/store-appointment-confirm"]=true;

/* Business: openAppointmentSummary */
window.__p0Modules.factories["modals/store-appointment-confirm#openAppointmentSummary:9948af90251a7b4f5de7cb61"]=function(__p0Scope){"use strict";return (function openAppointmentSummary(editMode) {
            if (typeof editMode === "boolean") __p0Scope.appointmentEditMode = editMode;
            var store = __p0Scope.stores.find(function (item) { return item.id === __p0Scope.appointment.storeId; }) || __p0Scope.activeStore;
            var title = __p0Scope.appointmentEditMode ? "修改/取消预约" : "预约到店";
            var subtitle = __p0Scope.appointmentEditMode ? "可修改预约信息并保存，或直接取消预约" : "请确认预约信息";
            var actions = __p0Scope.appointmentEditMode ? '<button class="lx-appointment-button" type="button" data-appointment-cancel>取消预约</button><button class="lx-appointment-button primary" type="button" data-appointment-confirm>保存修改</button>' : '<button class="lx-appointment-button primary" type="button" data-appointment-confirm>确认预约</button>';
            __p0Scope.appointmentMask.innerHTML = (0,__p0Scope.dialogShell)(title, subtitle, '<div class="lx-appointment-summary"><button class="lx-appointment-row" type="button" data-appointment-step="store"><b>预约门店</b><span>' + store.name + '</span><img data-poc-icon="global-next.svg" alt=""></button><button class="lx-appointment-row" type="button" data-appointment-step="time"><b>到店时间</b><span>' + __p0Scope.appointment.date + ' ' + __p0Scope.appointment.time + '</span><img data-poc-icon="global-next.svg" alt=""></button><button class="lx-appointment-row" type="button" data-appointment-step="purpose"><b>预约目的</b><span>' + __p0Scope.appointment.purpose + '</span><img data-poc-icon="global-next.svg" alt=""></button></div>', '<div class="lx-appointment-footer"><span class="lx-appointment-hint">' + (__p0Scope.appointmentEditMode ? '修改后请保存，取消预约将立即生效' : '您可修改预约信息完成预约') + '</span><div class="lx-appointment-actions">' + actions + '</div></div>');
            __p0Scope.appointmentMask.hidden = false;
            (0,__p0Scope.hydrateIcons)(__p0Scope.appointmentMask);
          }); };

/* Business: openAppointmentSuccess */
window.__p0Modules.factories["modals/store-appointment-confirm#openAppointmentSuccess:15b152ae368fe6383f36ac82"]=function(__p0Scope){"use strict";return (function openAppointmentSuccess(store) {
            __p0Scope.appointmentMask.innerHTML = (0,__p0Scope.dialogShell)("预约成功", "", '<div class="lx-appointment-success-store"><h3>' + store.name + '</h3><p>' + store.address + '</p></div><div class="lx-appointment-success-details"><div><span>预约编号</span><b>0001</b></div><div><span>到店时间</span><b>' + __p0Scope.appointment.date + ' ' + __p0Scope.appointment.time + '</b></div><div><span>预约目的</span><b>' + __p0Scope.appointment.purpose + '</b></div></div>', '<div class="lx-appointment-footer"><span class="lx-appointment-hint">您可提前联系门店：' + store.phone + '</span><div class="lx-appointment-actions"><button class="lx-appointment-button" type="button" data-appointment-edit>修改/取消预约</button><button class="lx-appointment-button primary" type="button" data-success-navigation>开始导航</button></div></div>');
            (0,__p0Scope.hydrateIcons)(__p0Scope.appointmentMask);
          }); };
}
window.__p0Modules.dispatch(document.currentScript);
