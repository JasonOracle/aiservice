# 技术实施文档 (Technical Implementation)

> **文档订正说明（2026-09-12）**：本文档此前描述的是**早期设计构想**（shadcn/ui、TiDB Vector、
> SSE 流式、Vercel AI SDK `useChat`），与**实际实现**已严重不符，会误导后续接手的 Agent。
> 本次按 `AGENTS.md` 第 6 条「沟通即文档」的要求，依据仓库真实代码重写为**实现现状**。
> 进度与验收记录见 `docs/progress.md`（Phase 0 ~ Phase 8）。

---

## 1. 系统架构与端口

前后端分离，三端 Monorepo，全部由根目录 `docker-compose.yml` 拉起（三容器常驻）。

| 模块 | 技术栈 | 端口 |
| :--- | :--- | :--- |
| `backend` | Python 3.11+ / FastAPI / SQLAlchemy | 宿主机 **8080** → 容器内 `8000` |
| `toc`（C 端商城） | Next.js 16 App Router + React + `antd`（PC）/ `antd-mobile`（移动） | `3000` |
| `tob`（B 端坐席台） | Next.js 16 App Router + `Ant Design X`（含 `antd`） | `3001` |

- **注意**：早期文档写的 `8001` 是过时信息，已全部订正为 `8080`。前端 `.env.local` 与
  `toc/lib/api.ts` 的兜底默认值均为 `8080`。
- **前端不使用** Tailwind CSS 与 shadcn/ui（`AGENTS.md` 已明确废弃 shadcn，全面转向 Ant Design 生态）。
- 前端**不经过 Next.js Server API 代理**，一律**纯客户端 Fetch / WebSocket 直连 FastAPI**，
  依赖后端全局 CORS 放行。

### 1.1 数据与检索层（实现现状）
- **开发环境**：**SQLite** 单库承三件事 —— 关系型数据（`users` 表）、RAG 知识切片、Mem0 记忆。
- **RAG 检索引擎**：`backend/rag.py`，基于 **SQLite FTS5 的中文关键词检索**，
  **并非向量检索**，也**没有** Embedding / 余弦相似度：
  - 中文按 **2/3-gram 切分**（不引入分词库），英文按单词切分；
  - 中文**虚词黑名单**（`NOISE_NGRAMS`）+ `FUNC_CHARS` + `_is_noise()` 过滤「怎么 / 么选」类噪声；
  - **标题加权** `TITLE_WEIGHT = 3.0`；
  - **相关度下限** `MIN_RELEVANCE = 0.30`，低于阈值不召回（宁可转人工，不喂噪声）；
  - **不使用 SQL `LIMIT` 截断候选择**（否则排在物理行后面的主题文档会永不被打分）。
- **Mem0 长期记忆**：`backend/memory.py`（`MemoryManager`），底层同样是 SQLite。
  首次聊天时用用户的 `traits` 冷启动写入画像，实现「千人千面」。
- **TiDB Serverless** 仍是 `AGENTS.md` 设定的**生产目标**，当前 MVP 未接入。

---

## 2. 数据模型

### 2.1 `users`（用户表，SQLAlchemy ORM）
- `id`、`phone`（手机号，登录账号）、`password_hash`（哈希）、`name`、
- `traits`（角色画像文本，用于 Mem0 冷启动）。
- 10 个演示种子用户由 `backend/scripts/seed.py` 注入，统一密码 `123456`。

### 2.2 `conversations`（会话表）与 `messages`（消息表）

**会话粒度 = 客户 × 店铺 × 商品**：同一名客户在多家店铺 / 多个商品下的咨询**各自独立成条**。
B 端坐席台因此能区分「张伟在极客方舟旗舰店问键盘」与「张伟在晨语咖啡问咖啡豆」两路并行会话，
这正是「左侧列表显示『店铺名 · 客户名』」的数据基础。

- **会话 ID 约定**：`id = "{user_id}::{session_key}"`，例如 `1::product:keyboard-k8pro`。
  采用**可读复合键**，前后端各自推算、无需先查库拿 ID：
  - 前端本地会话 id 即 `session_key`：`store`（店铺总客服）或 `product:{productId}`；
  - 分隔符 `::` 在 `backend/conversation_store.py`（`CONV_ID_SEP`）与
    `toc/lib/chatStore.ts`（`toBackendConvId` / `fromBackendConvId`）两侧约定一致。
  - ⚠️ 接口路径中含 `:`，前端调用须 `encodeURIComponent`。
