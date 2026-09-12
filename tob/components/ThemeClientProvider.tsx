/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[主色由 antd 蓝 #1677ff 统一为品牌橙 #FF6A00，与 C 端商城保持一致，避免同一产品出现两种主色]
 */
"use client";

import { ConfigProvider, theme } from "antd";
import React from "react";

export default function ThemeClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#FF6A00",
          colorLink: "#FF6A00",
          colorInfo: "#FF6A00",
          colorBgBase: "#ffffff",
          colorBgContainer: "#ffffff",
          colorBgLayout: "#f7f5f2",
          borderRadius: 8,
          colorText: "#1f1f1f",
          colorBorder: "#e5e7eb",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
