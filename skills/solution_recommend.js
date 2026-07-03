// Skill: 场景化解决方案推荐（卡片式输出，每方案关联真实在售商品）
const db = require('../db/schema');

// 内置场景方案库
const SOLUTIONS = {
  student: {
    key: 'student', icon: '🎓', title: '学生学习方案', scene: '学习/网课/作业',
    summary: '轻薄便携 + 长续航 + AI 写作助手，覆盖网课与作业全场景',
    industries: ['K12','高校'],
    productQuery: { nameLikeAny:['小新','YOGA Air','异能者'], categories:['笔记本电脑'], priceMin:3500, priceMax:7500, limit:3 },
    cta_text: '咨询学生认证优惠', cta_target: 'student_cert',
    suit_sites: ['shop','b','biz'],
  },
  home_entertainment: {
    key: 'home_entertainment', icon: '🎮', title: '家庭娱乐方案', scene: '游戏/影音/家用',
    summary: '游戏旗舰 + 4K 显示器 + 智能音响，客厅与书房双场景覆盖',
    industries: ['家庭'],
    productQuery: { nameLikeAny:['拯救者','刃9000K','Y9000','R9000'], categories:['笔记本电脑','台式机'], priceMin:7000, limit:3 },
    cta_text: '查看游戏旗舰', cta_target: 'gaming',
    suit_sites: ['shop'],
  },
  creator: {
    key: 'creator', icon: '🎨', title: '创作设计方案', scene: 'PS/PR/3D 建模',
    summary: '色准屏 + 独显 + 大内存，Adobe / Blender / Davinci 流畅运行',
    industries: ['设计','视频','摄影'],
    productQuery: { nameLikeAny:['YOGA Pro','YOGA Air','拯救者Y9000P','工作站P2'], priceMin:7000, limit:3 },
    cta_text: '查看创作机型', cta_target: 'creator',
    suit_sites: ['shop','b','biz'],
  },
  smb_office: {
    key: 'smb_office', icon: '💼', title: '中小企业办公方案', scene: '5-30 人企业 IT',
    summary: 'ThinkBook 主力机 + 入门服务器 + 远程管家，开箱即用',
    industries: ['中小企业','初创团队'],
    productQuery: { nameLikeAny:['ThinkBook','天逸','扬天'], categories:['笔记本电脑','台式机'], priceMin:3500, priceMax:9000, limit:3 },
    cta_text: '联系企业购顾问', cta_target: 'smb_consult',
    suit_sites: ['b','biz'],
  },
  enterprise_mobile: {
    key: 'enterprise_mobile', icon: '🧳', title: '商旅移动办公方案', scene: '差旅/外勤/分支',
    summary: 'ThinkPad 商旅本 + 5G 网卡 + 加密远程，跨地协作不掉线',
    industries: ['销售','顾问','分支'],
    productQuery: { nameLikeAny:['ThinkPad X','ThinkPad T','ThinkPad L'], categories:['笔记本电脑'], priceMin:6000, limit:3 },
    cta_text: '查看 ThinkPad 系列', cta_target: 'thinkpad',
    suit_sites: ['b','biz'],
  },
  finance: {
    key: 'finance', icon: '🏦', title: '金融行业方案', scene: '银行/证券/保险',
    summary: '加密终端 + ThinkStation 风控工作站 + 等保合规，满足金融监管',
    industries: ['银行','证券','保险','基金'],
    productQuery: { nameLikeAny:['ThinkStation','工作站','ThinkPad T','ThinkCentre'], priceMin:7000, limit:3 },
    cta_text: '咨询金融定制', cta_target: 'finance',
    suit_sites: ['biz'],
  },
  healthcare: {
    key: 'healthcare', icon: '🏥', title: '医疗行业方案', scene: '医院/影像/诊室',
    summary: '医用 PC + DICOM 影像工作站 + 多屏护士站，符合医疗器械规范',
    industries: ['医院','影像中心','社区医疗'],
    productQuery: { nameLikeAny:['ThinkCentre','工作站','服务器'], categories:['台式机','工作站','服务器'], priceMin:5000, limit:3 },
    cta_text: '咨询医疗方案', cta_target: 'healthcare',
    suit_sites: ['biz'],
  },
  education_biz: {
    key: 'education_biz', icon: '🏫', title: '教育信息化方案', scene: '学校/机房/教室',
    summary: '机房统一管理 + 智慧教室一体机 + 教师本，省财政采购合规',
    industries: ['K12','高校','教育局'],
    productQuery: { nameLikeAny:['ThinkCentre','天逸','扬天','会议平板'], categories:['台式机','智能会议解决方案'], priceMin:3500, limit:3 },
    cta_text: '咨询教育采购', cta_target: 'education',
    suit_sites: ['biz'],
  },
  government: {
    key: 'government', icon: '🏛', title: '政务办公方案', scene: '政府/事业单位',
    summary: '党政终端 + 国密合规 + 一表通办公环境，支持等保 2.0',
    industries: ['政府','事业单位'],
    productQuery: { nameLikeAny:['ThinkCentre','天逸','扬天','ThinkStation'], priceMin:5000, limit:3 },
    cta_text: '咨询政务定制', cta_target: 'government',
    suit_sites: ['biz'],
  },
  meeting_room: {
    key: 'meeting_room', icon: '📺', title: '智慧会议室方案', scene: '会议室/会客厅',
    summary: 'thinkplus 会议平板 + 4K 摄像头 + 协作主机，即开即用',
    industries: ['办公室','会客厅','培训室'],
    productQuery: { nameLikeAny:['thinkplus','会议平板','会议'], categories:['智能会议解决方案'], limit:3 },
    cta_text: '查看会议方案', cta_target: 'meeting',
    suit_sites: ['b','biz'],
  },
  server_storage: {
    key: 'server_storage', icon: '🗄', title: '数据中心方案', scene: '服务器/存储',
    summary: 'SR 机架服务器 + 企业级 SSD + 智能运维，3 年质保',
    industries: ['IT 部门','互联网','制造业'],
    productQuery: { nameLikeAny:['ThinkSystem','SR258','服务器','机架式'], categories:['服务器'], priceMin:5000, limit:3 },
    cta_text: '咨询数据中心', cta_target: 'datacenter',
    suit_sites: ['b','biz'],
  },
};

