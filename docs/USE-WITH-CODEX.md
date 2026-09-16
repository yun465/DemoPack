# Let Codex help prepare your demo pack

You describe the outcome; Codex helps author the configuration and copy, run commands, diagnose issues,
and review results. DemoPack performs the browser run and exports the assets. You still provide access
and review the deliverables. This workflow has been tried on local examples and TodoMVC; arbitrary
websites may need iteration. Codex access and service terms are separate from DemoPack.

Paste this into a Codex session with access to both projects, replacing the bracketed fields:

```text
Use DemoPack to create a complete demo pack for my web project.
DemoPack directory: [absolute path]
Target project directory or local URL: [path or URL]
Flow to demonstrate: [features and expected results]
Audience and language: [audience, language]
Visual style: [style]

Read the applicable AGENTS.md and both READMEs. Preserve existing files. Check Node.js,
Playwright Chromium, FFmpeg and ffprobe; prepare dependencies within available permissions.
Start the target app. Use fictional data and a fresh browser, never my existing browser credentials.

Use examples/starter/demo.json, docs/CONFIGURATION.md and docs/RELEASE-KIT.md to author a config.
Use stable selectors and explicit result waits. Write captions and an article grounded in the actual
project. Do not infer item identity from its list position.

Run the official DemoPack CLI to generate a detailed video, a short video, a portrait image-and-copy
video and a project article, plus GIF, cover, screenshots, README snippet and offline preview.
Complete ordinary reversible local work without repeated confirmations. Ask before account actions,
paid services, uploading or publishing. Inspect actual frames, captions, timing and dimensions.
Run verify and test offline playback after moving the output directory. Report the output location
and validation limits. Do not substitute mockups or other generation tools for DemoPack exports.
Do not publish a repository or post messages.
```

Once authored, the same config can run again without Codex or a model API key. DemoPack does not
include Codex and does not automatically understand arbitrary GitHub URLs. Authentication challenges,
permissions and missing dependencies may require your involvement. This project is not affiliated with
or endorsed by OpenAI.

[Chinese guide](USE-WITH-CODEX.zh-CN.md) · [TodoMVC example](todomvc-showcase/index.html) ·
[Validation record](TODOMVC-ACCEPTANCE.md)

GitHub does not execute the HTML preview. Download the repository and run
`node dist/cli.js preview docs --port 0 --open` after the build steps in the root README.
