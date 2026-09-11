# MobileChat 组件自说明文档

## 💡 核心思想
1. **纯正移动端原生体验**：
   - 采用全屏沉浸式布局，输入框底部适配 iOS/Android 安全区 (`env(safe-area-inset-bottom)`)，防止被软键盘或底部操作条遮挡；
   - 整合 `antd-mobile` 轻量级组件体系，交互自然扁平。
2. **双向流式与实时客服接入**：
   - 用户发送问题直连后端 AI 引擎；
   - 组件挂载时自动建立 `WebSocket /ws/c/{user_id}` 实时监听来自 B 端人工坐席的插话（`agent_reply`），并动态以绿色人工客服标签渲染展示；
   - 组件卸载时安全清理 WebSocket 句柄，杜绝移动端切页或热更新时的内存与连接泄露。

## 💻 使用示例
```tsx
import MobileChat from "@/components/mobile/MobileChat";

export default function MobileChatPage() {
  return <MobileChat onBack={() => window.history.back()} />;
}
```
