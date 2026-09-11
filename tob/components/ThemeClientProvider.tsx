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
          colorPrimary: "#1677ff",
          colorBgBase: "#ffffff",
          colorBgContainer: "#ffffff",
          colorBgLayout: "#f0f2f5",
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