const SCENE_KEYWORDS = {
  student: ['学生','学习','网课','上学','课程','学校用','大学','高校','作业','考试'],
  home_entertainment: ['家庭','娱乐','游戏','影音','客厅','家用','打游戏','吃鸡','3a'],
  creator: ['设计','创作','ps','pr','adobe','视频剪辑','3d','建模','blender','达芬奇','摄影','修图'],
  smb_office: ['中小企业','小公司','创业','5人','10人','开公司','创业公司','smb'],
  enterprise_mobile: ['商旅','差旅','外勤','出差','分支','移动办公','销售用','顾问'],
  finance: ['金融','银行','证券','保险','基金','信托','风控','合规'],
  healthcare: ['医疗','医院','医生','影像','dicom','诊室','护士站','社区医院'],
  education_biz: ['教育','学校采购','机房','教学','教师用','教室','一体机','智慧教室','教育局'],
  government: ['政府','政务','事业单位','机关','党政','国密','等保'],
  meeting_room: ['会议室','会议','开会','协作','会客厅','培训室','远程会议'],
  server_storage: ['服务器','机架','存储','数据中心','idc','机房机柜','虚拟化','私有云'],
};

const EXCLUDE_KEYWORDS_DEFAULT = ['测试','限定款T-Shirt','徽章','T恤','二手优品','POLO'];

function pickScenes(input, siteType, limit) {
  const text = String(input || '').toLowerCase();
  const matched = [];
  for (const [key, kws] of Object.entries(SCENE_KEYWORDS)) {
    if (kws.some(k => text.includes(k.toLowerCase()))) matched.push(key);
  }
  // 没匹配则按站点默认 top N
  if (matched.length === 0) {
    if (siteType === 'shop') return ['student','home_entertainment','creator'].slice(0, limit);
    if (siteType === 'b')    return ['smb_office','enterprise_mobile','meeting_room'].slice(0, limit);
    if (siteType === 'biz')  return ['government','education_biz','finance','meeting_room'].slice(0, limit);
    return ['smb_office','creator','meeting_room'].slice(0, limit);
  }
  return matched.slice(0, limit);
}