- `conversations` 字段：`user_id`、`session_key`、`product_id` / `product_name` / `store_name`、
  冗余摘要 `last_message` / `last_role` / `last_active_at`（毫秒）、**待接入状态**
  `handoff_reason`（`user` / `ai_fallback`）/ `handoff_at`，以及**会话级 AI 托管覆盖**
  `ai_managed`（见 2.4）。
- `messages` 字段：`conversation_id`、`role`（`user` / `assistant` / `agent` / `system`）、
  `content`、`created_at`（毫秒时间戳，与前端一致），以及 **`images`**（`Text`，JSON 数组字符串，
  元素为相对路径如 `/uploads/chat/2026-09/xxx.jpg`；纯文字消息为 `NULL`）。
  **纯图片消息（无文字）**入库时 `content` 为空串，会话摘要自动显示为 `[图片]`。
- **读写层**：`backend/conversation_store.py` 提供 `ensure_conversation()` / `add_message()` /
  `mark_handoff()` / `clear_handoff()` 以及托管状态读写（见 2.4）；
  **全部为「永不抛出」的容错设计** —— 持久化失败只打日志，绝不打断聊天与广播主链路。
- 建表位置：`backend/main.py` 的 `Base.metadata.create_all(...)`。

### 2.3 `settings`（全局配置表）

`{ key (PK), value, updated_at }` 的简单键值表，目前只承载**全局 AI 托管总开关**
（`key = ai_managed_global`，`value = "true" / "false"`）。

之所以落库而非放在内存：**B 端坐席关掉托管后，刷新页面、重启后端都必须保持一致**。

> ⚠️ SQLite 无迁移框架，`create_all` **只建新表、不会给已有表补列**。
> 后加的列由 `backend/database.py` 的 `ensure_schema()` 在启动时**幂等补齐**
> （当前补列项：`conversations.ai_managed`、`messages.images`），失败不阻断启动。

### 2.4 AI 托管状态（两级仲裁）

| 层级 | 存储位置 | 语义 |
| :--- | :--- | :--- |
| 全局总开关 | `settings.ai_managed_global` | 对所有**未单独设置**的会话生效 |
| 会话级覆盖 | `conversations.ai_managed` | `True` / `False` 为显式设置；`NULL` 表示**跟随全局** |

- **唯一仲裁入口**：`conversation_store.is_ai_managed(db, conv_id)` ——
  **会话级优先，未设置时回落全局**；会话不存在或读取异常时回落全局（宁可让 AI 正常，也不要静默全站失效）。
- **关闭托管后的行为**：客户消息**照常落库并推送到坐席台**，但 `AI 不生成回复`，
  即「AI 不再抢答，改由人工接待」。
- **命中人工接入即自动关闭**：`mark_handoff()` 内部会把 `ai_managed` 置为 `False` 并持久化，
  因此刷新 / 重启后依然保持「人工接待中」。
- **人工坐席回复后保持关闭**：`/ws/agent` 处理 `agent_message` 时显式 `set_session_ai_managed(cid, False)`，
  避免人工接手后 AI 又插话。

### 2.5 RAG 文档与切片
- 文档原文入库，按段落切分为 chunk 供 FTS5 检索；
- 种子知识库由 `backend/scripts/seed_kb.py` 灌入（**幂等**：先按文件名删旧文档再插入）：
  当前 **16 篇文档 / 36 切片**（10 个商品说明书 + 价格与优惠 / 物流配送 / 支付与发票 /
  售后与退货换货政策 / FAQ / 商城总览）。
- ⚠️ 均为**演示占位内容**，正式上线须替换为真实业务政策。

---

## 3. 核心 API 与消息协议

