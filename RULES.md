# FitPacer 全栈项目规范

## 核心理念

后端是前端逻辑的严谨化版本。同样的模式，用更重的工具加固。

```
前端（VP + Pinia）            后端（NestJS + Fastify）
─────────────────             ───────────────────────
async/await 调用接口      →    Zod Schema 驱动的远程函数
Pinia defineStore         →    @Injectable 模块单例
type guard 校验数据       →    Zod Schema 运行时校验
组合函数封装逻辑            →    Service 层封装逻辑
组件只负责渲染             →    Controller 只负责路由
```

> 当前阶段仅实现前端，后端为预留规划。

## 基础约定
- **语言**：全程使用中文交流，AI 的思考链（reasoning）也必须使用中文
- **构建工具**：统一使用 VP（Vite Plus）进行项目创建、测试、打包、运行
- **包管理器**：统一使用 pnpm，禁止使用 npm 或 yarn
- **代码检查**：使用 VP 内置能力，不额外配置 ESLint、Prettier、Husky、commitlint
- **部署**：说"发布"或"构建"即指部署到 GitHub Pages。执行 `cd frontend && pnpm run deploy`（= vp build + node scripts/deploy-ghpages.mjs）

## 目录结构

### 顶层（当前有效：仅前端）

```
fitpacer/
  frontend/              ← VP (Vite Plus) + Vue 3 + Pinia（当前活跃）
  backend/               ← NestJS (Fastify 引擎) + Zod（预留）
  docs/                  ← OpenAPI 文档（预留）
```

### 前端内部结构（feature-based，当前活跃）

```
frontend/src/
  plan/             ← 功能单元：训练计划
    planEngine.ts       ← 纯函数引擎
    usePlan.ts          ← Pinia store
    PlanView.tsx        ← TSX 页面组件
    PlanView.css        ← 组件样式（根 class 嵌套）
    PlanCard.tsx        ← TSX 子组件
    PlanCard.css        ← 子组件样式
    storage.ts          ← 数据持久化
    planEngine.test.ts  ← 同目录测试
  record/           ← 功能单元：训练记录
  dashboard/        ← 功能单元：数据看板
  settings/         ← 功能单元：设置
  goal/             ← 功能单元：目标追踪
  exercise/         ← 功能单元：自定义动作库
  calendar/         ← 功能单元：训练日历
  stats/            ← 功能单元：训练统计
  shared/           ← 跨功能复用
```

### 后端内部结构（预留规划）

```
backend/src/
  post/             ← 功能单元
    post.schema.ts      ← Zod Schema（唯一类型源）
    post.service.ts     ← @Injectable 单例
    post.controller.ts  ← 路由绑定
```

### 禁止
- 禁止出现 composables/、views/、components/、types/、controllers/、services/ 等技术分类文件夹
- 文件名必须体现功能含义，不用 index.ts

## Schema 驱动开发流程（后端上线后生效）

当前阶段（纯前端）暂时跳过此流程，类型直接在 `storage.ts` 中定义。
后端上线后恢复以下顺序，不可跳过 Schema 阶段：

```
第 1 步：定义 Schema（后端）
  backend/src/post/post.schema.ts
  → Zod Schema 定义数据结构 + 校验规则

第 2 步：实现后端逻辑（后端）
  backend/src/post/post.service.ts
  backend/src/post/post.controller.ts

第 3 步：消费接口（前端）
  frontend/src/post/api.ts       → type guard
  frontend/src/post/usePost.ts   → Pinia store
  frontend/src/post/PostList.tsx → 渲染
```

## 技术选型

| 层 | 选型 | 理由 |
|---|------|------|
| 构建 | VP（Vite Plus） | 项目创建、测试、打包、运行全部通过 VP |
| 包管理 | pnpm | 禁止使用 npm 或 yarn |
| 前端渲染 | **TSX**（JSX = JSX，拒绝 SFC 魔法语法） | 组件 = 纯函数，测试天然友好；利用 Vue 响应式 + Pinia，心智负担低于 React |
| 前端 DI | Pinia（惰性全局单例容器） | 不是"状态管理"，是 DI 容器 |
| 后端框架 | NestJS（Fastify 引擎） | 模块化架构 + Fastify 性能（预留） |
| 校验体系 | Zod（仅后端） | Schema 驱动校验 + 类型 + 文档（预留） |
| 单元测试 | Vitest（VP 内置） | 测试 planEngine + useXxx.ts + TSX 组件渲染输出 |
| 样式方案 | CSS 变量（app.css）+ 根 class 嵌套（组件级 .css） | 零依赖，原生 CSS Nesting，不需要 scoped |

