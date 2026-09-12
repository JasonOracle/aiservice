/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[合并规则补一条：本地独有、但已含客户消息的会话予以丢弃——
 *           这类会话说明服务端曾有记录，如今后端列表里没有它即已被服务端删除
 *           （如清理联调残留会话）。否则会出现「后端删了、前端还在」的假数据。
 *           仅含欢迎语、尚未发过消息的会话仍保留，保证「刚点进商品客服」不被冲掉。]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[消息模型支持图片——ChatMsg 新增 images 字段（图片相对路径列表），
 *           makeMsg 支持携带图片，「文字+图片」「纯图片」两类消息均可持久化；
 *           后端历史消息同步映射 images，使换设备后图片消息同样完整还原；
 *           新增 previewText() 供会话列表展示（纯图片消息显示「[图片]」而非空白）]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增后端会话合并能力（convFromBackend / mergeBackendConversations）——
 *           把后端持久化的会话与历史消息转换为本地会话结构，使 C 端换设备、换浏览器、
 *           清缓存后仍能拉回完整聊天记录；本地独有、尚未产生消息的会话予以保留，
 *           避免刚点进商品客服的欢迎语被合并冲掉]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增后端会话 ID 互转 helper（toBackendConvId / fromBackendConvId）——
 *           前端本地会话 id 为 `store` 或 `product:{id}`，后端会话 id 为 `{userId}::{本地id}`，
 *           两者互转后即可让「客户 × 店铺 × 商品」的会话标识在 C 端与 B 端之间贯通]
 *
 * C 端会话与消息持久化（localStorage）
 *
 * 设计说明：
 * - 存储键为 `toc_convs_{userId}`，按登录用户隔离，切换演示账号不会串数据；
 * - 会话是「按商品/店铺」聚合的：默认一条 AI 客服会话（id = "store"），
 *   从商品详情页进客服时会新建 `product:{productId}` 会话，
 *   这也正是「从详情页点客服后，客服 Tab 列表里会多一条会话」的实现方式；
 * - 每条消息都带 `createdAt` 毫秒时间戳，刷新页面后记录与时间都会保留。
 */

export type ChatRole = "user" | "assistant" | "agent" | "system";

export interface ChatMsg {
  id: string;
  role: ChatRole;
  content: string;
  /**
   * 消息附带的图片（相对路径列表，如 `["/uploads/chat/2026-09/xxx.jpg"]`）。
   * 展示时用 `mediaUrl()` 拼成完整地址；无图片时缺省。
   * 「纯图片」消息的 content 为空串，只靠本字段承载内容。
   */
  images?: string[];
  /** 毫秒时间戳 */
  createdAt: number;
}

export interface Conversation {
  /** "store" 或 `product:{productId}` */
  id: string;
  /** 会话标题（"AI 客服" 或 商品名） */
  title: string;
  /** 副标题（店铺名等） */
  subtitle?: string;
  /** 关联商品 ID（店铺会话为空） */
  productId?: string;
  messages: ChatMsg[];
  /** 最后活跃时间（用于会话列表排序） */
  lastActiveAt: number;
  /** 未读条数 */
  unread: number;
}

/** 默认 AI 客服会话 ID */
export const STORE_CONV_ID = "store";

/** 商品会话 ID */
export function productConvId(productId: string): string {
  return `product:${productId}`;
}

/** 生成消息唯一 ID */
export function newMsgId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function storageKey(userId: string): string {
  return `toc_convs_${userId}`;
}

/** 创建消息对象（images 为图片相对路径列表；纯图片消息时 content 传空串） */
export function makeMsg(
  role: ChatRole,
  content: string,
  createdAt = Date.now(),
  images?: string[],
): ChatMsg {
  const msg: ChatMsg = { id: newMsgId(), role, content, createdAt };
  if (images && images.length > 0) msg.images = [...images];
  return msg;
}

/**
 * 会话列表 / 侧栏的预览文案
 * 纯图片消息没有正文，用「[图片]」占位，避免列表上出现一条看起来空白的记录。
 */
export function previewText(msg?: { content?: string; images?: string[] }): string {
  if (!msg) return "";
  const text = (msg.content || "").trim();
  if (text) return text;
  return msg.images && msg.images.length > 0 ? "[图片]" : "";
}

/** 默认店铺会话（含欢迎语） */
export function createStoreConversation(): Conversation {
  const now = Date.now();
  return {
    id: STORE_CONV_ID,
    title: "AI 客服",
    subtitle: "AI 商城 · 官方客服",
    messages: [
      makeMsg("assistant", "你好！我是 AI 客服，很高兴为您服务。请问有什么可以帮您？", now),
    ],
    lastActiveAt: now,
    unread: 0,
  };
}

/** 创建某个商品的会话（含定向欢迎语） */
export function createProductConversation(productId: string, productName: string, store?: string): Conversation {
  const now = Date.now();
  return {
    id: productConvId(productId),
    title: productName,
    subtitle: store,
    productId,
    messages: [
      makeMsg(
        "assistant",
        `你好！我是 AI 客服。关于「${productName}」的参数、使用方法、优惠或售后，都可以直接问我。`,
        now,
      ),
    ],
    lastActiveAt: now,
    unread: 0,
  };
}

/** 读取会话列表（异常时返回空数组，避免脏数据导致白屏） */
export function loadConversations(userId: string): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Conversation[];
  } catch {
    return [];
  }
}

/** 写入会话列表 */
export function saveConversations(userId: string, list: Conversation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(list));
  } catch {
    // localStorage 写满或隐私模式：静默降级为「本次会话内存态」
  }
}