### 3.1 HTTP 接口（FastAPI）

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | 手机号 + 密码登录，返回 `{access_token, token_type, user_id, name}` |
| `POST` | `/api/chat` | **需 Bearer Token**。入参 `{message, session_id, product_id, product_name, store_name, images[]}`，出参 `{reply, sources[], conversation_id, ai_managed}`；同时**落库并广播**。⚠️ **允许「空文字 + 有图」**（文字与图片至少有一，否则 422） |
| `POST` | `/api/upload` | **需 Bearer Token**。multipart 单张图片（字段名 `file`），返回 `{url, size}`；`url` 为相对路径，前端用 `mediaUrl()` 拼成完整地址 |
| `GET` | `/uploads/...` | 静态图片访问（`StaticFiles` 挂载），由 `/api/upload` 写入 |
| `GET` | `/api/conversations` | 会话列表（按最后活跃倒序，可按 `user_id` 过滤），含 `handoff_reason` 与 `ai_managed`——**B 端坐席台左侧列表数据源**；C 端也用它对账同步 |
| `GET` | `/api/conversations/{id}/messages` | 某会话完整历史消息（按时间正序，**含 `images`**）——B 端点击会话时加载，C 端反向同步时加载 |
| `GET` | `/api/ai-custody` | 读取 AI 托管状态：`{global: bool, sessions: {conv_id: bool}}` |
| `PUT` | `/api/ai-custody` | 设置托管开关：`{enabled, conversation_id?}`；`conversation_id` 留空即设置**全局** |
| `GET` | `/api/users` | 全部种子用户（B 端历史遗留接口，现主要用于用户信息查阅） |
| `GET` | `/api/health` | 健康检查，返回 `{status, llm_configured, model}` |
| `GET/POST` | `/api/kb/*` | 知识库大盘数据（文档数、切片数等） |
| `GET` | `/docs` | Swagger UI |

**`/api/chat` 执行链路**（`backend/routers/chat.py`）：
1. 首次聊天时用 `traits` 冷启动 Mem0；
2. 按 `session_id` 推算会话 ID，`ensure_conversation()` 确保会话存在并补全商品 / 店铺元信息；
3. **客户提问落库**（`messages`）；
4. **★ AI 托管仲裁**：`is_ai_managed(conv_id)` 判定本会话是否应由 AI 应答；
   - **关闭** → 跳过第 5 步，只把客户消息广播给坐席台，返回 `ai_managed=false`、`reply=""`、`sources=[]`；
   - **开启** → 继续往下；
5. `stream_ai_response()` 聚合流式输出为完整回复（内部完成 RAG 检索 + Mem0 记忆注入 + 兜底约束）；
6. **AI 回复落库**，并刷新会话摘要（`last_message` / `last_active_at`）；
7. 向 B 端广播 **① 用户提问** 与（托管开启时）**② AI 回复**（`type=chat_stream`，带 `role`、会话上下文与 `ai_managed`）；
8. 调用 `detect_handoff()`，命中则 `mark_handoff()` **持久化待接入状态 + 关闭该会话 AI 托管**，
   并追加广播 **③ `handoff_request`** 与 **④ `ai_custody`**；
9. 返回 `reply`、RAG 来源 `sources`（文件名 + 相关度）、`conversation_id` 与 `ai_managed`。

> 注意：接口**不是 SSE 流式返回**给前端，前端拿到的是一次性 JSON；流式只发生在后端与模型之间。

### 3.2 WebSocket 通道

| 通道 | 方向 | 用途 |
| :--- | :--- | :--- |
| `/ws/agent` | B 端坐席订阅 | 接收所有 C 端会话广播；**上行** `agent_message` 发送人工回复 |
| `/ws/c/{user_id}` | C 端订阅 | **仅用于接收**人工客服回复 `agent_reply` 与托管状态 `ai_custody` |

B 端会收到的广播消息类型：

| `type` | 附加字段 | 触发时机 |
| :--- | :--- | :--- |
| `chat_stream` | `role`（`user` / `assistant`）、`content`、**`images[]`**、`at`、`user_id`、`user_name`、`user_phone`、**`conversation_id`**、**`product_name`**、**`store_name`**、**`ai_managed`** | 用户提问、AI 回复 |
| `handoff_request` | `content`（用户原话；纯图片消息为 `[图片]`）、**`images[]`**、`reason`、`at`、`conversation_id` 等同上一行 | 判定为「请求人工接入」 |
| `ai_custody` | `scope`（`global` / `session`）、`conversation_id`、`enabled`、`reason`（`manual` / `handoff`）、`at` | 任一坐席改动托管开关，或命中人工接入自动关闭 |
| `agent_reply` | `content`、**`images[]`**、`conversation_id`、`at` | 人工坐席插话（可带图），下发到 C 端 |
| `ai_reply` | `content`、`conversation_id`、`ai_managed` | `/ws/c/{user_id}` 的 `chat` 分支回复给客户端 |

- **`conversation_id` 是 B 端归集与 C 端投递的关键字段**：B 端据此把消息落到「店铺 · 客户」条目；
  C 端据此把人工回复投进对应会话（而不再一律投给「当前正在查看的会话」）。
