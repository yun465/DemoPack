# DemoPack

**One browser run. A complete GitHub demo pack.**

**With Codex, you can largely skip writing scripts, recording screens, and assembling assets yourself.**
Describe your project and the flow to demonstrate. Codex can help prepare the environment, author steps
and copy, run DemoPack, and review the output. You provide the goal, handle any required access, and
approve the result. Some projects need iteration; this is not a promise of zero-touch success.

**[Copy the Codex starter prompt →](docs/USE-WITH-CODEX.md)**
DemoPack itself makes no model calls and needs no API key. Using Codex separately requires access to
Codex and is subject to its service terms. This project is not affiliated with or endorsed by OpenAI.

Turn one browser run into **a detailed video, a short video, a portrait image-and-copy video, and a project article**.
Also export a GIF, screenshots, a README walkthrough and an offline preview. Local processing.
Human-written copy. No account, model key or watermark.

[中文](README.zh-CN.md) · [Watch the real demo](docs/kit-self-showcase/demo.mp4) · [Sample pack](docs/showcase/index.html)

![DemoPack recording its own generated preview](docs/kit-self-showcase/demo.gif)

The demo above is recorded by DemoPack from its actual exported preview. It shows the four entrances: detailed video, short video, portrait image-and-copy video, and authored project article. [Input steps](docs/kit-self-demo.json) ·
[Sample app recording](docs/showcase/demo.mp4) · [Chinese example](docs/showcase-zh/index.html)

## Start locally

The `init` starter now exports all four deliverables with one `generate` command. Configure the optional
`release` object to choose short-video steps, social cards and authored project sections.
Old configs without `release` retain their original outputs. The current generated interface is Chinese;
your captions, card text and article can use other languages. No machine translation is performed.
[Configuration](docs/RELEASE-KIT.md) · [Real four-part sample](docs/kit-showcase/index.html) ·
[New acceptance evidence](docs/RELEASE-KIT-ACCEPTANCE.md)

On Windows with the project already built, double-click `start-preview.cmd` to select a free port and
open the review hub. Keep its terminal running. Alternatively use `node dist/cli.js preview docs --port 0 --open`.

This is an **early source release**, not a published npm package. Clone/copy this repository and enter its
directory. Use Node.js 24 LTS. Install FFmpeg **and ffprobe** on PATH (FFmpeg must include libx264).

```sh
npm ci
npx playwright install chromium
npm run build
node dist/cli.js doctor
node dist/cli.js init my-demo
node dist/cli.js generate my-demo/demo.json
```

Generation prints a unique `output/<timestamp>-<id>` folder. Open its `index.html` directly, or serve it:

```sh
node dist/cli.js preview output/<printed-run-id>
```

`preview` binds only to 127.0.0.1:4173. Use `--port 4174` if occupied. No server is needed to open the
exported HTML offline. `init` refuses to overwrite an existing directory. Ctrl+C cancels a run.

