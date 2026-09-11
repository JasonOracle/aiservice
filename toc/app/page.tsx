// 双端异构渲染容器 + 认证守卫
// 根据 User-Agent 动态加载 MobileView 或 DesktopView
"use client";

import { Suspense, lazy, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

const MobileView = lazy(() => import("@/components/views/MobileView"));
const DesktopView = lazy(() => import("@/components/views/DesktopView"));

function detectDevice(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isNarrow = window.innerWidth < 768;
  return isMobile || isNarrow ? "mobile" : "desktop";
}

export default function AdaptiveShell() {
  const router = useRouter();
  const device = detectDevice();

  // 认证守卫：未登录则跳转登录页
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  // 未登录时不渲染主体，避免闪现
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <Spin size="large" />
        </div>
      }
    >
      {hasToken ? (device === "mobile" ? <MobileView /> : <DesktopView />) : <Spin style={{ width: "100%", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }} />}
    </Suspense>
  );
}
