/* 最普通的 toast — P0 business implementations. */
if (!window.__p0Modules.installed["modals/toast"]) {
window.__p0Modules.installed["modals/toast"]=true;

/* public/leaip0/assets/frontend/js/core/notification-toast-v1.js */
window.__p0Modules.sources["u20c3cef677d1a7ca"]=function(){
/* Shared P0 action feedback: brand card, concise heading and dismiss control. */
(function (root) {
  'use strict';
  if (root.__lxToast?.version === 3) return;
  root.__lxToast?.dismiss?.();
  // 乐享轻提示暂时停用；需要恢复时，将此默认开关改为 true。
  const DEFAULT_ENABLED = false;
  let enabled = DEFAULT_ENABLED;
  let toast = null;
  let remaining = 0;
  let startedAt = 0;
  let hovered = false;

  function describe(message) {
    const text = String(message || '');
    const rules = [
      [/正在上传/, '正在上传', 'info'],
      [/正在加载订单|正在准备商品与下单/, '正在加载', 'info'],
      [/正在打开/, '正在打开', 'info'],
      [/连接较慢|功能暂未加载完成/, '加载暂未完成', 'error'],
      [/上传失败|上传.*(?:异常|错误)/, '上传失败', 'error'],
      [/复制失败/, '复制失败', 'error'],
      [/门店.*(?:无法|失败)/, '门店加载失败', 'error'],
      [/订单.*加载失败|下单服务.*未就绪/, '订单加载失败', 'error'],
      [/待支付订单已失效/, '订单已失效', 'error'],
      [/商品.*(?:无法|不可用|不完整|获取失败|读取失败)|无法.*商品|商品数据服务未准备好|未找到该商品|商品图片地址无效/, '商品暂不可用', 'error'],
      [/方案.*(?:不可用|失败)|配置.*(?:未准备好|无法读取)/, '信息加载失败', 'error'],
      [/未找到对应资料|推荐的清单已过期|对应的.*已关闭/, '内容暂不可用', 'error'],
      [/找不到该订单/, '未找到订单', 'error'],
      [/失败|异常|错误/, '操作未完成', 'error'],
      [/请填写|请勾选|请选择行业/, '请完善信息', 'info'],
      [/该权益已兑换/, '权益已兑换', 'info'],
      [/积分不足/, '积分不足', 'info'],
      [/已在对比清单|已在引用列表/, '请勿重复添加', 'info'],
      [/最多对比|最多引用/, '已达数量上限', 'info'],
      [/超出列表范围|当前列表只有/, '请检查商品序号', 'info'],
      [/请至少选择.*对比|没有可对比|暂无可对比/, '请确认对比商品', 'info'],
      [/请先选择|请先打开|没说要打开|没有明确的推荐|当前没有可选|请选择具体商品|未能确定所选商品/, '请先选择商品', 'info'],
      [/商品配置已变化/, '请重新选择配置', 'info'],
      [/国补资格将在结算时核验/, '国补资格待核验', 'info'],
      [/请在地址管理/, '请前往地址管理', 'info'],
      [/暂不支持/, '暂不支持此操作', 'info'],
      [/验证码.*发送|发送验证码/, '验证码已发送', 'success'],
      [/认证.*通过|实名认证成功/, '认证通过', 'success'],
      [/认证状态确认中|认证.*(?:提交|审核)/, '认证审核中', 'info'],
      [/已重置.*认证/, '认证已重置', 'success'],
      [/已复制回答/, '复制成功', 'success'],
      [/已记录：/, '反馈已收到', 'success'],
      [/上传成功/, '上传成功', 'success'],
      [/下单成功|订单已生成/, '订单已生成', 'success'],
      [/已加入购物车/, '已加入购物车', 'success'],
      [/已加入对比/, '已加入对比', 'success'],
      [/对比清单已清空/, '对比清单已清空', 'success'],
      [/已引用/, '引用成功', 'success'],
      [/已加入优惠券包|已为你领取国补/, '优惠领取成功', 'success'],
      [/已兑换：/, '兑换成功', 'success'],
      [/已保存/, '保存成功', 'success'],
      [/延时开票日期已选择/, '开票日期已选择', 'success'],
      [/留资成功.*下载/, '下载已开始', 'success'],
      [/信息已提交/, '提交成功', 'success'],
      [/已退出登录/, '已退出登录', 'success'],
      [/已新建对话/, '已新建对话', 'success'],
      [/已关闭/, '页面已关闭', 'success'],
      [/当前没有其他标签/, '没有其他页面', 'info'],
      [/已切换/, '切换成功', 'success'],
      [/已为你打开/, '页面已打开', 'success'],
    ];
    const match = rules.find(([pattern]) => pattern.test(text));
    return match ? { title: match[1], kind: match[2] } : { title: '操作提示', kind: 'info' };
  }

  function pause() {
    if (!toast?._timer) return;
    clearTimeout(toast._timer);
    toast._timer = null;
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
  }

  function dismiss() {
    if (!toast) return;
    clearTimeout(toast._timer);
    toast._timer = null;
    remaining = 0;
    toast.classList.remove('show');
    toast.inert = true;
    toast.setAttribute('aria-hidden', 'true');
  }

  function setEnabled(value) {
    enabled = value === true;
    document.documentElement.setAttribute('data-lx-light-toast-enabled', String(enabled));
    if (!enabled) {
      dismiss();
      document.querySelectorAll('.lx-p0-toast').forEach((node) => {
        clearTimeout(node._timer);
        node._timer = null;
        node.classList.remove('show');
        node.inert = true;
        node.setAttribute('aria-hidden', 'true');
      });
    }
    return enabled;
  }

  function resume() {
    if (!toast?.isConnected || !toast.classList.contains('show') || toast._timer || hovered || toast.contains(document.activeElement) || remaining <= 0) return;
    startedAt = Date.now();
    toast._timer = setTimeout(dismiss, remaining);
  }

  function create() {
    const node = document.createElement('div');
    node.className = 'lx-p0-toast';
    node.innerHTML = '<div class="lx-toast-copy" aria-atomic="true"><div class="lx-toast-title"></div><div class="lx-toast-message"></div></div><button class="lx-toast-close" type="button" aria-label="关闭提示"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 5 10 10M15 5 5 15"/></svg></button>';
    node.querySelector('.lx-toast-close').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const returnFocus = node._returnFocus;
      const restoreFocus = node.contains(document.activeElement);
      dismiss();
      if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
    node.addEventListener('pointerdown', (event) => event.stopPropagation());
    node.addEventListener('click', (event) => event.stopPropagation());
    node.addEventListener('mouseenter', () => { hovered = true; pause(); });
    node.addEventListener('mouseleave', () => { hovered = false; resume(); });
    node.addEventListener('focusin', pause);
    node.addEventListener('focusout', () => queueMicrotask(resume));
    return node;
  }

  function show(message, options = {}) {
    if (!enabled) return;
    const text = String(message || '').trim();
    // Referenced products are already visible in the composer; keep every caller silent.
    if (!text || text === '已引用商品，直接提问即可') return;
    const info = describe(text);
    if (!toast?.isConnected) {
      document.querySelectorAll('.lx-p0-toast').forEach((old) => { clearTimeout(old._timer); old.remove(); });
      toast = create();
      document.body.appendChild(toast);
      hovered = false;
    }
    clearTimeout(toast._timer);
    toast._timer = null;
    toast.id = options.id || 'lx-notification-toast';
    toast._returnFocus = toast.contains(document.activeElement) ? toast._returnFocus : document.activeElement;
    const copy = toast.querySelector('.lx-toast-copy');
    const kind = options.kind || info.kind;
    copy.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    copy.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
    toast.querySelector('.lx-toast-title').textContent = options.title || info.title;
    toast.querySelector('.lx-toast-message').textContent = text;
    toast.querySelector('.lx-toast-retry')?.remove();
    if (typeof options.retry === 'function') {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'lx-toast-retry';
      retry.textContent = '重试';
      retry.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); options.retry(); });
      toast.appendChild(retry);
    }
    toast.classList.toggle('is-centered', !!options.centered);
    toast.inert = false;
    toast.removeAttribute('aria-hidden');
    toast.classList.add('show');
    remaining = typeof options.duration === 'number' ? Math.max(0, options.duration) : 2400;
    resume();
    return toast;
  }

  root.__lxToast = { version: 3, show, dismiss, describe, setEnabled, get enabled() { return enabled; } };
  setEnabled(DEFAULT_ENABLED);
})(window);

};
}
window.__p0Modules.dispatch(document.currentScript);