- `ai_custody` 同时下发给**坐席台**（多坐席浏览器实时同步开关）与**对应客户**（C 端显示「人工接待中」）；
  全局变更的 `conversation_id` 为空串。
- 人工坐席回复（`agent_message` 上行）**必须携带 `conversation_id`**，后端据此：
  ① 落库为 `agent` 角色；② `clear_handoff()` 清除待接入标记；③ 保持该会话 AI 托管为**关闭**。

> ⚠️ C 端发消息走 **HTTP `POST /api/chat`**，`/ws/c/{user_id}` 不承担发消息职责
> （其 `chat` 分支同样实现了完整落库、托管仲裁与广播，供直接走 WS 的客户端使用）。

### 3.3 「请求人工接入」判定（`backend/handoff.py`）

```python
detect_handoff(user_message, ai_reply) -> (need: bool, reason: str)
# 返回 (True, "user")        —— 用户主动说要人工
# 返回 (True, "ai_fallback") —— AI 检索不到、按高压线兜底提示「请转人工」
# 返回 (False, "")           —— 无需接入
```

- **用户主动要人工 与 AI 兜底提示转人工，两者都算一次「请求人工接入」**（产品明确要求）。
- 关键词**刻意不含裸词「人工」**，避免「人工智能」「人工湖」等误触发。
- **判定必须在后端做**：`routers/chat.py`（HTTP 通道）与 `routers/ws.py`（WS 通道）
  **两条路径都要广播** `handoff_request`，否则从 WS 发起的会话会漏报。
- **AI 托管关闭时不重复判定**：会话已在人工通道，再发消息不应反复触发告警。
- 命中后 `mark_handoff()` 把待接入状态**持久化到 `conversations` 表**（`handoff_reason` / `handoff_at`），
  **并同时关闭该会话的 AI 托管**（`ai_managed = False`），因此 B 端**刷新页面后红标不丢、
  也不会出现 AI 继续抢答**；人工坐席回复后由 `clear_handoff()` 清除红标（托管保持关闭）。
- B 端 `tob/components/AgentPage.tsx` 收到后：弹通知告警（标题含店铺名）+ 该会话条目红色
  「待接入」Tag + 自动切到该会话 + 消息流插入 system 提示条 + 同步显示「本会话: 人工接待中」。

### 3.4 图片消息链路（双向 + AI 识图）

**存储**：图片落盘在 `UPLOAD_DIR`（容器内 `/app/uploads`，即 `backend_uploads` 卷），
按 `uploads/chat/YYYY-MM/{uuid}.{ext}` 分目录存放；**数据库只存相对路径**，
前端用 `mediaUrl(relPath)` 拼上 `NEXT_PUBLIC_API_URL` 得到完整地址——
这样**换域名 / 换端口都不需要改库里的数据**，也避免把 localhost 硬编码进消息体。

**上传流程**（C 端 `ChatComposer` 与 B 端 `AgentPage` 同款）：
1. 三种入口：**点输入框左侧的「+」**（弹出小菜单：移动端「拍照 / 从相册选择」，
   桌面端「选择图片」）、**拖拽**入窗、**`Ctrl+V` 粘贴**（光标在输入框内时生效）；
   随后浏览器端压缩（长边 ≤ 1600px、JPEG 0.8，见 `lib/imageCompress.ts`）；
2. **逐张**调用 `POST /api/upload`（便于逐张展示上传状态与失败重试）；
3. 缩略图显示在**输入框上方**，右上角 × 可删；**任一图仍在上传中则发送按钮禁用**；
4. 发送时把已上传成功的 URL 数组随消息一起提交（`images`），**文字与图片可任意组合**（也允许只发图）；
5. 单条最多 3 张，**超出部分直接拒收并提示**（已选中的 3 张保持不动）。

**AI 识图**（`backend/ai_engine.py`）：
- `stream_ai_response(..., image_urls=[])` 把图片**转成 base64 data URL** 后拼成 OpenAI 图文数组。
  ⚠️ **必须走 base64**：模型在公网，**拿不到我们 localhost 上的图片**，直接传相对路径无效。
- 网关 `dots3-note-prev` **原生支持 vision**（已实测，详见 `docs/progress.md` Phase 10）；
  该模型是**推理型**（返回 `reasoning_content`），带图单轮约 5–15 秒。
