# C 端商城改版实施计划（待确认）

> 创建时间：2026-09-12
> 状态：**✅ 已实施完成（2026-09-12）** —— 本文档保留为当时的方案记录；
> 实际落地内容、验证结果与踩坑记录请见 `docs/progress.md` 的 **Phase 6**。
> 范围：`toc`（C 端商城）为主，`backend` 与 `tob` 有少量配合改动

---

## 一、需求拆解（已与你确认）

| # | 需求 | 确认结论 |
|---|---|---|
| 1 | PC 首页改为商品网格 | 参考截图1：多列商品瀑布流 |
| 2 | 移动端首页改为商品网格 | 参考截图2：2 列网格 + 底部导航 |
| 3 | 底部导航调整 | 去掉「我的」；原本的「购物车」位置改为「客服」→ **最终为「首页 / 客服」两个 Tab** |
| 4 | 商品详情页 | 每个商品可点入，做静态页；合理位置放「客服」入口 |
| 5 | 移动端客服交互 | **拼多多逻辑**：详情页点【客服】→ 跳转聊天页；【返回】回到上一页；此后「客服」Tab 的会话列表会多一条 |
| 6 | PC 端客服交互 | **淘宝网页版逻辑，但改为大弹窗**：左侧=已沟通过的客服列表，右侧=聊天界面 |
| 7 | 消息时间戳 | 每条消息记录时间；使用 localStorage 持久化，**刷新后记录与时间保留** |
| 8 | 请求人工接入 | 用户发送「人工客服」→ **B 端坐席台提示「用户请求人工接入」** |

**主色调**：~~按你的决定，**保持 antd 蓝 `#1677ff`**，不改为淘宝橙。~~
> ✅ **最终决定（2026-09-12，已实施）**：**改为橙色电商风**，主色 `#FF6A00` / 价格色 `#FF3B1F` /
> 底色 `#FFF9F5`，品牌渐变 `linear-gradient(135deg,#FF8A3D,#FF6A00,#E8480A)`。
> 定义见 `toc/lib/theme.ts`；B 端也同步统一为橙色。上一条为中途的旧结论，已被推翻。

---

## 二、现状盘点（改造前）

### 已经有的
- `toc/app/page.tsx`：UA 设备分流壳（`<768px` 或移动 UA → MobileView，否则 DesktopView），带登录守卫。
- `toc/components/views/MobileView.tsx`：antd-mobile 三 Tab（首页 / 消息 / 我的）；首页只是 6 个极简 `List.Item`。
- `toc/components/views/DesktopView.tsx`：左侧 `Sider` 菜单（首页 / AI 客服），**「首页」点进去是空白**，只有 `chat` 有内容。
- `toc/components/desktop/DesktopChat.tsx`、`toc/components/mobile/MobileChat.tsx`：聊天实现；发消息走 `POST /api/chat`，WS 只收 `agent_reply`。
- `tob/components/AgentPage.tsx`：坐席台，`/ws/agent` 收 `chat_stream`，按 `user_id` 归类；已有全局/会话级 AI 托管开关。

### 缺什么（本次要补）
1. **没有商品数据源**：商品目前硬编码在 `MobileView` 里，PC 端一件都没有，详情页无数据可依。
2. **没有商品详情页路由**。
3. **消息无时间字段**：`ChatMsg` 只有 `{ role, content }`，且刷新即丢失。
4. **没有会话列表概念**：客服 Tab 无从展示「多一条会话」。
5. **B 端没有「请求人工接入」通道**：目前只认 `chat_stream` 一种消息类型。

---

## 三、技术方案

### 3.1 商品数据源（新增）

新建 `toc/lib/products.ts`，作为 PC / 移动端 / 详情页**唯一数据来源**：

```ts
export interface Product {
  id: string;          // 用于路由 /product/[id] 与图片名
  name: string;
  price: number;       // 现价
  originalPrice?: number;  // 划线价
  sales: number;       // 销量（展示「xx人购买」）
  desc: string;        // 一句话卖点
  specs: { label: string; value: string }[];  // 详情页参数表
  tags?: string[];     // 如「包邮」「官方立减」
}
```

- 首期建议 **12~20 个商品**，优先复用知识库里已有的 6 个品类（机械键盘 K8 Pro / 降噪耳机 ANC-X / 蛋白粉 / 冲锋衣 GORE-TEX / 手办限量款 / 岩茶大红袍），其余按同一风格补足。
- **图片约定**：你提供素材放入 `toc/public/products/`，命名为 `{id}.jpg`（如 `k8-pro.jpg`），建议 **1:1 方图、≥600×600**。
  - 代码里做**降级兜底**：图片不存在时自动回退为内置占位图（渐变底 + 商品名首字），保证永不出现裂图。你可以随时补图，无需改代码。

