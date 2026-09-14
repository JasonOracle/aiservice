# AI 客服 MVP - 终极交付蓝图 (AI Handoff Blueprint)

> **致接手的 AI Agent (OpenCode / CodeBuddy)**：
> 欢迎接手此项目！本方案是项目的最高执行依据。项目被设定为**极高技术含金量**的架构，分为 `tob` (B端), `toc` (C端), `backend` (Python核心) 三个独立物理模块。请**严格按照以下分级步骤**执行，严禁一次性生成大量未经验证的代码。每完成一个步骤，必须通过指定的"测试标准 (DoD)"进行验证后方可进入下一步。

## 🎯 1. 全局架构与技术栈

- **后端引擎 (`backend`)**：`Python 3.11+`, `FastAPI`, `SQLAlchemy`, `Alembic`, `Mem0`, `TiDB Vector/SQLite`, `websockets`。
- **C端商城 (`toc`)**：`Next.js (App Router)`, `React`, `antd-mobile` (移动端), `antd` (PC端)。
- **B端后台 (`tob`)**：`Next.js (App Router)`, `React`, `Ant Design X`, `antd`。

---

## 🎨 2. 设计规范与 UI 库使用指南 (Design System)

为了保证"高定 SaaS 质感"和"纯正移动端体验"，必须严格遵循以下 UI 规范：

### 2.1 B端管理员后台 (`tob`)
- **设计风格**：主流现代化 SaaS 商务质感，默认采用浅色白底专业风格（SaaS Standard Light Mode）。
- **主题配色**：主色调已由 antd 蓝 `#1677ff` **统一为品牌橙 `#FF6A00`**（2026-09-12 改版，与 C 端保持一致，避免同一产品出现两种主色；见 `tob/components/ThemeClientProvider.tsx`），页面底色轻浅灰 `#f0f2f5`，容器与卡片背景纯白 `#ffffff` 配合浅灰微边框 `#e5e7eb`。
- **AI 托管控制**：采用双层托管仲裁机制（顶部提供全局 AI 托管开关，各会话顶部提供独立专属 Switch，且**会话专属 Switch 优先级高于全局开关**）。
- **推荐核心组件 (Ant Design X)**：
  - 对话气泡：`<Bubble />` (支持 markdown 渲染)。
  - 会话列表：`<Conversations />`。
  - 请求集成：使用 `useXChat` 和 `<XRequest />` 管理流式对话。
  - 提示词推荐：`<Prompts />`。
- **布局设计**：经典的左右分栏。左侧 `<Layout.Sider>` 纯白导航，右侧 `<Layout.Content>` 显示知识库大盘与实时坐席。

### 2.2 C端前端 (`toc` - 移动端视图)
- **设计风格**：**橙色电商 App（2026-09-12 改版）**。背景 `#FFF9F5` 衬托纯白卡片；品牌渐变 `linear-gradient(135deg,#FF8A3D 0%,#FF6A00 55%,#E8480A 100%)`；价格用暖红 `#FF3B1F` 突出。整体固定浅色，不做深色模式。
- **核心组件 (antd-mobile)**：
  - 底部导航：`<TabBar />`，置底，**仅两项：首页 / 客服**（已废弃原「消息 / 我的」）。「客服」Tab 内为会话列表，带未读红点。
  - 顶部导航：`<NavBar />`（品牌渐变底）。
  - 首页主体：品牌 Hero + **2 列商品网格** `<ProductGrid twoColumn />`（已弃用 `<List />`）。
  - 对话流输入：吸底固定布局（避免被手机软键盘遮挡）。
- **商品详情页**：底部固定操作栏，其中「客服」按钮 `router.push('/chat?productId=xxx')`；聊天页「返回」正好回到该详情页 —— **拼多多逻辑**（进过客服后，「客服」Tab 会话列表会多出一条商品会话）。
- **移动端聊天页**：路由 `app/chat/page.tsx`，支持 `?productId`（商品会话）与 `?conv`（指定会话）参数。

### 2.3 C端前端 (`toc` - PC端视图)
- **设计风格**：**橙色电商风（2026-09-12 改版）**，顶部导航 + 品牌 Hero + 多列商品网格，替代原先「类 ChatGPT 三栏」的旧方案。
- **核心组件 (antd)**：
  - 顶部导航：Logo + 菜单 + 「客服」入口。
  - 首页主体：与移动端共用同一份 `toc/lib/products.ts` 商品数据源，自适应多列商品卡片网格。
  - **客服交互改为「大弹窗」**（淘宝逻辑的变体）：点「客服」弹出 `PcChatModal`，左 = 已沟通过客服的会话列表，右 = 聊天界面。不再使用整页三栏布局。
- **商品详情页**：`app/product/[id]/page.tsx`，PC 版式为 `DesktopProductDetail`，「联系客服」→ 打开同一个 `PcChatModal`。

---

## 🚀 3. 分级开发步骤与测试标准 (Step-by-Step Execution)

> **Agent 规则**：请逐级开发。严禁跳步。每写完一个阶段的代码，必须在终端运行测试命令并确保无报错。

### Phase 0: 环境变量与网络基建 (Env & Networking)
**目标**：确立三端分离架构下的通信基石。
- [x] **步骤 0.1**：在 `backend/` 建立 `.env`，定义 `DATABASE_URL` (默认 SQLite)、`UPLOAD_DIR` (默认 `./uploads`)。
- [x] **步骤 0.2**：在 `tob/` 和 `toc/` 建立 `.env.local`，统一定义 `NEXT_PUBLIC_API_URL=http://localhost:8080` 和 `NEXT_PUBLIC_WS_URL=ws://localhost:8080`。
  > ⚠️ **端口订正（2026-09-12）**：后端在容器内监听 `8000`，`docker-compose.yml` 把它映射到宿主机 **`8080`**（`"8080:8000"`）。本文档早期写的 `8001` 是**过时信息**，已全部订正为 `8080`。`toc/lib/api.ts` 的兜底默认值也已同步改为 `8080`。
- [x] **通信规范**：前端彻底放弃 Next.js Server API 代理，**全部采用纯客户端 (Client-side Fetch/Axios) 直连 FastAPI**，降低 Node 层压力，依靠后端的 CORS 放行。

