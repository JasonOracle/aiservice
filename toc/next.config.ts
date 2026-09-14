/**
 * [变更日志]
 * 修改时间：2026-09-14
 * AI模型：Gemini 系列
 * 修改内容：[新增 output: 'export' 静态导出配置，确保 Cloudflare Pages 获得完整的静态 HTML/CSS/JS 资源产物]
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

