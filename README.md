# 🤖 AI 智能电商客服全栈系统 (AI Customer Service Full-Stack)

<div align="center">

> **「AI 负责效率，人工负责责任」** —— 一套基于 **Next.js 16 + FastAPI + TiDB Cloud + 多模态 Vision + 双向 WebSocket** 的企业级智能客服系统闭环。

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016%20(App%20Router)-black.svg?style=flat-square&logo=next.js)](https://nextjs.org)
[![Ant Design X](https://img.shields.io/badge/UI-Ant%20Design%20X%20%2F%20antd%206-1677ff.svg?style=flat-square)](https://x.ant.design)
[![TiDB Cloud](https://img.shields.io/badge/Database-TiDB%20Cloud%20Serverless-F32C42.svg?style=flat-square&logo=pingcap)](https://tidbcloud.com)
[![Render](https://img.shields.io/badge/Deploy-Render.com-46E3B7.svg?style=flat-square&logo=render)](https://render.com)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020.svg?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com)

[公网体验 (Demo)](#-公网在线体验) • [核心技术亮点](#-核心技术亮点与面试深度剖析) • [系统架构图](#-系统架构) • [功能全景与截图](#-功能全景与真实运行图) • [本地极速启动](#-本地极速启动) • [English README](./README.en.md)

</div>

---

## 🌐 公网在线体验

本系统已实现 **全链路云原生生产化托管**，零服务器费用运行于全球高可用边缘计算网络：

| 端口 | 访问地址 | 说明 / 体验账号 | 托管平台 |
| :--- | :--- | :--- | :--- |
| **🛍️ C端顾客商城 (PC / 移动自适应)** | [https://aiservice-toc.pages.dev](https://aiservice-toc.pages.dev) | 测试账号：`13800000001`，密码：`123456` | **Cloudflare Pages** |
| **🎧 B端坐席工作台** | [https://aiservice-tob.pages.dev](https://aiservice-tob.pages.dev) | 管理访问口令：`admin123` | **Cloudflare Pages** |
| **⚡ 后端 API / WebSocket 中枢** | `https://aiservice-backend.onrender.com` | `/docs` 交互式 Swagger API 文档 | **Render (Singapore)** |
| **🗄️ 分布式关系与向量数据库** | *TiDB Cloud Serverless (AWS Singapore)* | 100% MySQL 8.0 兼容云端底座 | **TiDB Cloud** |

---

## 💡 为什么做这个系统？(核心痛点与工程哲学)

市面上大部分号称“AI 客服”的项目，往往只是简单调一下 OpenAI 聊天接口套个对话框。但**在真实电商和企业级场景下，这种纯 Chatbot 根本无法上线**：

1. **幻觉与责任不可控**：顾客询问发货规则、退换货条款时，AI 容易凭空编造；一旦顾客上传商品破损照片询问是否属于质量问题，AI 乱下结论会导致商家面临严重售后纠纷与赔偿。
2. **缺乏多店铺与上下文隔离**：同一顾客在商城里往往会同时咨询多家店铺的多个商品，如果只按用户 ID 聚合会话，坐席看到的是一锅粥。
3. **“人工接管”形同虚设**：很多系统虽然有“人工客服”，但坐席介入后，AI 依然在后台抢答；或者页面一刷新，人工接管的状态就丢失了。

**本项目的核心设计哲学：`AI 负责效率，人工负责责任`**。
* **事实类咨询**：RAG 检索知识库并基于图文快速准确回答，给出引用依据。
* **争议类与责任判定**：AI **只客观描述所见事实**，严禁擅自下定论，并**强制触发人工介入并切断 AI 托管**，由人工坐席在工作台最终敲定。

---

## 🏗️ 系统架构

系统分为两个独立的前端应用和一个 Python FastAPI 高并发通信中枢：

```
                          ┌───────────────────────────┐
                          │   顾客 / 移动端微信扫码     │
                          └─────────────┬─────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
                 ▼                                             ▼
  ┌───────────────────────────────┐             ┌───────────────────────────────┐
  │      C 端商城前端 (toc)        │             │      B 端坐席工作台 (tob)     │
  │  Next.js 16 / React 19 / TS   │             │  Next.js 16 / React 19 / TS   │
  │  PC: antd v6 大弹窗沉浸客服    │             │  Ant Design X 原生 AI 气泡    │
  │  移动: antd-mobile 原生 App 态│             │  多坐席状态同步 / 快捷短语    │
  └──────────────┬────────────────┘             └──────────────┬────────────────┘
                 │ HTTP / REST                                 │ WebSocket /ws/agent
                 │ WebSocket /ws/c/{user_id}                   │ REST /api/conversations
                 └──────────────────────┬──────────────────────┘
                                        │
                                        ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                          FastAPI 后端异步引擎 (backend)                      │
  │                                                                             │
  │  ┌─────────────────────────┐  ┌────────────────────────┐  ┌──────────────┐  │
  │  │ 双向 WebSocket 通信 Hub  │  │   会话/消息持久化引擎   │  │ 图片落盘与   │  │
  │  │ (坐席广播 / 客户流式推包)│  │ (永不抛异常 / 容错降级)│  │ Base64 转换  │  │
  │  └─────────────────────────┘  └────────────────────────┘  └──────────────┘  │
  │  ┌─────────────────────────┐  ┌────────────────────────┐  ┌──────────────┐  │
  │  │ RAG 检索引擎 (FTS5)     │  │ AI 托管两级仲裁状态机  │  │ 人工接入判定 │  │
  │  │ (虚词过滤 / 标题加权)   │  │ (会话覆盖优先于全局)   │  │ (双触发源)   │  │
  │  └─────────────────────────┘  └────────────────────────┘  └──────────────┘  │
  └──────────────────────┬───────────────────────────────┬──────────────────────┘
                         │                               │
                         ▼                               ▼
      ┌────────────────────────────────────┐   ┌────────────────────────────────┐
      │       TiDB Cloud Serverless        │   │      Dots 模型网关 (Vision)    │
      │  users / conversations / messages  │   │  OpenAI 兼容协议 / 识图与推理   │
      └────────────────────────────────────┘   └────────────────────────────────┘
```

---

## 🌟 核心技术亮点与面试深度剖析

### 1. 多模态 Vision 识图与公网 Base64 安全穿透
* **工程陷阱**：在本地开发或私网部署时，用户上传的图片保存在后端容器内（如 `http://localhost:8080/uploads/...`）。当把这个相对地址直接送入大模型时，**公网上的模型网关根本无法回连开发者的私网地址，直接导致识图失败**。
* **解法**：在后端设计专用图片处理层 `chat_images.py`。落库时仅存储相对路径（换域名端口不丢失历史）；当将图片提交给大模型做 Vision 分析时，在内存中安全读盘转为 **Base64 Data URL**，以 OpenAI 标准图文协议（`[{type: "text"}, {type: "image_url"}]`）内联穿透，实现在公网模型下 100% 稳定识图。
* **AI 责任边界硬防御**：在 Prompt 中固化责任判定规则 —— 面对“耳机外壳有裂痕算质量问题吗”这类争议性提问，AI 仅被允许客观描述“图片外壳可见裂痕”，**绝对禁止直接承诺商家赔付**，并自动下发转人工指令。

### 2. 细粒度 RAG 知识检索与“严禁编造”兜底
* **虚词过滤与切词加权**：针对中文咨询特点，建立了中文虚词黑名单与 2/3-gram 算法，过滤“怎么/么选/能不能”等高频功能词干扰；对文档标题设定 **3.0 权重**，避免“猫砂怎么选”误命中不相干的“机械键盘轴体怎么选”。
* **严格拒答红线**：相关度下限设定为 `0.30`，未命中的库外问题一律严禁模型自由发挥，必须输出标准话术并引导转人工（触发 `ai_fallback` 人工接入流程）。

### 3. 会话维度重构：复合主键与确定性路由
* **模型设计**：放弃传统“按用户 ID 划分会话”的做法，采用**复合主键设计**：
  `id = "{user_id}::{session_key}"`（例如 `1::product:keyboard-k8pro`）。
* **架构收益**：
  - **天然去中心化推算**：前端本地状态、后端数据库主键、WebSocket 广播目标无需先通过 API 查库拿主键，两端基于当前客户和商品 ID 即可同步推算出一致的会话 ID。
  - **业务隔离**：同一顾客在商城内同时咨询“极客键盘店”和“挂耳咖啡店”时，在 B 端坐席台会清晰呈现为两条独立的会话卡片，消息互不污染。

### 4. 双层 AI 托管状态机与人工接管平滑过渡
* **问题痛点**：客服系统中，坐席手动介入后，AI 容易并发抢答，造成客户体验割裂。
* **两级仲裁机制**：
  - **全局开关**：存储在 `settings` 表，控制全店机器人总开关；
  - **会话级开关**：存储在 `conversations.ai_managed`，**会话级状态严格优先于全局开关**。
* **状态机闭环**：当顾客触发转人工意图或 AI 检索不到答案时，系统在落库的同时**原子化将该会话的 `ai_managed` 设为 `False`**，并通过 WebSocket 广播 `ai_custody` 事件，多坐席屏幕秒级同步“已转人工”红标；此后该会话中客户的新发消息只入库并推送到坐席台，AI 不再作答。

### 5. 高鲁棒性容错设计 (Never-Throw Store)
* `conversation_store.py` 的持久化写入方法全部采用“永不抛出（Never-throw）”的设计理念。即便数据库出现短暂网络抖动，数据落盘失败也仅打印日志警告，**绝不中断正在进行的流式对话和 WebSocket 广播主链路**。
* C 端前端支持跨设备反向同步：登录后自动从后端拉取历史，且本地刚进入商品客服、尚未发送消息的临时会话不会被服务端数据冲掉。

---

## 🖼️ 功能全景与真实运行图

> 以下均为在真实环境采集的系统运行截图，非设计稿。

### 1. C 端 · PC 宽屏电商商城
| 首页商品墙 (10大品类/独立店铺) | 商品详情页 (规格/卖点透出) |
| :---: | :---: |
| ![PC首页](docs/screenshots/pc-01-home.png) | ![PC商品详情](docs/screenshots/pc-02-product.png) |

| 客服大弹窗 (图文混排/AI识图应答) | 规范化发图菜单 (支持拖拽/Ctrl+V粘贴) |
| :---: | :---: |
| ![PC客服](docs/screenshots/pc-03-chat.png) | ![PC发图菜单](docs/screenshots/pc-05-plus-menu.png) |

### 2. C 端 · 移动端原生 App 体验
| 移动端双列商城瀑布流 | 移动端商品详情操作条 | 客服会话列表 (店铺多路归集) |
| :---: | :---: | :---: |
| ![移动首页](docs/screenshots/m-01-home.png) | ![移动详情](docs/screenshots/m-02-product.png) | ![会话列表](docs/screenshots/m-04-service-list.png) |

| 移动端对话流 (AI收到实拍图) | 移动端多图缩略与删除 | 人工接待态全屏感知 |
| :---: | :---: | :---: |
| ![移动对话](docs/screenshots/m-05-chat.png) | ![移动待发图片](docs/screenshots/m-07-pending-images.png) | ![人工接待](docs/screenshots/m-03-chat-page.png) |

### 3. B 端 · 高定 SaaS 智能坐席工作台 (Ant Design X)
| 坐席台全景 (店铺·客户双重视角/快捷短语) | 待接入告警 (AI识别争议自动切断托管) | 坐席全屏大图审查 (缩放/旋转) |
| :---: | :---: | :---: |
| ![坐席全景](docs/screenshots/b-01-overview.png) | ![待接入详情](docs/screenshots/b-02-handoff.png) | ![大图审查](docs/screenshots/b-03-image-preview.png) |

---

## 🚀 本地极速启动

项目提供标准的 Docker Compose 一键启动编排：

### 1. 准备大模型 API Key
在项目根目录创建 `.env` 文件（代码库已内置 Git 忽略）：
```env
# 支持小红书 Dots 网关或任意 OpenAI 兼容协议的大模型 Key
XIAO_HONG_SHU_API_KEY=your-api-key-here
```

### 2. 一键拉起三端容器
```bash
docker compose up -d --build
```
启动后访问端口：
* **C 端商城**: `http://localhost:3000`
* **B 端坐席工作台**: `http://localhost:3001`
* **后端 API 文档**: `http://localhost:8080/docs`

### 3. 灌入 16 篇商品与政策知识库（幂等执行）
```bash
docker compose exec -T backend python scripts/seed_kb.py
```

### 4. (可选) 注入逼真的多会话演示数据
```bash
docker compose exec -T backend python scripts/seed_demo.py
```

---

## 👥 预置演示测试账号

系统启动时已通过 `seed.py` 自动在数据库预装 10 个具有不同人设与购买特征的演示客户账号（统一密码：`123456`）：

| 手机号 | 姓名 | 客户画像与特征 |
| :--- | :--- | :--- |
| `13800000001` | 张伟 | 资深程序员，极简主义，偏好数码产品，讨厌推销 |
| `13800000002` | 李娜 | 美妆达人，关注成分与包装颜值，喜欢平替好物 |
| `13800000003` | 王强 | 健身教练，关注高蛋白营养配比与低脂零食 |
| `13800000004` | 赵敏 | 新手宝妈，对母婴产品安全成分极度敏感 |
| `13800000005` | 陈杰 | 数码发烧友，大学生，极度追求性能跑分 |
| `13800000006`~`10` | 杨洋、周游等 | 职场新人、户外博主、铲屎官、茶艺师、二次元画师等 |

* **B 端坐席访问凭证**：访问 `http://localhost:3001`，输入管理口令 `admin123` 即可登录工作台。

---

## 📂 项目工程目录树

```
aiservice/
├── backend/                      # Python FastAPI 后端中枢
│   ├── ai_engine.py              # LLM 调用内核 (Prompt工程 / Vision多模态组装 / 识图硬规则)
│   ├── rag.py                    # RAG 检索引擎 (FTS5全文检索 / 虚词过滤 / 标题3倍加权)
│   ├── handoff.py                # 人工接入规则判定器 (用户主动请求 / AI回答兜底)
│   ├── conversation_store.py     # 会话与消息持久化存储层 (永不抛异常设计)
│   ├── chat_images.py            # 聊天图片本地落盘与公网 Base64 转换工具
│   ├── models.py / database.py   # SQLAlchemy 数据模型与 SQLite/TiDB 兼容层
│   ├── routers/                  # 模块化路由 (chat, ws, conversation, custody, upload, kb)
│   └── scripts/                  # seed.py (种子用户), seed_kb.py (知识库), seed_demo.py (演示会话)
├── toc/                          # C 端顾客商城应用 (Next.js 16 + React 19)
│   ├── components/shop/          # 商城组件 (ProductGrid, PcChatModal, ProductCard 等)
│   ├── components/chat/          # 聊天组件 (ChatComposer, ChatMessageList, ImagePreview 等)
│   ├── components/views/         # 双端异构视图 (MobileView 移动端, DesktopView PC端)
│   └── lib/                      # api.ts (客户端直连), chatStore.ts (会话存储), theme.ts
├── tob/                          # B 端坐席工作台 (Next.js 16 + Ant Design X + antd 6)
│   ├── components/AgentPage.tsx  # 坐席工作台核心 (实时流监听 / AI托管控制 / 快捷短语)
│   └── lib/api.ts                # 坐席台 REST & WS 接口封装
├── docs/                         # 项目全套架构文档与自动化采集的 16 张运行截图
├── product.md                    # 产品需求文档 (PRD)
├── technical_implementation.md   # 技术实现规范与详细架构文档
├── testing.md                    # 端到端测试与质量验收策略 (Testing Strategy)
├── render.yaml                   # 云端 Render Web Service 自动化部署规范
└── docker-compose.yml            # 本地多容器编排标准
```

---

## 📄 License

本项目采用 [MIT License](LICENSE) 开源协议。
