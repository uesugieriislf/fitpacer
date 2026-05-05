# FitPacer 个人训练助手 PWA

## 项目概述

- **名称**：FitPacer
- **目标**：为个人用户提供一个极简、智能、完全离线的个人训练助手
- **运行环境**：移动端 PWA（添加到手机主屏幕使用）
- **交付标准**：`npm install` → `vp dev` 一键启动

## 顶层结构（monorepo）

```
fitpacer/
  frontend/             ← VP + Vue 3 + Pinia（当前开发重点）
  backend/              ← 预留，目前为空（未来可能 NestJS + Fastify）
  docs/                 ← 需求文档、设计文档
```

当前仅开发 `frontend/`，`backend/` 预留目录结构，不加任何代码。

## 技术选型

| 层 | 选型 |
|---|------|
| 构建 | VP（Vite Plus） |
| 前端框架 | Vue 3 + Composition API |
| 前端 DI | Pinia（惰性全局单例容器） |
| PWA | vite-plugin-pwa（离线访问 + 安装到桌面） |
| 图表 | Chart.js（轻量） |
| 路由 | 无需 vue-router，底部导航条件渲染 |
| 数据持久化 | localStorage（JSON 存储） |
| 日历交互 | 生成 .ics 文件触发下载，供用户导入系统日历 |
| 后端 | 预留，当前不实现 |

## 前端目录结构

按业务功能组织，不按技术类型分文件夹。

```
frontend/src/
  plan/                 ← 功能单元：训练计划
    usePlan.ts          ← defineStore：计划生成 + 调整 + 状态
    PlanView.vue        ← 本周计划页面
    planEngine.ts       ← 纯函数：计划生成与调整算法
    storage.ts          ← localStorage 读写 + 类型定义
    ics.ts              ← .ics 日历文件生成

  record/               ← 功能单元：训练记录
    useRecord.ts        ← defineStore：记录 CRUD
    RecordView.vue      ← 训练记录页面
    storage.ts          ← localStorage 读写 + 类型定义

  dashboard/            ← 功能单元：数据看板
    useDashboard.ts     ← defineStore：数据聚合 + 图表数据
    DashboardView.vue   ← 数据看板页面
    storage.ts          ← localStorage 读写 + 类型定义

  settings/             ← 功能单元：设置
    useSettings.ts      ← defineStore：用户偏好管理
    SettingsView.vue    ← 设置页面
    storage.ts          ← localStorage 读写 + 类型定义

  shared/               ← 跨功能复用
    useTheme.ts         ← 主题切换（亮/暗）
    icons.ts            ← emoji / 图标工具
```

### 目录规则
- 目录名用业务名词（plan、record、dashboard、settings）
- 文件名体现功能含义，不用 index.ts
- 禁止出现 composables/、views/、components/、types/ 等技术分类文件夹
- `shared/` 仅放真正跨功能复用的代码

## 数据流

```
storage.ts  →  useXxx.ts (defineStore)  →  .vue
持久化层       状态逻辑层（惰性单例）       渲染层（只消费）
```

- **storage.ts**：封装 localStorage 读写操作，**包含类型定义**——类型从数据中用 `as` 断言推导，不单独建 types/ 文件
- **useXxx.ts**：Pinia defineStore，惰性全局单例，调用 storage 读写数据，暴露响应式状态和操作方法
- **.vue**：从 store 解构数据和方法，直接用于模板渲染，不写业务逻辑

## 核心智能模块：计划生成与调整引擎

### planEngine.ts — 纯函数集合

逻辑层和视图层完全分离。引擎不依赖 Pinia、不依赖 Vue、不依赖存储，只做计算。

```typescript
// plan/planEngine.ts — 纯函数，输入数据→输出结果
function generatePlan(config: PlanConfig): DayPlan[]
function adjustPlan(plan: DayPlan[], missedDate: string): AdjustResult
function findNextSlot(plan: DayPlan[], fromDate: string): string | null
```

### 生成规则

- 应用初始化或用户确认训练日后，自动生成未来 4 周计划
- 力量训练日：周一、周四（间隔约 72 小时）
- 有氧训练日：周三、周六（周六为长有氧 50-60 分钟，其余 30-40 分钟）
- 其余为休息
- 力量日自动附带动作建议：引体向上、双杠臂屈伸、下斜俯卧撑、保加利亚分腿蹲

### 调整逻辑

当用户在某天点击"跳过"时，调用 `adjustPlan(missedDate)`：

1. 标记当日为已错过
2. 根据被错过的训练类型，提供两个恢复选项（弹窗选择）：
   - **保持原计划**：仅标记本次错过，后续不变
   - **重新对齐**（仅力量日有效）：将错过的力量训练插入下一个合适空档（三日后），顺延后续力量日，维持 72 小时间隔
3. 选择后更新计划数据，提示用户重新导出 .ics

## 4 个视图

### 视图 1：PlanView.vue（首页）
- 当前周（周一至周日）训练计划列表/简易日历
- 每项：日期、训练类型（力量/有氧/休息）、动作建议概要
- 已完成：勾选标记；已错过：跳过标记
- "标记完成"和"跳过"按钮
- 顶部"📲 导出训练日历 (.ics)"按钮

### 视图 2：RecordView.vue
- 选定某一天的训练记录（默认为今天）
- 表单：训练类型自动填入、动作选择（预设动作库 + 自定义添加）、组数、次数、RPE（1-10 滑块）
- 保存后写入 localStorage，更新该日完成状态

### 视图 3：DashboardView.vue
- 周报：本周完成率、总运动时长（有氧/力量分类）
- 月报：体重、腰围趋势图（line chart）
- 身体数据录入：晨起体重(kg)、腰围(cm)、睡眠质量(1-5)、肌肉酸痛度(1-5)

### 视图 4：SettingsView.vue
- 设定可用训练日（多选：周一至周日）
- 设定训练偏好（当前固定"力量+有氧混合"，后续可扩展）
- 设定睡眠提醒时间（仅页面提示，不实现闹钟）

## 系统日历提醒

- 不依赖浏览器通知 API
- 生成 .ics 文件：包含未来 4 周所有非休息日的训练事件
- 每个事件设置"开始前 15 分钟"的 VALARM
- 用户点击导出 → Blob 下载 → 手动打开 → 系统引导导入日历
- 计划调整后需手动重新导出

## 类型策略

- 不建 types/ 文件夹
- 类型定义在 storage.ts 中，用 `as` 断言推导
- 数据模型（localStorage 键名）：

```
fitpacer_training_plan: DayPlan[]
  { date: string, type: 'strength'|'cardio'|'rest',
    completed: boolean, missed: boolean, details: string }

fitpacer_training_records: TrainingRecord[]
  { id: string, date: string, action: string,
    sets: number, reps: number, rpe: number, note: string }

fitpacer_body_data: BodyData[]
  { id: string, date: string, weight: number,
    waist: number, sleepQuality: number, soreness: number }
```

## 命名规范

| 文件类型 | 命名 | 示例 |
|---------|------|------|
| 创建函数 | `useXxx.ts` | `usePlan.ts` |
| 组件 | `PascalCase.vue` | `PlanView.vue` |
| 引擎/纯函数 | `xxxEngine.ts` | `planEngine.ts` |
| 存储层 | `storage.ts` | 在各功能目录下 |
| 变量/函数 | camelCase | fetchPlans |
| 常量 | UPPER_SNAKE | MAX_PLAN_WEEKS |
| CSS class | kebab-case | plan-card |
