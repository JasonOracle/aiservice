# DesktopChat 组件自说明文档

## 💡 核心思想
1. **双通道异构通信**：
   - **用户主动上行**：走 HTTP `POST /api/chat`，保证带 `Bearer Token` 鉴权并兼容 Fast RAG 响应与 Mem0 冷启动；
   - **坐席实时下行**：走 WebSocket `/ws/c/{user_id}`，实时监听 B 端人工坐席发送的 `agent_reply`，实现毫秒级人工介入与实时插话；
2. **状态扁平与安全清理**：
   - 遵从卡帕西极简原则，不添加复杂的状态机，原地维护 `messages` 数组；
   - 显式区分三种角色：`user`（用户蓝色气泡）、`assistant`（AI客服机器人）、`agent`（绿色徽标人工客服）；
   - 在 `useEffect` 清理函数中显式执行 `ws.close()`，杜绝页面跳转或热更新时的连接泄漏。

## 💻 使用示例
```tsx
import DesktopChat from "@/components/desktop/DesktopChat";

export default function ChatView() {
  return (
    <div style={{ flex: 1, height: "100vh", display: "flex" }}>
      <DesktopChat />
    </div>
  );
}
```
