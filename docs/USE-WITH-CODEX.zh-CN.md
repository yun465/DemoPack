# 用 Codex，基本不用自己动手整理演示材料

代码优化、CLI 结果与 ESP 等设备素材，请使用 [非网页项目指南](NON-WEB.zh-CN.md) 的 `report` / `media` 入口。
这些入口处理已经得到的结果或素材，不替代硬件实测。

你描述目标，Codex 协助写配置和文案、运行命令、排查问题；DemoPack 执行真实浏览器流程并导出材料。
你仍需要提供项目位置、完成必要的登录或权限操作，并检查最终成品。复杂页面可能需要多次调整。
这是本项目已经实践过的协作方式，不是对任意网站成功率或操作次数的承诺。

## 直接复制给 Codex

先下载 DemoPack 源码，在能访问此目录及目标项目的 Codex 会话中发送以下内容，替换方括号字段：

```text
请使用 DemoPack 为我的网页项目生成一整套中文演示材料。

DemoPack 目录：[绝对路径]
目标项目目录或本地网址：[路径或 URL]
需要展示的功能：[例如新增任务、标记完成、查看结果]
目标读者：[例如初次使用的开源开发者]
风格：[例如简洁、清楚、深绿色包装]

请阅读两个项目的 README 和适用的 AGENTS.md，保护已有文件。
检查 Node.js、Playwright Chromium、FFmpeg 和 ffprobe；在权限允许的范围内准备依赖，
然后启动目标网页。使用独立浏览器与虚构数据，不读取现有浏览器凭据。

参考 DemoPack 的 examples/starter/demo.json、docs/CONFIGURATION.md 和 docs/RELEASE-KIT.md，
为我的项目编写 demo.json。基于实际界面选择稳定的定位，不把列表顺序当作业务身份；
为关键操作加入结果等待。字幕与项目介绍应依据真实功能，不编造能力。

用 DemoPack 的正式 CLI 实际生成：
1. 详细操作视频；2. 重点短视频；3. 竖屏截图加文案视频；4. 详细项目介绍。
同时保留 GIF、封面、截图、README 片段和离线预览。

常规本地可逆步骤直接完成，无需反复询问。涉及账号、付费、外部上传或发布时先询问。
完成后检查实际画面、中文字幕、时长、尺寸、步骤与说明一致性，运行 verify，
测试移动目录后断网打开，并告诉我产物位置及尚未验证的部分。
不要仅创建静态效果图，不要用其他生成工具替代 DemoPack 导出，不要自动发布或发帖。
```

## 谁负责什么

| 工作 | 执行者 |
| --- | --- |
| 确定展示目标、提供访问权限、验收 | 你 |
| 理解项目、准备配置和文案、诊断、辅助检查 | Codex |
| 浏览器操作、时间记录、截图、媒体导出、离线材料整理 | DemoPack |

如果环境缺失、权限受限或目标页面有验证码，Codex 可能需要你配合。
DemoPack 不内置 Codex，也不自动分析 GitHub 地址；配置写好后可重复运行，无需模型在线。
使用 Codex 的权限和费用与 DemoPack 分开。本项目与 OpenAI 无隶属关系，亦不代表其官方背书。

## 真实案例

[TodoMVC 实录](todomvc-showcase/index.html)：66 秒详细视频、18 秒短片、30 秒竖屏图文视频。
初次画面检查发现了列表顺序与字幕不一致的问题，修正定位后重新录制。
[验收记录](TODOMVC-ACCEPTANCE.md)说明已测和未测范围。

GitHub 文件页面不会直接运行 HTML 预览。下载源码后在 DemoPack 根目录运行：

```sh
npm ci
npx playwright install chromium
npm run build
node dist/cli.js preview docs --port 0 --open
```

只查看已有材料无需安装 FFmpeg；重新录制需要按根 README 准备 FFmpeg 和 ffprobe。
