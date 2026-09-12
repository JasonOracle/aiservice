/**
 * C 端全局 Provider
 * - antd ConfigProvider：注入品牌橙色主题
 * - ChatProvider：全局唯一会话状态 + WebSocket（供首页、详情页、聊天页、弹窗共用）
 */
"use client";

import { ConfigProvider } from "antd";
import { antdTheme } from "@/lib/theme";
import ChatProvider from "@/components/chat/ChatProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={antdTheme}>
      <ChatProvider>{children}</ChatProvider>
    </ConfigProvider>
  );
}
