import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
export async function binary(name: 'ffmpeg' | 'ffprobe') {
  const configured = process.env[`DEMOPACK_${name.toUpperCase()}`];
  if (configured) return configured;
  const local = path.resolve('.tools', process.platform === 'win32' ? `${name}.exe` : name);
  try {
    await access(local);
    return local;
  } catch {
    return name;
  }
}
export function run(
  command: string,
  args: string[],
  options: { cwd?: string; signal?: AbortSignal } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new Error('Cancelled'));
      return;
    }
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const collect = (b: Buffer) => {
      output = (output + b.toString()).slice(-24000);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const abort = () => child.kill('SIGTERM');
    options.signal?.addEventListener('abort', abort, { once: true });
    child.on('error', (e) => {
      options.signal?.removeEventListener('abort', abort);
      reject(
        new Error(
          `Cannot run ${path.basename(command)}: ${e.message}. Install FFmpeg and ffprobe; set DEMOPACK_FFMPEG / DEMOPACK_FFPROBE to executable paths.`,
        ),
      );
    });
    child.on('close', (code) => {
      options.signal?.removeEventListener('abort', abort);
      if (options.signal?.aborted) reject(new Error('Cancelled'));
      else if (code === 0) resolve(output);
      else reject(new Error(`${path.basename(command)} exited ${code}: ${output}`));
    });
  });
}
