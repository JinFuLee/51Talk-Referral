# FlashUI 设计与开发准则 (FlashUI Guidelines)

这是一份具备永续迭代能力的 **“组件级智能资料库 (Component Knowledge Base)”**。
当未来的人类开发者或 AI 智能体需要为本项目创建或修改任何页面、图表或组件时，**必须严格遵守此文件中的审美规格与代码模板**。绝对禁止自行发明与项目视觉不符的风格。

### 3. 色彩运用规律 (Color Rules)

- 不准使用极高饱和度颜色（例如不可用纯蓝 `bg-blue-600` 等），取而代之使用带有一定粉色/冰感混合的中间过渡色，如 `bg-blue-500/80`、`bg-emerald-400`。
- 对于警示与提示（`Destructive`/`Alert`），不要使用刺眼的鲜红，请使用柔和的莫兰迪玫瑰色或西柚色（`hsl(340, 60%, 75%)`）。 或 `hsl(210 20% 98%)`）。
- **点缀色 (Accents)**: 使用低饱和、高明度的色彩（如薄荷绿、水月蓝、柔和杏），告别刺眼的纯亮色。
- **阴影 (Shadows)**: 绝对禁止使用生硬的边缘阴影！所有卡片组件使用 Tailwind 的 `shadow-flash`（即极大的扩散半径配合极低的透明度），让组件“漂浮”起来而非贴在纸面上。
- **边界 (Borders)**: 除非必要，尽量去除黑色或深灰边框，善用淡色 (`border-slate-100` 或白底磨砂) 和间距来划分层级。

## 🧱 2. 组件基准模板 (Component Templates)

每次新建 UI 层级时，请直接由 ```css
  --shadow-flash: 0 8px 32px -4px rgba(30, 41, 59, 0.05),
                  0 4px 12px -2px rgba(30, 41, 59, 0.02);
  ```

- **交互态 (Hover)**:

  配合 `transition-all duration-500 hover:-translate-y-1 hover:shadow-flash-lg`，实现缓慢抬升的空气感。
- 边缘圆润 `rounded-2xl`
- 使用浅色文字，需要加入 `.backdrop-blur-md` 辅以 `bg-black/40`。
- 对于背景较深的包裹元素，可反向使用 `border-white/20`。

### 4. 阴影系统 (Shadows)

FlashUI 主张**轻薄悬浮的弥散光影**，摈弃坚硬的卡片边界：

- **基础投影**:

## 📸 3. 报告与演示模式 (Presentation & Print Mode)

FlashUI 系统被明确要求必须对职场汇报产出负责：
- 增加了一个 `.presentation-mode` 的全局 class，开启后隐藏 Navbar 及所有不相关操作按键。
- 遵循 `@media print` 媒体查询重置，打印时 (Cmd+P) 图表将自动占满屏幕宽度，隐藏任何阴影与不必要的菜单，自动附着企业级水印排版。
