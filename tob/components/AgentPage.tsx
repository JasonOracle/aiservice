/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[会话列表状态标签语义修正——「人工」标签（AI 托管已关闭）与「待接入」标签
 *           原先未互斥，导致待接入的会话同时挂着两个标签，看起来像「既在等人、又已经
 *           有人在接待」。现改为互斥：待接入只显示红标，已人工接管的会话才显示「人工」]
 *
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[坐席台三处调整——1) 会话列表角标语义改为「待接入会话数」（原为会话总数）：
 *              会话按「客户 × 店铺 × 商品」拆分，总数不等于客户数，显示总数容易误判为
 *              「来了这么多客户」；改为待接入数后直接对应坐席的待办，且无待接入时整块隐藏；
 *           2) 发图入口改为参考 Gemini 的「+」小菜单（选择图片 + 粘贴/拖拽提示），
 *              与 C 端输入区交互统一；
 *           3) 输入框补充 Ctrl+V 粘贴图片支持（此前只有 C 端有，坐席侧粘贴无反应）]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[坐席收发图片——1) 人工输入区支持拖拽 / 点击选图，浏览器端压缩后上传（逐张独立进度），
 *           待发送缩略图排在输入框上方、右上角「×」可移除，单条最多 3 张、超出拒绝并提示；
 *           2) 上传完成前禁用「发送回复」按钮，且不允许 Enter 发送；
 *           3) 消息气泡渲染图片，点击用 antd Image 自带的大图预览查看（支持缩放）；
 *           4) 人工回复携带 images 通过 WebSocket 下发给客户；
 *           5) 历史消息与实时消息均映射 images，刷新后图片仍在]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[人工输入区新增「快捷短语」栏（参考千牛）——输入框上方提供一排常用话术标签，
 *          单击即把话术填入输入框并自动聚焦光标，坐席无需重复手打；
 *          话术按问候 / 处理中 / 售后 / 收尾四类组织，未选中会话时整体置灰禁用；
 *          仅做「填入」不做「直接发送」，避免误发；已输入内容时追加在下一行，不覆盖原草稿]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[AI 托管开关真正生效——1) 全局总开关与会话级开关改为读写后端（/api/ai-custody），
 *              关闭后后端不再生成 AI 回复，客户消息照常推送到坐席台；
 *              2) 开关状态持久化，刷新页面、重启后端均不丢，不再依赖前端 state；
 *              3) 接收 ai_custody 广播，多坐席浏览器之间实时同步开关状态；
 *              4) WS 重连后重新拉取托管状态，避免断线期间的状态漂移；
 *              5) 列表项标注「人工接待」标识，待接入红标与托管状态可同时呈现]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[坐席台会话维度与历史回看改造——
 *           1) 左侧列表由「按客户」改为「按客户 × 店铺 × 商品」的会话维度，标题显示「店铺名 · 客户名」，
 *              副标题显示商品名与最后一条消息，同一客户在多家店的咨询各自独立成条；
 *           2) 会话列表与聊天记录改为从后端读取（/api/conversations），刷新页面、重启服务后历史仍在；
 *           3) 进入会话自动滚动到最后一条消息，无需手动下拖；
 *           4) 人工接入标记改为按会话维度并从后端初始化，刷新后红标不丢；
 *           5) 人工坐席回复改为携带 conversation_id 发送，使 C 端能精确投递到对应会话；
 *           6) 适配 antd v6——notification 的 `message` 属性已废弃，改用 `title`]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[新增「请求人工接入」处理链路——接收后端 handoff_request 广播后：1) 右上角弹 notification 告警；2) 会话列表加红色「待接入」标记并自动切到该会话；3) 消息流插入系统提示条；4) 自动关闭该会话的 AI 托管，避免 AI 继续抢答；同时在消息气泡下方补充时间]

 * B 端实时坐席监控台
 * - 监听 C 端对话流（chat_stream）、人工接入请求（handoff_request）与托管状态变更（ai_custody）
 * - 会话粒度：客户 × 店铺 × 商品，一名客户可有多路并行咨询
 * - 历史消息来自后端持久化，进入会话自动定位到最新一条
 * - 双层 AI 托管：全局开关 + 单会话独立开关（会话级优先），状态落在后端，多坐席实时同步
 */
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Image,
  Input,
  Row,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
  notification,
} from "antd";
// antd v6 的顶层入口不再导出 TextAreaRef，需从实现文件直接取（用于快捷短语填入后聚焦光标）
import type { TextAreaRef } from "antd/es/input/TextArea";
import {
  BellOutlined,
  CustomerServiceOutlined,
  MessageOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SendOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Bubble, Conversations } from "@ant-design/x";
import type { ConversationItemType } from "@ant-design/x";
import {
  WS_URL,
  getAiCustody,
  getConversationMessages,
  getConversations,
  mediaUrl,
  setAiCustody,
  uploadChatImage,
  type ConversationItem,
} from "@/lib/api";
import { compressImage } from "@/lib/imageCompress";