FFmpeg installation: macOS `brew install ffmpeg`; Ubuntu `sudo apt install ffmpeg`; on Windows obtain
a build from the [FFmpeg download links](https://ffmpeg.org/download.html) and put its `bin` directory
on PATH. Chromium on Linux may need `npx playwright install --with-deps chromium`. Install a CJK font
(e.g. Noto Sans CJK) for Chinese captions. Setup requires downloads; generation needs no cloud service.

If executables are outside PATH, set absolute paths in your current shell, for example PowerShell:

```powershell
$env:DEMOPACK_FFMPEG = 'C:\tools\ffmpeg\bin\ffmpeg.exe'
$env:DEMOPACK_FFPROBE = 'C:\tools\ffmpeg\bin\ffprobe.exe'
node dist/cli.js doctor
```

This review workspace also has ignored development binaries at `.tools/ffmpeg.exe` and
`.tools/ffprobe.exe`; they are discovered automatically from the current directory and are not shipped.

## Your first demo

Edit the starter `demo.json`: change `url`, selectors, fictional data and captions. Local HTML paths
resolve under the config's directory; HTTP(S) apps should already be running.

```json
{
  "title": "My project in three steps",
  "url": "http://localhost:3000",
  "steps": [
    { "action": "fill", "selector": "#name", "value": "Alex Example", "caption": "Add a fictional name." },
    { "action": "click", "selector": "#save", "caption": "Save the entry.", "holdMs": 3000 },
    { "action": "wait", "text": "Saved", "caption": "Your entry is ready.", "screenshot": true }
  ]
}
```

Supported actions: `open`, `click`, `fill`, `press`, `wait`, `screenshot`. Use
`{ "action": "press", "selector": ".new-todo", "key": "Enter", "caption": "Submit the task." }`
for keyboard submission. Supported keys: Enter, Tab, Escape, Backspace, Delete, ArrowUp,
ArrowDown, ArrowLeft, ArrowRight and Space. Every step has a human caption and
configurable hold time. Theme colors, margins, GIF excerpt and bounded 1–1.5× crop zoom are configurable.
See [configuration](docs/CONFIGURATION.md) and [JSON schema](demo.schema.json).

Codex or another coding assistant can help author selectors and steps. DemoPack itself does not call a
model. A useful prompt: “Read this page's UI, write a short DemoPack demo.json with fictional data,
explicit success waits and concise captions, then run it and inspect the exported frames.”

## What you get

Use `node dist/cli.js validate my-demo/demo.json` before recording for field-level configuration errors.
It does not test live selectors. After export, `node dist/cli.js verify "run-directory"` checks required
files and hashes, not visual quality or authenticity. For root README links, run
`node dist/cli.js snippet "run-directory" --prefix docs/demo` and copy its Markdown output.

| File | Use |
| --- | --- |
| `demo.mp4` | Full demonstration, H.264/yuv420p |
| `demo.gif` | Bounded README excerpt, configurable size and timing |
| `cover.jpg`, `screenshots/*.jpg` | Cover and selected moments from the same captured frames |
| `README-snippet.md` | Escaped descriptions with relative image references |
| `index.html` | Self-contained offline viewer using local media |
| `manifest.json` | Success status, step times, media measurements and asset SHA-256 hashes |

Copy the **whole run folder** into your repository, e.g. `docs/demo/`. Its snippet is ready to use inside
that folder. To paste it into your root README, prefix its links with `docs/demo/`. There is no absolute
local path in image references. A failed/cancelled run has `failure.json` only, never finished media.

## Run the examples and checks

```sh
node dist/cli.js generate examples/launch/demo.json
node dist/cli.js generate "examples/中文便签/demo.json"
npm run typecheck
npm test
npm run test:integration
```

Both examples are local, login-free and use fictional data. [Validation evidence](docs/FINAL-ACCEPTANCE.md)
separates automated tests, decoded-frame inspection and untested platforms.

## Fit and limits

- Best for short, explicit web walkthroughs. Frame sampling targets 10 fps by default; actual cadence
  is reported. MP4's 25 fps duplicates frames, not additional captured motion. This is not a 60 fps recorder.
- Zoom is a fixed crop per step, not an animated camera. No audio, voiceover, desktop capture, webcam,
  editing timeline, cloud storage or team system. One page; popups, multi-tab flows and iframes are not supported.
- No saved login state, credentials import, traces or raw network logs. The target website may make its
  own network requests. Use trusted pages and fictional data; visible sensitive content is still captured.
- Captions are limited to two rendered lines. System fonts affect text rendering; CJK fonts are needed
  for Chinese. Browser/OS rendering can differ. Fast animation may be under-sampled.
- Capture frames temporarily use disk. Hard termination can leave an incomplete `_work` directory;
  without `manifest.json` it is not a successful pack. Regeneration reruns the browser flow.
- Windows is locally tested. Linux CI is supplied but has not run on a remote runner. macOS is unverified.

## Why another tool?

Recording and styling are already well served by [testreel](https://github.com/greentfrapp/testreel),
[demo-machine](https://github.com/45ck/demo-machine), [playwright-recast](https://github.com/ThePatriczek/playwright-recast)
and [Stepshots](https://github.com/hauju/stepshots). DemoPack tests a narrower idea: release materials that
stay consistent and portable with one command. [Current competitor review and reuse decisions](docs/COMPETITORS.md).
Whether this saves enough work to earn repeat use is still a product hypothesis; no Star targets are promised.

MIT for DemoPack code. [Third-party notices](THIRD_PARTY_NOTICES.md) · [Contributing](CONTRIBUTING.md).
FFmpeg/browser binaries have separate licenses and are not included in the package.
