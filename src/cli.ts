#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { cp, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, doctor } from './capture.js';
import { serve } from './server.js';
import { inspectConfig, verifyPack, rootSnippet } from './release.js';
import { spawn } from 'node:child_process';
import { generateStory } from './imports.js';
const help = `DemoPack — 一次浏览器运行，四份发布材料

demopack init [directory]                    创建可编辑的本地示例（含四份材料配置）
demopack generate <demo.json> [--out output]  真实录制并导出到独立目录
demopack report <story.json> [--out output]   导入结果报告，生成四份材料和来源清单
demopack media <story.json> [--out output]    导入本地图片/视频/日志，生成材料回放
demopack preview <run-directory> [--port 4173] 本地预览材料
demopack doctor                             检查 Node、Chromium 与 FFmpeg
demopack validate <demo.json>                检查配置，不启动录制
demopack verify <run-directory>              检查完整性、来源关系和文件哈希
demopack snippet <run-directory> --prefix docs/demo   Print root README Markdown
demopack preview <directory> --port 0 --open  Pick a free port and open the browser

详细视频、简短视频、竖屏图文视频、项目介绍：在 release 中配置。
Ctrl+C 取消生成。失败或取消仅保留 failure.json，不标为成功。
不需要账号或 API Key，不读取已有浏览器身份，不上传或追踪。
`;
try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      port: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      open: { type: 'boolean' },
      prefix: { type: 'string' },
    },
  });
  const [command, arg] = positionals;
  if (positionals.length > 2)
    throw new Error('Too many positional arguments. Quote paths containing spaces.');
  if (values.help || !command) console.log(help);
  else if (command === 'doctor') console.log(JSON.stringify(await doctor(), null, 2));
  else if (command === 'validate') {
    if (!arg) throw new Error('Provide demo.json');
    const demo = await inspectConfig(arg);
    console.log(
      `VALID: ${demo.steps.length} steps. Minimum configured hold/lead-in: ${(demo.steps.reduce((n, s) => n + s.holdMs + 250 + (s.action === 'wait' ? s.ms || 0 : 0), 0) / 1000).toFixed(1)}s. Browser selectors and actual duration require a real run.`,
    );
  } else if (command === 'verify') {
    if (!arg) throw new Error('Provide a run directory');
    console.log(JSON.stringify(await verifyPack(arg), null, 2));
  } else if (command === 'snippet') {
    if (!arg || !values.prefix) throw new Error('Provide a run directory and --prefix docs/demo');
    process.stdout.write(await rootSnippet(arg, values.prefix));
  } else if (command === 'init') {
    const destination = path.resolve(arg || 'demopack-demo');
    try {
      await access(destination);
      throw new Error(`Destination exists: ${destination}. Choose a new directory.`);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(fileURLToPath(new URL('../examples/starter', import.meta.url)), destination, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    console.log(
      `Created ${destination}\nNext: node "${fileURLToPath(import.meta.url)}" generate "${path.join(destination, 'demo.json')}"`,
    );
  } else if (command === 'generate' || command === 'report' || command === 'media') {
    if (!arg) throw new Error(command === 'generate' ? 'Provide demo.json' : 'Provide story.json');
    const controller = new AbortController();
    const cancel = () => controller.abort();
    process.once('SIGINT', cancel);
    process.once('SIGTERM', cancel);
    try {
      if (command === 'generate') await generate(arg, values.out, controller.signal);
      else await generateStory(arg, command, values.out, controller.signal);
    } finally {
      process.removeListener('SIGINT', cancel);
      process.removeListener('SIGTERM', cancel);
      if (controller.signal.aborted) process.exitCode = 130;
    }
  } else if (command === 'preview') {
    if (!arg) throw new Error('Provide a run directory');
    const port = values.port ? Number(values.port) : 4173;
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
    const directory = path.resolve(arg);
    try {
      await access(path.join(directory, 'index.html'));
    } catch {
      throw new Error(
        'No index.html in this directory. Choose an exported pack or the docs review directory.',
      );
    }
    let server: Awaited<ReturnType<typeof serve>>;
    try {
      server = await serve(directory, port);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE')
        throw new Error(`Port ${port} is occupied. Retry with --port 0 to pick a free port.`);
      throw error;
    }
    console.log(`Preview: ${server.url} (Ctrl+C to stop)`);
    if (values.open) {
      const command =
        process.platform === 'win32'
          ? 'rundll32.exe'
          : process.platform === 'darwin'
            ? 'open'
            : 'xdg-open';
      const args =
        process.platform === 'win32' ? ['url.dll,FileProtocolHandler', server.url] : [server.url];
      const opener = spawn(command, args, { windowsHide: true, stdio: 'ignore' });
      opener.on('error', () =>
        console.error(`Could not open a browser automatically. Open ${server.url} manually.`),
      );
      opener.on('close', (code) => {
        if (code) console.error(`Browser opener exited ${code}. Open ${server.url} manually.`);
      });
    }
    const close = () => {
      void server.close();
    };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  } else throw new Error(`Unknown command: ${command}\n${help}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = process.exitCode || 1;
}
