import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme } from "antd";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 客服 MVP - 管理员后台",
  description: "高定 SaaS 智能客服管理后台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body style={{ background: "#141414", margin: 0 }}>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
              token: {
                colorPrimary: "#1677ff",
                colorBgBase: "#141414",
                colorBgContainer: "#1f1f1f",
                borderRadius: 8,
                colorBgElevated: "#1f1f1f",
              },
            }}
          >
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