## 渲染规范

### 核心原则

> 去掉 SFC 魔法，保留 Vue 响应式 + 生态，用 TSX 补齐组件表达力。

Vue 3 真正有价值的东西是 **Proxy 响应式系统**（ref/computed/watch）和 **官方生态**（Pinia、Vue Router）。
SFC（`.vue` 三区段）是历史包袱 —— 自创语法导致 TS 支持差、工具链特殊适配、测试困难。
改用 TSX 后，Vue 就相当于一个"没有 Hooks 心智负担的 React"，组件 = 函数，测试 = 测函数。

### 组件写法

```tsx
// plan/PlanView.tsx
import { usePlanStore } from './usePlan'
import './PlanView.css'

const PlanView = () => {
  const planStore = usePlanStore()

  return (
    <div class="plan-view">
      {planStore.plans.map(day => (
        <div class="plan-view__day">{day.date}</div>
      ))}
    </div>
  )
}

export default PlanView
```

- 组件是纯函数（或箭头函数）
- Props 直接用函数参数，不需要 defineProps
- 事件回调直接传函数 props（如 `onSelect`、`onToggle`）
- Pinia 不解构（见依赖注入章节）

### 样式约定

```
app.css         ← 全局 CSS 变量（设计系统），仅此一个
PlanView.tsx    ← TSX 组件
PlanView.css    ← 组件样式，根 class 作用域隔离
```

```css
/* PlanView.css */
.plan-view {
  padding: 16px;

  .plan-view__header { ... }
  .plan-view__title { font-weight: 600; }
  .plan-view__status { color: var(--text-secondary); }

  .plan-view__card {
    &--active { border-color: var(--color-primary); }
  }
}
```

- 每个组件一个同名的 `.css` 文件
- 以组件名（kebab-case 版本）作为根 class
- 所有子选择器嵌套在根 class 下，天然隔离
- 使用**原生 CSS Nesting**（现代浏览器已支持），零依赖
- 全局样式（字体、动画 keyframe、工具类）放在 `app.css`

### 编译开关

```ts
// vite.config.ts — Options API 被树摇掉，不从 .vue 引入
define: { __VUE_OPTIONS_API__: 'false' }
```

此开关告诉 Vue 运行时：你的代码中不会出现 `{ data() { ... } }` / `{ methods: { ... } }` 这种 Options API 写法，
所以 Options API 相关代码（`applyOptions`、`mixin`、`extends`、组件选项规范化等）会被打包器树摇掉，减小包体积。

### 存量的 .vue 文件

- 已存在的 `.vue` 文件保留不动，不主动迁移
- 新组件一律写 `.tsx`
- 若某个 `.vue` 需要大幅改动，可考虑顺便重写为 `.tsx`，但非必须

## 依赖注入

### 前端：Pinia defineStore（当前有效）

优先使用 defineStore 全局单例（覆盖 95%+ 场景），provide/inject 仅限极少数需要作用域隔离的场景。

```typescript
export const usePlan = defineStore('plan', () => {
  const plan = ref<DayPlan[]>(loadPlan())
  // ...
  return { plan, ... }
})
```

- 第一次调用 `usePlan()` 时才执行 setup（惰性初始化）
- 后续调用返回同一个实例（全局单例）
- 通过 Pinia DevTools 调试

### 铁律：禁止解构 Pinia store

```typescript
// ❌ 严禁 — 变成"不知道这个变量从哪里来"
const { plan, addPlan } = storeToRefs(usePlanStore())

// ✅ 必须 — 来源显式化
const planStore = usePlanStore()
planStore.plan
planStore.addPlan()
```

解构让变量来源模糊化，回到 Vuex `mapGetters` 那种"全局变量不知道哪来的"老路。
不解构是保持代码可读性和可追踪性的最简单手段。

### 后端：NestJS @Injectable（预留）

```typescript
@Injectable({ providedIn: 'root' })
export class PostService { ... }
```

前后端 DI 本质相同：全局惰性单例，第一次用到时初始化，之后复用。

## 类型策略

### 当前阶段（纯前端）
类型在 `storage.ts` 中手工定义，通过 `type guard` 做运行时校验。

### 后端上线后
- 唯一类型源：后端 Zod Schema（`z.infer` 推导类型）
- 前端通过 type guard 消费，不从手工定义来
- 不建 types/ 文件夹，不手工写 interface 冒充外部类型

## 命名规范