### Phase 1: 核心后端的基石 (Backend Foundation)
**目标**：搭建 FastAPI，配置数据库迁移，并灌入 10 个种子用户。
- [x] **步骤 1.1**：在 `backend/` 创建 `requirements.txt` 并完成 `pip install`，创建 `uploads/` 目录用于存放 RAG 文档。
- [x] **步骤 1.2**：配置 SQLAlchemy 和 Alembic。设计 `User` 表（包含手机号、密码哈希、用户特征字段）。
- [x] **步骤 1.3**：编写 `scripts/seed.py`，根据 `AGENTS.md` 里的表格注入 10 个逼真角色（密码统一哈希处理）。
- [x] **步骤 1.4**：实现 `/api/auth/login` 接口（返回 JWT）。
- [x] **步骤 1.5**：配置全局 CORS 中间件，允许一切来源跨域。
- **测试标准 (DoD)**：
  - [x] `uvicorn main:app --reload` 能成功启动。
  - [x] 访问 `http://localhost:8080/docs` 能看到 Swagger UI。
  - [x] 运行 `python scripts/seed.py` 成功且数据库存在 10 名用户。

### Phase 2: C端闭环与双端异构 (C-End Dual Tree)
**目标**：完成 `toc` 的路由搭建、登录逻辑与设备按需渲染。
- [x] **步骤 2.1**：在 `toc/` 初始化 Next.js，安装 `antd`, `antd-mobile`, `qrcode.react` 等。
- [x] **步骤 2.2**：编写设备探测中间件或 Hook (基于 User-Agent)，如果是手机端则动态加载 `<MobileView />`，否则加载 `<DesktopView />`（使用 `next/dynamic` 保证按需打包）。
- [x] **步骤 2.3**：实现强制登录页 `/login`，对接后端登录接口并将 Token 存入 localStorage。
- [x] **步骤 2.4**：实现扫码跨端接力。**注意网络坑点**：PC 端生成的二维码 URL 必须是本机的局域网 IP (LAN IP) 而不是 `localhost`，否则手机扫码后无法访问开发环境！
- **测试标准 (DoD)**：
  - [x] 运行 `pnpm run dev` 在 `toc/` 中启动。
  - [x] 浏览器通过 F12 切换手机/PC模式刷新，能看到界面组件完全不同。
  - [x] 使用手机扫描 PC 端生成的二维码（在同一 WiFi 下），手机能无缝打开当前对话。

### Phase 3: B端中枢与 Ant Design X (B-End Admin)
**目标**：搭建高定 AI 坐席后台。
- [x] **步骤 3.1**：在 `tob/` 初始化 Next.js，安装 `antd`, `@ant-design/x` 等依赖。
- [x] **步骤 3.2**：配置 `<AntdRegistry>` 以防 Next.js SSR 样式闪烁。
- [x] **步骤 3.3**：实现左侧导航栏，创建 `/kb` (知识库大盘) 和 `/models` (模型中心) 的静态 UI（使用 Ant Design X 组件）。
- **测试标准 (DoD)**：
  - [x] 运行 `pnpm run dev` 启动 `tob/`。
  - [x] 访问后台，页面呈现纯正的高级 SaaS 深色/浅色卡片质感，无任何样式闪烁报错。

### Phase 4: 硬核 AI 引擎与 WebSocket (The Core AI)
**目标**：彻底打通 Mem0 双规记忆和实时坐席。
- [x] **步骤 4.1**：后端 FastAPI 接入 Mem0，在聊天接口中传入当前登录用户的唯一标识，提取并更新长期记忆。
- [x] **步骤 4.2**：后端实现基于 SQLite FTS5 的简单 RAG 查询流水线（`rag.py`）。
- [x] **步骤 4.3**：后端开启 WebSocket Hub，接收 C 端流式请求，并向所有监听的 B 端坐席广播 `{ type: 'chat_stream', user_id: 'xxx', content: '...' }`。
- [x] **步骤 4.4**：`tob` 实时坐席控制台通过 WebSocket 接收并使用 `Ant Design X` 气泡展示在线聊天流。支持客服输入文字强行插话下发给 C端。
- [x] **步骤 4.5**：实现 B 端坐席双层 AI 托管控制（全局总开关 + 会话专属优先开关），并在 C 端建立 WebSocket `/ws/c/{user_id}` 实时接收人工回复。
- **测试标准 (DoD)**：
- [x] C 端用户换号聊天，AI 的语气和回答基于前序偏好发生显著变化。
- [x] B 端坐席界面能够实时看到 C 端弹出的对话气泡。
- [x] B 端人工坐席发送回复后，C 端用户界面能够实时同步展示客服消息气泡。

### Phase 5: 容器化一键部署 (Dockerization)
**目标**：包装为标准开源项目。
- [x] **步骤 5.1**：编写 `tob`, `toc`, `backend` 的 Dockerfile。
- [x] **步骤 5.2**：编写根目录的 `docker-compose.yml`，映射正确的端口（`toc` → 3000、`tob` → 3001、`backend` **宿主机 8080 → 容器内 8000**），挂载 SQLite 的 data 卷。
- **测试标准 (DoD)**：
  - [x] `docker compose up -d` 能够拉起整个体系（三容器常驻：`aiservice-toc-1` / `aiservice-tob-1` / `aiservice-backend-1`）。

> ⚠️ **开发期已知坑（2026-09-12）**：本项目在 **Windows 挂载卷 + Next.js Turbopack** 下，容器内的文件监听不可靠（会报 `EIO`），新增文件/新路由常常不被扫描到（表现为新路由 404 或改动不生效）。compose 里设的 `WATCHPACK_POLLING=true` 对 **Turbopack 无效**。**改完代码后请直接重启对应容器**：
> ```bash
> docker restart aiservice-toc-1   # 或 aiservice-tob-1 / aiservice-backend-1
> ```

---

### Phase 6: C端商城改版 + 人工接入链路 (2026-09-12 追加)
**目标**：把 C 端从「一个聊天框」升级为**有商品、有店铺、有详情的商城**，并打通「用户请求人工 → B 端坐席接管」的闭环。

