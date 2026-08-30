(function () {
  "use strict";

  var styleId = "lx-scanpay-button-standard-v101-style";
  if (document.getElementById(styleId)) return;

  var style = document.createElement("style");
  style.id = styleId;
  style.textContent = [
    ".lx-p0-modal .lx-scanpay-skin .sp-confirm,",
    ".lx-p0-modal .lx-scanpay-skin .sp-confirm.lx-p0-btn.primary{",
    "border:0!important;",
    "background:linear-gradient(90deg,#4d144a 11.9%,#b8252e 100%)!important;",
    "color:#fff!important;",
    "box-shadow:none!important;",
    "filter:none!important;",
    "}",
    ".lx-p0-modal .lx-scanpay-skin .sp-confirm:hover,",
    ".lx-p0-modal .lx-scanpay-skin .sp-confirm:active{",
    "background:linear-gradient(90deg,#4d144a 11.9%,#b8252e 100%)!important;",
    "box-shadow:none!important;",
    "filter:none!important;",
    "transform:none!important;",
    "}",
    ".lx-p0-modal .lx-scanpay-skin .sp-confirm:focus-visible{",
    "outline:2px solid #76216d!important;",
    "outline-offset:3px!important;",
    "}",
  ].join("");

  (document.head || document.documentElement).appendChild(style);
})();
