(function () {
  const palette = {
    "#e2001a": "#3f78c5",
    "#ff7d00": "#3f9ead",
    "#ef4444": "#3f78c5",
    "#f97316": "#3f9ead",
    "#ff4d4f": "#3f78c5",
    "#fa8c16": "#3f9ead",
    "#dc2626": "#3f78c5",
    "#ea580c": "#3f9ead"
  };

  function mapColor(value) {
    if (typeof value !== "string") return value;
    const key = value.trim().toLowerCase();
    return palette[key] || value;
  }

  function mapOption(value) {
    if (!value || typeof value !== "object") return mapColor(value);
    if (Array.isArray(value)) return value.map(mapOption);
    if (value.constructor && value.constructor !== Object) return value;
    const next = {};
    Object.keys(value).forEach(key => {
      next[key] = mapOption(value[key]);
    });
    return next;
  }

  function patchEcharts() {
    if (!window.echarts || window.echarts.__leaiHtmlSkinPatched) return;
    const originalInit = window.echarts.init.bind(window.echarts);
    window.echarts.init = function patchedInit(dom, theme, opts) {
      const chart = originalInit(dom, theme, opts);
      if (!chart.__leaiHtmlSkinPatched) {
        const originalSetOption = chart.setOption.bind(chart);
        chart.setOption = function patchedSetOption(option, ...args) {
          const next = mapOption(option);
          if (next && typeof next === "object" && !Array.isArray(next) && !next.color) {
            next.color = ["#3f78c5", "#3f9ead", "#58a86a", "#c89532", "#9070c3", "#6f879e"];
          }
          return originalSetOption(next, ...args);
        };
        chart.__leaiHtmlSkinPatched = true;
      }
      return chart;
    };
    window.echarts.__leaiHtmlSkinPatched = true;
  }

  function patchBrand() {
    const brand = document.querySelector(".brand-lockup");
    if (!brand || brand.__leaiHtmlSkinPatched) return;
    const first = brand.querySelector("span:first-child");
    if (first) {
      first.setAttribute("aria-label", "联想乐享");
      first.setAttribute("title", "联想乐享");
    }
    brand.__leaiHtmlSkinPatched = true;
  }

  function routeTo(path) {
    const query = window.location.search || "";
    const target = `/admin-vue${path}${query}`;
    if (window.location.pathname + window.location.search === target) return;
    window.location.assign(target);
  }

  function patchNavigation() {
    const header = document.querySelector(".sidebar-header");
    if (header && !header.__leaiHomeNavPatched) {
      header.addEventListener("click", event => {
        if (event.target.closest(".sidebar-collapse-btn")) return;
        routeTo("/portal/home");
      });
      header.__leaiHomeNavPatched = true;
    }

    const breadcrumbHome = document.querySelector(".topbar-breadcrumb span:first-child");
    if (breadcrumbHome && !breadcrumbHome.__leaiHomeNavPatched) {
      breadcrumbHome.addEventListener("click", () => routeTo("/portal/home"));
      breadcrumbHome.setAttribute("title", "返回首页");
      breadcrumbHome.__leaiHomeNavPatched = true;
    }
  }

  function patchPocLog() {
    const list = document.querySelector(".poc-log-list");
    if (!list || list.__leaiHtmlSkinPatched) return;
    if (list.textContent.includes("Vue 架构套用 HTML 样式")) {
      list.__leaiHtmlSkinPatched = true;
      return;
    }
    const item = document.createElement("div");
    item.className = "poc-log-item";
    item.innerHTML = `
      <time>2026-06-26 12:58</time>
      <div>
        <b>Vue 架构套用 HTML 样式</b>
        <p>保留 /admin-vue/ Vue 工作台架构，追加 HTML 版工作台样式层，恢复原有 logo、左侧菜单排布、页面底色、卡片和图表低饱和配色体系；同步补回品牌区和面包屑返回首页的点击跳转逻辑。</p>
        <small>new 预览入口 / Vue 工作台 / HTML 样式规范</small>
      </div>
      <em>预览验证中</em>`;
    list.prepend(item);
    list.__leaiHtmlSkinPatched = true;
  }

  function tick() {
    patchEcharts();
    patchBrand();
    patchNavigation();
    patchPocLog();
  }

  document.addEventListener("DOMContentLoaded", tick);
  const timer = setInterval(tick, 200);
  setTimeout(() => clearInterval(timer), 5000);
})();
