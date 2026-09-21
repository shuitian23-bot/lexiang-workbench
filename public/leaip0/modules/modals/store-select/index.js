/* 选择门店 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/store-select"]) {
window.__p0Modules.installed["modals/store-select"]=true;

/* Business: openAppointmentStoreStep */
window.__p0Modules.factories["modals/store-select#openAppointmentStoreStep:adc9fbcccdfde53248d88267"]=function(__p0Scope){"use strict";return (function openAppointmentStoreStep() {
            var currentAppointmentStore = __p0Scope.stores.find(function (store) { return store.id === __p0Scope.appointment.storeId; }) || __p0Scope.activeStore;
            var options = __p0Scope.stores.filter(function (store) { return store.sales && store.city === currentAppointmentStore.city; }).map(function (store) {
              return '<button class="lx-appointment-store-option' + (store.id === __p0Scope.appointment.storeId ? ' is-selected' : '') + '" type="button" data-appointment-store="' + store.id + '"><b>' + store.name + '</b><span>距离目的地 ' + store.distance + ' · ' + store.hours + '</span></button>';
            }).join("");
            __p0Scope.appointmentMask.innerHTML = (0,__p0Scope.dialogShell)("选择门店", "请选择销售门店", '<div class="lx-appointment-store-list">' + options + '</div>', '<div class="lx-appointment-footer"><span></span><div class="lx-appointment-actions"><button class="lx-appointment-button" type="button" data-appointment-back>返回</button><button class="lx-appointment-button primary" type="button" data-appointment-apply>确认</button></div></div>');
          }); };
}
window.__p0Modules.dispatch(document.currentScript);
