import { escapeHtml as e } from './text.js';
import type { Demo } from './config.js';
import type { Kit } from './kit.js';

const css = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f3f2ec;color:#173d36;font:16px/1.9 'Microsoft YaHei',system-ui,sans-serif;overflow-wrap:anywhere}main{max-width:1160px;padding:36px 28px 80px;margin:auto}a{color:inherit}a:focus-visible{outline:3px solid #997339;outline-offset:4px}header{border-bottom:1px solid #cbd4c6;padding-bottom:24px;display:flex;justify-content:space-between;gap:24px}h1{font-size:clamp(30px,5vw,56px);line-height:1.3;margin:55px 0 24px}h2{font-size:30px;line-height:1.4;margin:0 0 18px}p{color:#526c5d;white-space:pre-line}.nav{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0 54px}.nav a,.download{display:inline-block;padding:10px 18px;border:1px solid #becabb;border-radius:28px;text-decoration:none;font-size:14px}.nav a:hover,.download:hover{background:#e3e8dc}.section{border-top:1px solid #cbd4c6;padding:42px 0;margin-top:22px}.number{color:#8a724e;font-size:14px;letter-spacing:3px;margin-bottom:14px}video{width:100%;max-height:78vh;background:#132d29;display:block;border-radius:16px;margin:24px 0}.social{max-width:430px;margin:auto}.article{max-width:800px;margin:auto}.article h2{margin-top:48px;font-size:25px}.article p{margin:22px 0}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:26px 0}.gallery img{width:100%;border-radius:8px}.meta{font-size:13px;color:#657762}footer{border-top:1px solid #cbd4c6;margin-top:45px;padding-top:20px;font-size:13px}details{margin-top:24px}@media(max-width:600px){.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}main{padding:24px 20px 50px}header{font-size:13px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
const shell = (title: string, body: string) =>
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'"><title>${e(title)}</title><style>${css}</style>${body}</html>`;
export function projectHtml(demo: Demo) {
  const project = demo.release!.project;
  return shell(
    demo.title,
    `<main class="article"><a href="index.html#article">← 返回演示材料</a><h1>${e(demo.title)}</h1><p>${e(project.summary)}</p>${project.sections.map((s) => `<h2>${e(s.heading)}</h2><p>${e(s.body)}</p>`).join('')}<a class="download" href="project.md" download>下载介绍文字</a><footer>由作者提供内容，与本次演示材料一起导出。</footer></main>`,
  );
}
export function kitHtml(demo: Demo, kit: Kit, runId: string, warnings: string[]) {
  return shell(
    demo.title,
    `<main><header><b>项目演示作品集</b><span>本地生成 · 离线可看</span></header><h1>${e(demo.title)}</h1><p>${e(demo.release!.project.summary)}</p><nav class="nav"><a href="#detailed">01 详细视频</a><a href="#short">02 简短视频</a><a href="#social">03 竖屏图文视频</a><a href="#article">04 项目介绍</a></nav>
<section class="section" id="detailed"><div class="number">第一份 / 完整讲解</div><h2>从开始到完成，了解每一步</h2><p>完整浏览器演示 · ${demo.steps.length} 个步骤 · 人工填写中文字幕</p><video controls playsinline preload="metadata" poster="cover.jpg" src="demo.mp4"></video><div class="nav"><a href="demo.mp4" download>下载详细视频</a><a href="demo.gif" download>下载短动图</a><a href="README-snippet.md" download>下载图文片段</a><a href="walkthrough.html">查看逐步说明与截图</a></div></section>
<section class="section" id="short"><div class="number">第二份 / 快速了解</div><h2>用重点片段，介绍核心流程</h2><p>${kit.short.durationSeconds.toFixed(1)} 秒 · ${kit.clips.length} 个真实片段 · 保留原字幕与播放速度</p><video controls playsinline preload="metadata" poster="cover.jpg" src="short.mp4"></video><a class="download" href="short.mp4" download>下载简短视频</a></section>
<section class="section" id="social"><div class="number">第三份 / 手机图文叙事</div><h2>真实画面，配上清楚的说明</h2><p>${kit.social.durationSeconds.toFixed(1)} 秒 · 1080 × 1920 竖屏 · ${kit.cards.length} 张卡片 · 无配音或音乐</p><div class="social"><video controls playsinline preload="metadata" poster="${kit.cards[0].file}" src="social.mp4"></video></div><div class="nav"><a href="social.mp4" download>下载竖屏图文视频</a><a href="social-caption.md" download>下载发布文案</a></div><div class="gallery">${kit.cards.map((c, i) => `<a href="${c.file}" download><img src="${c.file}" alt="${e(demo.release!.social.cards[i].title)}" loading="lazy"></a>`).join('')}</div></section>
<section class="section" id="article"><div class="number">第四份 / 深入阅读</div><h2>详细介绍项目</h2><p>作者提供的功能、使用方式与限制说明。工具负责整理排版，不自动推断项目能力。</p><div class="nav"><a href="project.html">阅读完整介绍 →</a><a href="project.md" download>下载介绍文字</a></div></section>
<footer>所有资源均在此文件夹内，整体复制后可离线浏览。未自动上传或发布。${warnings.length ? '<p>录制质量提示：存在采样间隔或帧率警告，发布前请检查动态画面。详见文件清单。</p>' : ''}<details><summary>查看生成信息</summary><p>运行编号：${e(runId)}</p><a href="manifest.json">查看来源、媒体信息与文件校验清单</a></details></footer></main>`,
  );
}

export function cardHtml(
  title: string,
  card: { title: string; body: string },
  index: number,
  total: number,
  image: string,
) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;background:#f3f2ec;color:#173d36;font-family:'Microsoft YaHei','Noto Sans CJK SC',sans-serif;padding:104px 76px}header{display:flex;justify-content:space-between;gap:30px;align-items:center;border-bottom:1px solid #cbd4c6;padding-bottom:28px;font-size:26px}header b{max-width:760px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}header span{white-space:nowrap;font-size:22px;color:#647660}.eyebrow{margin-top:48px;font-size:24px;letter-spacing:3px;color:#8b704a}h1{font-size:68px;line-height:1.32;letter-spacing:-1px;margin:24px 0 36px;font-weight:650;white-space:pre-line;overflow-wrap:anywhere}.image{padding:14px;border-radius:24px;background:#173d36;box-shadow:0 24px 55px #173d3622}img{display:block;width:100%;height:700px;object-fit:contain;border-radius:12px}.body{white-space:pre-line;font-size:34px;line-height:1.75;margin:36px 0 0;color:#425d50;overflow-wrap:anywhere}.footer{position:absolute;bottom:100px;left:76px;right:76px;border-top:1px solid #ccd5c6;padding-top:24px;font-size:24px;color:#637762}</style><header><b>${e(title)}</b><span>${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span></header><div class="eyebrow">项目介绍 · 真实页面截图</div><h1>${e(card.title)}</h1><div class="image"><img src="data:image/jpeg;base64,${image}"></div><p class="body">${e(card.body)}</p><div class="footer">一份演示，讲清每一步。</div></html>`;
}
