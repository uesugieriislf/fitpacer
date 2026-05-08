// 统计项目代码行数
// 用法: node scripts/count-lines.mjs              → 统计 frontend/src 源码
//       node scripts/count-lines.mjs --all         → 包含配置文件
//       node scripts/count-lines.mjs frontend      → 统计整个前端目录

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const includeAll = process.argv.includes("--all");
const targetDir = process.argv.slice(2).find((a) => !a.startsWith("--")) || "frontend/src";

// 源码文件扩展名
const srcExts = new Set([".vue", ".ts", ".js", ".css", ".html"]);

// --all 时额外包含的配置文件
const cfgFiles = new Set(["vite.config.ts", "tsconfig.json", "package.json", "index.html"]);

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim();
}

// 统一用 git 根目录作为基准路径
let gitRoot;
try {
  gitRoot = run("git rev-parse --show-toplevel");
} catch {
  console.error("错误: 无法执行 git，请确认在 git 仓库中");
  process.exit(1);
}

const files = run("git ls-files --full-name")
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean)
  .filter((f) => {
    // --all 时包含配置文件
    if (includeAll && cfgFiles.has(f.replace(/^.*\//, ""))) return true;
    // 只统计目标目录下的源码
    if (!f.startsWith(targetDir + "/") && f !== targetDir) return false;
    return srcExts.has("." + f.split(".").pop());
  });

let total = 0;
const stats = [];

for (const f of files) {
  try {
    const n = readFileSync(join(gitRoot, f), "utf8").split("\n").length;
    total += n;
    stats.push({ file: f.replace(/^frontend\//, ""), lines: n });
  } catch (e) {
    console.error("警告: 无法读取", f, e.message);
  }
}

// 按行数降序排列
stats.sort((a, b) => b.lines - a.lines);

console.log("\n=== FitPacer 代码行数统计 ===\n");
for (const { file, lines } of stats) {
  console.log(`  ${file.padEnd(42)} ${String(lines).padStart(5)} 行`);
}
console.log(`  ${"─".repeat(48)}`);
console.log(`  ${"总计".padEnd(42)} ${String(total).padStart(5)} 行 / ${stats.length} 文件\n`);