/** 读取会话；首次使用时自动创建默认 AI 客服会话 */
export function ensureConversations(userId: string): Conversation[] {
  const list = loadConversations(userId);
  if (list.length > 0) return list;
  const initial = [createStoreConversation()];
  saveConversations(userId, initial);
  return initial;
}

/** 当前登录用户 ID（后端登录后写入 localStorage） */
export function getCurrentUserId(): string {
  if (typeof window === "undefined") return "1";
  return window.localStorage.getItem("user_id") || "1";
}

const pad = (n: number) => String(n).padStart(2, "0");

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 消息时间显示规则：
 * - 今天 → HH:mm
 * - 昨天 → 昨天 HH:mm
 * - 更早 → M月D日 HH:mm
 */
export function formatMsgTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (isSameDay(d, now)) return hm;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return `昨天 ${hm}`;

  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

/**
 * 是否需要在消息上方显示时间。
 * - 跨天必显示；
 * - 同一天内，与上一条间隔 ≤ 5 分钟则不重复显示，避免每行都挂个时间很吵。
 */
export function shouldShowTime(ts: number, prevTs?: number): boolean {
  if (!prevTs) return true;
  if (!isSameDay(new Date(ts), new Date(prevTs))) return true;
  return ts - prevTs > 5 * 60 * 1000;
}

/** 会话列表用：更简洁的相对时间（今天 HH:mm / 昨天 / M月D日） */
export function formatConvTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (isSameDay(d, now)) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return "昨天";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 会话列表排序：最后活跃的排前面 */
export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

/** 后端会话 ID 的分隔符（与 backend/conversation_store.py 的 CONV_ID_SEP 保持一致） */
export const CONV_ID_SEP = "::";

/**
 * 本地会话 ID → 后端会话 ID
 * 例如 ("1", "product:keyboard-k8pro") → "1::product:keyboard-k8pro"
 */
export function toBackendConvId(userId: string, convId: string): string {
  return `${userId}${CONV_ID_SEP}${convId}`;
}

/**
 * 后端会话 ID → 本地会话 ID；不属于当前用户时返回空串
 * 用于收到人工坐席回复时，判断该消息应投递到哪个本地会话。
 */
export function fromBackendConvId(userId: string, backendConvId: string): string {
  if (!backendConvId) return "";
  const prefix = `${userId}${CONV_ID_SEP}`;
  return backendConvId.startsWith(prefix) ? backendConvId.slice(prefix.length) : "";
}

/** 后端下发的会话项（与 backend/routers/conversation.py 的返回结构一致） */
export interface BackendConv {
  id: string;
  session_key: string;
  product_id: string | null;
  product_name: string | null;
  store_name: string | null;
  last_active_at: number;
}

/** 后端下发的历史消息项 */
export interface BackendMsg {
  id: number;
  role: ChatRole;
  content: string;
  /** 图片相对路径列表（无图片时为空数组或缺失） */
  images?: string[];
  created_at: number;
}

/**
 * 后端会话 + 历史消息 → 本地会话结构
 *
 * - 后端有消息时**以后端为准**（这是换设备能看到记录的关键）；
 * - 后端暂无消息时（极端情况）回退到本地已有内容，避免会话变空；
 * - 标题/副标题优先取后端的商品名与店铺名，保证跨设备展示一致。
 */
export function convFromBackend(
  bc: BackendConv,
  msgs: BackendMsg[],
  fallback?: Conversation,
): Conversation {
  const now = Date.now();
  const id = bc.session_key || STORE_CONV_ID;
  const messages: ChatMsg[] =
    msgs && msgs.length > 0
      ? msgs.map((m) => ({
          id: `be-${m.id}`,
          role: m.role,
          content: m.content,
          // 后端存的是图片相对路径列表；一并带回来，跨设备同步后图片也能正常显示
          images: m.images && m.images.length > 0 ? m.images : undefined,
          createdAt: m.created_at,
        }))
      : (fallback?.messages ?? []);

  return {
    id,
    title: bc.product_name || fallback?.title || "AI 客服",
    subtitle: bc.store_name || fallback?.subtitle || "AI 商城 · 官方客服",
    productId: bc.product_id || fallback?.productId,
    messages,
    lastActiveAt: bc.last_active_at || fallback?.lastActiveAt || now,
    unread: fallback?.unread ?? 0,
  };
}

/**
 * 把后端会话合并进本地列表
 *
 * 合并规则：
 * - 后端存在的会话**以后端为准**（消息、标题、店铺名都以服务端为准）；
 * - 本地独有、且**从未发出过客户消息**的会话予以保留 —— 典型场景是刚从商品详情页
 *   点进客服、尚未发出任何消息，此时后端还没有这条记录，其欢迎语不应被清掉；
 * - 本地独有、但**已含客户消息**的会话则丢弃 —— 这类会话说明服务端曾经存在过，
 *   如今后端列表里没有它，即已被服务端删除（例如清理联调残留数据）。
 *   若不丢弃，就会出现「后端删了、前端还在」的假数据。
 */
export function mergeBackendConversations(
  local: Conversation[],
  backend: BackendConv[],
  msgsByKey: Record<string, BackendMsg[]>,
): Conversation[] {
  const localMap = new Map(local.map((c) => [c.id, c]));
  const merged: Conversation[] = [];
  const seen = new Set<string>();

  for (const bc of backend) {
    const key = bc.session_key || STORE_CONV_ID;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(convFromBackend(bc, msgsByKey[key] ?? [], localMap.get(key)));
  }

  for (const c of local) {
    if (seen.has(c.id)) continue;
    // 曾发出过客户消息 = 服务端必然有记录；既然后端列表里没有，说明已被服务端删除
    if (c.messages.some((m) => m.role === "user")) continue;
    merged.push(c);
  }

  return merged;
}

