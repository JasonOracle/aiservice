/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[发图入口改为参考 Gemini 的「+」——1) 按钮从输入框右侧移到**左侧**，图标换成加号；
 *           2) 点击展开小菜单：移动端为「拍照 / 从相册选择」（拍照走 capture 直接唤起相机），
 *              桌面端为「选择图片」并附「Ctrl+V 粘贴 / 拖拽」提示；
 *           3) 菜单底部按端给出粘贴提示，保持「拖拽 / 粘贴 / 点选」三种入口不变]
 *
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[聊天输入区支持发送图片——1) 支持拖拽入框、Ctrl+V 粘贴、点击选图三种添加方式；
 *           2) 选中后在浏览器端压缩（长边 1600px / JPEG 0.8）再上传，缩略图排在输入框正上方，
 *              每张右上角「×」可移除；
 *           3) 单条最多 3 张，超出直接拒绝并提示（不做队列挤替）；
 *           4) 有图片处于「上传中」时禁用发送按钮；上传失败的图可单独删除；
 *           5) 支持「文字+图片」与「纯图片」两种消息；桌面端拖拽时整块高亮提示]

 * 聊天输入区（PC / 移动端共用）
 *
 * - 移动端：antd-mobile TextArea + 固定在底部的安全区适配
 * - PC 端：antd Input.TextArea，Enter 发送 / Shift+Enter 换行
 * - 附带「快捷提问」气泡，既是电商场景的常见引导，
 *   也让「转人工客服」这条链路在演示时一键可触发
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button as MButton, TextArea as MTextArea } from "antd-mobile";
import { Button, Input } from "antd";
import { CameraOutlined, PictureOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import { uploadChatImage } from "@/lib/api";
import { compressImage, createPreviewUrl } from "@/lib/imageCompress";
import { BRAND } from "@/lib/theme";

const DEFAULT_QUICK_REPLIES = ["有优惠吗？", "怎么退货？", "物流多久能到？", "转人工客服"];

/** 单条消息最多可带图片数（与后端 chat_images.MAX_IMAGES_PER_MESSAGE 保持一致） */
const MAX_IMAGES = 3;

/**
 * 全局拖拽接管者（模块级）
 *
 * 拖拽监听挂在 window 上时，若页面同时挂载了多个输入区实例（PC 弹窗 / 移动端聊天页），
 * 同一次拖拽会被每个实例各处理一遍 → 图片被重复添加。
 * 用本变量记录「本次拖拽由哪个实例接管」，保证只处理一次。
 */
let activeDragOwner: string | null = null;

/** 待发送图片的本地状态 */
interface PendingImage {
  id: string;
  /** 本地预览地址（blob:），移除时需 revoke */
  previewUrl: string;
  /** 上传成功后的相对路径；未完成时为空 */
  url?: string;
  status: "uploading" | "done" | "error";
}

interface Props {
  /** 发送回调：images 为已上传完成的图片相对路径列表（可能为空数组） */
  onSend: (text: string, images: string[]) => void;
  disabled?: boolean;
  variant?: "mobile" | "desktop";
  placeholder?: string;
  quickReplies?: string[];
}

export default function ChatComposer({
  onSend,
  disabled = false,
  variant = "desktop",
  placeholder = "输入您的问题…",
  quickReplies = DEFAULT_QUICK_REPLIES,
}: Props) {
  const [input, setInput] = useState("");
  /** 待发送图片队列（最多 MAX_IMAGES 张） */
  const [pending, setPending] = useState<PendingImage[]>([]);
  /** 桌面端拖拽悬停中 */
  const [dragging, setDragging] = useState(false);
  /** 轻提示文案（自动消失；不引 toast 组件以保持两端一致） */
  const [hint, setHint] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  /** 拍照专用选择器：带 capture 属性，移动端会直接唤起相机（桌面端不使用） */
  const cameraRef = useRef<HTMLInputElement>(null);
  /** 「+」发图小菜单是否展开 */
  const [menuOpen, setMenuOpen] = useState(false);
  /** 本实例标识，用于 window 级拖拽监听的「接管者」判定 */
  const instanceIdRef = useRef(`composer-${Math.random().toString(36).slice(2)}`);
  const isMobile = variant === "mobile";

  /** 保持 pending 的最新值（卸载清理、addFiles 判额度都要用，避免闭包取到旧值） */
  const pendingRef = useRef<PendingImage[]>([]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  /** 卸载时释放所有本地预览 URL，避免内存泄漏 */
  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  /** 轻提示，1.8 秒后自动消失 */
  const showHint = useCallback((text: string) => {
    setHint(text);
    window.setTimeout(() => setHint(""), 1800);
  }, []);

  const uploading = pending.some((p) => p.status === "uploading");
  const readyUrls = pending.filter((p) => p.status === "done" && p.url).map((p) => p.url as string);
  /** ★ 上传未完成时禁止发送（需求硬约束） */
  const canSend = !disabled && !uploading && (input.trim().length > 0 || readyUrls.length > 0);

  /**
   * 添加图片：压缩 → 上传（逐张独立进行，便于各自展示进度与失败原因）
   */
  const addFiles = useCallback(
    async (files: File[]) => {
      if (disabled) return;
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;

      // 额度：已占用的 + 本次可收的，超出部分直接拒绝（不做队列挤替）
      const remain = MAX_IMAGES - pendingRef.current.length;
      if (remain <= 0) {
        showHint(`单条消息最多 ${MAX_IMAGES} 张图片，请先移除已选图片`);
        return;
      }
      if (images.length > remain) {
        showHint(`单条消息最多 ${MAX_IMAGES} 张图片，已保留前 ${remain} 张`);
      }

      for (const file of images.slice(0, remain)) {
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const previewUrl = createPreviewUrl(file);
        setPending((prev) => [...prev, { id, previewUrl, status: "uploading" }]);

        try {
          const prepared = await compressImage(file);
          const url = await uploadChatImage(prepared.blob, prepared.filename);
          setPending((prev) =>
            prev.map((p) => (p.id === id ? { ...p, url, status: "done" } : p)),
          );
        } catch (e) {
          setPending((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: "error" } : p)),
          );
          showHint(e instanceof Error ? e.message : "图片上传失败，请重试");
        }
      }
    },
    [disabled, showHint],
  );

  /** 移除某张待发送图片 */
  const removeImage = useCallback((id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const submit = (text?: string) => {
    if (!canSend) return;
    const value = (text ?? input).trim();
    const urls = pending.filter((p) => p.status === "done" && p.url).map((p) => p.url as string);
    if (!value && urls.length === 0) return;

    // 清空待发送区（预览 URL 用完即释放）
    pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPending([]);
    setInput("");
    onSend(value, urls);
  };

  /**
   * ★ 全局拖拽接收（window 级）
   *
   * 为什么挂在 window 而不是输入区容器上：
   * 用户习惯是「把图片拖进聊天窗口」，落点常常在消息列表甚至页面空白处。
   * 若只在输入区监听，落在别处时浏览器会执行**默认行为——直接打开这张图片**，
   * 用户看到的就是「拖进去没反应，页面反而跳去显示图片」。
   * 挂到 window 上即可全窗口接收，并 preventDefault 掉默认打开行为。
   *
   * 同一页面可能同时挂载多个输入区实例（PC 弹窗 / 移动端聊天页），
   * 故用模块级 activeDragOwner 保证同一次拖拽只被一个实例接收（否则会重复添加）。
   */
  useEffect(() => {
    const myId = instanceIdRef.current;

    const onDragOver = (e: DragEvent) => {
      if (disabled) return;
      // 必须 preventDefault，否则后续 drop 事件根本不会触发
      e.preventDefault();
      if (activeDragOwner === null) activeDragOwner = myId;
      if (activeDragOwner !== myId) return;
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (activeDragOwner !== myId) return;
      // relatedTarget 为空 = 已离开整个文档，此时才取消高亮
      if (!e.relatedTarget) {
        activeDragOwner = null;
        setDragging(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      if (disabled) return;
      if (activeDragOwner !== null && activeDragOwner !== myId) return;
      activeDragOwner = null;
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) addFiles(files);
    };

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      if (activeDragOwner === myId) activeDragOwner = null;
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles, disabled]);

  /** 选完图后统一入口：重置 value 以便连续选同一张图仍能触发 change */
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    addFiles(files);
  };

  /** 隐藏选择器：files = 相册 / 文件（多选），camera = 相机（带 capture，仅移动端使用） */
  const pickers = (
    <>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPick}
      />
    </>
  );

  /** 关闭菜单并唤起对应的系统选择器 */
  const pickImage = (useCamera: boolean) => {
    setMenuOpen(false);
    (useCamera ? cameraRef : fileRef).current?.click();
  };

  /**
   * 「+」发图入口（参考 Gemini / 豆包：加号固定在输入框左侧）
   *
   * 菜单项按端区分：
   * - 移动端：拍照（capture 直接唤起相机）+ 从相册选择 —— 手机上「拍照发给客服」是真实高频场景；
   * - 桌面端：选择图片 —— 桌面没有相机入口，菜单里额外给出粘贴/拖拽的提示。
   */
  const menuItems = isMobile
    ? [
        { key: "camera", label: "拍照", icon: <CameraOutlined />, run: () => pickImage(true) },
        { key: "album", label: "从相册选择", icon: <PictureOutlined />, run: () => pickImage(false) },
      ]
    : [{ key: "file", label: "选择图片", icon: <PictureOutlined />, run: () => pickImage(false) }];

  const limited = disabled || pending.length >= MAX_IMAGES;

  const attach = (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {pickers}
      <button
        type="button"
        aria-label="添加图片"
        aria-expanded={menuOpen}
        title={pending.length >= MAX_IMAGES ? `最多 ${MAX_IMAGES} 张` : "添加图片"}
        disabled={limited}
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: `1px solid ${BRAND.border}`,
          background: "#fff",
          color: limited ? "#C9C0B8" : BRAND.primary,
          fontSize: 18,
          cursor: limited ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PlusOutlined />
      </button>

      {menuOpen && (
        <>
          {/* 点击空白处收起菜单（透明背板，不吃输入框的点击） */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 20 }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 48,
              zIndex: 21,
              minWidth: 196,
              background: "#fff",
              border: `1px solid ${BRAND.border}`,
              borderRadius: 12,
              boxShadow: "0 8px 28px rgba(31,27,24,0.16)",
              padding: 6,
            }}
          >
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.run}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  color: BRAND.text,
                  fontSize: 13,
                  padding: "9px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <span style={{ color: BRAND.primary, fontSize: 15, display: "flex" }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
            <div style={{ height: 1, background: BRAND.border, margin: "4px 8px" }} />
            <div style={{ fontSize: 11, color: BRAND.textSub, padding: "2px 10px 6px", lineHeight: 1.7 }}>
              {isMobile ? "也可长按输入框粘贴图片" : "也可 Ctrl+V 粘贴、或直接把图片拖进来"}
            </div>
          </div>
        </>
      )}
    </div>
  );

  /** 待发送缩略图区（排在输入框正上方，右上角 × 可移除） */
  const imageStrip = pending.length > 0 && (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
      {pending.map((p) => (
        <div key={p.id} style={{ position: "relative", width: 64, height: 64 }}>
          <img
            src={p.previewUrl}
            alt="待发送图片"
            style={{
              width: 64,
              height: 64,
              objectFit: "cover",
              borderRadius: 10,
              border: `1px solid ${p.status === "error" ? "#FF4D4F" : BRAND.border}`,
              opacity: p.status === "uploading" ? 0.6 : 1,
              display: "block",
            }}
          />
          {p.status === "uploading" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 10,
                background: "rgba(0,0,0,0.35)",
                color: "#fff",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              上传中
            </div>
          )}
          {p.status === "error" && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: "0 0 10px 10px",
                background: "rgba(255,77,79,0.88)",
                color: "#fff",
                fontSize: 10,
                textAlign: "center",
                lineHeight: "14px",
              }}
            >
              上传失败
            </div>
          )}
          {/* 右上角删除（需求指定的「×」） */}
          <button
            type="button"
            aria-label="移除这张图片"
            onClick={() => removeImage(p.id)}
            style={{
              position: "absolute",
              top: -7,
              right: -7,
              width: 18,
              height: 18,
              padding: 0,
              borderRadius: "50%",
              border: "1px solid #fff",
              background: "rgba(0,0,0,0.62)",
              color: "#fff",
              fontSize: 12,
              lineHeight: "16px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );

  const hintBar = hint && (
    <div style={{ fontSize: 12, color: "#E8480A", marginBottom: 6 }}>{hint}</div>
  );

  const quickRow = (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 8,
        scrollbarWidth: "none",
      }}
    >
      {quickReplies.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled || uploading}
          onClick={() => submit(q)}
          style={{
            flex: "0 0 auto",
            border: `1px solid ${BRAND.border}`,
            background: "#fff",
            color: BRAND.text,
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 999,
            cursor: disabled || uploading ? "not-allowed" : "pointer",
            opacity: disabled || uploading ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {q}
        </button>
      ))}
    </div>
  );

  /** 拖拽高亮遮罩（桌面端） */
  const dropMask = dragging && (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 6,
        background: "rgba(255,106,0,0.06)",
        border: `2px dashed ${BRAND.primary}`,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: BRAND.primary,
        fontSize: 13,
        fontWeight: 600,
        pointerEvents: "none",
      }}
    >
      松开即可添加图片（最多 {MAX_IMAGES} 张）
    </div>
  );

  if (isMobile) {
    return (
      // ⚠️ 拖拽监听已上移到 window（见上方 useEffect），此处只保留 dragging 遮罩做视觉反馈
      <div
        style={{
          position: "relative",
          background: "#fff",
          borderTop: `1px solid ${BRAND.border}`,
          padding: "10px 12px",
          paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
        }}
      >
        {dropMask}
        {quickRow}
        {imageStrip}
        {hintBar}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {attach}
          <div
            style={{
              flex: 1,
              background: "#F7F4F1",
              borderRadius: 12,
              padding: "6px 10px",
            }}
          >
            <MTextArea
              value={input}
              onChange={setInput}
              placeholder={uploading ? "图片上传中，请稍候…" : placeholder}
              rows={1}
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ fontSize: 14, "--font-size": "14px", outline: "none" } as React.CSSProperties}
            />
          </div>
          <MButton
            color="primary"
            onClick={() => submit()}
            disabled={!canSend}
            style={{
              height: 40,
              minWidth: 56,
              borderRadius: 10,
              background: BRAND.gradient,
              border: "none",
              color: "#fff",
              fontWeight: 600,
              opacity: canSend ? 1 : 0.5,
            }}
          >
            {uploading ? "上传中" : "发送"}
          </MButton>
        </div>
      </div>
    );
  }

  return (
    // ⚠️ 拖拽监听已上移到 window（见上方 useEffect），此处只保留 dragging 遮罩做视觉反馈
    <div
      style={{
        position: "relative",
        background: "#fff",
        borderTop: `1px solid ${BRAND.border}`,
        padding: "12px 20px",
      }}
    >
      {dropMask}
      {quickRow}
      {imageStrip}
      {hintBar}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        {attach}
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={(e) => {
            // 支持 Ctrl+V 直接粘贴截图（豆包同款交互）
            const files = Array.from(e.clipboardData?.files ?? []);
            if (files.length > 0) {
              e.preventDefault();
              addFiles(files);
            }
          }}
          placeholder={
            uploading
              ? "图片上传中，完成后即可发送…"
              : `${placeholder}（Enter 发送，Shift+Enter 换行，可拖拽或粘贴图片）`
          }
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1, fontSize: 14, borderRadius: 10 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => submit()}
          disabled={!canSend}
          style={{
            height: 40,
            borderRadius: 10,
            background: BRAND.gradient,
            border: "none",
            fontWeight: 600,
          }}
        >
          {uploading ? "上传中" : "发送"}
        </Button>
      </div>
    </div>
  );
}
