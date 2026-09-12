/**
 * C 端商城主题 token（橙色 · 电商感）
 *
 * 设计取向：
 * - 主色采用偏暖的电商橙，#FF6A00，比纯红更高级、比纯黄更有购买欲；
 * - 大面积留白 + 浅暖底色 #FFF9F5，避免整屏橙造成廉价感；
 * - 渐变仅用于 Hero / 主按钮 / 价格强调，克制使用以保留高级感；
 * - 价格使用橙红 #FF3B1F，符合国内电商「价格要跳出来」的视觉习惯。
 */
import type { ThemeConfig } from "antd";

export const BRAND = {
  /** 主色（按钮、选中态、链接） */
  primary: "#FF6A00",
  /** 主色加深（hover / active） */
  primaryDeep: "#E05500",
  /** 品牌渐变（Hero、主按钮、Logo） */
  gradient: "linear-gradient(135deg, #FFA24D 0%, #FF6A00 48%, #E8480A 100%)",
  /** 极浅橙底（标签、选中背景） */
  primarySoft: "#FFF1E6",
  /** 价格 / 促销色 */
  price: "#FF3B1F",
  /** 页面底色（暖白） */
  bg: "#FFF9F5",
  /** 卡片底色 */
  surface: "#FFFFFF",
  /** 分割线 */
  border: "#F2E7DE",
  /** 主文字 */
  text: "#1F1B18",
  /** 次级文字 */
  textSub: "#8A8078",
  /** 卡片阴影 */
  shadow: "0 1px 2px rgba(31,27,24,0.04), 0 6px 18px rgba(31,27,24,0.06)",
  /** 卡片 hover 阴影 */
  shadowHover: "0 8px 28px rgba(255,106,0,0.16)",
} as const;

export const FONT_STACK =
  '"PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

/** antd 全局主题（ConfigProvider 使用） */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primary,
    colorLink: BRAND.primary,
    colorInfo: BRAND.primary,
    colorError: BRAND.price,
    borderRadius: 10,
    fontFamily: FONT_STACK,
  },
  components: {
    Button: { primaryShadow: "0 4px 12px rgba(255,106,0,0.24)" },
  },
};
