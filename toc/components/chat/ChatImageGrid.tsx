/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增文件——消息中的图片网格（C 端 PC / 移动端共用）：
 *           单图按比例展示、2-3 张等宽网格排布；点击任意一张回调父组件打开大图预览]

 * 消息图片网格（C 端 PC / 移动端共用）
 */
"use client";

import { mediaUrl } from "@/lib/api";

interface Props {
  /** 图片相对路径列表 */
  images: string[];
  /** 是否为自己发出的消息（用于对齐方向） */
  mine?: boolean;
  /** 多图时的单张边长（px） */
  size?: number;
  /** 点击某张图 → 打开大图预览 */
  onPreview: (index: number) => void;
}

export default function ChatImageGrid({ images, mine = false, size = 112, onPreview }: Props) {
  if (!images || images.length === 0) return null;

  const single = images.length === 1;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: single
          ? "auto"
          : `repeat(${Math.min(images.length, 3)}, ${size}px)`,
        gap: 6,
        justifyContent: mine ? "flex-end" : "flex-start",
      }}
    >
      {images.map((src, i) => (
        <button
          key={`${src}-${i}`}
          type="button"
          onClick={() => onPreview(i)}
          title="点击查看大图"
          style={{
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "zoom-in",
            lineHeight: 0,
            borderRadius: 10,
            overflow: "hidden",
            // 单图最多 200px，避免竖图把气泡撑得过高
            width: single ? "auto" : size,
            height: single ? "auto" : size,
          }}
        >
          <img
            src={mediaUrl(src)}
            alt={`图片${i + 1}`}
            style={{
              display: "block",
              width: single ? "auto" : size,
              height: single ? "auto" : size,
              maxWidth: single ? 200 : size,
              maxHeight: single ? 200 : size,
              objectFit: "cover",
              borderRadius: 10,
            }}
          />
        </button>
      ))}
    </div>
  );
}
