// API 客户端封装 - 纯客户端 Fetch 直连 FastAPI
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8001";

export function getAuthHeaders() {
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

export { API_URL, WS_URL };
