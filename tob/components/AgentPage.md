# AgentPage 坐席监控组件

## 💡 核心思想
AgentPage 是 B 端智能客服系统的中枢调度界面，基于 Ant Design X 构建。其核心设计包括：
1. **真实会话流与多用户隔离**：通过后端 `/api/users` 动态加载种子用户列表，通过 WebSocket (`/ws/agent`) 实时接收 C 端用户的提问与 AI 回复流，并按 `user_id` 在前端独立维护消息池。
2. **双层 AI 托管状态仲裁**：
   - 提供「全局全部 AI 托管总开关」作为基准策略；
   - 每个用户对话卡片顶部具备独立的「会话级专属 AI 托管 Switch」；
   - 仲裁逻辑：当会话存在自定义托管设置时，以会话开关为最高优先级（优先于全局）；若未设置，则继承全局开关。
3. **主流 SaaS 视觉设计规范**：采用 Ant Design 经典浅灰底色（`#f0f2f5`）与纯白卡片容器体系，配合品牌主色蓝（`#1677ff`）渐变看板，彻底告别沉重暗色。

## 💻 使用示例
```tsx
import AgentPage from "@/components/AgentPage";

export default function AdminConsole() {
  return (
    <div style={{ padding: 24, background: "#f0f2f5" }}>
      <AgentPage />
    </div>
  );
}
```
