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
  frontend/src/post/PostList.vue → 渲染
```

## 技术选型

| 层 | 选型 | 理由 |
|---|------|------|
| 构建 | VP（Vite Plus） | 项目创建、测试、打包、运行全部通过 VP |
| 包管理 | pnpm | 禁止使用 npm 或 yarn |
| 前端框架 | Vue 3 + Composition API | script setup + defineStore |
| 前端 DI | Pinia（惰性全局单例容器） | 不是"状态管理"，是 DI 容器 |
| 后端框架 | NestJS（Fastify 引擎） | 模块化架构 + Fastify 性能（预留） |
| 校验体系 | Zod（仅后端） | Schema 驱动校验 + 类型 + 文档（预留） |
| 单元测试 | Vitest（VP 内置） | 测试 useXxx.ts + 纯函数模块 |

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
| 前端组件 | `PascalCase.vue` | `PlanView.vue` |
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
| P2 | **.vue 组件** | 组件是薄层，简单渲染即可 |

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

> 四种类别：`bug` / `correction`（用户纠正）/ `pattern`（模式）/ `review`（Review 发现）
