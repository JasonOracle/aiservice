/**
 * [变更日志]
 * 修改时间：2026-09-14
 * AI模型：Gemini 系列
 * 修改内容：[移除 dynamic = 'force-dynamic'，允许 Next.js 静态预渲染与纯静态 HTML 导出，彻底适配 Cloudflare Pages 静态托管]
 */
import { Suspense } from "react";
import { Spin } from "antd";
import AdminShell from "@/components/AdminShell";

export default function Home() {
  return (
    <Suspense fallback={<Spin style={{ width: "100%", height: "100vh" }} />}>
      <AdminShell />
    </Suspense>
  );
}

