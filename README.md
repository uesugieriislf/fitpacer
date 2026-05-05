# FitPacer 🏃‍♂️💪

极简智能的个人训练助手 PWA — 完全离线，添加到手机主屏幕使用。

## 功能一览

| 模块 | 功能 |
|------|------|
| 📅 **训练计划** | 自动生成 4 周计划（力量/有氧/休息），周视图导航，完成/跳过标记，跳过后弹窗调整 |
| 📝 **训练记录** | 按日期记录动作、组数、次数、RPE（1-10），预设动作库 + 自定义动作 |
| 📊 **数据看板** | 本周完成率/时长统计，体重+腰围趋势折线图（Chart.js），身体数据录入 |
| ⚙️ **设置** | 训练日自定义（周一至周日多选），睡眠提醒时间，亮/暗主题切换 |
| 📲 **日历导出** | 生成 .ics 文件（含 15 分钟前提醒），支持系统分享/直接打开/下载三种导入方式 |
| 📴 **PWA 离线** | 离线缓存，可安装到手机主屏幕 |

### 计划生成规则

- **力量训练**：周一、周四（间隔约 72 小时）
- **有氧训练**：周三、周六（周六为长有氧 50-60 分钟，其余 30-40 分钟）
- **跳过调整**：标记错过 → 弹窗选择"保持原计划"或"重新对齐"（仅力量日）

## 技术栈

| 层 | 选型 |
|---|------|
| 构建 | [VP（Vite Plus）](https://vite.dev) |
| 框架 | Vue 3 + Composition API |
| 状态管理 | Pinia（惰性全局单例） |
| 图表 | Chart.js |
| PWA | vite-plugin-pwa + Workbox |
| 持久化 | localStorage |
| 包管理 | pnpm |

## 快速开始

```bash
pnpm install
cd frontend
vp dev
```

浏览器打开 `http://localhost:5173/fitpacer/` 即可预览。

生产构建：

```bash
cd frontend
vp build
```

## 项目结构

```
fitpacer/
├── frontend/                # Vue 3 前端（当前开发重点）
│   └── src/
│       ├── plan/            # 功能：训练计划
│       │   ├── planEngine.ts    # 纯函数：计划生成与调整算法
│       │   ├── usePlan.ts       # Pinia store
│       │   ├── PlanView.vue     # 周视图页面
│       │   ├── storage.ts       # 类型定义 + localStorage
│       │   └── ics.ts           # .ics 日历文件生成
│       ├── record/          # 功能：训练记录
│       │   ├── useRecord.ts
│       │   ├── RecordView.vue
│       │   └── storage.ts
│       ├── dashboard/       # 功能：数据看板
│       │   ├── useDashboard.ts
│       │   ├── DashboardView.vue
│       │   └── storage.ts
│       ├── settings/        # 功能：设置
│       │   ├── useSettings.ts
│       │   ├── SettingsView.vue
│       │   └── storage.ts
│       └── shared/          # 跨功能复用
│           ├── useTheme.ts
│           └── icons.ts
├── backend/                 # 预留（当前为空）
├── deploy-tmp/              # GitHub Pages 部署产物
├── docs/                    # 需求文档
├── FITPACER.md              # 项目需求（不变的需求锚点）
├── PROGRESS.md              # 开发进度（持续更新的快照）
└── RULES.md                 # 项目规范（全栈约定 + 经验教训）
```

> 按业务功能组织，不按技术类型分文件夹。详见 `RULES.md`。

## 部署

项目已配置 GitHub Pages 自动部署：

```bash
cd frontend
pnpm deploy
```

推送到 `gh-pages` 分支，访问：
`https://uesugieriislf.github.io/fitpacer/`

## PWA 使用

1. 浏览器打开线上地址
2. 底部弹出"添加到主屏幕"提示（或浏览器菜单手动添加）
3. 添加到桌面后，图标为 FitPacer，点击直接离线使用

## 项目文档

| 文件 | 说明 |
|------|------|
| `FITPACER.md` | 完整需求定义 |
| `PROGRESS.md` | 开发进度与功能状态 |
| `RULES.md` | 全栈开发规范与经验教训 |

## License

MIT
