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
- **设计风格**：顶级 SaaS 科技感，推荐使用深浅色自适应模式，默认以深色 (Dark Mode) 为主色调增加专业感。
- **主题配色**：主色调 (Primary Color) `#1677ff` (Ant Design 默认蓝)，背景使用深空灰 `#141414`，卡片背景 `#1f1f1f`。
- **推荐核心组件 (Ant Design X)**：
  - 对话气泡：`<Bubble />` (支持 markdown 渲染)。
  - 会话列表：`<Conversations />`。
  - 请求集成：使用 `useXChat` 和 `<XRequest />` 管理流式对话。
  - 提示词推荐：`<Prompts />`。
- **布局设计**：经典的左右分栏。左侧 `<Layout.Sider>` 深色导航，右侧 `<Layout.Content>` 显示知识库大盘与实时坐席。

### 2.2 C端前端 (`toc` - 移动端视图)
- **设计风格**：极简电商 App，纯正原生体验。背景采用微灰 `#f5f5f9` 衬托纯白卡片。
- **推荐核心组件 (antd-mobile)**：
  - 底部导航：`<TabBar />` (置底，包含首页、消息、我的)。
  - 顶部导航：`<NavBar />`。
  - 列表呈现：`<List />` 和 `<Card />`。
  - 对话流输入：吸底固定布局（避免被手机软键盘遮挡）。

### 2.3 C端前端 (`toc` - PC端视图)
- **设计风格**：类似网页版 ChatGPT 的宽屏高效工作流。
- **推荐核心组件 (antd)**：
  - 整体布局：三栏结构。左侧 `<Menu />` 展示历史会话，中间显示对话流 `<List />`，右侧显示商品上下文或用户信息面板。

---

## 🚀 3. 分级开发步骤与测试标准 (Step-by-Step Execution)

> **Agent 规则**：请逐级开发。严禁跳步。每写完一个阶段的代码，必须在终端运行测试命令并确保无报错。

### Phase 0: 环境变量与网络基建 (Env & Networking)
**目标**：确立三端分离架构下的通信基石。
- [x] **步骤 0.1**：在 `backend/` 建立 `.env`，定义 `DATABASE_URL` (默认 SQLite)、`UPLOAD_DIR` (默认 `./uploads`)。
- [x] **步骤 0.2**：在 `tob/` 和 `toc/` 建立 `.env.local`，统一定义 `NEXT_PUBLIC_API_URL=http://localhost:8001` 和 `NEXT_PUBLIC_WS_URL=ws://localhost:8001`。
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
  - [x] 访问 `http://localhost:8001/docs` 能看到 Swagger UI。
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
- **测试标准 (DoD)**：
  - [x] C 端用户换号聊天，AI 的语气和回答基于前序偏好发生显著变化。
  - [x] B 端坐席界面能够实时看到 C 端弹出的对话气泡。

### Phase 5: 容器化一键部署 (Dockerization)
**目标**：包装为标准开源项目。
- [ ] **步骤 5.1**：编写 `tob`, `toc`, `backend` 的 Dockerfile。
- [ ] **步骤 5.2**：编写根目录的 `docker-compose.yml`，映射正确的端口（如 3000, 3001, 8000），挂载 SQLite 的 data 卷。
- **测试标准 (DoD)**：
  - [ ] `docker-compose up -d` 能够拉起整个体系。

---

## 🛡️ 4. AI 执行铁律 (Absolute Guardrails)

1. **拒绝假想代码**：严禁在代码块中使用 `// ... existing code` 或 `// TODO: implement later`。给出的代码必须是 100% 完整、可直接粘贴运行的。
2. **防沉迷日志**：每一个关键组件的顶部，必须添加中文的变动日志（如修改时间、修改人、修改逻辑）。
3. **自测闭环**：如果不确定一个命令是否有效，先自己写个脚本测一下，不要让主进程崩溃。
4. **清理副作用**：所有的 WebSocket 监听、`useEffect` 轮询，必须有严格的卸载清理 (`cleanup`) 函数，严防内存泄漏！