- [x] **步骤 6.1 商品与主题数据层**
  - `toc/lib/products.ts`：**10 个商品 × 10 家不同店铺**的唯一数据源（keyboard-k8pro / headphone-ancx / protein-whey / diaper-baby / coffee-drip / jacket-goretex / catfood-freeze / tea-dahongpao / figure-limited / skincare-niacin），每件含店铺、价格、原价、销量、评分、参数、卖点、标签。
  - `toc/lib/theme.ts`：导出 `BRAND`（`primary #FF6A00`、`price #FF3B1F`、`bg #FFF9F5`、`primarySoft`、`border`、`text`、`textSub`、`gradient`）与 `antdTheme`。
  - `toc/lib/useDevice.ts`：设备判定 Hook（移动 UA 或视口 < 768px → mobile），监听 resize 可在双端版式间切换。
  - `toc/components/AppProviders.tsx`：`ConfigProvider(antdTheme)` + `ChatProvider`，挂在根 layout。
- [x] **步骤 6.2 会话持久化与聊天内核**
  - `toc/lib/chatStore.ts`：localStorage 持久化，key = `toc_convs_{userId}`（**按用户隔离，换演示账号不串数据**）；消息带 `createdAt` 毫秒时间戳；默认一条 `store` 会话，从商品详情页进客服则新建 `product:{productId}` 会话。
  - 时间显示规则：跨天必显示；同一天内与上一条间隔 ≤ 5 分钟则不重复显示。
  - `toc/components/chat/ChatProvider.tsx`：全局会话状态 + **全局唯一** WebSocket `/ws/c/{user_id}`（避免弹窗与页面各自建连导致重复连接）。挂在根 layout、不随路由卸载，因此需监听 `pathname` 重新比对 localStorage 中的 `user_id` / `token`。
  - `ChatMessageList.tsx` / `ChatComposer.tsx`：消息列表（user / assistant / agent / system 四态 + 时间戳）与输入区（含快捷提问「转人工客服」）。
- [x] **步骤 6.3 首页网格与商品详情页**
  - `toc/components/shop/`：`ProductGrid`、`ProductCard`、`ProductImage`（`.jpg` → `.png` 逐级降级，失败回退渐变占位图）、`ServiceList`（会话列表）、`PcChatModal`（PC 大弹窗）。
  - `toc/components/views/MobileView.tsx`：Hero + 2 列网格 + TabBar「首页 / 客服」。
  - `toc/components/views/DesktopView.tsx`：顶部导航 + Hero + 多列网格 + 客服大弹窗。
  - `toc/app/product/[id]/page.tsx` + `MobileProductDetail` / `DesktopProductDetail`：双端商品详情页。
  - 商品图：`toc/public/products/*.jpg`（10 张，760×760，合计约 0.65MB）。
- [x] **步骤 6.4 人工接入链路（后端判定 + 双通道广播）**
  - `backend/handoff.py`：`detect_handoff(user_message, ai_reply)` → `(True,"user")` / `(True,"ai_fallback")` / `(False,"")`。
    **两种来源都算一次「请求人工接入」**：① 用户主动说要人工；② AI 检索不到、按高压线兜底说「请转人工」。
    ⚠️ 关键词**刻意不含裸词「人工」**，否则「人工智能」「人工湖」会误触发。
  - `backend/routers/chat.py` 与 `routers/ws.py`：广播完 AI 回复后追加广播 `handoff_request` 消息。
  - `tob/components/AgentPage.tsx`：收到 `handoff_request` → 弹通知告警 + 会话列表打红色「待接入」Tag + 自动切到该会话 + 消息流插入 system 提示条 + 自动关闭该会话的 AI 托管。
- [x] **步骤 6.5 知识库扩充与检索增强**
  - `backend/scripts/seed_kb.py`：重写为 **16 篇文档 / 36 切片** —— 10 个商品各一份详细说明书（品牌店铺 / 参数 / 卖点 / 适用人群 / 使用保养 / 常见问题 / 价格售后）+ 通用政策（价格与优惠 / 物流配送 / 支付与发票 / 售后与退货换货政策 / FAQ / 商城总览）。每个主题文档名内嵌高频词，并附「常见问法」段落覆盖口语说法。
  - `backend/rag.py` 四项增强：① 中文虚词黑名单 `NOISE_NGRAMS` + `FUNC_CHARS` + `_is_noise()` 滤噪；② **移除 SQL `LIMIT`**（原先会把排在物理行后面的主题文档直接截断、永不参与打分）；③ 标题加权 `TITLE_WEIGHT = 3.0`；④ 相关度下限 `MIN_RELEVANCE = 0.30`。
- **测试标准 (DoD)**：
  - [x] 检索回归：19/19 有效问题命中正确文档、7/7 库外问题正确转人工。
  - [x] 场景 A：C 端说「我要人工客服」→ B 端收到 `handoff_request`，`reason=user`。
  - [x] 场景 B：「猫砂怎么选」（库外）→ AI 兜底转人工 → B 端收到 `handoff_request`，`reason=ai_fallback`。
  - [x] 场景 C：「大红袍怎么冲泡」正常咨询 → **不**触发 handoff（无多报）。
  - [x] 双端页面 200、首页商品网格正常渲染、橙色主题生效。

> ★ **踩坑记录**：本次改版曾导致 **C 端整站白屏**（`/`、`/login` 都空白，`document.body.innerText` 为空，但 `curl` 返回 200、`<title>` 正常 —— **SSR 正常、客户端整包渲染崩溃**）。
> 根因是 `antd-mobile-icons` **不存在的导出 `CustomerServiceOutline`**（详见日志：`Export CustomerServiceOutline doesn't exist in target module`）。注意 **`antd-mobile-icons`（移动端）与 `@ant-design/icons`（PC 端）是两套不同的图标集**，后者才有 `CustomerServiceOutlined`，不要混用。
> 核验某图标是否存在：
> ```bash
> docker exec aiservice-toc-1 sh -c "cat /app/node_modules/antd-mobile-icons/es/index.js | grep -iE '关键字'"
> ```