- **识图硬约束（写在 system prompt 里，防幻觉）**：
  - **事实类**（这是什么 / 什么颜色 / 图上文字 / 怎么用）→ 结合图片与知识库**直接回答**；
  - **争议类**（质量判定、责任归属、赔偿退换）→ **只客观描述所见 + 引用知识库条款，
    最终判定交人工**（实测会回答「外壳确实有明显裂纹…需要人工客服核实」并自动转人工）；
  - 看不清 → 明说「看不清」并请用户重拍，**严禁猜测**。

---

## 4. 前端状态管理（C 端）

**不使用 Vercel AI SDK / `useChat`**，改为自建的 Context + Hook 体系：

- `toc/components/AppProviders.tsx`：挂在**根 layout**上，组合 `ConfigProvider(antdTheme)` + `ChatProvider`。
- `toc/components/chat/ChatProvider.tsx`：
  - 全局持有全部会话与消息，对外暴露 `send()` / `markRead()` / `ensureConversation()` /
    `refresh()` / `aiManagedOf()`；
  - **`refresh()` = `syncFromBackend()`**：登录后、进入「客服」列表、打开 PC 客服弹窗时，
    从 `GET /api/conversations` + `GET /api/conversations/{id}/messages` 拉回会话与历史，
    与本地记录合并（**服务端为准**）—— 这是「**换设备 / 换浏览器 / 清缓存后仍能看到完整记录**」的实现；
  - `send()` 把**会话上下文一并提交**（`session_id` / `product_id` / `product_name` / `store_name`），
    后端据此按「客户 × 店铺 × 商品」落库，B 端列表才能显示店铺；
  - `send()` 依据响应里的 **`ai_managed`** 决定气泡类型：`true` → 追加 AI 回复；
    `false` → 追加 **system 提示「已为您转接人工客服，请稍候」**（避免出现空气泡）；
  - 收到人工回复时依据 `conversation_id` **精确投递**到对应会话；该 ID 缺失、或本地已无此会话时，
    才回退到「当前正在查看的会话」→「最近活跃的会话」；
  - 收到 `ai_custody` 时更新该会话接待态，供聊天头部显示「人工接待中」；
  - **全局只建立一条 WebSocket**（`/ws/c/{user_id}`），避免 PC 弹窗与移动端页面各自建连导致
    重复连接与状态分裂；
  - 它挂在根 layout、**不随路由卸载**，因此必须监听 `pathname` 变化重新比对 localStorage 中的
    `user_id` / `token`，否则「先开登录页再登录」会沿用旧用户（演示账号换号会串数据）。
- `toc/lib/chatStore.ts`：localStorage 持久化，key = `toc_convs_{userId}`（**按用户隔离**）。
  消息带 `createdAt` 毫秒时间戳；会话按 `lastActiveAt` 倒序。
  - 默认一条 `store` 会话（AI 客服）；从商品详情页进客服时新建 `product:{productId}` 会话 ——
    这正是「详情页点客服后，客服 Tab 会多一条会话」的实现方式。
  - `toBackendConvId()` / `fromBackendConvId()`：本地会话 id 与后端会话 id（`{userId}::{本地id}`）
    互转，是 C 端与 B 端会话对齐的桥梁。
  - `convFromBackend()` / `mergeBackendConversations()`：把后端会话与历史消息转换为本地结构并合并 ——
    **后端存在的会话以后端为准**；**本地独有**的会话再分两种处理：
    - 含 `user` 角色消息 → **丢弃**（说明服务端曾有记录，如今后端列表里没有它，即已被服务端删除；
      否则会出现「后端删了、前端还在」的假数据）；
    - 仅含欢迎语、从未发出消息 → **保留**（否则刚点进商品客服的欢迎语会被合并冲掉）。
  - 时间显示规则：跨天必显示；同一天内与上一条间隔 ≤ 5 分钟则不重复显示。
- `toc/lib/products.ts`：**C 端商品唯一数据源**（10 商品 × 10 家不同店铺）。
- `toc/lib/useDevice.ts`：设备判定 Hook（移动 UA 或视口 < 768px → mobile），
  监听 `resize` 可在双端版式间切换，供首页与商品详情页共用。

### 4.1 C 端双端版式与交互差异

