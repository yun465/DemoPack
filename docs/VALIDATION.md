# Local validation history — 2026-09-16

**This is the historical validation log. The current decision, rebuilt media measurements and test evidence are in [FINAL-ACCEPTANCE.md](FINAL-ACCEPTANCE.md).**

## Follow-up acceptance requested by the owner

Added `npm run test:acceptance` and reproduced a real defect before fixing it: text waiting selected
the first matching DOM node even when it was hidden, ignoring a later visible success message.
The runner now filters matching text to visible elements before waiting. The original test failed at
step 2; the same fixture now exports successfully, and its screenshot was visually inspected.
[Before fix](evidence/acceptance-before-fix.json) · [After fix](evidence/acceptance-after-fix.json).

All six expanded acceptance cases passed: fresh CLI init to a fully decoded 20–40 second pack;
hidden duplicate text; relative navigation and repeated exports preserving the first run; caption
overflow; out-of-range GIF start; HTTP 404. The last three leave failure.json only.
The fresh first-export flow took 34.64 seconds after the fix (an earlier run took 41.71 seconds).
Dependencies were already installed; this is machine timing, not novice onboarding or install time.

The build, typecheck, 3 unit tests, 9 integration cases and formatting check also passed after the fix.
An additional real-browser check downloaded README-snippet.md and compared its bytes with the source,
then sought the MP4 to its final second and observed playback reach ended=true.
Existing accepted showcase media were unchanged; their earlier full artifact validation remains applicable.
No real user adoption or repeat-use claim follows from these local tests.

Status: local review build, no remote repository, push, npm publication, outreach or post.
Executed on Windows x64, Node v24.19.0, Playwright 1.63.0 / Chromium 153.0.8010.12.
Test media tools: FFmpeg 6.1.1 (libx264), ffprobe 4.0.2. Tools live under ignored .tools/.
This machine's npm launcher reports a Node 22 runtime during install, causing an engine warning;
the actual CLI, tests and doctor ran under the reported Node 24 executable. No global configuration changed.

## Actual exported media

| Pack | MP4 duration / resolution / bytes | GIF duration / resolution / bytes | Measured capture rate |
| --- | --- | --- | --- |
| [Orbit](showcase/index.html) | 28.68 s / 1024×720 / 309,930 | 14.01 s / 720×506 / 523,659 | 9.15 fps |
| [Chinese notes](showcase-zh/index.html) | 21.24 s / 1024×720 / 190,957 | 12.01 s / 640×450 / 217,965 | 9.14 fps |
| [DemoPack self-demo](self-showcase/index.html) | 28.00 s / 1184×900 / 567,169 | 14.01 s / 800×608 / 767,064 | 9.12 fps |

These are measured files, not target settings. GIF durations sum decoded frame delays because this
ffprobe build does not report a GIF container duration. MP4 encoding uses 25 fps by duplicating captured
frames; maximum observed sampling gaps were 113 ms, 127 ms and 142 ms, respectively.

All three MP4s and GIFs were fully decoded with FFmpeg, all asset hashes matched their manifests,
and all selected image references resolved. Every pack was copied into a different directory containing
Chinese characters, then opened directly with file:// in a fresh Chromium context with `offline: true`.
Video currentTime advanced, all images loaded, walkthrough captions matched the timeline, and no HTTP(S)
requests occurred. This tests browser-enforced offline behavior; the host network adapter was not disabled.

[Machine-readable artifact results](evidence/artifact-results.json).

## Visual inspection

Inspected decoded video contact sheets, including English and Chinese caption text, before/after page
states, click markers, crop zoom and surrounding frame margins. The initial Orbit recording revealed a
cramped third card; the sample layout was tightened and the accepted pack was regenerated.

- [Orbit decoded frames](evidence/orbit-contact-sheet.jpg)
- [Chinese decoded frames](evidence/chinese-contact-sheet.jpg)
- [Self-demo decoded frames](evidence/self-contact-sheet.jpg)
- [Moved offline preview screenshot](evidence/offline-preview.png)

Black unused cells at the end of a contact sheet are tile padding, not black frames in the video.
Chinese characters were visually readable, not replacement boxes. Captions describe the real recorded
changes. The self-demo uses the actual exported page: a separate browser check confirmed the same video
click starts playback (paused=false, currentTime advancing). It does not show a simulated generator UI.
The Markdown download is a real anchor download; downloads are not represented as a separate editing UI.

## Executed checks

- `npm run build` — passed.
- `npm run typecheck` — passed.
- `npm run format:check` — passed.
- `npm test` — 3 passed: schema/defaults/Unicode, invalid actions and bounds, text escaping.
- `npm run test:integration` — 9 passed, listed below.
- `npm run test:artifacts` — all 3 final packs passed full decoding, media/manifest agreement, hashes,
  moved offline playback, zero external requests, relative images, and caption agreement.
- `npm audit` — zero reported vulnerabilities at this run; this is not a security guarantee.
- `npm pack` — local package assembled; no media tools, credentials, output/ or node_modules in payload.
- Installed the local tarball into an isolated test-results directory with scripts disabled; its CLI
  doctor passed and init successfully copied the packaged starter. This did not publish a package.
- Main project documentation relative links resolved. Local review hub returned HTTP 200 on port 4173.

Integration cases: missing element (specific selector and step); missing FFmpeg; missing ffprobe and
Chromium diagnostics; cancellation during capture; cancellation during MP4 encoding; Chinese config and
output paths plus captions; moved file:// offline playback; localhost range requests/root containment;
init refusing to overwrite an existing directory. [Detailed results](evidence/integration-results.json).

The first unit-test attempt failed because implementation modules did not yet exist. That is scaffold
evidence, not proof of a controlled behavioral regression. An initial compiler check also failed due to
TypeScript 7 requiring explicit Node types; tsconfig was corrected and the final build/typecheck passed.
Cancellation was exercised through the same AbortSignal consumed by the CLI; an actual physical Ctrl+C
keypress on Windows and hard process termination were not simulated. No success artifacts remain in
the tested handled-failure/cancellation directories.

## Not yet established

- macOS/Linux execution. Linux CI is configured but has not run remotely.
- Browser engine diversity: only bundled Chromium was exercised.
- Performance on large/high-motion pages, slow CPUs, long recordings, hostile/untrusted pages or
  unusual fonts; exact frame cadence is bounded by screenshot/encoding work.
- Caption/selector quality on five real external projects. No one has been contacted.
- Product adoption, time saved versus alternatives, or repeat use. No Star prediction is supported.

Run `node dist/cli.js preview docs` to browse the local review hub. Rerun the examples into fresh output
folders to reproduce. Preserved accepted packs in docs/ are copies of real successful run folders, each
with its own runId and content hashes; source configurations are in examples/ and docs/self-demo.json.
