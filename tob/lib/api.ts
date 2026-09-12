/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增坐席发图相关封装——uploadChatImage()（multipart 上传，返回相对路径）
 *           与 mediaUrl()（相对路径 → 可访问的完整地址）；历史消息项补充 images 字段，
 *           使坐席台刷新、回看历史时也能看到图片]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增 AI 托管状态接口封装（getAiCustody / setAiCustody）——
 *           坐席台的全局总开关与会话级开关改为读写后端（持久化，刷新与重启不丢），
 *           替代原先仅存于前端 state、刷新即复原的做法；
 *           会话项补充 ai_managed 字段，供列表直接标注「人工接待中」]
 *
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增会话与历史消息接口封装（getConversations / getConversationMessages）——
 *           坐席台会话列表与聊天记录改为从后端读取，替代原先仅存于浏览器内存的做法，
 *           使刷新页面与重启后仍能回看历史并按会话归集]
 *
 * API 客户端封装 - B 端管理后台
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

export interface UserItem {
  id: number;
  phone: string;
  name: string;
  traits: string;
}

export async function getUsers(): Promise<UserItem[]> {
  const res = await fetch(`${API_URL}/api/users`);
  if (!res.ok) throw new Error("获取用户列表失败");
  return res.json();
}

/**
 * 会话项 · 一条 = 某客户 × 某店铺 × 某商品的一路咨询
 * 因此同一客户可能出现在多条记录中（例如同时在两家店咨询）
 */
export interface ConversationItem {
  /** 后端会话 ID，形如 `1::product:keyboard-k8pro` */
  id: string;
  user_id: number;
  user_name: string;
  user_phone: string;
  /** 客户端会话标识：`store` 或 `product:{productId}` */
  session_key: string;
  product_id: string | null;
  product_name: string | null;
  store_name: string | null;
  last_message: string;
  last_role: string;
  /** 毫秒时间戳 */
  last_active_at: number;
  /** 待接入原因：`user`（客户主动）/ `ai_fallback`（AI 兜底）；为 null 表示无需人工 */
  handoff_reason: string | null;
  handoff_at: number | null;
  /** 会话级 AI 托管覆盖：true/false 为显式设置，null 表示跟随全局开关 */
  ai_managed: boolean | null;
}

/** 历史消息项 */
export interface MessageItem {
  id: number;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  /** 图片相对路径列表（无图片时为空数组） */
  images?: string[];
  created_at: number;
}

/** 拉取全部会话（按最后活跃时间倒序） */
export async function getConversations(): Promise<ConversationItem[]> {
  const res = await fetch(`${API_URL}/api/conversations`);
  if (!res.ok) throw new Error("获取会话列表失败");
  return res.json();
}

/**
 * 拉取某会话的完整历史消息（按时间正序）
 * - 会话 ID 含 `:`，需编码后再拼入路径
 */
export async function getConversationMessages(conversationId: string): Promise<MessageItem[]> {
  const res = await fetch(
    `${API_URL}/api/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
  if (!res.ok) throw new Error("获取历史消息失败");
  return res.json();
}

/**
 * AI 托管状态（后端为唯一真源）
 * - global：全局总开关，对所有「未单独设置」的会话生效
 * - sessions：显式设置过托管状态的会话 → { conversation_id: bool }
 */
export interface AiCustodyState {
  global: boolean;
  sessions: Record<string, boolean>;
}

/** 读取 AI 托管状态（全局 + 各会话覆盖） */
export async function getAiCustody(): Promise<AiCustodyState> {
  const res = await fetch(`${API_URL}/api/ai-custody`);
  if (!res.ok) throw new Error("获取 AI 托管状态失败");
  return res.json();
}

/**
 * 设置 AI 托管开关
 * - 不传 conversationId → 设置全局总开关
 * - 传 conversationId   → 设置该会话的专属开关（优先级高于全局）
 */
export async function setAiCustody(
  enabled: boolean,
  conversationId = "",
): Promise<AiCustodyState> {
  const res = await fetch(`${API_URL}/api/ai-custody`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, conversation_id: conversationId }),
  });
  if (!res.ok) throw new Error("设置 AI 托管状态失败");
  return res.json();
}

/**
 * 上传一张图片（坐席发图用）
 *
 * - 图片已在浏览器端压缩过（见 `lib/imageCompress.ts`）；
 * - **不要手动设置 Content-Type**：必须让浏览器自动带 multipart 边界；
 * - 返回相对路径（如 `/uploads/chat/2026-09/xxx.jpg`），
 *   随 agent_message 一起通过 WebSocket 发给 C 端。
 */
export async function uploadChatImage(file: Blob, filename = "image.jpg"): Promise<string> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? "图片上传失败，请重试");
  }
  const data = await res.json();
  return String(data?.url ?? "");
}

/**
 * 图片相对路径 → 可访问的完整地址
 * 后端存的是相对路径（换域名后历史图片不会失效），展示时在此补前缀。
 */
export function mediaUrl(relPath: string): string {
  if (!relPath) return "";
  if (/^(https?:)?\/\//.test(relPath) || relPath.startsWith("data:")) return relPath;
  return `${API_URL}${relPath.startsWith("/") ? "" : "/"}${relPath}`;
}

export { API_URL, WS_URL };
