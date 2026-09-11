# ThemeClientProvider 组件

## 💡 核心思想
在 Next.js App Router (RSC 服务端组件) 架构下，Ant Design 的主题算法（`theme.defaultAlgorithm`）依赖客户端运行时环境。
通过声明 `"use client"` 的 `ThemeClientProvider` 组件隔离主题配置，配置主流 SaaS 经典浅灰底色（`#f0f2f5`）与纯白卡片容器体系。

## 💻 使用示例
```tsx
import ThemeClientProvider from "@/components/ThemeClientProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{ background: "#f0f2f5" }}>
        <ThemeClientProvider>{children}</ThemeClientProvider>
      </body>
    </html>
  );
}
```
