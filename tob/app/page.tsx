// 左侧导航 + 路由入口
import { Suspense } from "react";
import { Spin } from "antd";
import AdminShell from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={<Spin style={{ width: "100%", height: "100vh" }} />}>
      <AdminShell />
    </Suspense>
  );
}
