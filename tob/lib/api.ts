// API 客户端封装 - B 端管理后台
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8001";

export { API_URL, WS_URL };
