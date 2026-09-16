# 代码优化与设备项目：先准备证据，再整理材料

DemoPack 现在提供 `report` 和 `media` 两个入口。它们把导入的结果或素材排成讲解页，再用真实浏览器
回放并输出详细视频、短视频、竖屏图文视频、介绍文字、GIF 和截图。
**这不是自动理解任意仓库，也不是终端、IDE 或全桌面录屏，更不会控制开发板。**

[真实跑分报告示例](report-showcase/index.html) · [合成素材导入示例](media-showcase/index.html) ·
[本轮验收记录](NON-WEB-ACCEPTANCE.md)。HTML 预览请下载后离线打开，或用 DemoPack 的 preview 命令查看。

## 代码优化 / 基准报告

先实际运行自己的测试，再提供原始结果。工具不执行配置中的任意命令，不替你验证实验方法。

```sh
node examples/report/benchmark.mjs
node dist/cli.js report examples/report/story.json --out output/report
```

该示例真的比较固定输入下的两种查找方式，计入 Set 建表耗时，交替运行七轮并检查结果一致。
每次跑分都会更新示例中的结果文件，请保留你希望发布的那次记录。不同机器的结果可能不同。

## 设备视频 / 照片 / 串口日志

实际 ESP 项目可以提供自己拍摄的 MP4、PNG/JPEG 照片以及经过人工检查的串口日志。
为每项填写来源、固件版本、测试条件和限制，不要把编译成功写成硬件通过。

仓库内的测试素材明确为 **FFmpeg 合成图与测试片，不是设备拍摄**：

```sh
node examples/media/make-fixture.mjs
node dist/cli.js media examples/media/story.json --out output/media
```

导入 MP4 通过 Chromium 静音回放并截图采样，源文件另外保存。它不保留导出视频音轨，不提供逐帧剪辑，
不保证快速动作的流畅度。原始视频的声音仍可能存在于附带原片中，请在导入前检查。
若设备效果依赖蜂鸣器、语音或很短的灯闪，读者应核对原始文件；当前导出不能作为精密时序证据。

## story.json 格式

[JSON Schema](../story.schema.json) 可用于编辑器提示；预检还会核对文件路径与媒体区间。

```json
{
  "title": "项目讲解",
  "summary": "实际功能和本次展示目标。",
  "conditions": "实验或拍摄时间、版本、环境、输入、设备和测量方法。",
  "limitations": "未测试的部分和不能由这些材料证明的结论。",
  "chapters": [
    {
      "title": "测量结果",
      "caption": "在给定条件下观测到的结果。",
      "kind": "metrics",
      "file": "results.json",
      "origin": "本机执行 benchmark 脚本产生，运行版本 abc123。",
      "seconds": 6
    }
  ]
}
```

- `report` 接受 `text`、`metrics`。`media` 接受这两种以及 `image`、`video`。
- `text` 为 `.txt/.log/.diff/.md/.json` 的纯文本展示，HTML 会转义，Markdown 不执行。
  画面展示前 13 行且最多 900 字符，完整原文附包。大文件应先制作有来源的摘录，单个文本上限 64000 字节。
- `metrics` 是 JSON 数组，每项为 `{"label":"耗时","before":12.5,"after":8.2,"unit":"ms"}`。
  最多五项；数值必须为有限数字。工具仅并列展示，不自动宣称提升。
- `image` 仅 PNG、JPG/JPEG；`video` 仅浏览器能播放的 MP4，建议 H.264。
- 视频可指定 `startSeconds`，默认 0；`seconds` 默认 6，范围 3–20，指定区间必须落在原片时长内。
  回放包含页面加载和停留开销，最终时长见清单，不等于所有 seconds 的简单求和。
- 1–8 个章节；本地文件必须位于配置所在目录内，允许子目录，不允许绝对路径、远程 URL 或符号链接逃逸。
- 单文件上限 100 MiB，来源文件合计上限 250 MiB。配置不接受 shell 命令。

每次导出生成独立目录。预检错误可能尚未创建输出目录；开始录制后的失败/取消沿用 `failure.json` 契约。
输入会先复制到一次性临时快照；结束后清理该快照，不修改你的原始文件。

## 核对与分享

```sh
node dist/cli.js verify output/实际目录
node dist/cli.js preview output/实际目录 --port 0 --open
```

预览页顶部提供来源入口。`source.html` 展示条件、限制和原文件链接，`sources.json` 记录来源与 SHA-256，
`sources/` 保留导入的字节。导出清单把这些文件纳入完整性校验。哈希不是作者身份、实验真实性或临床效果的证明。
提交配置文件内不保存绝对路径，但你自己写入的字幕、日志内容和原片可能含敏感信息，分享前需检查。
所有处理本地完成，不上传、不接触现有浏览器账号，也不执行设备烧录。

## 让 Codex 帮忙

告诉 Codex：“请先实际运行我的基准测试，保存测量条件、原始结果和局限，再按 DemoPack 的
docs/NON-WEB.zh-CN.md 编写 story.json，用 report 导出四份材料并核对。”

ESP 项目则说：“我提供了实际拍摄的视频、照片和串口记录。请核对来源说明，使用 media 生成材料，
不要伪造设备实测，也不要连接或烧录设备。”提供设备材料仍是你的必要参与。