---

### Phase 7: 会话维度重构 + 聊天记录持久化 (2026-09-12 追加)
**目标**：B 端坐席台从「按客户」升级为「按 客户 × 店铺 × 商品」的会话维度；把聊天记录从浏览器内存搬到后端数据库，使刷新与重启后仍可回看历史并定位到最新一条。

**背景（问题定位）**：
- C 端早已按店铺/商品分会话，但 `send()` 只提交了 `message`，**会话上下文从未传给后端**；`/api/chat` 的 `session_id` 参数形同虚设（接收了却从未被使用）。
- 因此 B 端只能拿 `user_id / user_name / user_phone` 拼出「张伟 · 13800000001」，**无法区分同一客户的多店铺咨询**。
- B 端消息 100% 存于 React 内存，**刷新即归零**（回到硬编码欢迎语）；后端当时也只有 `users` 一张表，无处可捞。

- [x] **步骤 7.1 会话与消息持久化模型**
  - `backend/models.py` 新增 **`Conversation`** 与 **`Message`** 两张表。
  - **会话 ID 约定** `id = "{user_id}::{session_key}"`（如 `1::product:keyboard-k8pro`），可读复合键，前后端各自推算、无需先查库。
  - `Conversation` 含 `product_id / product_name / store_name` 与摘要字段 `last_message` / `last_active_at`，另有 **待接入状态** `handoff_reason` / `handoff_at`。
  - `backend/conversation_store.py`（新增）：`ensure_conversation()` / `add_message()` / `mark_handoff()` / `clear_handoff()`，**全部为「永不抛出」的容错设计**，持久化失败不打断聊天主链路。
- [x] **步骤 7.2 聊天接口落库与上下文透传**
  - `ChatRequest` 新增 `session_id` / `product_id` / `product_name` / `store_name`；响应新增 `conversation_id`。
  - `/api/chat`：先 `ensure_conversation()`，再落库「客户提问 + AI 回复」，命中 handoff 时 `mark_handoff()` 持久化待接入状态。
  - 广播 `chat_stream` / `handoff_request` 补充 `conversation_id` / `product_name` / `store_name` / `at`。
  - `/ws/c/{user_id}` 与 `/ws/agent` 同步对齐：人工坐席回复落库为 `agent` 角色并 `clear_handoff()`，转发 C 端时携带 `conversation_id`。
- [x] **步骤 7.3 会话查询接口**
  - 新增 `backend/routers/conversation.py`：`GET /api/conversations`（会话列表，含客户名/手机号/店铺/商品/最后消息/待接入原因，批量取用户避免 N+1）、`GET /api/conversations/{id}/messages`（完整历史，时间正序）。
- [x] **步骤 7.4 C 端会话上下文贯通**
  - `toc/lib/chatStore.ts` 新增 `toBackendConvId()` / `fromBackendConvId()` 互转 helper。
  - `ChatProvider.send()` 携带会话上下文；收到 `agent_reply` 时按 `conversation_id` **精确投递**（缺失才回退到「当前查看的会话」→「最近活跃的会话」）。
- [x] **步骤 7.5 B 端坐席台重构**
  - `tob/lib/api.ts` 新增 `getConversations()` / `getConversationMessages()` 与类型定义。
  - `AgentPage.tsx`：列表改为后端会话，标题「**店铺名 · 客户名**」、副标题「商品名 · 最后消息」；点击按需拉历史；WS 按 `conversation_id` 归集并自动新增条目；**进入会话与来新消息自动滚到最后一条**；待接入红标改为从后端 `handoff_reason` 初始化（刷新不丢）；人工回复携带 `conversation_id`。
  - 顺手适配 antd v6：`notification` 的 `message` 属性已废弃，改用 `title`。
- **测试标准 (DoD)**：
  - [x] 同一客户（张伟）在「极客方舟旗舰店」与「晨语咖啡」的两路咨询**各自独立成条**（`1::product:keyboard-k8pro` / `1::product:coffee-drip`）。
  - [x] `GET /api/conversations` 返回店铺名、商品名与最后一条消息；`GET .../messages` 返回完整历史（user / assistant 顺序正确）。
  - [x] 人工接入状态持久化：客户主动 → `handoff_reason=user`；库外问题 → `handoff_reason=ai_fallback`。
  - [x] **重启 `aiservice-backend-1` 后再次查询，会话与待接入状态完整保留**（「下次重启进入还有吗」的正面答案）。
  - [x] 三端容器均 200，B 端服务端渲染输出含新界面文案，无编译错误。

> ✅ **该遗留项已在 Phase 8 解决**：B 端「AI 托管」开关现已**真正生效**（后端仲裁 + 持久化），
> 不再是「只影响前端提示」。

---

### Phase 8: AI 托管真正生效 + C 端跨设备记录 (2026-09-12 追加)
**目标**：让 B 端「AI 托管」开关真正控制 AI 是否应答（**全局 + 会话两级、可单独开关、接入人工后自动关闭**），并让 C 端**换设备 / 换浏览器 / 清缓存后仍能看到完整聊天记录**。

**背景（问题定位）**：
- B 端那两个开关是**纯前端 `useState`**：后端 `/api/chat` 从头到尾没有读取过托管状态，所以「关掉托管」AI 照样抢答；刷新页面又自己弹回「开启」。
- 上一轮写的「接入人工后自动关闭」也只是前端 `setSessionAiManaged(false)`，**刷新即失效**。
- C 端消息只存在浏览器 localStorage；后端虽已把消息落库，但 C 端**从未去拉**，所以换设备等于失忆。

- [x] **步骤 8.1 托管状态持久化（后端）**
  - `backend/models.py`：新增 **`Setting`** 键值表（承载全局总开关 `ai_managed_global`）；`Conversation` 新增 **`ai_managed`** 列（`True` / `False` 为显式设置，**`NULL` 表示跟随全局**）。
  - `backend/database.py`：新增 **`ensure_schema()`**，启动时**幂等补齐后加列** —— SQLite 无迁移框架，`create_all` 只建新表、不会给已有表补列。
  - `backend/conversation_store.py`：新增 `get_global_ai_managed()` / `set_global_ai_managed()` / `set_session_ai_managed()` / `list_session_ai_overrides()` / **`is_ai_managed()`（唯一仲裁入口：会话级优先，未设置回落全局）**；并让 `mark_handoff()` **顺带把 `ai_managed` 置为 `False`**。
