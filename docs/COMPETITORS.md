# Competitor and reuse review

Reviewed 2026-09-16 from the current default-branch README, root LICENSE and documented interfaces.
Source snapshots live in `research/`, retaining each upstream MIT notice. No competitor was installed
or benchmarked. GitHub's unauthenticated API was rate limited; raw default-branch files were readable.
These are documentation observations, not claims of runtime correctness or exhaustive feature absence.

| Project / source | Verified overlap and interface | Reuse opportunity | Unknown in reviewed material |
| --- | --- | --- | --- |
| [testreel](https://github.com/greentfrapp/testreel) · [license](https://github.com/greentfrapp/testreel/blob/main/LICENSE) | MIT. JSON steps; WebM/MP4/GIF; screenshots and output manifest; cursor, chrome, background. `record(def, {outputDir})`, `recordPage(page)`, Playwright fixture. | Closest future capture adapter; could replace our bounded capture loop when richer cursor animation is needed. | A single command delivering our exact relative-path README + all formats + relocatable offline folder contract is not established. |
| [demo-machine](https://github.com/45ck/demo-machine) · [license](https://github.com/45ck/demo-machine/blob/master/LICENSE) | MIT. YAML specs; `run`, `capture`, `edit`, `analyze`, `share`, `doctor`; per-run directories, event evidence, quality reports, chaptered static viewer. | Strong workflow precedent; consider importing completed manifests or using it as an optional advanced backend. | Exact README-snippet and GIF bundle parity unknown. Static sharing and local operation are already supported, not DemoPack inventions. |
| [playwright-recast](https://github.com/ThePatriczek/playwright-recast) · [license](https://github.com/ThePatriczek/playwright-recast/blob/main/LICENSE) | MIT. `Recast.from(...).parse().render(...).toFile(...)`; trace processing, subtitles, speed control, click effects and zoom. TTS providers are optional pipeline stages. | Rich rendering backend if advanced animation/narration becomes a validated need. | Complete README/screenshots/offline-release-folder parity unknown. No claim that a model key is mandatory for basic rendering. |
| [Stepshots](https://github.com/hauju/stepshots) · [license](https://github.com/hauju/stepshots/blob/main/LICENSE) | MIT. Rust CLI `init`, `record`, `preview`, `verify`, `patch`; `.stepshot` screenshot bundles, Chrome extension, React embedding and guided tours. Optional authenticated upload. | Screenshot and tutorial interchange, selector freshness checking, editor/schema UX patterns. | MP4/GIF generation and our exact offline README folder contract unknown. The existence of hosted features does not imply local capture requires an account. |

## Concrete initial increment

DemoPack's deliverable is a GitHub release-material folder, with MP4, bounded GIF, cover, selected
screenshots, an escaped relative-path Markdown walkthrough, and an offline HTML page. Every item comes
from one frame/timeline stream. A hash manifest makes changes inspectable. Failed/cancelled runs never
carry a success manifest or finished media. This is packaging and consistency work, not a novel recorder.

It remains unproven whether this convenience is enough to make maintainers switch from the projects
above. If five trials show users prefer existing capture workflows, implement an importer/adapter rather
than expand a competing editor.

## Chosen reuse boundary

Use Playwright (Apache-2.0) for browser control, Zod (MIT) for the input contract, and external FFmpeg/
ffprobe for encoding and validation. Chromium renders text into frames, avoiding FFmpeg font-path and
subtitle escaping differences. No competitor implementation code was copied or linked. Retaining a
small independent frame capture adapter avoids importing auth/trace/TTS/MCP features outside this MVP.
The tradeoff is bounded capture cadence and abrupt per-step zoom; advanced recorders may be better for
fast animation. Do not claim visual superiority without comparative runs.

Dependency versions are pinned in package-lock.json. Node 24 was chosen from the maintained LTS line
([Node release table](https://nodejs.org/en/about/previous-releases)). FFmpeg is an external executable:
its license varies with build options ([FFmpeg legal information](https://ffmpeg.org/legal.html)); it is
not covered by this project's MIT license. See THIRD_PARTY_NOTICES.md.
