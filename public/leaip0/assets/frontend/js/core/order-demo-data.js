(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OrderDemoData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SERVICE_NOTICE = '此商品交付请查看商品详情页面服务说明为准，如有疑问可点击产品页下方在线客服咨询';
  var DEFAULT_RECIPIENT = {
    name: '王小明',
    phone: '181 0102 4147',
    address: '北京市海淀区上地西路 6 号联想北研大厦'
  };
  var DEFAULT_INVOICE = {
    type: '电子普通发票',
    title: '个人',
    taxpayerId: '不适用',
    content: '商品明细'
  };
  var DEFAULT_STORE = {
    method: '到店自提',
    name: '联想来酷智生活北京五彩城店',
    phone: '010-6291 8888',
    address: '北京市海淀区清河中街 68 号五彩城购物中心一层',
    hours: '10:00–22:00'
  };
  var PHYSICAL_STEPS = ['已下单', '仓库处理中', '已揽收', '运输中', '派送中', '已签收'];

  var products = {
    yoga: {
      name: 'YOGA Air 14 Aura AI 元启版',
      description: '酷睿 Ultra 7｜32GB｜1TB｜月光白',
      image: '/assets/img/shop-1.jpg',
      price: 7499
    },
    legion: {
      name: '拯救者 Y9000P 2026',
      description: '酷睿 Ultra 9｜RTX 5070｜冰魄白',
      image: '/assets/img/shop-2.jpg',
      price: 12999
    },
    thinkpad: {
      name: 'ThinkPad X1 Carbon Aura',
      description: '14 英寸商务旗舰｜32GB｜1TB',
      image: '/assets/img/shop-3.jpg',
      price: 10999
    },
    tablet: {
      name: '小新 Pad Pro 12.7',
      description: '3K 高刷屏｜12GB｜256GB｜深空灰',
      image: '/assets/img/shop-4.jpg',
      price: 2199
    },
    service: {
      name: '联想延长保修服务 2 年',
      description: '适用于指定笔记本｜电子服务凭证',
      image: '/assets/img/shop-5.jpg',
      price: 399
    },
    install: {
      name: '联想上门安装与数据迁移',
      description: '工程师上门｜系统设置｜数据迁移',
      image: '/assets/img/shop-6.jpg',
      price: 299
    },
    recharge: {
      name: '联想乐豆充值卡 500 元',
      description: '充值后可用于乐享商城指定商品',
      image: '/assets/img/shop-7.jpg',
      price: 500
    },
    option: {
      name: '联想小新 Air 蓝牙无线鼠标',
      description: '蓝牙 5.0｜轻音按键｜云墨灰',
      image: '/assets/img/shop-8.jpg',
      price: 99
    },
    customization: {
      name: 'A 面喷绘 · 仲夏星月',
      description: '个性化图案｜专属定制｜随主机交付',
      image: '/assets/img/shop-9.jpg',
      price: 69
    },
    gift: {
      name: '联想都市简约双肩包',
      description: '随主品赠送｜深空灰｜数量有限',
      image: '/assets/img/shop-10.jpg',
      price: 0
    },
    beanLaptop: {
      name: 'ThinkBook 15p 英特尔酷睿版',
      description: '酷睿 i5｜16GB｜512GB｜深空灰',
      image: '/assets/img/shop-11.jpg',
      price: 6499
    }
  };

  function item(product, quantity, role, beans) {
    return {
      role: role || '',
      name: product.name,
      description: product.description,
      image: product.image,
      quantity: quantity || 1,
      amount: product.price * (quantity || 1),
      beans: Number(beans || 0)
    };
  }

  function payment(goods, freight, discount, actual) {
    var payable = goods + freight - discount;
    return {
      goods: goods,
      freight: freight,
      discount: discount,
      payable: payable,
      actual: typeof actual === 'number' ? actual : payable
    };
  }

  function timeline(labels, currentIndex, times, canceled) {
    return labels.map(function (label, index) {
      var state = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
      if (canceled && index > 0) state = 'upcoming';
      return {
        label: label,
        state: state,
        time: times[index] || ''
      };
    });
  }

  function trackingPackage(name, company, number, progress, route) {
    return {
      name: name,
      company: company,
      number: number,
      progress: progress,
      route: route,
      steps: PHYSICAL_STEPS.map(function (label, index) {
        return {
          label: label,
          state: index < progress ? 'complete' : index === progress ? 'current' : 'upcoming',
          time: index <= progress ? '2026-08-' + String(14 + index).padStart(2, '0') + ' ' + String(9 + index).padStart(2, '0') + ':20:18' : ''
        };
      })
    };
  }

  function normalOrder(config) {
    var labels = ['提交订单', '支付成功', '等待收货', '交易完成'];
    var times = [config.createdAt, config.paidAt || '', config.receivedAt || '', config.completedAt || ''];
    return Object.assign({
      type: 'normal',
      typeLabel: '普通订单',
      paymentMethod: config.paidAt ? '支付宝' : '待支付',
      items: [item(config.product || products.yoga, config.quantity || 1)],
      recipient: DEFAULT_RECIPIENT,
      invoice: DEFAULT_INVOICE,
      remark: '工作日送货，配送前请电话联系。',
      expectedDelivery: '2026-08-21 18:00:00',
      shipping: {
        mode: 'physical',
        packages: config.packages || [trackingPackage('包裹 1', '顺丰速运', 'SF1495827362014', config.shippingProgress == null ? 3 : config.shippingProgress, ['北京仓', '济南中转场', '北京海淀'])]
      }
    }, config, {
      timeline: timeline(labels, config.currentIndex, times, config.status === '已取消')
    });
  }

  function serviceOrder(config) {
    var labels = ['提交订单', '支付成功', '服务中', '服务完成'];
    var times = [config.createdAt, config.paidAt || '', config.serviceAt || '', config.completedAt || ''];
    return Object.assign({
      type: 'service',
      typeLabel: '服务订单',
      paymentMethod: config.paidAt ? '微信支付' : '待支付',
      items: [item(config.product || products.service, 1)],
      recipient: DEFAULT_RECIPIENT,
      invoice: DEFAULT_INVOICE,
      remark: '请安排在周六上午联系。',
      shipping: { mode: 'notice', notice: SERVICE_NOTICE }
    }, config, {
      timeline: timeline(labels, config.currentIndex, times, config.status === '已取消')
    });
  }

  function basePaymentFor(product, actual) {
    return payment(product.price, 0, 0, actual);
  }

  var orders = [
    normalOrder({
      id: '300000101', status: '待付款', createdAt: '2026-08-18 09:12:36', currentIndex: 0,
      countdownTarget: '2026-08-19T23:59:00+08:00', product: products.yoga,
      payment: basePaymentFor(products.yoga, 0)
    }),
    normalOrder({
      id: '300000102', status: '待发货', createdAt: '2026-08-17 14:26:08', paidAt: '2026-08-17 14:28:19', currentIndex: 1,
      product: products.legion, payment: payment(12999, 0, 500, 12499), shippingProgress: 1
    }),
    normalOrder({
      id: '300000103', status: '待收货', createdAt: '2026-08-15 10:03:42', paidAt: '2026-08-15 10:05:11', receivedAt: '2026-08-16 19:42:07', currentIndex: 2,
      product: products.thinkpad, payment: payment(10999, 0, 300, 10699),
      packages: [
        trackingPackage('包裹 1 · 电脑主机', '顺丰速运', 'SF1495827362014', 4, ['北京仓', '济南中转场', '北京海淀']),
        trackingPackage('包裹 2 · 配件赠品', '京东物流', 'JDVA00372958102', 3, ['上海仓', '天津分拣中心', '北京海淀'])
      ]
    }),
    normalOrder({
      id: '300000104', status: '交易完成', createdAt: '2026-08-09 16:18:25', paidAt: '2026-08-09 16:20:02', receivedAt: '2026-08-11 10:13:44', completedAt: '2026-08-12 18:06:19', currentIndex: 3,
      product: products.tablet, payment: payment(2199, 0, 200, 1999), shippingProgress: 5
    }),
    normalOrder({
      id: '300000105', status: '已取消', createdAt: '2026-08-12 11:07:59', currentIndex: 0,
      product: products.yoga, payment: basePaymentFor(products.yoga, 0), remark: '订单已由用户取消。'
    }),
    normalOrder({
      id: '300000106', status: '待发货', createdAt: '2026-08-18 08:33:15', paidAt: '2026-08-18 08:36:02', currentIndex: 1,
      product: products.yoga, payment: payment(7499, 0, 0, 7499), isExchange: true,
      remark: '原订单商品换货，新商品将优先发出。'
    }),
    normalOrder({
      id: '300000107', status: '待收货', createdAt: '2026-08-18 16:20:00', paidAt: '2026-08-18 16:22:18', receivedAt: '2026-08-20 10:18:36', currentIndex: 2,
      items: [item(products.yoga, 1, '主品'), item(products.option, 1, '选件')],
      payment: payment(7598, 0, 99, 7499),
      packages: [
        trackingPackage('包裹 1 · YOGA Air 14', '顺丰速运', 'SF1495827362107', 4, ['北京仓', '济南中转场', '北京海淀']),
        trackingPackage('包裹 2 · 蓝牙无线鼠标', '京东物流', 'JDVA00372958107', 3, ['上海仓', '天津分拣中心', '北京海淀'])
      ],
      remark: '主品与选件可能分包裹送达。'
    }),
    normalOrder({
      id: '300000108', status: '待发货', createdAt: '2026-08-18 17:02:11', paidAt: '2026-08-18 17:04:26', currentIndex: 1,
      items: [item(products.legion, 1, '主品'), item(products.service, 1, '服务')],
      payment: payment(13398, 0, 399, 12999),
      packages: [trackingPackage('包裹 1 · 拯救者 Y9000P', '顺丰速运', 'SF1495827362108', 1, ['北京仓', '济南中转场', '北京海淀'])],
      remark: '延长保修服务不单独生成物流包裹。'
    }),
    normalOrder({
      id: '300000109', status: '待发货', createdAt: '2026-08-18 17:16:45', paidAt: '2026-08-18 17:18:02', currentIndex: 1,
      items: [item(products.thinkpad, 1, '主品'), item(products.customization, 1, '私定')],
      payment: payment(11068, 0, 69, 10999),
      packages: [trackingPackage('包裹 1 · ThinkPad 私定版', '顺丰速运', 'SF1495827362109', 1, ['深圳仓', '武汉中转场', '北京海淀'])],
      remark: '私定图案将随主品制作并一同交付。'
    }),
    normalOrder({
      id: '300000110', status: '待收货', createdAt: '2026-08-18 17:31:08', paidAt: '2026-08-18 17:32:41', receivedAt: '2026-08-20 12:06:12', currentIndex: 2,
      items: [item(products.tablet, 1, '主品'), item(products.gift, 1, '赠品')],
      payment: payment(2199, 0, 0, 2199),
      packages: [trackingPackage('包裹 1 · 小新 Pad Pro 与赠品', '京东物流', 'JDVA00372958110', 4, ['上海仓', '天津分拣中心', '北京海淀'])],
      remark: '赠品随主品一同发出，不单独计价。'
    }),
    normalOrder({
      id: '300000111', status: '待付款', createdAt: '2026-08-18 18:06:33', currentIndex: 0,
      countdownTarget: '2026-08-19T23:59:00+08:00', isBeanRedemption: true,
      paymentMethod: '在线支付 + 乐豆',
      items: [item(products.beanLaptop, 1, '', 200)],
      payment: Object.assign(payment(6499, 0, 0, 0), { beans: 200 }),
      remark: '订单使用 200 乐豆抵扣，请在倒计时结束前完成现金部分支付。'
    }),
    serviceOrder({
      id: '300000201', status: '待付款', createdAt: '2026-08-18 11:18:20', currentIndex: 0,
      countdownTarget: '2026-08-19T23:59:00+08:00', payment: basePaymentFor(products.service, 0)
    }),
    serviceOrder({
      id: '300000202', status: '待服务', createdAt: '2026-08-17 09:05:31', paidAt: '2026-08-17 09:06:02', currentIndex: 1,
      product: products.install, payment: basePaymentFor(products.install, 299)
    }),
    serviceOrder({
      id: '300000203', status: '服务中', createdAt: '2026-08-16 13:11:44', paidAt: '2026-08-16 13:12:07', serviceAt: '2026-08-18 10:00:00', currentIndex: 2,
      product: products.install, payment: basePaymentFor(products.install, 299)
    }),
    serviceOrder({
      id: '300000204', status: '服务完成', createdAt: '2026-08-10 12:20:19', paidAt: '2026-08-10 12:21:06', serviceAt: '2026-08-12 09:30:00', completedAt: '2026-08-12 11:48:32', currentIndex: 3,
      payment: basePaymentFor(products.service, 399)
    }),
    serviceOrder({
      id: '300000205', status: '已取消', createdAt: '2026-08-11 08:20:10', currentIndex: 0,
      payment: basePaymentFor(products.service, 0), remark: '服务预约已取消。'
    }),
    {
      id: '300000301', type: 'presale', typeLabel: '预售订单', status: '待付定金',
      createdAt: '2026-08-18 00:00:00', paidAt: '', paymentMethod: '待支付', currentIndex: 0,
      countdownTarget: '2026-08-18T23:59:00+08:00', expectedDelivery: '2026-09-12 18:00:00',
      items: [item(products.legion, 1)], recipient: DEFAULT_RECIPIENT, invoice: DEFAULT_INVOICE,
      remark: '预售商品按尾款支付顺序发货。', payment: payment(12999, 0, 900, 0),
      presale: { deposit: 500, tailAmount: '待公布', tailPaymentAt: '2026-09-01 00:00:00' },
      timeline: timeline(['提交订单', '支付成功', '等待收货', '交易完成'], 0, ['2026-08-18 00:00:00', '', '', '']),
      shipping: { mode: 'physical', packages: [trackingPackage('包裹 1', '顺丰速运', '待生成', 0, ['预售准备中', '待出库', '待收货'])] }
    },
    {
      id: '300000302', type: 'presale', typeLabel: '预售订单', status: '待付尾款',
      createdAt: '2026-08-12 00:00:00', paidAt: '2026-08-12 00:02:31', paymentMethod: '支付宝', currentIndex: 0,
      countdownTarget: '2026-09-03T23:59:00+08:00', expectedDelivery: '2026-09-12 18:00:00',
      items: [item(products.legion, 1)], recipient: DEFAULT_RECIPIENT, invoice: DEFAULT_INVOICE,
      remark: '已支付定金，尾款开放后请及时完成支付。', payment: payment(12999, 0, 900, 500),
      presale: { deposit: 500, tailAmount: 11599, tailPaymentAt: '2026-09-01 00:00:00' },
      timeline: timeline(['提交订单', '支付成功', '等待收货', '交易完成'], 0, ['2026-08-12 00:00:00', '', '', '']),
      shipping: { mode: 'physical', packages: [trackingPackage('包裹 1', '顺丰速运', '待生成', 0, ['预售准备中', '待出库', '待收货'])] }
    },
    {
      id: '300000401', type: 'recharge', typeLabel: '充值订单', status: '交易完成',
      createdAt: '2026-08-13 17:42:06', paidAt: '2026-08-13 17:42:49', paymentMethod: '微信支付', currentIndex: 3,
      items: [item(products.recharge, 1)], recipient: DEFAULT_RECIPIENT,
      invoice: { text: '不开发票' }, remark: '卡密仅限充值账号本人使用。', payment: basePaymentFor(products.recharge, 500),
      recharge: { account: '18101024147', cardNumber: 'LX5A-9M2P-6Q8K', cardSecret: '7N4R-2W9X' },
      timeline: timeline(['提交订单', '支付成功', '等待收货', '交易完成'], 3, ['2026-08-13 17:42:06', '2026-08-13 17:42:49', '2026-08-13 17:43:08', '2026-08-13 17:43:22']),
      shipping: { mode: 'notice', notice: SERVICE_NOTICE }
    },
    {
      id: '300000402', type: 'recharge', typeLabel: '充值订单', status: '待发货',
      createdAt: '2026-08-18 13:03:12', paidAt: '2026-08-18 13:04:01', paymentMethod: '支付宝', currentIndex: 1,
      expectedDelivery: '2026-08-19 18:00:00',
      items: [item(products.recharge, 1)], recipient: DEFAULT_RECIPIENT,
      invoice: { text: '不开发票' }, remark: '充值预计在 10 分钟内到账。', payment: basePaymentFor(products.recharge, 500),
      recharge: { account: '18101024147' },
      timeline: timeline(['提交订单', '支付成功', '等待收货', '交易完成'], 1, ['2026-08-18 13:03:12', '2026-08-18 13:04:01', '', '']),
      shipping: { mode: 'notice', notice: SERVICE_NOTICE }
    },
    {
      id: '300000501', type: 'omoPickup', typeLabel: 'OMO 订单', status: '等待自提',
      createdAt: '2026-08-17 15:28:44', paidAt: '2026-08-17 15:29:20', paymentMethod: '微信支付', currentIndex: 2,
      items: [item(products.tablet, 1)], recipient: { name: '李晓琳', phone: '186 1038 5521', address: '' },
      store: DEFAULT_STORE, pickupCode: '726 419', invoice: { text: '请联系发货门店开具发票' },
      remark: '到店后请出示自提码和手机号。', payment: payment(2199, 0, 100, 2099),
      timeline: timeline(['提交订单', '支付成功', '到店自提', '交易完成'], 2, ['2026-08-17 15:28:44', '2026-08-17 15:29:20', '2026-08-18 11:16:02', '']),
      shipping: { mode: 'pickup', notice: '商品已备妥，请在门店营业时间内到店自提。' }
    },
    {
      id: '300000502', type: 'omoDelivery', typeLabel: 'OMO 订单', status: '待收货',
      createdAt: '2026-08-18 14:05:32', paidAt: '2026-08-18 14:06:04', paymentMethod: '支付宝', currentIndex: 2,
      expectedDelivery: '预计 3 小时送达', items: [item(products.yoga, 1)], recipient: DEFAULT_RECIPIENT,
      store: Object.assign({}, DEFAULT_STORE, { method: '门店闪送' }), invoice: { text: '请联系发货门店开具发票' },
      remark: '闪送配送前请电话联系。', payment: payment(7499, 18, 300, 7217),
      timeline: timeline(['提交订单', '支付成功', '等待收货', '交易完成'], 2, ['2026-08-18 14:05:32', '2026-08-18 14:06:04', '2026-08-18 14:38:19', '']),
      shipping: { mode: 'storeDelivery', packages: [trackingPackage('闪送订单', '门店闪送', 'LKS202608180052', 4, ['五彩城门店', '清河中街', '上地西路'])] }
    }
  ];

  var filters = {
    types: [
      { value: 'all', label: '全部类型' },
      { value: 'normal', label: '普通订单' },
      { value: 'presale', label: '预售订单' },
      { value: 'service', label: '服务订单' },
      { value: 'recharge', label: '充值订单' },
      { value: 'omo', label: 'OMO 订单' }
    ],
    statuses: ['全部', '待付款', '待发货', '待收货', '待服务', '服务中', '待付定金', '待付尾款', '等待自提', '交易完成', '服务完成', '已取消']
  };

  function validateTimestamp(value) {
    return !value || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  }

  function validateOrders(source) {
    var errors = [];
    var seen = new Set();
    source.forEach(function (order) {
      if (!/^3\d{8}$/.test(order.id)) errors.push(order.id + ': invalid id');
      if (seen.has(order.id)) errors.push(order.id + ': duplicate id');
      seen.add(order.id);
      if (!validateTimestamp(order.createdAt) || !validateTimestamp(order.paidAt)) errors.push(order.id + ': invalid timestamp');
      if (!Array.isArray(order.timeline) || order.timeline.length !== 4) errors.push(order.id + ': timeline must have four nodes');
      else if (order.timeline.some(function (node) { return !validateTimestamp(node.time); })) errors.push(order.id + ': invalid timeline timestamp');
      if (!Array.isArray(order.items) || order.items.length === 0) errors.push(order.id + ': missing items');
      if (!order.payment || order.payment.payable !== order.payment.goods + order.payment.freight - order.payment.discount) errors.push(order.id + ': payment total mismatch');
      if (!order.status || !order.type) errors.push(order.id + ': missing status or type');
    });
    return errors;
  }

  return {
    orders: orders,
    filters: filters,
    products: products,
    serviceNotice: SERVICE_NOTICE,
    validateOrders: validateOrders
  };
});
