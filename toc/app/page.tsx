// 双端异构渲染容器 + 认证守卫
// 根据 User-Agent 动态加载 MobileView 或 DesktopView
"use client";

import { Suspense, lazy, useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [device, setDevice] = useState<"mobile" | "desktop">("desktop");

  useEffect(() => {
    setMounted(true);
    setDevice(detectDevice());
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
    } else {
      setHasToken(true);
    }
  }, [router]);

  if (!mounted) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#fff" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: "#888" }}>正在跳转至登录页面...</div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
          <Spin size="large" />
        </div>
      }
    >
      {device === "mobile" ? <MobileView /> : <DesktopView />}
    </Suspense>
  );
}
