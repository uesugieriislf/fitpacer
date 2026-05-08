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
- **构建工具**：统一使用 VP（Vite Plus）进行项目创建、测试、打包、格式化、运行
- **包管理器**：统一使用 pnpm，禁止使用 npm 或 yarn
- **代码检查**：使用 VP 内置能力（fmt / lint / check），不额外配置 ESLint、Prettier、Husky、commitlint
- **配置文件**：Vite 配置必须用 `.mjs` 格式（`vite.config.mjs`），不能用 `.ts`。VP 的工具链（fmt/lint/check）使用 Node.js 原生加载配置，TS 格式无法被直接解析
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

### 允许
- 每个功能模块下允许 `components/` 文件夹，用于存放该模块的 UI 组件
- 每个组件一个文件夹：`组件名/组件名.tsx` + `组件名.css` + `组件名.test.ts`

### 禁止
- 禁止出现 composables/、views/、types/、controllers/、services/ 等技术分类文件夹
- 禁止顶层 components/ 文件夹（组件归属到各自功能模块内）
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

> Vue 3 TSX 通用最佳实践以 **`vue-tsx-best-practices`** Skill 为准。
> 参考 Skill：`Skill({ skill: "vue-tsx-best-practices" })` 加载。
> 以下 FitPacer 特化约定在此之上做增补/调整。

### 核心原则

沿用 Skill 的核心理念：**Vue 组件的本质是一个被托管的 render 函数**。
去掉 SFC 魔法，保留 Vue 响应式 + 生态，用 TSX 补齐组件表达力。

### 组件写法

采用 Skill 的 `defineComponent({ props, emits, setup })` 模式：

```tsx
// shared/PlanCard.tsx
import { defineComponent, type PropType } from 'vue'
import './PlanCard.css'

interface Plan {
  id: string
  title: string
}

export default defineComponent({
  props: {
    plan: { type: Object as PropType<Plan>, required: true },
    active: { type: Boolean, default: false },
  },
  emits: {
    select: (id: string) => true,
  },
  setup(props, { emit }) {
    return () => (
      <div
        class={['plan-card', props.active && 'plan-card--active'].filter(Boolean).join(' ')}
        onClick={() => emit('select', props.plan.id)}
      >
        <span class="plan-card__title">{props.plan.title}</span>
      </div>
    )
  },
})
```

要点：

- **Props 必须声明** — 在 `props: { ... }` 中做类型 + 运行时校验，复杂类型用 `PropType<T>` 辅助
- **Emits 必须声明** — 在 `emits: { ... }` 中声明事件及参数类型，保持输出接口清晰
- **最小组件（无 props/emits）** — 直接用 `defineComponent(() => { return () => ... })` 省略 props 声明
- **无 props 参数用 `_`** — 如 `setup(_, { emit })` 防止 TS 未使用变量报错
- **响应式统一用 `ref` 不用 `reactive`** — TSX 中没有自动解包，所有响应式数据统一 `.value` 访问，心智模型单一。开发者不需要判断"这是基础类型还是对象"，一律 `ref`
- v-model — 照用，其本质就是 props + emits 语法糖

### 铁律：禁止解构

这个规则比 Skill 更严格 —— **Pinia 不解构，props 也不解构**。

```tsx
// ❌ 严禁 — 任何解构都不行
const { name, age } = storeToRefs(useUserStore())  // Pinia 来源不明
const { title } = toRefs(props)                     // props 来源模糊

// ✅ 必须 — 来源显式化
const userStore = useUserStore()
userStore.name
props.title
```

理由：
- 不解构 → 每个变量用 `store.xxx` 或 `props.xxx`，读者一眼知道是从哪来的
- 不解构 props → 省去 `toRefs` 的额外 API 调用，也不需要担心解构后丢失响应式
- 这与 Pinia 不解构是同一原则的延伸

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
- **禁止解构 Pinia store**，详见「渲染规范 → 铁律：禁止解构」

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
| P1 | **.tsx 组件** | `defineComponent({ props, emits, setup })` 形式，可 mount 或 mock props 测试 |
| P2 | **.vue 组件（存量）** | 存量 SFC 保留，新代码不写 .vue |

### 开发流程

```
改代码 → 格式化（vp fmt）→ 类型检查（vue-tsc --noEmit）→ 跑测试（vp test）→ 构建（vp build）→ git commit → 提交
```

- **每次有意义的变更后，必须执行完整质量门禁：**
  0. `npx vp fmt` — 自动格式化代码
  1. `npx vue-tsc --noEmit` — 零 TS 错误
  2. `pnpm run test` — 全部测试通过
  3. `pnpm run build` — 构建通过
- 可一键执行：`npx vp check`（格式化 + lint + 类型检查合并在一步）
- 第 0 步格式化优先执行，确保 lint 检查时不会被格式问题干扰
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
| 2026-05-08 | pattern | **TSX 组件写法对齐 `vue-tsx-best-practices` Skill**。统一用 `defineComponent({ props, emits, setup })` 模式，纯函数组件已废弃 | #6 |
| 2026-05-08 | correction | **禁止解构的范围扩展到 props**。不仅 Pinia 不解构，`toRefs(props)` 也不许用。理由同源：变量来源必须显式 | #6 |
| 2026-05-08 | bug | **TSX 中 CSS 需要显式 import `'./Xxx.css'`**。不带扩展名 Vite 自动找 `.tsx` 不会自动关联同名的 `.css` 文件。忘写 import = 样式全丢 | #6 |
| 2026-05-08 | bug | **Teleport 到 body 的内容 CSS 不能嵌套在根 class 下**。Teleport 出去的 DOM 不在组件根元素内，必须用独立作用域类（如 `pv-modal`）包裹 | #6 |
| 2026-05-08 | bug | **v-model on checkbox 在 Rolldown（VP 打包器）下报 const reassign**。`v-model` 生成 `$event => ref = $event` 但 ref 是 const。修复：改为显式 `checked={ref.value} onChange={e => ref.value = e.target.checked}` | #6 |
| 2026-05-08 | bug | **VP 的 fmt/lint/check 命令无法加载 `.ts` 配置文件**。原因：Node.js ESM 无法直接解析 TypeScript，而 VP 工具链用原生 `import()` 加载配置。修复：将 `vite.config.ts` 改为 `vite.config.mjs`（内容纯 JS 无 TS 语法）。**Vite 也支持 `.mjs` 配置** | #6 |
| 2026-05-08 | bug | **Windows 不区分文件名大小写！** `App.css` 会覆盖 `app.css`。Created `App.css` → 覆盖了设计系统 `app.css`（CSS 变量全丢）。修复：从 git 历史恢复，App Shell 样式合并到 `app.css` 末尾。**在 Windows 上永远不要使用仅大小写不同的文件名** | #6 |
| 2026-05-08 | pattern | **Teleport 到 body 的弹窗需要独立的 CSS 作用域**。`.view-class .modal-class` 不匹配 Teleport 出去的 DOM。每次使用 Teleport 时：① overlay 加 `pv-modal` class，② CSS 加 `.pv-modal { .modal-class { ... } }` 作用域 | #6 |

> 四种类别：`bug` / `correction`（用户纠正）/ `pattern`（模式）/ `review`（Review 发现）
