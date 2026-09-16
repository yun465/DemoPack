# 第一次使用 DemoPack

先在项目根目录安装依赖并构建：

```sh
npm ci
npx playwright install chromium
npm run build
node dist/cli.js doctor
```

需要 Node.js 24、FFmpeg 和 ffprobe。环境诊断报错时先安装对应依赖。

```sh
node dist/cli.js init my-demo
node dist/cli.js generate my-demo/demo.json
```

这会录制一个本地中文发布看板，不需要启动其他项目。命令完成后会打印实际输出目录。

```sh
node dist/cli.js preview output/<实际输出目录> --port 0 --open
```

预览里依次是详细视频、简短视频、竖屏图文视频、项目介绍。
保留预览终端运行；也可以直接打开产物目录中的 index.html 离线查看。

录制自己的网页时，先启动目标应用，再将 my-demo/demo.json 的 url 改为应用地址，
修改 steps 的选择器、演示数据、说明以及 release 的短片步骤、图文卡片和项目文字。
示例数据不能代替你的真实项目介绍，发布前请检查画面与文案。

[完整配置与四份材料规则](RELEASE-KIT.md) · [本轮验收](RELEASE-KIT-ACCEPTANCE.md)
