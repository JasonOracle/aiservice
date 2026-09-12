/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[send() 支持携带图片——签名扩展为 send(convId, text, images?)，
 *           允许「纯图片」消息（文字为空但有图）；提交 /api/chat 时带上 images，
 *           接收人工坐席回复（agent_reply）时同步还原图片]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[1. 新增后端反向同步 syncFromBackend()——登录后与进入客服列表时从后端拉取会话与历史消息，
 *              与本地 localStorage 合并，实现「换设备/换浏览器也能看到完整聊天记录」；
 *              2. 新增会话接待态 convAiManaged，接收后端 ai_custody 广播并与发送结果同步，
 *              供界面展示「人工接待中」；
 *              3. send() 依据后端返回的 ai_managed 决定追加 AI 气泡还是「已转人工」系统提示，
 *              避免托管关闭时出现空气泡]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[会话上下文贯通——send() 发送时携带 session_id / product_id / product_name / store_name，
 *           使后端能按「客户 × 店铺 × 商品」落库，B 端坐席列表得以区分同一客户的不同店铺咨询；
 *           收到 agent_reply 时依据 conversation_id 精确投递到对应会话（原先只能投给当前查看的会话）]

 * C 端会话状态中心（Context）
 *
 * 职责：
 * 1. 统一持有全部会话与消息，localStorage 为本地缓存、后端为跨设备真源；
 * 2. 全局只建立一条 `/ws/c/{user_id}` 连接，用于接收 B 端人工客服回复与托管状态变更，
 *    避免 PC 弹窗、移动端页面各自建连造成重复连接与状态分裂；
 * 3. 对外暴露 `send()`，统一走 `POST /api/chat`（RAG + Mem0 全链路）。
 *
 * 登录态同步：本 Provider 挂在根 layout 上、不会随路由卸载，
 * 因此必须监听 pathname 变化重新比对 localStorage 中的 user_id / token，
 * 否则「先打开登录页再登录」会一直沿用旧用户（演示账号换号时会串数据）。
 *
 * 数据来源分工：
 * - 本地 localStorage：即时可用、离线可读；
 * - 后端 /api/conversations：跨设备一致、清缓存后可恢复（syncFromBackend 负责合并）。
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  API_URL,
  WS_URL,
  getAuthHeaders,
  getConversationMessages,
  getMyConversations,
} from "@/lib/api";
import {
  type Conversation,
  type BackendMsg,
  STORE_CONV_ID,
  ensureConversations,
  fromBackendConvId,
  getCurrentUserId,
  makeMsg,
  mergeBackendConversations,
  saveConversations,
  sortConversations,
} from "@/lib/chatStore";

export type ConnectState = "connecting" | "open" | "closed";