| | 移动端（`antd-mobile`） | PC 端（`antd`） |
| :--- | :--- | :--- |
| 首页 | Hero + **2 列商品网格** | 顶部导航 + Hero + 多列商品网格 |
| 底部/主导航 | `<TabBar />` **仅「首页 / 客服」** | 顶部导航「客服」入口 |
| 客服交互 | 详情页「客服」→ 跳 `/chat?productId=xxx`（**拼多多逻辑**，返回即回详情页） | 弹 **`PcChatModal` 大弹窗**（淘宝逻辑：左会话列表 + 右聊天） |
| 详情页 | `MobileProductDetail` | `DesktopProductDetail` |
| 接待态提示 | 聊天头部副标题追加「（人工客服接待中）」 | 聊天头部显示橙色「人工接待中」Tag |

- 路由：`app/product/[id]/page.tsx`（商品详情，双端异构）、`app/chat/page.tsx`（移动端聊天页，
  支持 `?productId` / `?conv`）、`app/login/page.tsx`。
- 主色：品牌橙 `#FF6A00`（`toc/lib/theme.ts` 的 `BRAND` / `antdTheme`）。

### 4.2 B 端（`tob`）
- `AdminShell.tsx` 侧边导航；`AgentPage.tsx` 实时坐席；`KBPage.tsx` 知识库大盘；
  `ModelsPage.tsx` 模型中心。
- 对话气泡用 Ant Design X 的 `<Bubble />`，会话列表用 `<Conversations />`。
- **会话列表与聊天记录均来自后端**（`GET /api/conversations` 与
  `GET /api/conversations/{id}/messages`），**不再存放于浏览器内存**（原实现刷新即归零）：
  - 列表项标题为「**店铺名 · 客户名**」，副标题为「商品名 · 最后一条消息」，
    使同一客户的多店铺咨询各自独立成条；已转人工的会话额外挂灰色「人工」小标；
  - 点击会话按需拉取历史（`loadedRef` / `loadingRef` 双重去重，避免并发重复请求）；
  - 进入会话与来新消息时**自动滚动到最后一条**（`scrollRef` + `scrollTop = scrollHeight`）；
  - 待接入红标来自会话的 `handoff_reason`，**刷新后不丢**（人工回复后由后端清除）。
- **双层 AI 托管仲裁（已真正生效）**：全局总开关 + 会话专属 Switch，**会话专属优先级高于全局**；
  - 两者均**读写后端** `GET/PUT /api/ai-custody`，**关闭后后端不再生成 AI 回复**；
  - 状态**持久化**：刷新页面、重启后端均不丢（不再出现「刷新一下又自己开了」）；
  - 采用**乐观更新 + 失败回滚**（失败时重新 `loadCustody()` 对齐后端）；
  - 监听 `ai_custody` 广播，**多坐席浏览器之间实时同步**；WS **重连后重新拉取**，避免断线期间状态漂移；
  - 会话托管关闭时，客户新消息会以 `message.warning` 强提示坐席「请人工回复」。
- **坐席快捷短语**（常量 `QUICK_PHRASES`，交互参考千牛）：位于人工输入框**正上方**的一排胶囊按钮，
  内置 8 条高频话术，覆盖 **问候 → 处理中 → 售后 → 收尾** 四阶段；
  - 单击**只填入、不直接发送**（避免误发）；若已有草稿则**换行追加**，不覆盖坐席已输入内容，
    随后 `focus({ cursor: "end" })` 把光标落到末尾便于接着补字；
  - 未选中会话时整排**置灰禁用**，与输入框状态一致；
  - ⚠️ **antd v6 顶层入口不再导出 `TextAreaRef`**，须从 `antd/es/input/TextArea` 导入。
- 主题主色同样统一为 `#FF6A00`（`ThemeClientProvider.tsx`）。
- ⚠️ **「模型中心」是展示用的静态 Mock，切换不真正生效**（产品明确要求）。
  真正的模型配置只认 `.env`。

---

## 5. 模型接入（Dots 网关）

- **Key 位置**：项目根目录 `.env` 的 `XIAO_HONG_SHU_API_KEY`（该文件已 gitignore，
  由 `docker-compose.yml` 的 `env_file`（`required: false`）注入容器）。
- **Base URL**：`https://note3-prev-api.askdiandian.com/v1`（OpenAI 兼容）
- **模型**：`dots3-note-prev`；鉴权 `Authorization: Bearer` 可用。
- **推理型模型**：响应含 `reasoning_content`，**思考 token 计入 `max_tokens`** ——
  `max_tokens` 给小会只输出思考、正文为空。
