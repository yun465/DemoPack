# TodoMVC 外部项目实录

来源：[tastejs/todomvc](https://github.com/tastejs/todomvc)，MIT 许可。
使用 `examples/javascript-es6`，固定提交 `ff43b02e59dfa604386bb382034b2cd07c2bcd8a`。
只使用该提交已跟踪的 `dist`，没有修改目标应用，也没有安装它的构建依赖。

在 DemoPack 根目录准备源代码（以下目标目录需要尚不存在）：

```powershell
git clone --filter=blob:none --sparse https://github.com/tastejs/todomvc.git test-results/todomvc-replay
git -C test-results/todomvc-replay sparse-checkout set examples/javascript-es6
git -C test-results/todomvc-replay checkout ff43b02e59dfa604386bb382034b2cd07c2bcd8a
node dist/cli.js preview test-results/todomvc-replay/examples/javascript-es6/dist --port 5188
```

保持该终端运行。另一终端执行（先按根 README 安装 DemoPack 依赖）：

```powershell
npm run build
node dist/cli.js generate examples/todomvc/demo.json --out output/todomvc
```

每次运行生成独立目录。按 CLI 打印的目录启动 `preview`，或直接打开其中的 `index.html`。
如 5188 已被占用，修改服务端口及 `demo.json` 中的 URL，保持一致。

此配置首次实际使用了 `press` 键盘动作：

```json
{ "action": "press", "selector": ".new-todo", "key": "Enter", "caption": "按回车提交任务。" }
```

`press` 先定位可见元素，再对该元素发送按键。支持 Enter、Tab、Escape、Backspace、Delete、
ArrowUp、ArrowDown、ArrowLeft、ArrowRight、Space，不接受任意脚本或组合快捷键。

材料使用中文虚构任务，字幕、预览与说明为中文。TodoMVC 自身英文按钮保持原样，并在字幕中解释。
目标项目版权不属于 DemoPack；本案例不代表其官方背书。源码许可证原文见仓库根目录 `license.md`。
