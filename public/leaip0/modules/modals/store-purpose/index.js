/* 门店预约目的 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/store-purpose"]) {
window.__p0Modules.installed["modals/store-purpose"]=true;

/* Business: openAppointmentPurposeStep */
window.__p0Modules.factories["modals/store-purpose#openAppointmentPurposeStep:8d4342834fc03bfed10df3ae"]=function(__p0Scope){"use strict";return (function openAppointmentPurposeStep() {
            __p0Scope.appointmentMask.innerHTML = (0,__p0Scope.dialogShell)("预约目的", "请填写具体需求", '<textarea class="lx-purpose-input" data-appointment-purpose maxlength="80">' + __p0Scope.appointment.purpose + '</textarea>', '<div class="lx-appointment-footer"><span class="lx-appointment-hint">最多输入 80 个字</span><div class="lx-appointment-actions"><button class="lx-appointment-button" type="button" data-appointment-back>返回</button><button class="lx-appointment-button primary" type="button" data-appointment-apply>确认</button></div></div>');
          }); };
}
window.__p0Modules.dispatch(document.currentScript);
