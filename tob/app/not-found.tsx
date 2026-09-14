/**
 * [变更日志]
 * 修改时间：2026-09-14
 * AI模型：Gemini 系列
 * 修改内容：[移除 dynamic = 'force-dynamic'，改为静态 404 引导页与客户端重定向，解决 Next.js 静态导出 out 目录时的构建报错]
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}

