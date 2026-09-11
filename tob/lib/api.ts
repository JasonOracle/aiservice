// API 客户端封装 - B 端管理后台
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

export { API_URL, WS_URL };
