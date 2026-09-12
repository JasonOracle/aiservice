/**
 * 设备判定 Hook（双端异构渲染的统一入口）
 *
 * 判定规则与 app/page.tsx 保持一致：
 * - 移动 UA 或视口宽度 < 768px → mobile
 * - 其余 → desktop
 * 监听 resize，让浏览器窗口缩放时能在双端版式间自动切换（便于 PC 端调试移动版式）。
 */
"use client";

import { useEffect, useState } from "react";

export type Device = "mobile" | "desktop";

export function detectDevice(): Device {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isNarrow = window.innerWidth < 768;
  return isMobile || isNarrow ? "mobile" : "desktop";
}

export function useDevice(): Device {
  const [device, setDevice] = useState<Device>("desktop");

  useEffect(() => {
    setDevice(detectDevice());
    const onResize = () => setDevice(detectDevice());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return device;
}