/**
 * 坐席「快捷短语」（参考千牛快捷回复）
 *
 * 设计取舍：
 * - **只填入、不直接发送**——坐席还可能补充细节，直接发送容易误发；
 * - 覆盖服务四阶段：问候 → 处理中 → 售后 → 收尾，顺序即使用顺序；
 * - 若后续要支持坐席自定义，把本数组换成后端下发的配置即可（当前为内置常量）。
 */
const QUICK_PHRASES: string[] = [
  "您好，很高兴为您服务，请问有什么可以帮您？",
  "亲，感谢您的咨询～我马上为您处理。",
  "稍等，我帮您查询一下，请稍候～",
  "您的问题我已记录，正在为您加急核实。",
  "这种情况支持 7 天无理由退换，请您放心。",
  "麻烦您提供一下订单号，我帮您核实处理～",
  "已经为您加急处理，请留意后续消息。",
  "感谢您的理解与支持，祝您购物愉快！",
];

/** 坐席单条消息最多可带图片数（与后端 chat_images.MAX_IMAGES_PER_MESSAGE 保持一致） */
const MAX_IMAGES = 3;

/** 坐席待发送图片的本地状态 */
interface PendingImage {
  id: string;
  /** 本地预览地址（blob:），移除时需 revoke */
  previewUrl: string;
  /** 上传成功后的相对路径 */
  url?: string;
  status: "uploading" | "done" | "error";
}

interface ChatMsg {
  key: string;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  /** 图片相对路径列表（无图片时缺省） */
  images?: string[];
  /** 毫秒时间戳 */
  at: number;
}

/** 时间展示：HH:mm */
function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 待接入原因 → 中文说明 */
function handoffText(reason: string | null): string {
  if (reason === "ai_fallback") return "AI 未能解答，需人工介入";
  if (reason === "user") return "客户主动请求人工";
  return "";
}

