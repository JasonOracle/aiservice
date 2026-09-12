/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[设备判定逻辑抽到 lib/useDevice（与商品详情页共用同一份实现），并接入品牌主题色]

 * C 端主壳：双端异构渲染 + 认证守卫
 * - 移动 UA / 窄视口 → MobileView；其余 → DesktopView
 */
"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { useDevice } from "@/lib/useDevice";
import { BRAND } from "@/lib/theme";

const MobileView = lazy(() => import("@/components/views/MobileView"));
const DesktopView = lazy(() => import("@/components/views/DesktopView"));

export default function AdaptiveShell() {
  const router = useRouter();
  const device = useDevice();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
    } else {
      setHasToken(true);
    }
  }, [router]);

  if (!mounted) {
    return (
      <Centered>
        <Spin size="large" />
      </Centered>
    );
  }

  if (!hasToken) {
    return (
      <Centered>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: BRAND.textSub }}>正在跳转至登录页面…</div>
      </Centered>
    );
  }

  return (
    <Suspense
      fallback={
        <Centered>
          <Spin size="large" />
        </Centered>
      }
    >
      {device === "mobile" ? <MobileView /> : <DesktopView />}
    </Suspense>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.bg,
      }}
    >
      {children}
    </div>
  );
}
