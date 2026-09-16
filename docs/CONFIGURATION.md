# demo.json

See the generated [JSON schema](../demo.schema.json). Unknown fields are rejected. No arbitrary code,
shell commands, storageState, credentials, browser profiles or network log settings are accepted.

```json
{
  "title": "My project",
  "url": "http://localhost:3000",
  "viewport": { "width": 960, "height": 540 },
  "timeoutMs": 10000,
  "captureFps": 10,
  "theme": { "background": "#101c2d", "accent": "#54e0bb", "padding": 32 },
  "gif": { "width": 640, "fps": 8, "seconds": 12, "start": 0 },
  "steps": [
    { "action": "open", "caption": "Open the project.", "holdMs": 2500 },
    { "action": "fill", "selector": "#name", "value": "Alex Example", "caption": "Enter fictional data." },
    { "action": "click", "selector": "button[type=submit]", "caption": "Save the entry.", "zoom": 1.2 },
    { "action": "wait", "text": "Saved", "caption": "Confirm the result.", "screenshot": true },
    { "action": "screenshot", "caption": "The completed entry." }
  ]
}
```

- `url`: HTTP(S), or a relative HTML path beneath demo.json's directory. Local HTML gets an ephemeral
  loopback server. Relative `open.url` resolves against that server or the initial remote URL.
- `viewport`: even dimensions from 320 to 1920; default 960×540. Final dimensions are width + 2×padding,
  height + 2×padding + 116. Default output is 1024×720. The extra area holds title and captions.
- `steps`: 1–60, each requiring a human caption (1–140 characters). Long captions that exceed two rendered
  lines fail instead of silently clipping. Smaller viewports need shorter text. Newlines are not a layout API.
- `holdMs`: 200–30000, default 2500, **after** action completion; each step also has a 250ms lead-in.
  Navigation/action waits add time, so total duration is measured, not simply the sum of holdMs.
- `click` / `fill`: required Playwright selector. Prefer stable `data-testid` or accessible text selectors.
  `fill.value` is demo data. Use only fictional, non-sensitive values: visible data is recorded.
- `press`: required `selector` and `key`. Sends a real keyboard event to the visible target.
  Keys: Enter, Tab, Escape, Backspace, Delete, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Space.
  Use explicit result waits afterward; a successful key dispatch alone does not prove form submission.
- `wait`: requires `selector`, `text`, or `ms`; if more than one is supplied all are applied in that order.
  Selector waits for visibility; text uses the first visible matching text locator.
- `screenshot`: explicit action, or boolean on any step. Taken from the last composed frame after hold.
- `zoom`: 1–1.5; constant for the step, resets on the next step. Crop centers on the action selector or
  optional `focus` selector. Screenshot/wait with `focus` can bring a section into view. Zoom does not
  change the page's DOM or layout. It may crop peripheral content; inspect the result.
- `captureFps`: target 4–15, not a guaranteed cadence. Frame timestamps preserve elapsed time.
  Manifest reports measured average rate and largest gap. MP4 uses 25 fps with duplicated frames.
- `gif`: a bounded excerpt, not the entire MP4 by default. Choose a meaningful start and 1–30 seconds.
  GIF is resized with a 128-color palette; text fidelity is best in MP4/full-size screenshots.
- `theme`: six-digit colors, even padding 16–80. No watermark is applied to captured media.

Success directory: demo.mp4, demo.gif, cover.jpg, screenshots/, README-snippet.md, index.html,
manifest.json. Manifest contains step timings, descriptions, relative asset paths, byte sizes, hashes,
and media/environment measurements. It deliberately omits source URL, selectors, fill values and raw logs.
Captions and visible pixels are public-facing content. Review them before publishing.

Failures/cancellation: unique run folder with failure.json only, exit 1 (failure) or 130 (handled Ctrl+C).
The diagnostic can contain a selector or a navigation error URL: it is not a release artifact.
Hard process termination/power loss cannot be cleaned up; absence of success manifest means incomplete.

The preview command serves any explicitly selected directory on 127.0.0.1 only. Share the exported
folder, not a source working directory. Offline HTML itself makes no network requests and needs no server.

Additional CLI helpers: `validate <demo.json>` checks configuration fields without media dependencies;
`verify <pack>` checks required files and SHA-256 hashes (not visual quality or authenticity);
`snippet <pack> --prefix docs/demo` prints Markdown ready for a root README. Prefix is a repository-relative
directory; whitespace is URL-encoded. `preview <directory> --port 0 --open` chooses an available port
and asks the system browser to open it. Keep the serving terminal open. An occupied explicit port is
reported with a recovery command. Preview requires index.html, supports HEAD and single byte ranges,
and streams media instead of buffering the whole file.

Key screenshot events include `screenshotAtMs`, the same monotonic clock used for the captured frame.
The frame must belong to the current step and follow action completion. Long titles are visually
ellipsized to reserve space for the step count; the full title remains in the manifest and Markdown.

The manifest's media.captureWarnings records gaps over 500 ms and mean capture rates below 60% of
the requested cadence. These also print as QUALITY WARNING during export. A successful run means
steps and export completed, not that every transition is visually smooth. Inspect the video and rerun
without competing capture workloads when needed.

## Four-deliverable mode

The optional `release` block enables detailed video, short video, portrait social video and authored project text in one run. See [the release-kit contract](RELEASE-KIT.md) for fields, limits, provenance and error semantics. `init` enables it by default; legacy inputs without `release` remain valid.
