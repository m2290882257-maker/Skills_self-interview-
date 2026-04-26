#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

/**
 * 本地最小化 Web 健康检查（不依赖 npm install）。
 * 输入：仓库内固定文件路径。
 * 输出：控制台检查结果 + 进程退出码（0 通过，1 失败）。
 * 边界：仅做静态结构检查，不启动 Next.js 服务。
 */

const repoRoot = process.cwd();
const webRoot = path.join(repoRoot, 'web');

const checks = [];

function addCheck(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function checkFileExists(relPath) {
  const absolutePath = path.join(repoRoot, relPath);
  const exists = fs.existsSync(absolutePath);
  addCheck(`文件存在: ${relPath}`, exists, exists ? 'ok' : 'missing');
  return exists;
}

function checkWebPackageScripts() {
  const relPath = 'web/package.json';
  if (!checkFileExists(relPath)) return;

  try {
    const raw = readText(path.join(repoRoot, relPath));
    const pkg = JSON.parse(raw);
    const scripts = pkg.scripts || {};

    addCheck('web dev 脚本存在', typeof scripts.dev === 'string', scripts.dev || 'missing');
    addCheck('web build 脚本存在', typeof scripts.build === 'string', scripts.build || 'missing');
    addCheck('web start 脚本存在', typeof scripts.start === 'string', scripts.start || 'missing');
  } catch (error) {
    addCheck('web/package.json 可解析', false, String(error));
  }
}

function checkMvpWiring() {
  const apiPath = path.join(webRoot, 'pages/api/mvp.ts');
  const libPath = path.join(webRoot, 'lib/runMVPFlow.ts');

  if (!fs.existsSync(apiPath) || !fs.existsSync(libPath)) {
    addCheck('MVP API/前端连接检查', false, 'web/pages/api/mvp.ts 或 web/lib/runMVPFlow.ts 缺失');
    return;
  }

  const apiText = readText(apiPath);
  const libText = readText(libPath);

  addCheck(
    'API 使用本地 skill 提取器',
    apiText.includes('extractResumeExperiences') &&
      apiText.includes('extractJobAnchorFromJd') &&
      apiText.includes('extractInterviewQuestions'),
    '检查 api/mvp.ts 是否直连本地 orchestrator'
  );

  addCheck(
    '前端调用本地 API 路由',
    libText.includes("fetch('/api/mvp'") || libText.includes('fetch("/api/mvp"'),
    '检查 runMVPFlow.ts 是否请求 /api/mvp'
  );
}

function main() {
  const requiredFiles = [
    'web/pages/index.tsx',
    'web/pages/api/mvp.ts',
    'web/lib/runMVPFlow.ts',
    'web/components/UploadPanel.tsx',
    'web/components/AnalysisPanel.tsx'
  ];

  requiredFiles.forEach(checkFileExists);
  checkWebPackageScripts();
  checkMvpWiring();

  let failed = 0;
  for (const check of checks) {
    const icon = check.ok ? '✅' : '❌';
    console.log(`${icon} ${check.name} - ${check.detail}`);
    if (!check.ok) failed += 1;
  }

  if (failed > 0) {
    console.error(`\nWeb health check failed: ${failed} 项未通过`);
    process.exit(1);
  }

  console.log('\nWeb health check passed.');
}

main();
