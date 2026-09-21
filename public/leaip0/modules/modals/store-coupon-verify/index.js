/* 门店优惠券核销 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/store-coupon-verify"]) {
window.__p0Modules.installed["modals/store-coupon-verify"]=true;

/* Business: openCouponDetail */
window.__p0Modules.factories["modals/store-coupon-verify#openCouponDetail:10457444e89f7396815a3990"]=function(__p0Scope){"use strict";return (function openCouponDetail(index) {
            var titles = ["价值39元手机背膜免费贴", "指定笔记本满5000减200", "笔记本电脑免费清洁养护", "指定电脑配件满300减50", "旧机回收额外补贴200元", "指定笔记本购机赠双肩背包"];
            __p0Scope.couponMask.dataset.modalKind = "detail";
            __p0Scope.couponMask.innerHTML = '<div class="lx-appointment-dialog lx-coupon-dialog" role="dialog" aria-modal="true"><button class="lx-appointment-close" type="button" data-coupon-close aria-label="关闭">×</button><h2>优惠券详细说明</h2><div class="lx-coupon-dialog-copy"><p><b>' + titles[index || 0] + '</b></p><p><b>有效期至：</b>　2026-06-26 - 2026-07-31</p><p><b>使用说明：</b>　本优惠券限期使用，过期作废。领取后登录移动端会员中心“优惠券-官网使用”可查看适用商品。</p></div></div>';
            __p0Scope.couponMask.hidden = false;
          }); };

/* Business: couponBarcodeMarkup */
window.__p0Modules.factories["modals/store-coupon-verify#couponBarcodeMarkup:5a990834f335ee148deb01cf"]=function(__p0Scope){"use strict";return (function couponBarcodeMarkup() {
            var patterns = ["211232", "112331", "134111", "124112", "311123", "132311", "313121", "123122", "2331112"];
            var x = 10;
            var bars = "";
            patterns.forEach(function (pattern) {
              pattern.split("").forEach(function (unit, index) {
                var width = Number(unit);
                if (index % 2 === 0) bars += '<rect x="' + x + '" y="2" width="' + width + '" height="52" />';
                x += width;
              });
            });
            return '<svg class="lx-barcode-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (x + 10) + ' 58" role="img" aria-label="Code 128 券码 437984543848" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="currentColor">' + bars + '</g></svg>';
          }); };

/* Business: openCouponUse */
window.__p0Modules.factories["modals/store-coupon-verify#openCouponUse:c7670c2b30d8428c73a33f94"]=function(__p0Scope){"use strict";return (function openCouponUse(index, customTitle) {
            var title = customTitle || ["价值39元手机背膜免费贴", "指定笔记本满5000减200", "笔记本电脑免费清洁养护", "指定电脑配件满300减50", "旧机回收额外补贴200元", "指定笔记本购机赠双肩背包"][index || 0];
            __p0Scope.couponMask.dataset.modalKind = "redeem";
            var applicableStores = __p0Scope.stores.filter(function (store) { return store.city === __p0Scope.activeStore.city; }).slice(0, 2);
            __p0Scope.couponMask.innerHTML = '<div class="lx-appointment-dialog lx-coupon-dialog" role="dialog" aria-modal="true"><button class="lx-appointment-close" type="button" data-coupon-close aria-label="关闭">×</button><h2>优惠券券码</h2><div class="lx-coupon-code-head"><b>' + title + '</b><span>2026.07.31 24:00 过期</span></div><div class="lx-barcode">' + (0,__p0Scope.couponBarcodeMarkup)() + '</div><div class="lx-redeem-code">兑换码：437984543848</div><div class="lx-redeem-hint">请出示以上券码给联想门店工作人员</div><div class="lx-coupon-code-detail"><b>优惠券详细说明</b><span><b>使用说明：</b> 本优惠券限期使用，过期作废。</span><span><b>有效期至：</b> 2026.06.26 00:00 - 2026.07.31 24:00</span></div><div class="lx-coupon-applicable"><h3>适用门店</h3>' + applicableStores.map(function (store) { return '<div class="lx-coupon-store-row"><div><b>' + store.name + '</b><span>' + store.address + '</span><span>营业时间 ' + store.hours + '　电话 ' + store.phone + '</span></div><em>距离 ' + store.distance + '</em></div>'; }).join("") + '</div></div>';
            __p0Scope.couponMask.hidden = false;
          }); };
}
window.__p0Modules.dispatch(document.currentScript);