### 3.2 路由与页面结构

```
app/
├── page.tsx                    # C 端主壳（已有，UA 分流）
├── login/page.tsx              # 登录（已有）
├── product/[id]/page.tsx       # 新增：商品详情（内部按设备渲染两个版本）
└── chat/page.tsx               # 新增：移动端客服聊天页（push 进入，可返回）
```

### 3.3 移动端（拼多多逻辑）

**主壳 `MobileView`**
- 底部 TabBar 改为 **「首页 / 客服」** 两项（选中态用主色蓝）。
- 首页 → 2 列商品网格；点击商品 `router.push('/product/{id}')`。
- 客服 Tab → **会话列表页**：展示已沟通过的会话（含默认「AI 客服」会话），点任一条进入聊天页。

**商品详情页 `MobileProductDetail`**
- 顶部返回、商品大图、名称、价格、销量、参数表。
- **底部固定操作栏**：`[客服]`（左，次要按钮）+ `[立即购买]`（右，主按钮，MVP 仅占位）。
- 点【客服】→ `router.push('/chat?productId={id}')`。
  - 若该商品已有会话则复用，否则**新建一条会话**（标题=商品名），于是返回客服 Tab 时列表里就多了一条。
- 聊天页【返回】→ `router.back()`，即回到商品详情页。

**聊天页 `/chat`**
- 顶部：返回 + 会话标题（商品名 / AI 客服）。
- 消息区：气泡 + **时间戳**；user 右侧蓝底，assistant 左侧白底，人工客服带绿色「人工客服」标签。
- 输入区固定在底部，适配 `safe-area-inset-bottom`。

### 3.4 PC 端（淘宝网页版逻辑 + 大弹窗）

**首页 `DesktopView`**
- 顶部导航：`AI 商城` Logo + 右侧「客服」入口、手机扫码继续、退出登录（沿用现有能力）。
- 主区：**多列响应式商品网格**（`auto-fill, minmax(200px, 1fr)`，宽屏约 5 列，与截图1 一致）。
- 点击商品 → `/product/{id}`。

**商品详情页 `DesktopProductDetail`**
- 左侧大图、右侧信息区（标题 / 价格 / 销量 / 参数 / 数量）。
- 右侧信息区放 **`[联系客服]`** 按钮 → 打开**大弹窗**。

**大弹窗 `PcChatModal`**
- 尺寸约 `width: 900px, height: 620px` 的 antd `Modal`。
- **左栏（约 280px）**：已沟通过的客服会话列表（头像 + 标题 + 最后一条消息预览 + 时间 + 未读点）。
- **右栏**：聊天界面（消息流 + 输入框）。
- 由详情页按钮、顶部「客服」入口共同调用。

### 3.5 聊天数据模型（时间戳 + 持久化）

新增 `toc/lib/chatStore.ts`，封装 localStorage 读写：

```ts
interface ChatMsg {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  createdAt: number;      // 新增：毫秒时间戳
}

interface Conversation {
  id: string;             // 'store' 或 `product:{productId}`
  title: string;          // 'AI 客服' 或 商品名
  productId?: string;
  messages: ChatMsg[];
  lastActiveAt: number;
  unread: number;
}
```

- 存储键：`toc_convs_{userId}`（会话列表，内含消息）。
- **时间显示规则**：
  - 同一天 → `HH:mm`
  - 昨天 → `昨天 HH:mm`
  - 更早 → `M月D日 HH:mm`
  - 相邻消息间隔 > 5 分钟时才显示时间，避免刷屏。
- `DesktopChat` / `MobileChat` 抽出共用的消息渲染与发送逻辑，避免两套重复实现。

### 3.6 「请求人工接入」链路

**判定放在后端**（比前端匹配可靠，且 B 端只依赖后端协议）：

- 关键词命中：`人工`、`转人工`、`人工客服`、`真人`、`找客服`。
- 在 `routers/chat.py`（HTTP 通道）与 `routers/ws.py`（WS 通道）中，**在广播用户提问之后**追加一条广播：

```json
{
  "type": "handoff_request",
  "user_id": "3",
  "user_name": "王强",
  "user_phone": "13800000003",
  "content": "我要人工客服",
  "at": 1789193960
}
```

**B 端 `AgentPage` 收到后**：
1. 右上角弹出 antd `notification`：**「用户 王强 请求人工接入」**。
2. 左侧会话列表对应项加**红色 Badge「待接入」**并高亮。
3. 该会话消息流插入一条**系统提示条**：「用户于 14:32 请求人工接入」。
4. 自动把**该会话的 AI 托管开关关闭**（切为人工接待），避免 AI 继续抢答。

