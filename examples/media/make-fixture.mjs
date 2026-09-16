import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { binary, run } from '../../dist/process.js';
const root = path.dirname(fileURLToPath(import.meta.url));
await mkdir(root, { recursive: true });
const ffmpeg = await binary('ffmpeg');
await run(ffmpeg, [
  '-y',
  '-v',
  'error',
  '-f',
  'lavfi',
  '-i',
  'testsrc2=size=960x540:rate=25',
  '-t',
  '10',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  path.join(root, 'synthetic.mp4'),
]);
await run(ffmpeg, [
  '-y',
  '-v',
  'error',
  '-i',
  path.join(root, 'synthetic.mp4'),
  '-frames:v',
  '1',
  path.join(root, 'synthetic.png'),
]);
await writeFile(
  path.join(root, 'fixture.txt'),
  '这是合成素材导入测试，不是 ESP 设备实测。\n图片与视频由 FFmpeg testsrc2 生成。\n没有连接开发板，没有烧录固件，没有读取串口。\n实际使用时，请替换为你拍摄的设备视频、照片和串口记录。\n设备效果必须由真实拍摄和实测支撑。\n',
);
console.log('Created explicitly synthetic import fixtures');