export default function AgentPage() {
  /** 会话列表（一条 = 客户 × 店铺 × 商品），唯一数据来源为后端 */
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string>("");
  /** 消息缓存：{ [conversation_id]: ChatMsg[] }，点击会话时从后端拉取 */
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMsg[]>>({});
  const [msgLoading, setMsgLoading] = useState(false);
  /** 每个会话专属独立的 AI 托管配置：{ [conversation_id]: boolean } */
  const [sessionAiManaged, setSessionAiManaged] = useState<Record<string, boolean>>({});
  /** 全局全部 AI 托管开关 */
  const [globalAiManaged, setGlobalAiManaged] = useState<boolean>(true);

  const [input, setInput] = useState("");
  /** 当前悬停的快捷短语（tob 无全局 CSS 文件，hover 反馈用内联样式实现） */
  const [hoverPhrase, setHoverPhrase] = useState("");

  /** 待发送图片队列（坐席发图，最多 MAX_IMAGES 张） */
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  /** 拖拽悬停中（整块高亮提示） */
  const [dragging, setDragging] = useState(false);
  /** 轻提示文案（自动消失） */
  const [hint, setHint] = useState("");
  /** 「+」发图小菜单是否展开（与 C 端输入区保持同一套交互） */
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  /** 是否有图片正在上传中 —— ★ 上传完成前禁用发送按钮 */
  const uploading = pendingImages.some((p) => p.status === "uploading");

  /** 输入框实例：快捷短语填入后把光标交还给输入框，坐席可直接接着补字 */
  const inputAreaRef = useRef<TextAreaRef>(null);
  /** 隐藏的文件选择器 */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeConvIdRef = useRef<string>("");
  /** 已成功拉取过历史的会话，避免重复请求 */
  const loadedRef = useRef<Set<string>>(new Set());
  /** 正在请求历史中的会话，避免并发重复拉取 */
  const loadingRef = useRef<Set<string>>(new Set());
  /** 会话列表快照：WS 回调中需判断某会话是否已存在（闭包内 state 可能是旧值） */
  const convsRef = useRef<ConversationItem[]>([]);
  /** 消息区滚动容器，用于进入会话时定位到最后一条 */
  const scrollRef = useRef<HTMLDivElement>(null);
  /** 待发送图片的最新值（判额度、卸载清理都要用，避免闭包取到旧值） */
  const pendingImagesRef = useRef<PendingImage[]>([]);

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  /** 卸载时释放所有本地预览 URL，避免内存泄漏 */
  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  /** 轻提示，1.8 秒后自动消失 */
  const showHint = useCallback((text: string) => {
    setHint(text);
    window.setTimeout(() => setHint(""), 1800);
  }, []);

  useEffect(() => {
    convsRef.current = conversations;
  }, [conversations]);

  /** 拉取会话列表 */
  const refreshConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      return data;
    } catch {
      message.error("获取会话列表失败，请检查后端服务是否可用");
      return [];
    } finally {
      setListLoading(false);
    }
  }, []);

  /** 拉取某会话的历史消息（带并发去重：同一会话正在请求中则跳过） */
  const loadMessages = useCallback(async (convId: string, force = false) => {
    if (!convId) return;
    if (!force && (loadedRef.current.has(convId) || loadingRef.current.has(convId))) return;
    loadingRef.current.add(convId);
    setMsgLoading(true);
    try {
      const msgs = await getConversationMessages(convId);
      loadedRef.current.add(convId);
      setMessagesMap((prev) => ({
        ...prev,
        [convId]: msgs.map((m) => ({
          key: `${convId}-${m.id}`,
          role: m.role,
          content: m.content,
          // 历史消息同样带图片（相对路径列表），刷新后图片不丢
          images: m.images && m.images.length > 0 ? m.images : undefined,
          at: m.created_at,
        })),
      }));
    } catch {
      // 会话可能已被服务端删除，静默降级
    } finally {
      loadingRef.current.delete(convId);
      setMsgLoading(false);
    }
  }, []);

  /**
   * 从后端同步 AI 托管状态（全局总开关 + 各会话覆盖）
   *
   * 后端是唯一真源：页面刷新、后端重启后状态都从服务端拉回，
   * 因此不再出现「关掉托管，刷新一下又自己开了」的问题。
   */
  const loadCustody = useCallback(async () => {
    try {
      const state = await getAiCustody();
      setGlobalAiManaged(state.global);
      setSessionAiManaged(state.sessions ?? {});
    } catch {
      // 后端不可用时保留当前视图，不打断坐席工作
    }
  }, []);

  // 首次进入时对齐托管状态
  useEffect(() => {
    loadCustody();
  }, [loadCustody]);

  // 首次进入：拉会话列表并默认选中最新一条（切换 activeConvId 会自动触发历史加载）
  useEffect(() => {
    refreshConversations().then((data) => {
      if (data && data.length > 0) setActiveConvId(data[0].id);
    });
  }, [refreshConversations]);

  /** 把一条消息并入指定会话（带去重，避免与历史拉取结果重复） */
  const appendMessage = useCallback((convId: string, msg: ChatMsg) => {
    setMessagesMap((prev) => {
      const list = prev[convId];
      // 尚未加载过历史的会话不做本地堆积，等点击时统一从后端拉取
      if (!list) return prev;
      const dup = list.some(
        (m) =>
          m.role === msg.role &&
          m.content === msg.content &&
          m.at === msg.at &&
          // 纯图片消息 content 为空串，必须一并比较图片，否则会被误判成重复而丢弃
          (m.images ?? []).join(",") === (msg.images ?? []).join(","),
      );
      if (dup) return prev;
      return { ...prev, [convId]: [...list, msg] };
    });
  }, []);

  // 建立 WebSocket 实时监听 C 端所有会话流
  useEffect(() => {
    const wsUrl = WS_URL.replace(/^http/, "ws");
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${wsUrl}/ws/agent`);
      ws.onopen = () => {
        console.log("[Agent WS] 坐席连接成功");
        // 断线期间可能有其他坐席改过托管开关，重连后重新对齐
        loadCustody();
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const convId = String(data.conversation_id || "");
          const uid = String(data.user_id);
          const now = Number(data.at) || Date.now();

          // ⓪ AI 托管状态变更（任一坐席改动后，其余坐席实时对齐；全局变更 conversation_id 为空）
          if (data.type === "ai_custody") {
            if (data.scope === "global") {
              setGlobalAiManaged(!!data.enabled);
            } else if (convId) {
              setSessionAiManaged((prev) => ({ ...prev, [convId]: !!data.enabled }));
            }
            return;
          }

          if (!convId) return;

          // ① 普通对话流（客户提问 / AI 回复）
          if (data.type === "chat_stream") {
            const role: ChatMsg["role"] =
              data.role === "assistant" ? "assistant" : "user";
            // 随消息下发的图片相对路径列表（客户发来的图）
            const msgImages: string[] = Array.isArray(data.images)
              ? data.images.map(String)
              : [];
            appendMessage(convId, {
              key: `${convId}-${role}-${now}-${Math.random().toString(36).slice(2, 6)}`,
              role,
              content: data.content,
              images: msgImages.length > 0 ? msgImages : undefined,
              at: now,
            });

            // 同步刷新会话摘要；若是从未见过的会话（新咨询），重新拉一次列表
            if (!convsRef.current.some((c) => c.id === convId)) {
              refreshConversations();
            } else {
              // 纯图片消息没有正文，摘要记「[图片]」，否则列表上这一条看起来像空的
              const summary = data.content || (msgImages.length > 0 ? "[图片]" : "");
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === convId
                    ? { ...c, last_message: summary, last_role: role, last_active_at: now }
                    : c,
                ),
              );
            }

            if (role === "user") {
              if (data.ai_managed === false) {
                // 该会话已转人工，AI 不会应答，必须由坐席回复
                message.warning(
                  `【${data.user_name || "客户"}】发来新消息，且该会话已关闭 AI 托管，请人工回复`,
                );
              } else if (convId !== activeConvIdRef.current) {
                message.info(`收到来自【${data.user_name || "客户"}】的新消息`);
              }
            }
            return;
          }

          // ② 请求人工接入（客户主动要求 / AI 兜底转人工）
          if (data.type === "handoff_request") {
            const reasonText = handoffText(String(data.reason || ""));
            const isAiFallback = data.reason === "ai_fallback";

            notification.warning({
              title: `${data.store_name ? data.store_name + " · " : ""}${
                data.user_name || "客户"
              } 请求人工接入`,
              description: `${reasonText}｜手机号 ${data.user_phone || "-"}｜原话：「${String(
                data.content || "",
              ).slice(0, 40)}」`,
              placement: "topRight",
              duration: 0,
              icon: <BellOutlined style={{ color: "#fa8c16" }} />,
            });

            // 更新会话的待接入状态（持久化在后端，刷新后仍会带回）
            if (!convsRef.current.some((c) => c.id === convId)) {
              refreshConversations();
            } else {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === convId
                    ? {
                        ...c,
                        handoff_reason: String(data.reason || "user"),
                        handoff_at: now,
                        last_active_at: now,
                      }
                    : c,
                ),
              );
            }

            appendMessage(convId, {
              key: `${convId}-system-${now}`,
              role: "system",
              content: `客户于 ${fmtTime(now)} 请求人工接入（${reasonText}）`,
              at: now,
            });

            // 自动关闭该会话的 AI 托管，交还人工接待
            setSessionAiManaged((prev) => ({ ...prev, [convId]: false }));

            // 自动切到该会话，便于坐席第一时间处理
            setActiveConvId(convId);
            if (!loadedRef.current.has(convId)) loadMessages(convId);
            return;
          }
        } catch {
          // 忽略格式解析错误
        }
      };
      wsRef.current = ws;
    } catch {
      // 容错
    }

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [appendMessage, refreshConversations, loadMessages, loadCustody]);

  // 切换会话时按需拉取历史
  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  /**
   * 待接入会话数 —— 顶栏角标显示的是它（原先显示 conversations.length 即会话总数）。
   *
   * 为什么改：会话按「客户 × 店铺 × 商品」拆分，同一位客户可能产生多条会话，
   * 直接把总数显示成角标会让人误以为「来了这么多客户」；而坐席真正要盯的是
   * 「还有几个会话在等我接入」。没人工介入需求时角标整体隐藏，不再有恒定数字。
   */
  const pendingHandoffCount = useMemo(
    () => conversations.filter((c) => !!c.handoff_reason).length,
    [conversations],
  );

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConvId),
    [conversations, activeConvId],
  );
  const currentMessages = messagesMap[activeConvId] || [];

  // 进入会话 / 来新消息时，把聊天区滚动到最后一条
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeConvId, currentMessages.length, msgLoading]);

  /**
   * 添加图片：浏览器端压缩 → 上传（逐张独立进行，各自展示进度与失败原因）
   * - 单条最多 MAX_IMAGES 张，超出部分直接拒绝并提示（不做队列挤替）
   * - 未选中会话时不允许添加（与输入框的禁用状态一致）
   */
  const addFiles = useCallback(
    async (files: File[]) => {
      if (!activeConvIdRef.current) {
        showHint("请先选择左侧的客户会话");
        return;
      }
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;

      const remain = MAX_IMAGES - pendingImagesRef.current.length;
      if (remain <= 0) {
        showHint(`单条消息最多 ${MAX_IMAGES} 张图片，请先移除已选图片`);
        return;
      }
      if (images.length > remain) {
        showHint(`单条消息最多 ${MAX_IMAGES} 张图片，已保留前 ${remain} 张`);
      }

      for (const file of images.slice(0, remain)) {
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const previewUrl = URL.createObjectURL(file);
        setPendingImages((prev) => [...prev, { id, previewUrl, status: "uploading" }]);

        try {
          const prepared = await compressImage(file);
          const url = await uploadChatImage(prepared.blob, prepared.filename);
          setPendingImages((prev) =>
            prev.map((p) => (p.id === id ? { ...p, url, status: "done" } : p)),
          );
        } catch (e) {
          setPendingImages((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: "error" } : p)),
          );
          showHint(e instanceof Error ? e.message : "图片上传失败，请重试");
        }
      }
    },
    [showHint],
  );

  /**
   * ★ 全局拖拽接收（window 级）
   *
   * 为什么挂在 window 而不是输入区容器上：
   * 用户习惯是「把图片拖进聊天窗口」，落点常常在消息区甚至页面空白处。
   * 若只在输入区监听，落在别处时浏览器会执行**默认行为——直接打开这张图片**，
   * 用户看到的就是「拖进去没反应，页面反而跳去显示图片」。
   * 挂到 window 上即可全窗口接收，并 preventDefault 掉默认打开行为。
   */
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!activeConvIdRef.current) return;
      // 必须 preventDefault，否则后续 drop 事件根本不会触发
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      // relatedTarget 为空 = 已离开整个文档，此时才取消高亮；
      // 在窗口内元素间移动时 relatedTarget 非空，保持高亮不闪烁
      if (!e.relatedTarget) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!activeConvIdRef.current) return;
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) addFiles(files);
    };

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  /** 移除一张待发送图片 */
  const removePendingImage = useCallback((id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  /** 清空待发送图片并释放本地预览 URL */
  const clearPendingImages = useCallback(() => {
    pendingImagesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingImages([]);
  }, []);

  // 人工客服介入发送消息（支持「文字+图片」与「纯图片」）
  const handleSend = () => {
    const text = input.trim();
    const urls = pendingImages
      .filter((p) => p.status === "done" && p.url)
      .map((p) => p.url as string);

    // ★ 上传完成前禁止发送（需求硬约束）：按钮与 Enter 都会走到这里
    if (uploading) {
      showHint("图片上传中，请稍候…");
      return;
    }
    if ((!text && urls.length === 0) || !activeConvId) return;

    setInput("");
    clearPendingImages();

    const at = Date.now();
    appendMessage(activeConvId, {
      key: `${activeConvId}-agent-${at}`,
      role: "agent",
      content: text,
      images: urls.length > 0 ? urls : undefined,
      at,
    });

    // 已人工回复即视为已接入，清掉待接入标记（该会话此后由人工持续接待）
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              handoff_reason: null,
              handoff_at: null,
              ai_managed: false,
              last_active_at: at,
              // 纯图片回复用「[图片]」占位，避免列表摘要空白
              last_message: text || (urls.length > 0 ? "[图片]" : ""),
              last_role: "agent",
            }
          : c,
      ),
    );

    // 通过 WS 广播给 C 端客户（携带 conversation_id 与图片，便于 C 端精确投递）
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeConv) {
      wsRef.current.send(
        JSON.stringify({
          type: "agent_message",
          user_id: String(activeConv.user_id),
          conversation_id: activeConvId,
          content: text,
          images: urls,
        }),
      );
    }
  };

  /**
   * 快捷短语填入：追加到输入框末尾并聚焦，不覆盖坐席已输入的内容
   * - 有草稿时换行追加，使话术独立成段；
   * - setState 是异步的，延后一帧再聚焦并把光标放到末尾，坐席可直接接着补字。
   */
  const insertQuickPhrase = (phrase: string) => {
    setInput((prev) => (prev.trim() ? `${prev.replace(/\s+$/, "")}\n${phrase}` : phrase));
    window.setTimeout(() => inputAreaRef.current?.focus({ cursor: "end" }), 0);
  };

  // 会话列表按最后活跃时间倒序
  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.last_active_at - a.last_active_at),
    [conversations],
  );

  // 构造 Conversations 列表项：标题「店铺名 · 客户名」，副标题「商品名 · 最后消息」
  const conversationItems: ConversationItemType[] = useMemo(() => {
    return sortedConversations.map((c) => {
      const pending = !!c.handoff_reason;
      const storeLabel = c.store_name || "商城客服";
      const preview = c.last_message || "暂无最新消息";
      const prefix = c.product_name ? `${c.product_name} · ` : "";
      const desc = prefix + preview;

      return {
        key: c.id,
        label: (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {`${storeLabel} · ${c.user_name}`}
            </span>
            {pending && (
              <Tag color="error" style={{ marginInlineEnd: 0, transform: "scale(0.86)", flexShrink: 0 }}>
                待接入
              </Tag>
            )}
            {/* 「人工」标签表示该会话已由人工接待（AI 托管关闭）。
                与「待接入」互斥：待接入的会话人工还没接手，不该同时挂「人工」标签，
                否则看起来像「既在等人、又已经有人在接待」。 */}
            {!pending && c.ai_managed === false && (
              <Tag
                style={{
                  marginInlineEnd: 0,
                  transform: "scale(0.86)",
                  flexShrink: 0,
                  color: "#6b7280",
                  background: "#f3f4f6",
                  borderColor: "#e5e7eb",
                }}
              >
                人工
              </Tag>
            )}
          </span>
        ),
        description: desc.length > 22 ? desc.slice(0, 22) + "..." : desc,
      };
    });
  }, [sortedConversations]);

  // 计算当前会话最终生效的 AI 托管状态（会话级开关优先级 > 全局开关）
  const isCurrentAiManaged = useMemo(() => {
    if (sessionAiManaged[activeConvId] !== undefined) {
      return sessionAiManaged[activeConvId];
    }
    return globalAiManaged;
  }, [sessionAiManaged, activeConvId, globalAiManaged]);

  /**
   * 切换全局 AI 托管总开关
   * 乐观更新 + 失败回滚：先改视图保证手感，再落库；失败则重新从后端对齐。
   */
  const handleToggleGlobalAi = async (checked: boolean) => {
    setGlobalAiManaged(checked);
    try {
      const state = await setAiCustody(checked);
      setGlobalAiManaged(state.global);
      setSessionAiManaged(state.sessions ?? {});
      message.success(
        checked
          ? "已开启全局 AI 托管（未单独设置的会话均由 AI 应答）"
          : "已关闭全局 AI 托管（未单独设置的会话将由人工接待）",
      );
    } catch {
      message.error("设置全局 AI 托管失败，请检查后端服务");
      loadCustody();
    }
  };

  /**
   * 切换当前会话的专属 AI 托管
   * 该设置优先级高于全局开关；关闭后后端不再为该会话生成 AI 回复。
   */
  const toggleCurrentSessionAi = async (checked: boolean) => {
    const convId = activeConvId;
    if (!convId) return;
    setSessionAiManaged((prev) => ({ ...prev, [convId]: checked }));
    try {
      const state = await setAiCustody(checked, convId);
      setGlobalAiManaged(state.global);
      setSessionAiManaged(state.sessions ?? {});
      message.success(
        checked
          ? "已开启本会话的 AI 托管（优先于全局设置）"
          : "已关闭本会话的 AI 托管，改由人工接待",
      );
    } catch {
      message.error("设置会话 AI 托管失败，请检查后端服务");
      loadCustody();
    }
  };

  const pendingCount = useMemo(
    () => conversations.filter((c) => c.handoff_reason).length,
    [conversations],
  );

  return (
    <div>
      {/* SaaS 经典橙色渐变顶部看板 */}
      <div
        style={{
          background: "linear-gradient(135deg, #FF8A3D 0%, #FF6A00 55%, #E8480A 100%)",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 20,
          color: "#fff",
          boxShadow: "0 4px 12px rgba(255,106,0,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CustomerServiceOutlined style={{ fontSize: 24 }} />
              <Typography.Title level={3} style={{ color: "#fff", margin: 0 }}>
                实时坐席监控台
              </Typography.Title>
              {pendingCount > 0 && (
                <Tag
                  color="#fff"
                  style={{
                    color: "#E8480A",
                    fontWeight: 700,
                    borderRadius: 999,
                    border: "none",
                  }}
                >
                  {pendingCount} 个待接入
                </Tag>
              )}
            </div>
            <Typography.Text
              style={{ color: "rgba(255,255,255,0.88)", marginTop: 4, display: "block" }}
            >
              按「店铺 · 客户」区分会话，一名客户可同时咨询多家店铺；历史消息已持久化，刷新不丢
            </Typography.Text>
          </div>

          {/* 全局全部 AI 对话托管总开关 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255,255,255,0.18)",
              padding: "10px 18px",
              borderRadius: 24,
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.3)",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>
              全部 AI 对话托管 (全局):
            </span>
            <Switch
              checked={globalAiManaged}
              onChange={handleToggleGlobalAi}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </div>
        </div>
      </div>

      <Row gutter={16}>
        {/* 左侧会话列表（按 店铺 × 客户 × 商品 拆分） */}
        <Col xs={24} md={8}>
          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>客户会话列表</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* 角标语义 = 待接入会话数。无待接入时整块隐藏——
                      避免出现一个恒定数字，让人误以为「来了这么多客户」（会话是按
                      客户 × 店铺 × 商品 拆分的，总数 ≠ 客户数）。 */}
                  {pendingHandoffCount > 0 && (
                    <span
                      title={`${pendingHandoffCount} 个会话正在等待人工接入`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#FFF3EC",
                        border: "1px solid #FFD9BC",
                        borderRadius: 999,
                        padding: "2px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#E8480A",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Badge status="error" />
                      待接入 {pendingHandoffCount}
                    </span>
                  )}
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => refreshConversations()}
                  />
                </div>
              </div>
            }
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            styles={{ body: { padding: 12 } }}
          >
            {listLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin />
              </div>
            ) : conversationItems.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>
                    暂无客户咨询
                    <br />
                    等待 C 端客户从商品页发起会话
                  </span>
                }
                style={{ padding: "32px 0" }}
              />
            ) : (
              <Conversations
                items={conversationItems}
                activeKey={activeConvId}
                onActiveChange={(key) => setActiveConvId(key as string)}
                style={{ maxHeight: 520, overflow: "auto" }}
              />
            )}
          </Card>
        </Col>

        {/* 右侧实时对话主区 */}
        <Col xs={24} md={16}>
          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar style={{ backgroundColor: "#FF6A00", flexShrink: 0 }} icon={<UserOutlined />} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>
                      {activeConv
                        ? `${activeConv.user_name} (${activeConv.user_phone})`
                        : "客户对话"}
                    </div>
                    {activeConv && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          fontWeight: "normal",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <ShopOutlined />
                        {`${activeConv.store_name || "商城客服"}${
                          activeConv.product_name ? " · " + activeConv.product_name : ""
                        }`}
                      </div>
                    )}
                  </div>
                  {activeConv?.handoff_reason && (
                    <Tag color="error" style={{ marginInlineStart: 4, flexShrink: 0 }}>
                      待接入 · {handoffText(activeConv.handoff_reason)}
                    </Tag>
                  )}
                </div>

                {/* 当前会话独立的专属 AI 托管 Switch（优先级高于全局） */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: isCurrentAiManaged ? "#f0fdf4" : "#fef2f2",
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: `1px solid ${isCurrentAiManaged ? "#bbf7d0" : "#fecaca"}`,
                    flexShrink: 0,
                  }}
                >
                  <Badge
                    status={isCurrentAiManaged ? "success" : "error"}
                    text={
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {isCurrentAiManaged ? "本会话: AI托管中" : "本会话: 人工接待中"}
                      </span>
                    }
                  />
                  <Switch
                    size="small"
                    checked={isCurrentAiManaged}
                    onChange={toggleCurrentSessionAi}
                  />
                </div>
              </div>
            }
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              minHeight: 560,
              display: "flex",
              flexDirection: "column",
            }}
            styles={{ body: { padding: 0, flex: 1, display: "flex", flexDirection: "column" } }}
          >
            {/* 消息历史滚动区 */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                maxHeight: 440,
                minHeight: 380,
                overflow: "auto",
                padding: "20px",
                background: "#fafafa",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {!activeConv ? (
                <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 80 }}>
                  <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                  <div>请从左侧选择一个客户会话</div>
                </div>
              ) : msgLoading && currentMessages.length === 0 ? (
                <div style={{ textAlign: "center", marginTop: 80 }}>
                  <Spin />
                </div>
              ) : currentMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 80 }}>
                  <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                  <div>该会话暂无消息，可在下方输入主动发起沟通</div>
                </div>
              ) : (
                currentMessages.map((m) =>
                  m.role === "system" ? (
                    <div key={m.key} style={{ display: "flex", justifyContent: "center" }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#B45309",
                          background: "#FFF7E6",
                          border: "1px solid #FFE0A3",
                          borderRadius: 999,
                          padding: "4px 14px",
                        }}
                      >
                        {m.content}
                      </span>
                    </div>
                  ) : (
                    <div key={m.key}>
                      <Bubble
                        content={
                          <div>
                            {/* 消息图片：点击可用 antd Image 自带的大图预览查看（支持缩放、多图切换） */}
                            {m.images && m.images.length > 0 && (
                              <Image.PreviewGroup>
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    marginBottom: m.content ? 8 : 0,
                                  }}
                                >
                                  {m.images.map((src, idx) => (
                                    <Image
                                      key={`${src}-${idx}`}
                                      src={mediaUrl(src)}
                                      alt={`图片${idx + 1}`}
                                      width={116}
                                      height={116}
                                      style={{
                                        objectFit: "cover",
                                        borderRadius: 8,
                                        cursor: "zoom-in",
                                        display: "block",
                                      }}
                                    />
                                  ))}
                                </div>
                              </Image.PreviewGroup>
                            )}
                            {m.content ? (
                              <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
                            ) : null}
                          </div>
                        }
                        placement={m.role === "user" ? "start" : "end"}
                        avatar={
                          m.role === "user" ? (
                            <Avatar icon={<UserOutlined />} style={{ background: "#52c41a" }} />
                          ) : m.role === "agent" ? (
                            <Avatar
                              icon={<CustomerServiceOutlined />}
                              style={{ background: "#FF6A00" }}
                            />
                          ) : (
                            <Avatar icon={<RobotOutlined />} style={{ background: "#FFB27A" }} />
                          )
                        }
                        variant={m.role === "user" ? "filled" : "outlined"}
                        style={{ borderRadius: 10 }}
                      />
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          textAlign: m.role === "user" ? "left" : "right",
                          padding: "0 6px",
                        }}
                      >
                        {m.role === "agent" ? "人工客服" : m.role === "assistant" ? "AI 客服" : ""}
                        {m.role !== "user" ? " · " : ""}
                        {fmtTime(m.at)}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>

            {/* 人工输入与发送区（含参考千牛的快捷短语栏 + 坐席发图）
                ⚠️ 拖拽监听挂在 window 上（见上方 handleWindowDrag* 的 useEffect），
                   不再挂在本容器：原先只挂在输入区，拖到消息区或列表区时
                   浏览器会按默认行为直接打开图片，表现为「拖拽无反应」。
                   此处保留 dragging 遮罩作为视觉反馈。 */}
            <div
              style={{
                position: "relative",
                padding: "16px 20px",
                borderTop: "1px solid #f0f0f0",
                background: "#ffffff",
              }}
            >
              {/* 拖拽高亮遮罩 */}
              {dragging && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 6,
                    background: "rgba(255,106,0,0.06)",
                    border: "2px dashed #FF6A00",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FF6A00",
                    fontSize: 13,
                    fontWeight: 600,
                    pointerEvents: "none",
                  }}
                >
                  松开即可添加图片（最多 {MAX_IMAGES} 张）
                </div>
              )}
              {/* 快捷短语：单击填入输入框（只填入不发送，避免误发） */}
              <div style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#8c8c8c" }}>
                    快捷短语
                  </span>
                  <span style={{ fontSize: 11, color: "#bfbfbf" }}>
                    点击填入输入框，可继续补充后发送
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {QUICK_PHRASES.map((phrase) => {
                    const on = hoverPhrase === phrase && !!activeConv;
                    return (
                      <button
                        key={phrase}
                        type="button"
                        disabled={!activeConv}
                        onMouseEnter={() => setHoverPhrase(phrase)}
                        onMouseLeave={() => setHoverPhrase("")}
                        onClick={() => insertQuickPhrase(phrase)}
                        title={phrase}
                        style={{
                          maxWidth: 280,
                          padding: "4px 12px",
                          fontSize: 12,
                          lineHeight: "18px",
                          borderRadius: 999,
                          border: `1px solid ${on ? "#FF6A00" : "#FFE0C7"}`,
                          background: on ? "#FFEFE4" : "#FFF7F1",
                          color: "#E8480A",
                          cursor: activeConv ? "pointer" : "not-allowed",
                          opacity: activeConv ? 1 : 0.45,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          transition: "background .15s, border-color .15s",
                        }}
                      >
                        {phrase}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 待发送图片：缩略图排在输入框正上方，右上角「×」可移除 */}
              {pendingImages.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  {pendingImages.map((p) => (
                    <div key={p.id} style={{ position: "relative", width: 64, height: 64 }}>
                      <img
                        src={p.previewUrl}
                        alt="待发送图片"
                        style={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: `1px solid ${p.status === "error" ? "#FF4D4F" : "#e5e7eb"}`,
                          opacity: p.status === "uploading" ? 0.6 : 1,
                          display: "block",
                        }}
                      />
                      {p.status === "uploading" && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: 8,
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
                            borderRadius: "0 0 8px 8px",
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
                      <button
                        type="button"
                        aria-label="移除这张图片"
                        onClick={() => removePendingImage(p.id)}
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
              )}

              {/* 轻提示（超出张数、上传失败原因等） */}
              {hint && (
                <div style={{ fontSize: 12, color: "#E8480A", marginBottom: 8 }}>{hint}</div>
              )}

              {/* 隐藏的图片选择器 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = ""; // 重置，便于连续选择同一张图
                  addFiles(files);
                }}
              />

              {/* 输入框与发送按钮 */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                {/* 「+」发图入口（与 C 端输入区同一套交互）：菜单里给出选图入口与粘贴/拖拽提示 */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Button
                    icon={<PlusOutlined />}
                    aria-expanded={attachMenuOpen}
                    onClick={() => setAttachMenuOpen((v) => !v)}
                    disabled={!activeConv || pendingImages.length >= MAX_IMAGES}
                    title={
                      pendingImages.length >= MAX_IMAGES ? `最多 ${MAX_IMAGES} 张图片` : "添加图片"
                    }
                    style={{ height: 40, width: 40, borderRadius: 8 }}
                  />
                  {attachMenuOpen && (
                    <>
                      {/* 点击空白处收起菜单 */}
                      <div
                        onClick={() => setAttachMenuOpen(false)}
                        style={{ position: "fixed", inset: 0, zIndex: 20 }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          bottom: 48,
                          zIndex: 21,
                          minWidth: 210,
                          background: "#fff",
                          border: "1px solid #f0f0f0",
                          borderRadius: 12,
                          boxShadow: "0 8px 28px rgba(0,0,0,0.16)",
                          padding: 6,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false);
                            fileInputRef.current?.click();
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            background: "transparent",
                            color: "#1f1b18",
                            fontSize: 13,
                            padding: "9px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ color: "#FF6A00", fontSize: 15, display: "flex" }}>
                            <PictureOutlined />
                          </span>
                          选择图片
                        </button>
                        <div style={{ height: 1, background: "#f0f0f0", margin: "4px 8px" }} />
                        <div
                          style={{
                            fontSize: 11,
                            color: "#8c8c8c",
                            padding: "2px 10px 6px",
                            lineHeight: 1.7,
                          }}
                        >
                          也可 Ctrl+V 粘贴、或直接把图片拖进来
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <Input.TextArea
                  ref={inputAreaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={(e) => {
                    // 支持 Ctrl+V 直接粘贴截图（与 C 端输入区保持一致）
                    const files = Array.from(e.clipboardData?.files ?? []);
                    if (files.length > 0) {
                      e.preventDefault();
                      addFiles(files);
                    }
                  }}
                  disabled={!activeConv}
                  placeholder={
                    !activeConv
                      ? "请先选择左侧的客户会话…"
                      : uploading
                        ? "图片上传中，完成后即可发送…"
                        : isCurrentAiManaged
                          ? "当前处于 AI 托管状态，您输入并发送后将作为人工坐席向客户插话…"
                          : "请输入回复客户的内容…（可拖拽或粘贴图片）"
                  }
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  style={{ flex: 1, borderRadius: 8 }}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  disabled={
                    !activeConv ||
                    uploading ||
                    (!input.trim() && !pendingImages.some((p) => p.status === "done"))
                  }
                  style={{
                    height: 40,
                    borderRadius: 8,
                    background: "linear-gradient(135deg,#FF8A3D,#FF6A00)",
                    border: "none",
                    fontWeight: 600,
                  }}
                >
                  {uploading ? "上传中" : "发送回复"}
                </Button>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
