/* 到店时间 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/arrival-time"]) {
window.__p0Modules.installed["modals/arrival-time"]=true;

/* Business: openAppointmentTimeStep */
window.__p0Modules.factories["modals/arrival-time#openAppointmentTimeStep:c0a2cc45bd432af8322e60e6"]=function(__p0Scope){"use strict";return (function openAppointmentTimeStep() {
            var dates = [["周三", "8.12", "2026-08-12"], ["周四", "8.13", "2026-08-13"], ["周五", "8.14", "2026-08-14"], ["周六", "8.15", "2026-08-15"], ["周日", "8.16", "2026-08-16"], ["周一", "8.17", "2026-08-17"], ["周二", "8.18", "2026-08-18"]];
            var times = ["18:00", "19:00", "20:00", "21:00"];
            __p0Scope.appointmentMask.innerHTML = (0,__p0Scope.dialogShell)("到店时间", "请选择到店时间", '<div class="lx-date-grid">' + dates.map(function (date) { return '<button class="lx-date-option' + (date[2] === __p0Scope.appointment.date ? ' is-selected' : '') + '" type="button" data-appointment-date="' + date[2] + '" data-date-label="' + date[0] + ' ' + date[1] + '"><b>' + date[0] + '</b><span>' + date[1] + '</span></button>'; }).join("") + '</div><div class="lx-time-grid">' + times.map(function (time) { return '<button class="lx-time-option' + (time === __p0Scope.appointment.time ? ' is-selected' : '') + '" type="button" data-appointment-time="' + time + '">' + time + '</button>'; }).join("") + '</div>', '<div class="lx-appointment-footer"><span></span><div class="lx-appointment-actions"><button class="lx-appointment-button" type="button" data-appointment-back>返回</button><button class="lx-appointment-button primary" type="button" data-appointment-apply>确认</button></div></div>');
          }); };
}
window.__p0Modules.dispatch(document.currentScript);
