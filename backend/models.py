"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[Message 新增 images 列，承载一条消息附带的图片地址列表（JSON 数组字符串，
          形如 ["/uploads/chat/2026-09/xxx.jpg"]）——使「文字+图片」「纯图片」两类消息都能持久化，
          并在 C 端与 B 端、以及跨设备之间完整还原图片]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[AI 托管状态持久化——1) 新增 Setting 键值表，承载「全局 AI 托管总开关」；
          2) Conversation 新增 ai_managed 列，承载「会话级 AI 托管覆盖」
          （True=该会话由 AI 自动应答，False=已转人工、AI 不再抢答，None=未单独设置、跟随全局）]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增 Conversation 与 Message 两张表，用于客服会话与聊天记录的持久化——
          会话按「用户 × 店铺 × 商品」唯一确定，使 B 端坐席能按店铺/商品区分同一客户的多路咨询；
          消息表为 B 端刷新、重启后回看历史提供数据来源，并为滚动定位到最后一条提供依据]

SQLAlchemy 数据模型
- User: 核心用户表，包含手机号、密码哈希、用户特征（Mem0 冷启动用）
- Conversation: 客服会话表，一条记录 = 某客户在某店铺某商品下的一路咨询
- Message: 聊天消息表，承载用户/AI/人工坐席的系统提示等全部消息
- Setting: 全局配置键值表（目前用于 AI 托管总开关），使开关状态在重启后依然保留
"""
from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, BigInteger, func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(11), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    # 用户特征描述，用于 Mem0 冷启动
    traits = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Conversation(Base):
    """
    客服会话（客户 × 店铺 × 商品）

    主键设计：`id = "{user_id}::{session_key}"`，例如 `1::product:keyboard-k8pro`。
    采用可读复合键的好处是前后端都能各自推算，无需先查库拿 ID：
    - 前端本地会话 id 就是 `session_key`（`store` 或 `product:{productId}`）
    - 后端会话 id = 登录用户 id + `::` + session_key
    """

    __tablename__ = "conversations"

    id = Column(String(128), primary_key=True)
    # 客户（users.id）
    user_id = Column(Integer, index=True, nullable=False)
    # 客户端的会话标识：`store` 或 `product:{productId}`
    session_key = Column(String(128), index=True, nullable=False)
    # 关联商品与店铺（店铺总客服会话下为空）
    product_id = Column(String(64), nullable=True)
    product_name = Column(String(128), nullable=True)
    store_name = Column(String(128), nullable=True)
    # 冗余最后一条消息，供 B 端会话列表直接展示，避免列表接口逐条查消息
    last_message = Column(Text, nullable=True)
    last_role = Column(String(16), nullable=True)
    # 最后活跃时间（毫秒时间戳，与前端一致，便于排序）
    last_active_at = Column(BigInteger, index=True, nullable=False, default=0)
    # 待接入状态：`user`（客户主动要求）/ `ai_fallback`（AI 兜底转人工）；为空表示无需人工
    # 持久化后 B 端刷新页面仍能看到「待接入」红标，人工坐席回复后清空
    handoff_reason = Column(String(32), nullable=True)
    handoff_at = Column(BigInteger, nullable=True)
    # 会话级 AI 托管覆盖：
    #   True  → 本会话由 AI 自动应答
    #   False → 已转人工接待，AI 不再抢答（客户消息只推给坐席台）
    #   None  → 未单独设置，跟随全局开关
    ai_managed = Column(Boolean, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Message(Base):
    """聊天消息：role 取 user（客户）/ assistant（AI）/ agent（人工坐席）/ system（系统提示）"""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # 所属会话，对应 conversations.id
    conversation_id = Column(String(128), index=True, nullable=False)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    # 本条消息附带的图片地址列表，序列化为 JSON 数组字符串后落库（无图片时为 NULL）。
    # 地址为**相对路径**（如 `/uploads/chat/2026-09/xxx.jpg`），前端按各自的 API 域名拼接访问；
    # 之所以不存绝对 URL，是为了换域名/端口时历史图片不至于全部失效。
    # 注：AI 识图时需把该路径读盘转成 base64（模型在公网，无法回连 localhost）。
    images = Column(Text, nullable=True)
    # 毫秒时间戳，与前端保持一致
    created_at = Column(BigInteger, index=True, nullable=False)


class Setting(Base):
    """
    全局配置键值表

    目前用于承载「全局 AI 托管总开关」（key = `ai_managed_global`）。
    之所以落库而非放在内存，是为了让 B 端坐席关掉托管后，
    即便刷新页面或重启后端，状态依然保持一致。
    """

    __tablename__ = "settings"

    key = Column(String(64), primary_key=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
