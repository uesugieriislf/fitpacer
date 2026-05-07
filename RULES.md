# FitPacer 项目规范

## 基础约定
- **语言**：全程使用中文交流
- **构建工具**：统一使用 VP（Vite Plus）
- **包管理器**：统一使用 pnpm，禁止使用 npm 或 yarn
- **代码检查**：使用 VP 内置能力（`vp check`），不额外配置 ESLint/Prettier

## 目录结构

按业务功能组织，不按技术类型分文件夹：

```
src/
  plan/             ← 功能单元：训练计划
  record/           ← 功能单元：训练记录
  dashboard/        ← 功能单元：数据看板
  settings/         ← 功能单元：设置
  goal/             ← 功能单元：目标追踪
  shared/           ← 跨功能复用
```

### 禁止
- 禁止出现 composables/、views/、components/、types/ 等技术分类文件夹
- 文件名必须体现功能含义，不用 index.ts

## 开发流程

```
改代码 → 跑测试 → git commit → 提交
```

### 每次任务完成后立即提交
- **每次有意义的变更后**（新增功能、修改功能、修复 bug），必须立即 `git add` + `git commit`
- 不要积攒多个任务的修改再一起提交
- commit message 用中文，简要概括本次变更内容
- 提交前确保不遗留未保存的修改

## 测试策略

- 统一使用 Vitest（通过 `vp test`）
- 测试文件命名：`xxx.test.ts`，放在被测文件同目录
- 优先测试纯函数模块（P0）和 storage 层（P0）
- useXxx.ts 需 mock storage 测试（P1）
- .vue 组件只在有复杂交互时写测试（P2）

## 跨会话进度跟踪

- `PROGRESS.md` 维护项目状态快照，每次有意义的变更后更新
- `MEMORY.md`（.workbuddy/memory/）记录 AI 会话间的长期上下文
- 新会话先读 PROGRESS.md 和 MEMORY.md

## 命名规范

| 文件类型 | 命名方式 | 示例 |
|---------|---------|------|
| 创建函数 | `useXxx.ts` | `usePlan.ts` |
| 组件 | `PascalCase.vue` | `PlanView.vue` |
| 引擎/纯函数 | `xxxEngine.ts` | `planEngine.ts` |
| 存储层 | `storage.ts` | 在各功能目录下 |
| 变量/函数 | camelCase | fetchPlans |
| 常量 | UPPER_SNAKE | MAX_PLAN_WEEKS |
| CSS class | kebab-case | plan-card |

## 经验教训清单

> AI 自动记录，追加不修改。新会话先读此清单。

| 日期 | 类别 | 教训 / 模式 | 会话 |
|------|------|-------------|------|
| 2026-05-05 | pattern | 每次任务完成后立即 git commit，不要积攒多次修改再提交 | #1 |
| 2026-05-05 | correction | RULES.md 必须明确写入"每次任务后提交"规则，不能只靠口头约定 | #1 |
| 2026-05-07 | bug | `new Date().toISOString()` 返回 UTC 时间！东八区晚上 22:14 会变成 14:14。永远用本地 getters（getHours/getMinutes）拼接时间戳，不要用 toISOString 存基于时间的信息 | #4 |
| 2026-05-07 | correction | **需要用户决策的内容（方案选择/选项对比）必须写在可见的回复正文中，不能放在 thinking 推理块里**。thinking 是内部推理空间，用户看不到默认折叠内容。放进去等于没放。AI 需要在正文中直接提问 or 给出选项 | #4 |