function fetchProductsFor(query) {
  const where = ["status='active'", "image_url IS NOT NULL", "image_url != ''"];
  const params = [];

  if (query.categories?.length) {
    where.push(`category IN (${query.categories.map(()=>'?').join(',')})`);
    params.push(...query.categories);
  }
  if (query.nameLikeAny?.length) {
    where.push('(' + query.nameLikeAny.map(()=>'name LIKE ?').join(' OR ') + ')');
    params.push(...query.nameLikeAny.map(s => `%${s}%`));
  }
  EXCLUDE_KEYWORDS_DEFAULT.forEach(s => { where.push('name NOT LIKE ?'); params.push(`%${s}%`); });
  if (typeof query.priceMin === 'number') { where.push('price >= ?'); params.push(query.priceMin); }
  if (typeof query.priceMax === 'number') { where.push('price <= ?'); params.push(query.priceMax); }

  const sql = `
    SELECT id, name, sku, category, price, original_price, image_url, description
    FROM products
    WHERE ${where.join(' AND ')}
    ORDER BY sort_order DESC, id DESC
    LIMIT ?
  `;
  params.push(query.limit || 3);
  return db.prepare(sql).all(...params);
}

module.exports = {
  name: 'solution_recommend',
  description: '为用户推荐场景化解决方案卡片（学生/家庭/中小企业/金融/医疗/教育/政府/会议室/数据中心等）。每个方案附 2-3 件真实在售推荐机型。当用户问"行业方案/政府方案/教育采购/会议室/服务器方案"或描述使用场景时调用此工具。',
  parameters: {
    type: 'object',
    properties: {
      scene: { type: 'string', description: '用户描述的场景或行业，如：教育、金融、医院、中小企业、学生、家庭娱乐、会议室、服务器等。可包含痛点描述。' },
      site_type: { type: 'string', enum: ['default','shop','b','biz'], description: '当前业务入口，由系统注入：shop=个人及家庭，b=中小企业，biz=政教及大企业。' },
      max: { type: 'integer', minimum: 1, maximum: 6, description: '返回方案数量上限，默认 3。' },
    },
    required: ['scene'],
  },
  execute: ({ scene, site_type, max }, context = {}) => {
    const siteType = site_type || context.siteType || 'default';
    const limit = Math.min(Math.max(parseInt(max, 10) || 3, 1), 6);

    const sceneKeys = pickScenes(scene, siteType, limit);
    const solutions = sceneKeys
      .map(k => SOLUTIONS[k])
      .filter(s => !s.suit_sites || s.suit_sites.includes(siteType) || siteType === 'default')
      .slice(0, limit)
      .map(s => {
        const products = fetchProductsFor(s.productQuery).map(p => ({
          id: p.id, sku: p.sku, name: p.name, price: p.price,
          original_price: p.original_price, image_url: p.image_url,
          category: p.category,
        }));
        return {
          key: s.key, icon: s.icon, title: s.title, scene: s.scene,
          summary: s.summary, industries: s.industries,
          products, cta_text: s.cta_text, cta_target: s.cta_target,
        };
      })
      .filter(s => s.products.length > 0);

    if (solutions.length === 0) {
      return { action:'frontend_solutions', solutions: [], note:'未匹配到对应场景方案，请尝试更具体的描述（如：教育采购 / 金融加密终端 / 服务器虚拟化）。' };
    }

    return {
      action: 'frontend_solutions',
      title: `${scene} - 推荐方案`,
      solutions,
      note: `共匹配 ${solutions.length} 个场景方案，每方案附 ${solutions[0].products.length} 件在售推荐机型。点击 CTA 可深入咨询。`,
    };
  },
};
