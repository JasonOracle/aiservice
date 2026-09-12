/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增文件——浏览器端图片压缩工具（与 toc 端同源实现）：
 *           坐席发图前把图片等比压到长边 1600px、转 JPEG（质量 0.8）再上传；
 *           GIF 原样放行（压缩会丢动画）]
 *
 * 图片压缩工具（浏览器端，坐席发图用）
 *
 * 与 `toc/lib/imageCompress.ts` 为同源实现——两个 Next.js 项目各自独立打包，
 * 无法共享模块，如需修改请两边同步。
 */

/** 压缩参数 */
export interface CompressOptions {
  /** 长边上限（像素），默认 1600 */
  maxEdge?: number;
  /** JPEG 质量（0-1），默认 0.8 */
  quality?: number;
}

/** 压缩结果 */
export interface PreparedImage {
  /** 压缩后的文件（可直接 FormData 上传） */
  blob: Blob;
  /** 上传文件名（扩展名与 blob 类型一致） */
  filename: string;
  /** 压缩前字节数 */
  originalSize: number;
  /** 压缩后字节数 */
  size: number;
}

/** 单张图片的原始体积上限（超过直接拒绝，避免浏览器解析超大图卡死） */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/** 按长边等比缩放计算目标尺寸（小于上限时保持原尺寸） */
function fitSize(w: number, h: number, maxEdge: number): { width: number; height: number } {
  const longEdge = Math.max(w, h);
  if (!longEdge || longEdge <= maxEdge) return { width: w || 1, height: h || 1 };
  const ratio = maxEdge / longEdge;
  return { width: Math.max(1, Math.round(w * ratio)), height: Math.max(1, Math.round(h * ratio)) };
}

/** 读取图片为可绘制对象（优先 createImageBitmap，失败回退到 <img>） */
async function loadBitmap(file: File): Promise<{
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height };
    } catch {
      // 部分浏览器/格式不支持，走下面兜底
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    img.src = url;
  });
}

/** canvas → Blob */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("图片压缩失败"))),
      type,
      quality,
    );
  });
}

/** 原样返回（不做任何处理的降级路径） */
function passthrough(file: File, name?: string): PreparedImage {
  return {
    blob: file,
    filename: name || file.name || "image.jpg",
    originalSize: file.size,
    size: file.size,
  };
}

/**
 * 压缩单张图片
 *
 * - GIF：原样返回（canvas 重绘会丢失动画）
 * - 其他格式：等比缩放到长边 maxEdge 并转 JPEG；透明区域铺白底
 * - canvas 不可用等异常：退化为原图上传，功能不中断
 *
 * 异常：非图片类型、体积超过 MAX_SOURCE_BYTES 时抛出，由调用方提示用户
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<PreparedImage> {
  const { maxEdge = 1600, quality = 0.8 } = options;

  if (!file.type.startsWith("image/")) {
    throw new Error("只能选择图片文件");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("图片体积过大（超过 20MB），请换一张");
  }

  if (file.type === "image/gif") {
    return passthrough(file, "image.gif");
  }

  try {
    const { source, width, height } = await loadBitmap(file);
    const target = fitSize(width, height, maxEdge);

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return passthrough(file);

    // 铺白底：PNG 透明区域转 JPEG 会变黑
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.drawImage(source as CanvasImageSource, 0, 0, target.width, target.height);

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);

    // 压缩后反而更大时（小图重编码），保留原图更划算
    if (blob.size >= file.size && file.type === "image/jpeg") {
      return passthrough(file);
    }

    return {
      blob,
      filename: "image.jpg",
      originalSize: file.size,
      size: blob.size,
    };
  } catch {
    return passthrough(file);
  }
}

/** 生成用于本地预览的临时 URL（移除时记得 URL.revokeObjectURL 释放） */
export function createPreviewUrl(file: File | Blob): string {
  return URL.createObjectURL(file);
}