- [x] **步骤 8.2 托管开关接口与聊天链路仲裁**
  - 新增 `backend/routers/custody.py`：`GET /api/ai-custody`（读取 `{global, sessions}`）、`PUT /api/ai-custody`（`conversation_id` 留空即设置**全局**）；变更后广播 `ai_custody` 给**坐席台**与**该会话所属客户**。
  - `/api/chat`：先 `is_ai_managed()` 仲裁；**托管关闭时不生成 AI 回复**，仅落库并广播客户消息给坐席台，响应 `ai_managed=false`、`reply=""`、`sources=[]`；命中 handoff 时额外广播 `ai_custody`。
  - `/ws/c/{user_id}` 的 `chat` 分支同样仲裁；`/ws/agent` 处理 `agent_message` 时**显式保持该会话托管为关闭**（人工接手后 AI 不再插话）。
- [x] **步骤 8.3 B 端开关接入后端 + 多坐席同步**
  - `tob/lib/api.ts` 新增 `getAiCustody()` / `setAiCustody()`；`ConversationItem` 补充 `ai_managed`。
  - `AgentPage.tsx`：两级开关改为**后端真实读写**（乐观更新 + 失败回滚 `loadCustody()`）；监听 `ai_custody` 广播实现**多坐席浏览器实时同步**；WS **重连后重新拉取**，避免断线期间状态漂移；会话托管关闭时客户新消息改用 `message.warning` 强提示「请人工回复」；列表项挂灰色「人工」小标。
- [x] **步骤 8.4 C 端反向同步（跨设备可见）**
  - `toc/lib/api.ts` 新增 `getMyConversations()` / `getConversationMessages()`。
  - `toc/lib/chatStore.ts` 新增 `convFromBackend()` / `mergeBackendConversations()`：**后端存在的会话以后端为准；本地独有、尚未发出消息的会话予以保留**（避免刚点进商品客服的欢迎语被合并冲掉）。
  - `ChatProvider.tsx` 新增 `syncFromBackend()`：登录后自动同步一次，并通过 `refresh()` 在**进入「客服」Tab**、**打开 PC 客服弹窗**时再对齐一次。
- [x] **步骤 8.5 C 端接待态提示**
  - `send()` 依据响应 `ai_managed` 决定追加 **AI 气泡** 还是 **system 提示「已为您转接人工客服，请稍候」**（避免出现空气泡）。
  - 新增 `aiManagedOf()`，由 `ai_custody` 广播与发送结果共同更新；移动端聊天头部副标题追加「（人工客服接待中）」，PC 端头部显示橙色「人工接待中」Tag。
- **测试标准 (DoD)** —— 全部实测通过：
  - [x] `GET /api/ai-custody` 初始为 `{global:true, sessions:{}}`；会话级关闭后 `sessions` 出现 `"1::product:keyboard-k8pro": false`。
  - [x] 托管开启提问 → `ai_managed=true` 且返回 AI 回复；**会话级关闭后提问 → `ai_managed=false`、`reply=""`、`sources=[]`，且 `messages` 仅 +1（只落了客户提问）**。
  - [x] **全局关闭**后，未单独设置的 `store` 会话提问 → `ai_managed=false`（证明「回落全局」生效）。
  - [x] 重新开启会话托管后发送「我要人工客服」→ `handoff_reason=user`，且该会话 `ai_managed` **自动变为 false**。
  - [x] **重启 `aiservice-backend-1` 后**再次读取，`sessions` 中 `coffee-drip: false` **依然保留**（状态持久化成立）。
  - [x] C 端浏览器启动后已自动调用 `GET /api/conversations?user_id=1` 与逐会话 `/messages`（后端日志可见）；三端页面均 200，无编译或运行时报错。

> ★ **踩坑记录（编辑工具用法，务必注意）**：本轮曾在**同一条消息里对同一个文件发起两个 Edit 调用**，导致其中一处被**静默覆盖丢失**，表现为：
> `ReferenceError: loadCustody is not defined`（函数定义丢失）、`main.py` 少挂载一个路由（`/api/ai-custody` 整片 404）、
> `mark_handoff()` 少了一句自动关闭托管。
> **结论：同一文件的多次编辑必须串行执行，只有跨文件的编辑才可并行。**

> ⚠️ **其余仍存在的遗留项（非本次范围）**：
> 1. `docker-compose.yml` 的 `WATCHPACK_POLLING=true` 对 Turbopack **无效**（留着不报错，但也没用）。
> 2. `GET /api/conversations` 目前**无鉴权**（B 端内部接口，C 端同步也复用它）；正式上线前应补 Token 校验。

---

### Phase 9: 坐席台快捷短语 (2026-09-12 追加)
**目标**：把坐席重复手打的高频话术沉淀为**可点击的快捷短语**（参考千牛快捷回复），降低客服响应成本。

- [x] **步骤 9.1 快捷短语栏（B 端）**
  - `tob/components/AgentPage.tsx` 新增内置常量 `QUICK_PHRASES`（8 条，覆盖 **问候 → 处理中 → 售后 → 收尾** 四阶段服务流程）。
  - 位置：**人工输入框正上方**，左侧标注「快捷短语」，右侧提示「点击填入输入框，可继续补充后发送」。
  - 交互：**单击即把话术填入输入框**；若已有草稿则**换行追加**（不覆盖坐席已输入内容），随后 `focus({ cursor: "end" })` 把光标落到末尾，方便接着补字。
  - **只填入、不直接发送** —— 刻意区别于千牛的「一键发送」，避免误发。
  - 未选中会话时整排**置灰禁用**（`disabled` + `opacity: .45`），与输入框的 `disabled` 状态保持一致。
  - 视觉：胶囊形 chip，浅橙底 `#FFF7F1` + 橙字 `#E8480A` + 边框 `#FFE0C7`；hover 升为底 `#FFEFE4` / 边 `#FF6A00`（tob 无全局 CSS 文件，hover 用内联样式 + `hoverPhrase` state 实现）。
  - ⚠️ **类型细节**：**antd v6 的顶层入口不再导出 `TextAreaRef`**，须 `import type { TextAreaRef } from "antd/es/input/TextArea"`。
