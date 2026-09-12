/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增文件——聊天图片的全屏大图预览层：
 *           点击消息里的缩略图后弹出，支持多图左右切换、Esc / 点击遮罩关闭；
 *           自研实现而非使用 antd 的 Image.PreviewGroup，是为了让 PC 与移动端
 *           共用一份代码（移动端视图刻意不引入 antd 组件，避免增大包体）]

 * 图片大图预览（C 端 PC / 移动端共用）
 *
 * 交互：
 * - 点击遮罩空白处或右上角「×」关闭
 * - 多图时左右两侧出现切换按钮，底部显示「当前 / 总数」
 * - 打开期间锁定页面滚动，支持 Esc 关闭
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { mediaUrl } from "@/lib/api";

interface Props {
  /** 图片相对路径列表 */
  images: string[];
  /** 当前展示第几张；-1 表示不展示（关闭态） */
  index: number;
  onClose: () => void;
}

export default function ImagePreview({ images, index, onClose }: Props) {
  const [current, setCurrent] = useState(index);

  useEffect(() => {
    setCurrent(index);
  }, [index]);

  // 打开期间锁定 body 滚动 + 支持 Esc 关闭
  useEffect(() => {
    if (index < 0) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, onClose]);

  const total = images.length;
  const safe = Math.min(Math.max(current, 0), Math.max(total - 1, 0));

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c <= 0 ? total - 1 : c - 1));
    },
    [total],
  );
  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c >= total - 1 ? 0 : c + 1));
    },
    [total],
  );

  if (index < 0 || total === 0) return null;

  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.16)",
    color: "#fff",
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        background: "rgba(0,0,0,0.84)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* 关闭按钮 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭预览"
        style={{
          position: "absolute",
          top: 18,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.16)",
          color: "#fff",
          fontSize: 20,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>

      {/* 图片本体：点击自身不关闭（阻止冒泡到遮罩） */}
      <img
        src={mediaUrl(images[safe])}
        alt={`图片 ${safe + 1}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "92vw",
          maxHeight: "88vh",
          objectFit: "contain",
          borderRadius: 8,
          boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        }}
      />

      {total > 1 && (
        <>
          <button type="button" onClick={goPrev} aria-label="上一张" style={{ ...arrowStyle, left: 20 }}>
            ‹
          </button>
          <button type="button" onClick={goNext} aria-label="下一张" style={{ ...arrowStyle, right: 20 }}>
            ›
          </button>
          <div
            style={{
              position: "absolute",
              bottom: 22,
              color: "#fff",
              fontSize: 13,
              background: "rgba(255,255,255,0.16)",
              padding: "4px 12px",
              borderRadius: 999,
            }}
          >
            {safe + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
}
