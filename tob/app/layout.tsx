import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme } from "antd";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 客服 MVP - 管理员后台",
  description: "高定 SaaS 智能客服管理后台",
};

import ThemeClientProvider from "@/components/ThemeClientProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body style={{ background: "#f0f2f5", margin: 0, color: "#1f1f1f" }}>
        <AntdRegistry>
          <ThemeClientProvider>{children}</ThemeClientProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