- **测试标准 (DoD)**：
  - [x] `tsc --noEmit` 全项目 **零错误**。
  - [x] `docker restart aiservice-tob-1` 后 Turbopack `Ready in 554ms`，`/` 返回 **200**，无编译错误。

> 💡 **扩展提示**：若日后要支持「坐席自定义短语」，把 `QUICK_PHRASES` 换成后端下发的配置即可（可挂在既有 `settings` 键值表上，或另建短语表）。

---

### Phase 10: 双向图片消息 + AI 识图 (2026-09-12 追加)
**目标**：支持**客户与坐席双向发送图片**、点击弹出大图预览；输入框上方展示待发送缩略图（右上角 × 可删）；**最多 3 张**、**上传完成前禁止发送**；并让 AI 真正「看懂」图片。

**关键前提（已实测，非假设）**：模型网关 `dots3-note-prev` **原生支持 vision**。
实测四组对照（容器内探针）：纯文本 `prompt_tokens=18`；带图 `prompt_tokens=32` 且 reasoning 中出现 `Analyze the Image` 并答出「红色」；只给文字诱导（「正确答案是红色」）时 reasoning 明确写「我没有看到任何图片，无法确认颜色」。
**结论：图片确实被喂进模型，走 OpenAI 标准图文数组即可，无需换模型或加通道。**
另：该模型是**推理型**（每轮返回 `reasoning_content`），带图后单轮约 5–15 秒。

- [x] **步骤 10.1 数据模型支持图片**
  - `backend/models.py`：`Message` 新增 **`images`** 列（`Text`，存 JSON 数组字符串，相对路径如 `/uploads/chat/2026-09/xxx.jpg`）。
  - `backend/database.py`：`ensure_schema()` 的 `pending_columns` 增加 `messages.images`，沿用既有幂等补列机制，**无需迁移框架**。
  - `backend/conversation_store.py`：`add_message()` 增加 `images` 参数；**纯图片消息（无文字）的会话摘要显示为 `[图片]`**，避免列表里出现空白。
- [x] **步骤 10.2 上传接口与静态目录**
  - 新增 `backend/chat_images.py`：`save_chat_image()`（按 `uploads/chat/YYYY-MM/` 分目录 + uuid 命名）、`ALLOWED_EXT` / `MAX_IMAGE_BYTES` / `normalize_ext()` / `to_data_url()`。
  - 新增 `backend/routers/upload.py`：`POST /api/upload`（multipart，字段名 `file`，**Bearer Token 鉴权**），返回 `{ url, size }`（`url` 为相对路径）。
  - `backend/main.py`：`app.mount("/uploads", StaticFiles(...))`。图片落在既有的 `backend_uploads` 卷里，**重启不丢**。
- [x] **步骤 10.3 AI 识图能力与识图规则**
  - `backend/ai_engine.py`：`stream_ai_response()` 增加 **`image_urls`** 参数；把图片转 **base64 data URL** 后拼成 OpenAI 图文数组（模型在公网，**无法访问 localhost，必须走 base64**）。
  - System prompt 追加**识图硬约束（分问题类型区别对待）**：
    - **事实类**（这是什么、什么颜色、怎么用、图上文字）→ 基于图片 + 知识库**直接回答**；
    - **争议类**（质量判定、责任归属、赔偿退换）→ **只客观描述所见 + 引用知识库条款，最终判定交人工**；
    - 看不清 / 无法确认 → 明确说「看不清」并请用户重拍，**严禁猜测**。
- [x] **步骤 10.4 聊天链路贯通 images**
  - `ChatRequest` 新增 `images`；**允许「空文字 + 有图」**（校验改为「文字或图片至少有一」）。
  - `/api/chat` 与 `/ws/c/{user_id}` 的 `chat` 分支：落库与广播均携带 `images`；`/ws/agent` 的 `agent_message` 支持坐席发图并转发 `images`。
  - `GET /api/conversations/{id}/messages` 返回 `images`；`handoff_request` 广播也带 `images`（纯图片消息用 `[图片]` 占位原话）。
- [x] **步骤 10.5 C 端发图交互**
  - 新增 `toc/lib/imageCompress.ts`：浏览器端压缩（长边 ≤ 1600px、JPEG 质量 0.8），手机原图 3–8MB 通常 1 秒内压完。
  - 重写 `toc/components/chat/ChatComposer.tsx`：**拖拽 / Ctrl+V 粘贴 / 点击选择**三种入口；缩略图排在**输入框上方**，右上角 × 删除；**上传中禁用发送**；**超出 3 张直接拒收并提示**（已选中的保持不动）。
  - 新增 `ChatImageGrid.tsx`（消息内图片网格，单图自适应 / 多图等宽）+ `ImagePreview.tsx`（全屏大图，支持左右切换与 ESC 关闭）。
- [x] **步骤 10.6 B 端坐席收发图片**
  - `tob/lib/imageCompress.ts` 同款压缩；`tob/lib/api.ts` 新增 `uploadChatImage()` / `mediaUrl()`。
  - `AgentPage.tsx`：输入区支持拖拽选图、缩略图 + ×、上传中禁用发送；消息气泡渲染图片并支持大图预览；历史与实时消息均映射 `images`。