- **配置优先级**（`backend/ai_engine.py`）：进程环境变量 > `backend/.env` > 项目根 `.env`。
- **支持图像输入（vision）**：`content` 可传 OpenAI 标准图文数组；图片须以 **base64 data URL**
  形式内联（模型在公网，无法回源我们的 localhost）。识图时 `prompt_tokens` 会明显上升——
  这是判断「图片是否真被喂进模型」的可靠信号（详见 `docs/progress.md` Phase 10 的实测对照）。
- 判断 AI 是否可用：`GET /api/health` 的 `llm_configured`。

---

## 6. 工程约定与开发坑位

1. **无幻觉高压线（`AGENTS.md`）**：检索不到知识库内容时**必须转人工**，
   **严禁**模型用自身知识编造实质性答复（寒暄除外）。
2. **改完代码必须重启容器**：本项目在 **Windows 挂载卷 + Turbopack** 下文件监听不可靠
   （报 `EIO`），新增文件 / 新路由常常不被扫描到（表现为新路由 404 或改动不生效）。
   compose 里的 `WATCHPACK_POLLING=true` **对 Turbopack 无效**。
   ```bash
   docker restart aiservice-toc-1   # 或 aiservice-tob-1 / aiservice-backend-1
   ```
3. **两套图标集不可混用**：移动端只能从 `antd-mobile-icons` 取（**没有** `CustomerServiceOutline`），
   PC 端才用 `@ant-design/icons`（有 `CustomerServiceOutlined`）。
   曾因前者不存在的导出导致 **C 端整站白屏**。核验：
   ```bash
   docker exec aiservice-toc-1 sh -c "cat /app/node_modules/antd-mobile-icons/es/index.js | grep -iE '关键字'"
   ```
4. **排障口诀**：「整站白屏 + `body.innerText` 为空 + HTTP 200」= **SSR 正常、客户端整包崩**。
   先看 `docker logs <容器>` 里的 `Export ... doesn't exist` / 模块解析错误，
   并重点检查**挂在根 layout 上的模块**（本项目 `AppProviders → ChatProvider`，它一崩，
   连 `/login` 都会白）。
5. **变更日志**：任何被修改的文件，须在**文件最顶部**追加中文变更日志（`AGENTS.md` 第 5 条），
   且**严禁 AI 自行发明或递增版本号**。
6. **沟通即文档**（`AGENTS.md` 第 6 条）：需求变更一旦落地并被用户确认，必须**立即**同步
   到 `progress.md` 与本文档，禁止只停留在会话上下文里。
7. **后端加表加列**：SQLite 无迁移框架，新增**表**由 `create_all` 负责，
   新增**列**必须同时在 `database.py` 的 `ensure_schema()` 里登记，否则老库会缺列。
8. **`/api/ai-custody` 的会话级设置**：`conversations.ai_managed` 为 `NULL` 表示跟随全局；
   目前 B 端 UI 不做「清除覆盖」，切回开启会写入显式 `true`（语义等价，无副作用）。
9. **容器内自检脚本的环境**（写临时验证脚本时）：
   - **没有 `requests`**，用标准库 `urllib`；有 `websockets`(17.1) 与 `httpx`。
   - **容器内后端端口是 `8000`**（`docker-compose.yml` 映射到宿主 `8080`）。
   - `/ws/c/{user_id}` 的回复事件类型是 **`ai_reply`**（不是 `done`），等错类型会空等到超时。
   - 用 `urllib` 读 `dict(resp.headers)` 可能取不到 `Content-Type`，**以 `curl -D -` 为准**。
10. ⚠️ **antd-mobile 的 `NavBar` 要去掉返回箭头必须写 `back={null}`**。
    该组件源码（`es/components/nav-bar/nav-bar.js`）的判据是 `back !== null`，
    而 `back` **没有默认值** —— 所以**不传 `back` 时值是 `undefined`，反而会渲染出箭头**。
    「C 端首页/客服页顶部有个多余返回箭头」的根因即在此。
11. **B 端会话列表角标的语义是「待接入会话数」**（`handoff_reason` 非空），不是会话总数。
    原因是会话按「客户 × 店铺 × 商品」拆分，**总数 ≠ 客户数**，显示总数会被误读为
    「来了这么多客户」（同一位客户咨询 6 个商品就会产生 6 条会话）。无待接入时角标整块隐藏。
