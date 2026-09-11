import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 客服 MVP - C端商城",
  description: "轻量 AI 客服演示，支持 RAG + Mem0 千人千面记忆",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
