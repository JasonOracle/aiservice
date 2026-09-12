import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/AppProviders";

export const metadata: Metadata = {
  title: "AI 商城 · 智能客服",
  description: "轻量 AI 客服演示，支持 RAG 检索 + Mem0 千人千面记忆",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
