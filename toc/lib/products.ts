/**
 * C 端商城商品数据源（PC / 移动端 / 详情页唯一来源）
 *
 * 说明：
 * - 10 个商品分别来自 10 家不同店铺、覆盖 10 个不同品类；
 * - 每个商品在后端知识库中都有一份同名说明书（见 backend/scripts/seed_kb.py），
 *   AI 客服能依据它回答参数、价格、售后等问题；
 * - 商品图约定放入 toc/public/products/，命名为 `{id}.png`；
 *   图片缺失时组件会自动降级为渐变占位图（见 components/shop/ProductImage.tsx），
 *   因此补图不阻塞开发、也不会出现裂图。
 */

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  /** 商品 ID：用于路由 /product/[id] 与图片文件名 */
  id: string;
  /** 商品名称 */
  name: string;
  /** 一句话卖点（卡片副标题） */
  subtitle: string;
  /** 所属品类 */
  category: string;
  /** 所属店铺 */
  store: string;
  /** 现价（元） */
  price: number;
  /** 划线价（元） */
  originalPrice: number;
  /** 销量（展示为「x 人已购」） */
  sales: number;
  /** 评分（0-5） */
  rating: number;
  /** 商品标签 */
  tags: string[];
  /** 核心卖点（详情页展示） */
  highlights: string[];
  /** 规格参数（详情页参数表） */
  specs: ProductSpec[];
  /** 商品图路径；图片不存在时自动走渐变占位图 */
  image: string;
  /** 占位图渐变色（[起始, 结束]） */
  accent: [string, string];
}