---

## 四、改动文件清单

| 文件 | 动作 | 说明 |
|---|---|---|
| `toc/lib/products.ts` | 新增 | 商品数据源 |
| `toc/lib/chatStore.ts` | 新增 | 会话/消息 localStorage 持久化 |
| `toc/components/shop/ProductGrid.tsx` | 新增 | 响应式商品网格（PC/移动共用） |
| `toc/components/shop/ProductCard.tsx` | 新增 | 商品卡片（含图片降级兜底） |
| `toc/app/product/[id]/page.tsx` | 新增 | 详情页路由（UA 分流） |
| `toc/components/product/DesktopProductDetail.tsx` | 新增 | PC 详情版式 |
| `toc/components/product/MobileProductDetail.tsx` | 新增 | 移动端详情版式 |
| `toc/app/chat/page.tsx` | 新增 | 移动端聊天页 |
| `toc/components/shop/PcChatModal.tsx` | 新增 | PC 大弹窗（左列表 + 右聊天） |
| `toc/components/shop/ServiceList.tsx` | 新增 | 移动端客服 Tab 的会话列表 |
| `toc/components/chat/ChatMessageList.tsx` | 新增 | 抽出的消息渲染（含时间戳） |
| `toc/components/views/MobileView.tsx` | 改 | TabBar 改「首页/客服」；首页换网格 |
| `toc/components/views/DesktopView.tsx` | 改 | 首页渲染网格；客服改为大弹窗 |
| `toc/components/desktop/DesktopChat.tsx` | 改 | 接入持久化 + 时间戳 |
| `toc/components/mobile/MobileChat.tsx` | 改 | 接入持久化 + 时间戳 |
| `backend/routers/chat.py` | 改 | 人工接入关键词检测 + 广播 |
| `backend/routers/ws.py` | 改 | 同上（WS 通道） |
| `tob/components/AgentPage.tsx` | 改 | 处理 `handoff_request`：通知 + 高亮 + 关托管 |
| `backend/scripts/seed_kb.py` | 可选改 | 新增商品是否同步进知识库（见待确认 2） |

---

## 五、待你确认的 4 件事

1. **商品清单**：一共要多少个商品？是否以现有 6 个品类为骨架扩充？（影响 `products.ts` 与图片素材数量）
2. **新增商品是否同步进知识库**：若同步，AI 能回答这些商品的问题；若不同步，问到时只会走「转人工」（更真实，但演示时显得答不上来）。
3. **价格颜色**：主色已定 antd 蓝，但电商价格通常用暖红突出（截图里也是橙红）。是否允许**价格/划线价单独用暖红**，其余保持蓝？
4. **AI 兜底说「请转人工」时，是否也算一次「请求人工接入」**：
   - 算 → 只要 AI 答不上来 B 端就会收到提醒（更安全，但提醒会变多）
   - 不算 → 仅用户**主动**说「人工客服」才触发（更精准）

---

## 六、建议实施顺序（分 3 步，每步可独立验收）

**Step 1｜数据层 + 商品展示**
`products.ts` → `ProductGrid` / `ProductCard` → 详情页（PC + 移动）。验收：首页网格正常，所有商品可点进详情。

**Step 2｜移动端导航与聊天**
TabBar 改版 → 客服 Tab 会话列表 → `/chat` 页面 → 时间戳 + 持久化。验收：详情页点客服能进聊天、返回回到详情页、客服 Tab 多一条会话、刷新记录仍在。

**Step 3｜PC 大弹窗 + 人工接入链路**
`PcChatModal` → 后端 `handoff_request` 广播 → B 端通知/高亮/关托管。验收：C 端发「我要人工客服」，B 端立刻弹提示并高亮该会话。

---

## 七、风险与注意点

- **图片素材未到位前**：全部走占位图兜底，不阻塞开发。
- ~~**`toc/lib/api.ts` 的默认端口仍是 `8001`**（实际为 8080），本次可顺手统一，避免本地裸跑时踩坑。~~
  ✅ **已完成（2026-09-12）**：`toc/lib/api.ts` 兜底默认值已改为 `8080`；`docs/progress.md` 内所有 `8001` 也已一并订正为 `8080`。
- **PC 大弹窗内嵌聊天**会与现有 `DesktopChat`（三栏布局组件）职责重叠，计划将其重构为可复用的「消息列表 + 输入框」两件套，弹窗与页面共用，避免两份实现。
- **localStorage 持久化**按 `user_id` 隔离，切换演示账号不会串数据。
