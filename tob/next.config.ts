/**
 * [变更日志]
 * 修改时间：2026-09-14
 * AI模型：Gemini 系列
 * 修改内容：[新增 output: 'export' 静态导出配置，使 next build 生成包含 HTML/CSS/JS 的 out 目录，彻底解决 Cloudflare Pages 部署时的 522 回源超时报错]
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@ant-design/x", "antd", "@ant-design/icons", "@ant-design/cssinjs"],
};

export default nextConfig;