export const PRODUCTS: Product[] = [
  {
    id: "keyboard-k8pro",
    name: "机械键盘 K8 Pro 三模",
    subtitle: "Gasket 结构 · 全键热插拔 · 三模连接",
    category: "电脑外设",
    store: "极客方舟旗舰店",
    price: 399,
    originalPrice: 499,
    sales: 128000,
    rating: 4.9,
    tags: ["满299减30", "一年质保", "包邮"],
    highlights: [
      "Gasket 垫圈结构 + 双层消音棉，敲击闷实、回弹柔和，久敲不累手",
      "全键热插拔轴座，免焊接换轴，红轴/茶轴/青轴随心换",
      "蓝牙 5.1 / 2.4G / Type-C 三模，一键在台式机、笔记本、平板间切换",
    ],
    specs: [
      { label: "配列", value: "87 键 TKL" },
      { label: "轴体", value: "红轴 / 茶轴 / 青轴（热插拔）" },
      { label: "键帽", value: "PBT 二色成型 · OEM 高度" },
      { label: "续航", value: "4000mAh · 关灯约 180 小时" },
      { label: "背光", value: "RGB 1680 万色 · 12 种灯效" },
      { label: "重量", value: "约 780g（含键帽）" },
    ],
    image: "/products/keyboard-k8pro.jpg",
    accent: ["#5B7C99", "#243447"],
  },
  {
    id: "headphone-ancx",
    name: "主动降噪耳机 ANC-X",
    subtitle: "-45dB 深度降噪 · 40h 续航 · LDAC",
    category: "影音数码",
    store: "声学实验室",
    price: 599,
    originalPrice: 799,
    sales: 86000,
    rating: 4.8,
    tags: ["满599减80", "赠收纳包", "一年质保"],
    highlights: [
      "最高 -45dB 主动降噪，通勤、地铁、飞机上明显隔绝低频噪音",
      "40mm 镀钛动圈 + LDAC 高解析编码，听感细节优于普通蓝牙耳机",
      "双设备同时连接，电脑与手机可同时在线，来电自动切换",
    ],
    specs: [
      { label: "降噪深度", value: "最高 -45dB · 支持通透模式" },
      { label: "发声单元", value: "40mm 镀钛复合振膜动圈" },
      { label: "音频编码", value: "SBC / AAC / LDAC" },
      { label: "续航", value: "开降噪 30h · 关降噪 40h" },
      { label: "蓝牙", value: "蓝牙 5.3 · 双设备连接" },
      { label: "防护", value: "IPX4 防汗防泼溅" },
    ],
    image: "/products/headphone-ancx.jpg",
    accent: ["#3F4553", "#14161C"],
  },
  {
    id: "protein-whey",
    name: "乳清蛋白粉 2kg",
    subtitle: "每 100g 含 80g 蛋白 · 低糖配方",
    category: "运动营养",
    store: "燃力健身官方店",
    price: 299,
    originalPrice: 369,
    sales: 52000,
    rating: 4.7,
    tags: ["满299减30", "第二件9折", "SC 认证"],
    highlights: [
      "每 100g 含蛋白质 80g，含量高于市面常见 70% 规格",
      "低糖配方，每份仅约 3g 碳水，增肌减脂期都适用",
      "香草 / 巧克力 / 原味三种口味，原味零添加香精",
    ],
    specs: [
      { label: "规格", value: "2kg / 罐（约 66 份）" },
      { label: "蛋白类型", value: "浓缩乳清蛋白 WPC80" },
      { label: "每份营养", value: "蛋白质 24g · 碳水 3g · 脂肪 1.5g" },
      { label: "口味", value: "香草 / 巧克力 / 原味" },
      { label: "保质期", value: "未开封 24 个月" },
      { label: "冲泡", value: "30g 粉 + 200ml 常温水摇匀" },
    ],
    image: "/products/protein-whey.jpg",
    accent: ["#E8A33D", "#B06A0F"],
  },
  {
    id: "diaper-baby",
    name: "婴儿纸尿裤 L 码 3 包装",
    subtitle: "0.2cm 超薄 · 5 层锁水 · 无荧光剂",
    category: "母婴用品",
    store: "贝贝安心",
    price: 159,
    originalPrice: 219,
    sales: 156000,
    rating: 4.9,
    tags: ["会员9折", "满299减30", "国标认证"],
    highlights: [
      "0.2cm 超薄芯体，宝宝活动不受限，夏天穿也不闷",
      "五层锁水 + 高分子吸水树脂，回渗量低，屁屁保持干爽",
      "尿显条设计，不用拆开就能判断是否需要更换",
    ],
    specs: [
      { label: "尺码", value: "L 码（9-14kg）" },
      { label: "规格", value: "44 片 × 3 包 = 132 片" },
      { label: "芯体厚度", value: "约 0.2cm" },
      { label: "吸收量", value: "单次约 500ml" },
      { label: "材质", value: "亲肤无纺布 + 5 层锁水芯体" },
      { label: "适用月龄", value: "约 9-24 个月" },
    ],
    image: "/products/diaper-baby.jpg",
    accent: ["#8ED4EE", "#3E8FB0"],
  },
  {
    id: "coffee-drip",
    name: "精品挂耳咖啡 20 包",
    subtitle: "下单后 48h 内烘焙 · 0 糖 0 奶精",
    category: "咖啡冲饮",
    store: "晨语咖啡",
    price: 89,
    originalPrice: 129,
    sales: 68000,
    rating: 4.8,
    tags: ["第二件半价", "新鲜烘焙", "新人券"],
    highlights: [
      "下单后 48 小时内新鲜烘焙发货，包装标注烘焙日期",
      "挂耳设计免器具，办公室、出差、露营都能现冲",
      "中浅烘焙不苦，果酸明亮，适合不接受深烘焦苦的用户",
    ],
    specs: [
      { label: "规格", value: "10g × 20 包 / 盒" },
      { label: "产地", value: "云南保山 / 埃塞俄比亚" },
      { label: "处理法", value: "水洗" },
      { label: "烘焙度", value: "中浅烘焙" },
      { label: "咖啡因", value: "每包约 80mg" },
      { label: "冲泡", value: "90-93℃ · 注水 150-180ml" },
    ],
    image: "/products/coffee-drip.jpg",
    accent: ["#C08A57", "#5E3A21"],
  },
  {
    id: "jacket-goretex",
    name: "GORE-TEX 三合一冲锋衣",
    subtitle: "防水 20000mm · 可拆抓绒内胆",
    category: "户外装备",
    store: "山野猎人户外",
    price: 1299,
    originalPrice: 1899,
    sales: 34000,
    rating: 4.9,
    tags: ["满1000减150", "会员9折", "赠收纳袋"],
    highlights: [
      "GORE-TEX 三层压胶面料，防水 20000mm，中大雨可长时间抵御",
      "三合一结构，一件顶三件：春秋单穿外壳、冬季套抓绒内胆",
      "腋下透气拉链 + 15000 透气指数，高强度徒步不闷汗",
    ],
    specs: [
      { label: "面料", value: "GORE-TEX 三层压胶" },
      { label: "防水指数", value: "20000mm" },
      { label: "透气指数", value: "15000g/m²·24h" },
      { label: "结构", value: "防水外壳 + 可拆抓绒内胆" },
      { label: "尺码", value: "S - 3XL（中性版型）" },
      { label: "洗涤", value: "机洗 ≤30℃ · 禁用柔顺剂" },
    ],
    image: "/products/jacket-goretex.jpg",
    accent: ["#6B8C5E", "#2C3E28"],
  },
  {
    id: "catfood-freeze",
    name: "冻干双拼猫粮 2kg",
    subtitle: "粗蛋白 ≥42% · 0 谷物 · 冻干双拼",
    category: "宠物用品",
    store: "毛球优选",
    price: 189,
    originalPrice: 249,
    sales: 78000,
    rating: 4.8,
    tags: ["第三件7折", "独立分装", "国标认证"],
    highlights: [
      "粗蛋白 ≥42%，动物蛋白占比高，符合猫的肉食天性",
      "冻干鸡肉粒 + 蛋黄双拼，适口性好，挑食猫接受度高",
      "500g × 4 独立小包分装，避免大袋反复开封受潮氧化",
    ],
    specs: [
      { label: "规格", value: "2kg（500g × 4 包）" },
      { label: "粗蛋白", value: "≥ 42%" },
      { label: "粗脂肪", value: "≥ 16%" },
      { label: "冻干占比", value: "约 10%" },
      { label: "适用", value: "1 岁以上全阶段成猫" },
      { label: "保质期", value: "未开封 18 个月" },
    ],
    image: "/products/catfood-freeze.jpg",
    accent: ["#E6B27A", "#9C6631"],
  },
  {
    id: "tea-dahongpao",
    name: "武夷正岩大红袍礼盒",
    subtitle: "正岩核心产区 · 传统炭焙 · 实木礼盒",
    category: "茶叶",
    store: "茗山堂",
    price: 459,
    originalPrice: 599,
    sales: 23000,
    rating: 4.9,
    tags: ["满400减50", "赠茶样", "送礼推荐"],
    highlights: [
      "武夷山正岩核心产区（三坑两涧）原料，岩韵明显",
      "传统炭焙、中足火退火充分，入口醇厚不锁喉，耐泡 8-10 泡",
      "实木礼盒 + 手提袋，适合商务与长辈馈赠",
    ],
    specs: [
      { label: "规格", value: "8g × 20 泡（160g）" },
      { label: "产区", value: "武夷山正岩核心产区" },
      { label: "品种", value: "肉桂 / 水仙 / 大红袍拼配" },
      { label: "工艺", value: "传统炭焙 · 中足火" },
      { label: "年份", value: "2024 年秋茶" },
      { label: "冲泡", value: "100℃ · 盖碗 110ml · 投茶 8g" },
    ],
    image: "/products/tea-dahongpao.jpg",
    accent: ["#A06B36", "#4A2C13"],
  },
  {
    id: "figure-limited",
    name: "限定款手办 1/8 比例",
    subtitle: "正版授权 · 限量 2000 体 · 附编号卡",
    category: "二次元周边",
    store: "次元工坊",
    price: 899,
    originalPrice: 1099,
    sales: 11000,
    rating: 4.9,
    tags: ["满800减80", "限量发售", "三层防撞包装"],
    highlights: [
      "官方授权正版，附防伪标与限量编号卡，具备收藏价值",
      "PVC + ABS 手工上色，服饰褶皱与发丝细节还原度高",
      "彩盒 + 珍珠棉 + 外箱三层包装，运输破损包赔",
    ],
    specs: [
      { label: "比例", value: "1/8 · 全高约 23cm" },
      { label: "材质", value: "PVC + ABS 手工上色" },
      { label: "版本", value: "限量 2000 体 · 附编号卡" },
      { label: "底座", value: "透明亚克力底座" },
      { label: "包装", value: "彩盒 + 珍珠棉 + 防撞外箱" },
      { label: "发货", value: "现货 48h 内 / 预售按页面标注" },
    ],
    image: "/products/figure-limited.jpg",
    accent: ["#8B7BD9", "#3D2E7A"],
  },
  {
    id: "skincare-niacin",
    name: "烟酰胺精华液 30ml",
    subtitle: "5% 烟酰胺 · 提亮匀净 · 敏感肌友好",
    category: "美妆护肤",
    store: "雅诗芳研",
    price: 269,
    originalPrice: 349,
    sales: 91000,
    rating: 4.7,
    tags: ["满199减20", "赠小样", "无酒精香精"],
    highlights: [
      "5% 烟酰胺为公认有效浓度，兼顾提亮效果与皮肤耐受性",
      "传明酸 + 透明质酸复配，提亮同时兼顾保湿，不易拔干",
      "无酒精、无香精、无色素，敏感肌也能日常使用",
    ],
    specs: [
      { label: "规格", value: "30ml / 瓶 · 滴管设计" },
      { label: "核心成分", value: "5% 烟酰胺 · 1% 传明酸" },
      { label: "功效", value: "提亮肤色 · 改善暗沉 · 保湿修护" },
      { label: "适用肤质", value: "全肤质（敏感肌友好）" },
      { label: "用法", value: "早晚各一次 · 每次 2-3 滴" },
      { label: "保质期", value: "未开封 3 年" },
    ],
    image: "/products/skincare-niacin.jpg",
    accent: ["#F0AEC4", "#B0506F"],
  },
];

/** 按 ID 取商品 */
export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** 销量展示：12000 → 1.2万 */
export function formatSales(sales: number): string {
  if (sales >= 10000) {
    const w = sales / 10000;
    return `${w >= 100 ? Math.round(w) : w.toFixed(1).replace(/\.0$/, "")}万`;
  }
  return String(sales);
}