- **测试标准 (DoD)** —— 全部实测通过：
  - [x] 上传 `/api/upload` 返回 `{"url":"/uploads/chat/2026-09/xxx.png","size":178}`；`GET` 该地址返回 **200** 且 `content-type: image/png`。
  - [x] **AI 真识图**：发 64×64 纯红图问「这是什么颜色」→ 回答「这是一张纯红色的图片，呈现出饱满且稍微偏深的红色调」，耗时 5.5s；`messages.images` 正确落库。
  - [x] **纯图片无文字**（`message=""` + `images`）→ 接口 **200 不报 422**，AI 正常应答。
  - [x] **争议类**：问「耳机外壳有裂纹，算质量问题吗能退货吗」→ AI 只描述「外壳上确实有明显的裂纹」+ 引导人工；数据库 `ai_managed=False`、`handoff_reason=ai_fallback`（**自动转人工且关托管**）。
  - [x] **WS 双向**：C 端发图 → B 端收到 `chat_stream` 且 `images` 正确；坐席回图 → C 端收到 `agent_reply` 且 `images` 正确。
  - [x] `tsc --noEmit`（tob + toc）**零错误**；三端容器重启后 `/api/health`、`3000`、`3001` 均 **200**。

> ★ **踩坑记录**：
> 1. **容器内无 `requests`**，写自检脚本要用标准库 `urllib`；有 `websockets`（17.1）与 `httpx`。
> 2. **容器内后端端口是 `8000`**（宿主才是 8080），容器内自检脚本要连 `127.0.0.1:8000`。
> 3. **`/ws/c/{user_id}` 的回复事件类型是 `ai_reply`**（不是 `done`）；等错类型会导致脚本空等到超时。
> 4. **模型在公网，拿不到 localhost 图片** —— 识图必须转 base64 data URL，直接传相对路径无效。
> 5. 本轮用 `urllib` 读响应头时 `dict(resp.headers)` 曾读到 `Content-Type=None`，**是脚本解析问题，不是接口缺陷**（`curl -D -` 实测 `content-type: image/png` 正常）。

> ⚠️ **遗留项（非本次范围）**：
> 1. 图片**只校验格式与体积，不做病毒扫描 / 内容审核**；正式上线建议接入内容安全审核。
> 2. 上传接口**无频率限制**，可被刷写占满磁盘；生产环境需加限流与容量上限。
> 3. 图片**无自动清理机制**（孤儿图会一直留在卷里）。

---

### Phase 11: 界面细节修正 + 联调数据清理 (2026-09-12 追加)

**目标**：三处体验修正 —— ① B 端角标语义改为「待接入」；② C 端移动端导航栏去掉冗余按钮与残留返回箭头；③ 发图入口参考 Gemini 改为左侧「+」小菜单。同时清理联调残留的假商品会话。

**改动清单**
- **数据清理**（一次性）：删除 6 条联调残留会话 —— 判据为「带 `product_id` 但该 id 不在 C 端商品目录」，
  命中 `imgtest` / `onlyimg` / `dispute` / `wstest`×3。会话 **10 → 4**、消息 **44 → 28**，剩余全部为真实商品会话
  （键盘 K8 Pro / 降噪耳机 ANC-X / 挂耳咖啡 / 商城客服）。删除前已导出备份：
  `.workbuddy/backup/deleted-conversations-20260912-2035.json`（8 KB，含会话与全部消息原文）。
- **B 端 `tob/components/AgentPage.tsx`**：
  - 角标 `conversations.length`（会话总数）→ `pendingHandoffCount`（`handoff_reason` 非空的会话数），
    文案为「待接入 N」，**无待接入时整块隐藏**，不再出现恒定数字；
  - 发图入口改为「+」弹出小菜单（选择图片 + 「Ctrl+V 粘贴 / 拖拽」提示），与 C 端交互统一；
  - 输入框补 `onPaste` 粘贴收图（此前只有 C 端有，坐席侧在输入框粘贴图片无反应）。
- **C 端 `toc/components/views/MobileView.tsx`**：顶部导航栏去掉右上角「客服」按钮，
  并显式 `back={null}` 消除组件默认渲染出的返回箭头。首页与「客服」Tab **共用同一 NavBar，一处改动两页同时生效**；
  「客服」入口由底部 TabBar（带未读红点）承担。
- **C 端 `toc/components/chat/ChatComposer.tsx`**：「+」从输入框**右侧移到左侧**，图标换成加号，
  点击展开小菜单 —— 移动端「拍照 / 从相册选择」，桌面端「选择图片」并附粘贴/拖拽提示。
  拖拽与 Ctrl+V 两种入口保持不变。
- **C 端 `toc/lib/chatStore.ts`**：`mergeBackendConversations` 新增丢弃规则（见下）。

**关键发现 / 踩坑**
1. ⚠️ **antd-mobile 的 `NavBar` 中 `back` 没有默认值**。源码（`es/components/nav-bar/nav-bar.js`）的判据是
   `back !== null`，因此**不传 `back` 时其值为 `undefined`，反而会渲染出一个返回箭头**。
   要去掉必须**显式写 `back={null}`** —— 这是 C 端首页／客服页一直有个多余返回箭头的根因。
2. ⚠️ **角标总数 ≠ 客户数**。会话按「客户 × 店铺 × 商品」拆分，同一位客户咨询 6 个商品就有 6 条会话；
   显示总数会被误读成「来了这么多客户」。坐席真正关心的是「还有几个等我接入」。
3. ⚠️ **「后端删了、前端还在」**。`mergeBackendConversations` 原规则无条件保留本地独有会话，
   导致服务端清理数据后前端仍显示假会话。判定依据改为：
   **本地独有 + 含 `user` 角色消息 → 丢弃**（说明服务端曾有记录、现已被删）；
   仅含欢迎语、从未发过消息的会话仍保留（保证「刚点进商品客服」不被冲掉）。

**测试标准 (DoD)**
- [x] 清理后会话 4 条 / 消息 28 条，全部为真实商品会话；备份文件已落盘。
- [x] `tsc --noEmit`（tob + toc）**零错误**；后端 `py_compile` 通过。
- [x] 三端容器重启后 `3000` / `3001` / `8080/api/health` 均 **200**。
- [x] 移动端导航栏、发图「+」菜单的**视觉效果已人工确认**（Phase 12 用浏览器自动化截图验证；
      注：Phase 11 当时记为「agent-browser 启动失败」有误，工具实际可用，详见 Phase 12 踩坑记录 1、4）。

---

### Phase 12: 产品介绍文档 + 全流程截图 + 演示数据 (2026-09-12 追加)

