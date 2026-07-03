// Skill: 找门店 + 预约体验（POC mock 数据，结构化输出 PC tab 卡片化）
module.exports = {
  name: 'store_finder',
  description: '查询用户所在城市的联想体验店列表，并提供预约到店时段。当用户问「门店/最近的联想店/在哪能体验/预约到店/线下店/体验店/门店地址」时调用。返回结构化数据，PC 端走右侧 tab 卡片化展示。',
  parameters: {
    type: 'object',
    properties: {
      city:    { type: 'string', description: '城市，如 北京 / 上海 / 深圳' },
      product: { type: 'string', description: '想体验的机型，如 拯救者 Y9000K / 会议平板' },
    },
    required: [],
  },
  execute: ({ city, product }) => {
    var c = city || '北京';
    var p = product || '拯救者 Y9000K';
    var stores = [
      {
        name: '联想' + c + '朝阳大悦城店',
        rating: 4.8,
        address: c + '市朝阳区朝阳北路 101 号大悦城 4 层',
        hours: '10:00-22:00（今日营业中）',
        phone: '010-5867-1234',
        metro: '朝阳门站 D 口出 步行 5 分钟',
        distance: '距您约 3.2 km',
        product_lines: [p, '小新 Pro 2026', 'YOGA Air', 'ThinkPad X1'],
        slots: [
          { time: '今日 14:00-15:00', remain: 3 },
          { time: '今日 16:00-17:00', remain: 5 },
          { time: '今日 19:00-20:00', remain: 2 },
          { time: '明日 10:00-11:00', remain: 8 },
        ],
      },
      {
        name: '联想' + c + '西单大悦城店',
        rating: 4.7,
        address: c + '市西城区西单北大街 131 号',
        hours: '10:00-22:00',
        phone: '010-6601-2345',
        metro: '西单站 J 口',
        distance: '距您约 5.8 km',
        product_lines: ['拯救者全系', 'ThinkBook', '会议平板'],
        slots: [
          { time: '今日 15:00-16:00', remain: 4 },
          { time: '明日 11:00-12:00', remain: 6 },
        ],
      },
      {
        name: '联想' + c + '国贸店',
        rating: 4.9,
        address: c + '市朝阳区建国门外大街 1 号国贸 B1',
        hours: '10:00-22:00',
        phone: '010-6505-6789',
        metro: '国贸站 A1 口',
        distance: '距您约 8.1 km',
        is_flagship: true,
        product_lines: ['全系 + 工作站 ThinkStation 体验区', '政企方案展厅'],
        slots: [
          { time: '今日 17:00-18:00', remain: 6 },
          { time: '明日 13:00-14:00', remain: 8 },
        ],
      },
    ];
    return {
      action: 'frontend_stores',
      title: '📍 ' + c + ' 联想体验店',
      city: c,
      product: p,
      stores: stores,
      perks: [
        '🎁 出示预约短信送 ¥50 立减券',
        '📷 体验拍照分享 +100 乐豆',
        '☕ 现场免费咖啡 + 工程师 1 对 1 讲解',
      ],
    };
  },
};