interface ChatContextValue {
  /** 会话数据是否已从本地读取完成 */
  ready: boolean;
  /** 会话列表（按最后活跃时间倒序） */
  conversations: Conversation[];
  /** 当前正在查看的会话 ID */
  activeConvId: string;
  setActiveConvId: (id: string) => void;
  /** 正在等待 AI 回复的会话 ID（用于显示「正在思考」） */
  loadingConvId: string | null;
  /** 未读总数（用于 TabBar / 导航红点） */
  unreadTotal: number;
  /** WebSocket 连接状态 */
  connectState: ConnectState;
  /** 会话不存在时创建（已存在则不动） */
  ensureConversation: (conv: Conversation) => void;
  /** 发送消息并等待 AI 回复（images 为图片相对路径列表；纯图片消息 text 传空串） */
  send: (convId: string, text: string, images?: string[]) => Promise<void>;
  /** 清空某会话未读 */
  markRead: (convId: string) => void;
  /** 主动从后端同步会话与历史（进入客服列表时调用，保证看到最新记录） */
  refresh: () => Promise<void>;
  /** 某会话是否仍由 AI 托管；undefined 表示暂未知（按 AI 托管处理） */
  aiManagedOf: (convId: string) => boolean | undefined;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat 必须在 <ChatProvider> 内使用");
  return ctx;
}

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>(STORE_CONV_ID);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const [connectState, setConnectState] = useState<ConnectState>("connecting");
  const [userId, setUserId] = useState<string>("1");
  const [hasToken, setHasToken] = useState(false);
  /** 会话接待态：{ [本地会话 id]: 是否由 AI 托管 }；缺省表示未知（按 AI 托管处理） */
  const [convAiManaged, setConvAiManaged] = useState<Record<string, boolean>>({});

  const userIdRef = useRef<string>("1");
  const activeIdRef = useRef<string>(STORE_CONV_ID);
  const wsRef = useRef<WebSocket | null>(null);
  /** 会话列表快照：send() 需读取会话的商品/店铺上下文，用 ref 避免其依赖频繁变化 */
  const convsRef = useRef<Conversation[]>([]);

  useEffect(() => {
    activeIdRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    convsRef.current = conversations;
  }, [conversations]);

  /** 统一更新 + 落盘 */
  const commit = useCallback((updater: (prev: Conversation[]) => Conversation[]) => {
    setConversations((prev) => {
      const next = updater(prev);
      saveConversations(userIdRef.current, next);
      return next;
    });
  }, []);

  // 初始化 + 登录态变化同步（路由切换时重新比对 localStorage）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const uid = getCurrentUserId();
    const token = !!window.localStorage.getItem("token");
    setHasToken(token);

    if (!ready || uid !== userIdRef.current) {
      userIdRef.current = uid;
      setConversations(ensureConversations(uid));
      setActiveConvId(STORE_CONV_ID);
      setConvAiManaged({});
      setReady(true);
    }
    setUserId(uid);
  }, [pathname, ready]);

  /**
   * 从后端反向同步会话与历史消息
   *
   * 这是「换设备也能看到记录」的实现：后端已把每条消息持久化（messages 表），
   * 这里把服务端的会话与消息拉回来，与本地记录合并（服务端为准）。
   * 后端不可用时静默降级为本地记录，不影响正常聊天。
   */
  const syncFromBackend = useCallback(async () => {
    if (typeof window === "undefined") return;
    const uid = getCurrentUserId();
    if (!window.localStorage.getItem("token")) return;

    try {
      const remote = await getMyConversations(uid);
      const msgsByKey: Record<string, BackendMsg[]> = {};

      // 会话数量有限（一个客户至多若干条），并发拉取即可
      await Promise.all(
        remote.map(async (c) => {
          const key = c.session_key || STORE_CONV_ID;
          try {
            msgsByKey[key] = await getConversationMessages(c.id);
          } catch {
            msgsByKey[key] = [];
          }
        }),
      );

      commit((prev) => mergeBackendConversations(prev, remote, msgsByKey));
    } catch {
      // 后端未启动或网络异常：保持本地记录可用
    }
  }, [commit]);

  // 登录后 / 切换账号后自动同步一次，实现跨设备一致
  useEffect(() => {
    if (!ready || !hasToken) return;
    syncFromBackend();
  }, [ready, hasToken, userId, syncFromBackend]);

  /** 收到人工客服回复（依据后端会话 ID 精确投递到对应会话；支持只发图片） */
  const handleAgentReply = useCallback(
    (
      content: string,
      backendConvId = "",
      at?: number,
      images?: string[],
    ) => {
      const imgs = images && images.length > 0 ? images : undefined;
      // 人工坐席可能「只发图片不发文字」，此时也要正常展示
      if (!content && !imgs) return;
      commit((prev) => {
        if (prev.length === 0) return prev;
        const viewing = activeIdRef.current;
        // ① 优先依据后端会话 ID 定位本地会话
        const local = backendConvId ? fromBackendConvId(userIdRef.current, backendConvId) : "";
        // ② 定位不到时回退：当前查看的会话 → 最近活跃的会话
        const targetId =
          local && prev.some((c) => c.id === local)
            ? local
            : prev.some((c) => c.id === viewing)
              ? viewing
              : sortConversations(prev)[0].id;

        const ts = at ?? Date.now();
        return prev.map((c) =>
          c.id === targetId
            ? {
                ...c,
                messages: [...c.messages, makeMsg("agent", content, ts, imgs)],
                lastActiveAt: ts,
                unread: c.id === viewing ? 0 : c.unread + 1,
              }
            : c,
        );
      });
    },
    [commit],
  );

  // 全局唯一 WS 连接（未登录不连）
  useEffect(() => {
    if (!ready || !hasToken || typeof window === "undefined") return;

    const wsUrl = WS_URL.replace(/^http/, "ws");
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${wsUrl}/ws/c/${userId}`);
      setConnectState("connecting");
      ws.onopen = () => setConnectState("open");
      ws.onclose = () => setConnectState("closed");
      ws.onerror = () => setConnectState("closed");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "agent_reply") {
            handleAgentReply(
              String(data.content ?? ""),
              String(data.conversation_id ?? ""),
              Number(data.at) || undefined,
              // 人工坐席可能随消息发来图片（相对路径列表）
              Array.isArray(data.images) ? data.images.map(String) : undefined,
            );
            return;
          }
          // 坐席切换了该会话的 AI 托管（含命中人工接入后的自动关闭）
          if (data.type === "ai_custody") {
            const local = fromBackendConvId(
              userIdRef.current,
              String(data.conversation_id || ""),
            );
            if (local) {
              setConvAiManaged((prev) => ({ ...prev, [local]: !!data.enabled }));
            }
          }
        } catch {
          // 忽略非 JSON 消息
        }
      };
      wsRef.current = ws;
    } catch {
      setConnectState("closed");
    }

    return () => {
      ws?.close();
      wsRef.current = null;
    };
  }, [ready, hasToken, userId, handleAgentReply]);

  const ensureConversation = useCallback(
    (conv: Conversation) => {
      commit((prev) => (prev.some((c) => c.id === conv.id) ? prev : [...prev, conv]));
    },
    [commit],
  );

  const markRead = useCallback(
    (convId: string) => {
      commit((prev) =>
        prev.map((c) => (c.id === convId && c.unread > 0 ? { ...c, unread: 0 } : c)),
      );
    },
    [commit],
  );

  const send = useCallback(
    async (convId: string, text: string, images?: string[]) => {
      const trimmed = text.trim();
      const imgs = images && images.length > 0 ? images : [];
      // 图片已在 ChatComposer 内上传完成（上传中不允许点发送），这里只负责提交；
      // 允许「纯图片」消息：文字为空但有图时同样可发送
      if ((!trimmed && imgs.length === 0) || loadingConvId) return;

      const now = Date.now();
      commit((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, makeMsg("user", trimmed, now, imgs)],
                lastActiveAt: now,
                unread: 0,
              }
            : c,
        ),
      );
      setLoadingConvId(convId);

      let reply = "";
      /** 本次是否由 AI 应答（false 表示该会话已转人工） */
      let aiManaged = true;
      try {
        // 携带会话上下文：后端据此把消息归入「客户 × 店铺 × 商品」会话，
        // 并让 B 端坐席列表能显示「店铺名 · 客户名」
        const conv = convsRef.current.find((c) => c.id === convId);
        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            message: trimmed,
            // 图片相对路径列表（由 /api/upload 返回），后端据此落库并让 AI 识图
            images: imgs,
            session_id: convId,
            product_id: conv?.productId ?? "",
            // 仅商品会话携带商品名与店铺名；店铺总客服会话两者留空
            product_name: conv?.productId ? conv.title : "",
            store_name: conv?.productId ? (conv.subtitle ?? "") : "",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          aiManaged = data.ai_managed !== false;
          reply = String(data.reply ?? "").trim();
        } else {
          reply = "抱歉，服务暂时不可用，请稍后再试或转接人工客服。";
        }
      } catch {
        reply = "网络错误，请检查连接后重试。";
      }

      const at = Date.now();
      setConvAiManaged((prev) => ({ ...prev, [convId]: aiManaged }));
      commit((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: aiManaged
                  ? [...c.messages, makeMsg("assistant", reply || "（AI 暂时没有返回内容，请重试）", at)]
                  : [
                      ...c.messages,
                      makeMsg("system", "已为您转接人工客服，请稍候，客服会尽快回复您。", at),
                    ],
                lastActiveAt: at,
              }
            : c,
        ),
      );
      setLoadingConvId(null);
    },
    [commit, loadingConvId],
  );

  const aiManagedOf = useCallback(
    (convId: string) => convAiManaged[convId],
    [convAiManaged],
  );

  const sorted = useMemo(() => sortConversations(conversations), [conversations]);
  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread, 0),
    [conversations],
  );

  const value: ChatContextValue = {
    ready,
    conversations: sorted,
    activeConvId,
    setActiveConvId,
    loadingConvId,
    unreadTotal,
    connectState,
    ensureConversation,
    send,
    markRead,
    refresh: syncFromBackend,
    aiManagedOf,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