**目标**：产出可对外展示的产品介绍文档，配**真实运行截图**（非设计稿），并把项目里
「截图时数据太单薄」的问题一并解决。

**交付物**
1. **`docs/产品介绍.md`（新增）**：作品集/README 取向 —— 概览、功能全景（配图）、
   系统架构、五个关键技术点、工程难点表、快速启动、目录结构、已知限制。
2. **`docs/screenshots/`（新增 16 张）**：浏览器自动化在真实 Docker 环境下采集。
   - C 端 PC（1440×900，6 张）：首页 / 商品详情 / 客服弹窗（含图片消息）/ 大图预览 / 发图菜单 / 待发送缩略图
   - C 端移动（390×844，7 张）：首页 / 商品详情 / 会话列表 / 聊天（含图片）/ 发图菜单 / 待发送缩略图 / 人工接待态
   - B 端坐席台（1440×900，3 张）：总览 / 待接入会话详情 / 图片大图预览
3. **`backend/scripts/seed_demo.py`（新增）**：演示会话注入脚本，与 `seed_kb.py` 并列、同样**幂等**。
   补 8 位客户的 9 条会话，覆盖三种接待状态：AI 托管正常应答 / 待接入（红标）/ 已人工接管，
   并含 6 张图片消息。素材取自 C 端商品图，需先 `docker cp` 到容器 `/app/_demo_images/`。

**代码修正**
- ⚠️ **`tob/components/AgentPage.tsx`：会话列表状态标签冲突** —— 「待接入」（`handoff_reason` 非空）
  与「人工」（`ai_managed === false`）两个标签判断条件未互斥，导致待接入的会话**同时挂两个标签**，
  看起来像「既在等人、又已经有人在接待」。已改为互斥：待接入只显示红标，已接管的会话才显示「人工」。

**踩坑记录**
1. ⚠️ **Next.js 开发模式的调试指示器会挡住页面元素**（浮在左下角），自动化点击「+」会被它截胡，
   截图前需 `eval` 移除 `nextjs-portal` 节点。这也是 Phase 11 里「加号点不到」的真正原因，
   并非菜单本身有问题。
2. ⚠️ **`scripts/` 下执行脚本需手动补 `sys.path`**：直接 `python scripts/seed_demo.py` 时
   项目根目录不在 `sys.path`，`import database` 会 `ModuleNotFoundError`
   （`seed_kb.py` 已有此处理，新脚本沿用）。
3. ⚠️ 截图流程中 `press Escape` 会**连带关闭 antd Modal 弹窗**，导致后续步骤失焦；
   关闭浮层应改用「再次点击触发按钮」。
4. ℹ️ **`agent-browser` 在本环境实际可用**（Phase 11 判定为「启动失败」有误，已在下方订正）：
   注意 `open` 命令首次启动 daemon 时可能长时间不返回，需后台运行 + 写文件读结果。

**测试标准 (DoD)**
- [x] 演示数据注入成功：会话 13 条（跨 10 位客户、9 家店铺），其中待接入 4 条、已人工接管 2 条。
- [x] 历史数据一致性订正：`handoff_reason` 非空但 `ai_managed` 非 false 的旧记录已修正（2 条）。
- [x] 16 张截图全部采集成功，且与产品介绍文档中的引用一一对应。
- [x] `tsc --noEmit`（tob）**零错误**；tob 容器重启后页面正常。
- [x] 根目录与 backend 的临时脚本、探针文件已清理干净。

**遗留**
- 截图为演示数据态；`seed_demo.py` 与真实业务数据无冲突，可重复执行。
### Phase 13: 云端全栈生产化部署与求职级 README 重构 (2026-09-14 追加)

**目标**：彻底脱离纯本地运行限制，打通「TiDB Cloud 分布式云数据库 + Render 异步全双工后端 + Cloudflare Pages 双端前端」的零成本云原生托管架构，并重构面向面试官的硬核求职级 `README.md`。

**交付物**
1. **TiDB Cloud Serverless (AWS Singapore)**：
   - 生产数据库打通，100% 兼容 MySQL 8.0 协议；
   - 成功执行表结构初始化（`users`, `conversations`, `messages`, `settings`）；
   - 自动灌入 10 位演示种子用户账号。
2. **Render Web Service 后端**：
   - Python 3.11 原生环境运行，成功挂载 TiDB 云库，提供稳定的 HTTPS API 与常驻全双工 WSS 连接；
   - 公网接口健康检查 `GET /api/health` 200 响应。
3. **Cloudflare Pages 前端双端**：
   - `aiservice-toc.pages.dev`（C 端商城），支持 PC/移动自适应；
   - `aiservice-tob.pages.dev`（B 端智能坐席工作台），集成 `@ant-design/x`。
4. **`README.md` 全面重构**：
   - 融入 `docs/产品介绍.md` 核心精髓与 16 张真实环境运行截图；
   - 提炼四大核心技术亮点与面试高频剖析（Vision 多模态 Base64 穿透、RAG 切词加权与拒答高压线、复合主键会话模型、双层 AI 托管状态机与 Never-throw 存储设计）。

**测试标准 (DoD)**
- [x] TiDB Cloud 远程直连成功，表结构与种子数据注入完毕。
- [x] Render 后端部署上线，成功接管 TiDB 数据库。
- [x] Cloudflare 双端配置与构建指令配置完毕。
- [x] 根目录 `README.md` 重构交付，技术亮点与面试引导清晰完备。

---

## 🛡️ 4. AI 执行铁律 (Absolute Guardrails)

1. **拒绝假想代码**：严禁在代码块中使用 `// ... existing code` 或 `// TODO: implement later`。给出的代码必须是 100% 完整、可直接粘贴运行的。
2. **防沉迷日志**：每一个关键组件的顶部，必须添加中文的变动日志（如修改时间、修改人、修改逻辑）。
3. **自测闭环**：如果不确定一个命令是否有效，先自己写个脚本测一下，不要让主进程崩溃。
4. **清理副作用**：所有的 WebSocket 监听、`useEffect` 轮询，必须有严格的卸载清理 (`cleanup`) 函数，严防内存泄漏！

