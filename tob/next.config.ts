import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ant-design/x", "antd", "@ant-design/icons", "@ant-design/cssinjs"],
};

export default nextConfig;