| 文件类型 | 命名方式 | 示例 |
|---------|---------|------|
| 前端创建函数 | `useXxx.ts` | `usePlan.ts` |
| 前端 TSX 组件 | `PascalCase.tsx` | `PlanView.tsx`（新代码统一用 TSX） |
| 前端 .vue 组件 | `PascalCase.vue` | 存量保留，新代码不再创建 |
| 前端组件样式 | `PascalCase.css` | `PlanView.css`（与 TSX 组件同目录） |
| 引擎/纯函数 | `xxxEngine.ts` | `planEngine.ts` |
| 存储层 | `storage.ts` | 在各功能目录下 |
| 后端 Controller | `xxx.controller.ts` | `post.controller.ts`（预留） |
| 后端 Service | `xxx.service.ts` | `post.service.ts`（预留） |
| 后端 Schema | `xxx.schema.ts` | `post.schema.ts`（预留） |
| 变量/函数 | camelCase | fetchPlans, isLoading |
| 常量 | UPPER_SNAKE | MAX_PLAN_WEEKS |
| CSS class | kebab-case | plan-card |

## 测试策略

### 工具
- 统一使用 Vitest（VP 内置，`vp test`）
- 测试文件命名：`xxx.test.ts`，放在被测文件同目录

### 测试优先级

| 优先级 | 测试对象 | 理由 |
|--------|---------|------|
| P0 | **纯函数模块** | 无依赖，最好测（planEngine, calendarEngine, statsEngine） |
| P0 | **storage.ts** | 数据持久化正确性 |
| P1 | **useXxx.ts（Pinia store）** | 业务逻辑核心，需 mock localStorage |
| P1 | **.tsx 组件** | 组件 = 纯函数，直接传 props 测试渲染输出，不再挂载 .vue |
| P2 | **.vue 组件（存量）** | 存量 SFC 保留，新代码不写 .vue |

### 开发流程

```
改代码 → 跑测试 → git commit → 提交
```

- 测试是逻辑代码的标配，不是可选项
- 每次有意义的变更后，必须立即 git add + git commit
- commit message 用中文，简要概括本次变更内容

### 不测试什么
- 不测 VP 框架自身功能
- 不测第三方库（Chart.js、Pinia 等）
- 不写 end-to-end 测试

## 跨会话进度跟踪

- `PROGRESS.md` 维护项目状态快照，每次有意义的变更后更新
- `.workbuddy/memory/` 记录 AI 会话间的操作日志和长期上下文
- AI 新会话必须先读 PROGRESS.md 和 .workbuddy/memory/MEMORY.md

### 与 FITPACER.md 的关系

| 文件 | 用途 | 谁来写 |
|------|------|--------|
| `FITPACER.md` | 需求文档（不变的需求锚点） | 用户制定，原则上不改 |
| `PROGRESS.md` | 进度状态（持续更新的快照） | AI 每次变更后自动维护 |
| `RULES.md`（本文件） | 项目规范 + 经验教训 | AI 根据用户反馈持续更新 |

## 经验教训清单

> AI 自动记录，追加不修改。新会话先读此清单，尤其关注高频陷阱。

| 日期 | 类别 | 教训 / 模式 | 会话 |
|------|------|-------------|------|
| 2026-05-05 | pattern | 开发完成后自动运行项目（vp dev --host），让用户能直接在移动端测试，无需用户提醒 | #1 |
| 2026-05-05 | pattern | 每次任务完成后立即 git commit，不要积攒多次修改再提交 | #1 |
| 2026-05-05 | correction | RULES.md 必须明确写入"每次任务后提交"规则，不能只靠口头约定 | #1 |
| 2026-05-07 | bug | `new Date().toISOString()` 返回 UTC 时间！东八区晚上 22:14 会变成 14:14。永远用本地 getters（getHours/getMinutes）拼接时间戳，不要用 toISOString 存基于时间的信息 | #4 |
| 2026-05-07 | correction | **需要用户决策的内容（方案选择、选项对比等）必须写在可见的回复正文中，不能放在 thinking 推理块里**。thinking 是内部推理空间，用户看不到默认折叠内容。放进去等于没放 | #4 |
| 2026-05-08 | pattern | **全面切 TSX，废弃 SFC**。新组件一律写 `.tsx`，样式用同目录 `.css` + 根 class 嵌套隔离。Options API 通过 `__VUE_OPTIONS_API__: false` 树摇掉。Pinia 禁止解构 | #6 |
| 2026-05-08 | correction | **Pinia 禁止 `storeToRefs` 解构**。不解构才能让变量来源显式化，避免回到 Vuex `mapGetters` 那种"不知道变量从哪来"的老路 | #6 |

> 四种类别：`bug` / `correction`（用户纠正）/ `pattern`（模式）/ `review`（Review 发现）
