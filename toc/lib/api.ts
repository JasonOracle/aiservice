/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增聊天图片上传封装 uploadChatImage() 与地址拼接 helper mediaUrl()——
 *           上传走 multipart/form-data（注意不能手动设置 Content-Type，否则边界丢失），
 *           返回相对路径；历史消息项补充 images 字段，使跨设备同步能还原图片]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增会话与历史消息接口封装（getMyConversations / getConversationMessages）——
 *           C 端登录后据此从后端反向同步聊天记录，使换设备、换浏览器、清缓存后依然能看到完整历史，
 *           不再只依赖本机 localStorage]

 * API 客户端封装 - 纯客户端 Fetch 直连 FastAPI
 * 默认端口 8080：与 docker-compose 中 backend 的端口映射（8080:8000）一致，
 * 本地裸跑前端时也不会再打到不存在的 8001。
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  name: string;
}

/**
 * 登录：手机号 + 密码
 */
export async function login(phone: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "登录失败");
  return res.json();
}

/**
 * 获取本机局域网 IP（用于生成二维码 URL）
 * 通过 WebRTC 或后端接口获取；MVP 阶段由后端 /api/machine-ip 返回
 */
export async function getLocalIP(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/machine-ip`);
    if (res.ok) {
      const data = await res.json();
      return data.ip;
    }
  } catch {
    // fallback
  }
  // 最终兜底：用 window.location 的 host（开发时是 localhost，扫码会失败但 UI 可展示）
  return typeof window !== "undefined" ? window.location.hostname : "localhost";
}

/** C 端本地会话标识（与后端 conversation_store 的 session_key 一致） */
export type ChatConvRole = "user" | "assistant" | "agent" | "system";

/** 后端返回的会话项（一条 = 本人在某店铺某商品下的一路咨询） */
export interface BackendConversation {
  /** 后端会话 ID，形如 `1::product:keyboard-k8pro` */
  id: string;
  user_id: number;
  /** 客户端会话标识：`store` 或 `product:{productId}` */
  session_key: string;
  product_id: string | null;
  product_name: string | null;
  store_name: string | null;
  last_message: string;
  last_role: string;
  /** 毫秒时间戳 */
  last_active_at: number;
  handoff_reason: string | null;
}

/** 后端返回的历史消息项 */
export interface BackendMessage {
  id: number;
  role: ChatConvRole;
  content: string;
  /** 图片相对路径列表（无图片时为空数组） */
  images?: string[];
  created_at: number;
}

/** 拉取当前用户的全部会话（按最后活跃时间倒序） */
export async function getMyConversations(userId: string): Promise<BackendConversation[]> {
  const res = await fetch(
    `${API_URL}/api/conversations?user_id=${encodeURIComponent(userId)}`,
    { headers: { ...getAuthHeaders() } },
  );
  if (!res.ok) throw new Error("获取会话列表失败");
  return res.json();
}

/** 拉取某会话的完整历史消息（按时间正序）；会话 ID 含 `:`，需编码后再拼入路径 */
export async function getConversationMessages(conversationId: string): Promise<BackendMessage[]> {
  const res = await fetch(
    `${API_URL}/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    { headers: { ...getAuthHeaders() } },
  );
  if (!res.ok) throw new Error("获取历史消息失败");
  return res.json();
}

/**
 * 上传一张聊天图片
 *
 * - 图片已在浏览器端压缩过（见 `lib/imageCompress.ts`），这里只负责传输；
 * - **不要手动设置 Content-Type**：必须让浏览器自动带上 multipart 边界（boundary），
 *   手写 `Content-Type: multipart/form-data` 会导致后端解析不到文件；
 * - 返回**相对路径**（如 `/uploads/chat/2026-09/xxx.jpg`），
 *   随消息一起提交给 /api/chat 落库，展示时用 `mediaUrl()` 拼成完整地址。
 */
export async function uploadChatImage(file: Blob, filename = "image.jpg"): Promise<string> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: form,
  });
  if (!res.ok) {
    // 后端的 detail 是给用户看的中文提示（如「图片过大」），优先透出
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? "图片上传失败，请重试");
  }
  const data = await res.json();
  return String(data?.url ?? "");
}

/**
 * 图片相对路径 → 可直接用于 <img src> 的完整地址
 * 后端存的是相对路径（避免换域名后历史图片全部失效），展示时在这里补上前缀。
 */
export function mediaUrl(relPath: string): string {
  if (!relPath) return "";
  if (/^(https?:)?\/\//.test(relPath) || relPath.startsWith("data:")) return relPath;
  return `${API_URL}${relPath.startsWith("/") ? "" : "/"}${relPath}`;
}

export { API_URL, WS_URL };
