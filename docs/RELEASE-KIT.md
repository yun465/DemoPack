# 一次运行，四份发布材料 / Four-deliverable release kit

默认 `init` 示例已启用此功能，不依赖 innovation 仓库或一次性脚本。
The default starter enables this mode. One `generate` command produces the complete kit.

```sh
node dist/cli.js init my-demo
node dist/cli.js validate my-demo/demo.json
node dist/cli.js generate my-demo/demo.json
node dist/cli.js verify output/<实际目录>
node dist/cli.js preview output/<实际目录> --port 0 --open
```

## 配置 / Configuration

在原有配置中增加 `release`。以下例子需要至少三个步骤：

```json
{
  "release": {
    "short": { "steps": [1, 3], "secondsPerStep": 4 },
    "social": {
      "secondsPerCard": 6,
      "cards": [
        { "step": 1, "title": "从一个真实问题开始", "body": "在这里填写你的项目用途。" },
        { "step": 3, "title": "看见操作后的结果", "body": "说明这张真实截图展示了什么。" }
      ]
    },
    "project": {
      "summary": "项目是什么，为谁解决什么问题。",
      "sections": [
        { "heading": "主要功能", "body": "填写已经实现的功能，不把计划当作成果。" },
        { "heading": "如何使用", "body": "填写安装和首次使用步骤。" },
        { "heading": "已知限制", "body": "填写尚未支持或尚未验证的部分。" }
      ]
    },
    "socialCaption": "可选：发布到社交平台时使用的正文草稿。"
  }
}
```

- 步骤编号从 **1** 开始。短片步骤必须存在且不能重复，最多 12 段，按给定顺序剪辑。
  `secondsPerStep` 为 1–10 秒，默认 4 秒；取每个步骤末尾的相应时间，短步骤使用完整时段。
  字幕和实际画面来自原片，不变速、不重新配词。浏览器异步加载可能仍出现在片段中，需要看画面。
- 卡片最多 8 张；每张引用真实步骤截图。被引用的步骤即使没有 `screenshot: true` 也会自动截图。
  标题最多 44 字符、正文最多 100 字符；长文字或过多换行造成实际溢出会报错，不能仅靠字符上限保证排版。
- `secondsPerCard` 为 3–15 秒，默认 6 秒。竖屏视频固定为 1080 × 1920，静态卡片逐张展示，无音频。
  卡片截图保持原比例，不裁掉原图；文字和页面细节是否适合手机观看仍需人工检查。
- 项目介绍必须由作者提供：摘要最多 800 字符，1–12 节，单节正文最多 4000 字符。
  正文按纯文本排版，换行保留，HTML 会转义，不支持嵌入脚本或远程资源。
- `socialCaption` 可选，最多 5000 字符。省略时从作者提供的摘要和卡片文字整理，绝不推断项目能力。
- 不加 `release` 时保持旧格式。配置验证不需要媒体依赖；真正生成仍需要 Chromium、FFmpeg 和 ffprobe。

**English:** Step references are one-based. Short clips take the end of each selected recorded event,
bounded by its actual duration, in the configured order. Card references automatically request screenshots.
Social output is a silent 1080 × 1920 slideshow. Article and social copy are authored text, not model output.
Omitting `release` keeps the legacy pack format. The generated interface currently uses Chinese labels.

## 文件与一致性 / Files and provenance

| 文件 | 内容 |
| --- | --- |
| demo.mp4 | 详细视频 |
| short.mp4 | 简短视频 |
| social.mp4 | 竖屏图文视频 |
| cards/*.png | 可单独使用的图文图片 |
| project.md / project.html | 项目介绍的可编辑文本与阅读页 |
| social-caption.md | 发布正文草稿 |
| index.html | 四个入口的离线预览 |
| walkthrough.html | 完整步骤与截图 |
| demo.gif / cover.jpg / screenshots / README-snippet.md | 兼容原有发布材料 |

`manifest.json` 的 `deliverables` 保存选段时间、来源步骤、卡片与源截图关系，以及媒体实际时长、
分辨率与大小。所有新增文件都纳入哈希校验。`verify` 同时检查四份材料必需项和来源关系，
但不证明真实性或画面质量，也不是数字签名。复制整个目录即可保持离线链接有效。

任何短视频、卡片、竖屏编码、介绍写入错误或取消，都会使本次运行失败，仅留下 `failure.json`。
错误中会说明导出阶段或溢出的卡片位置。强制杀进程、断电仍可能留下不完整文件，没有成功清单就不算完成。

All outputs are hashed in the manifest. Any export error or handled cancellation fails the whole run;
it cannot be reported as a complete pack. No uploading, posting, accounts, generated claims, voiceover,
music, platform acceptance guarantee, or cross-device source-app credentials are added.
