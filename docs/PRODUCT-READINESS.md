# Product readiness decision

The first release should be a local-review/early-trial 0.1, not a claim of a mature recorder.
Core value is consistent, portable release materials from one explicit flow. That value is implemented;
external adoption has not been demonstrated.

## Added before final acceptance

- Config-only validation with field paths, without requiring media tools or launching a browser.
- Pack completeness and content-hash verification, rejecting unsafe paths and missing referenced assets.
- Root README snippet output with repository-relative prefixes and encoded spaces.
- Free-port preview, occupied-port guidance, missing-index diagnosis and optional system browser opener.
  Windows has a double-click start-preview.cmd entry, which keeps a visible terminal for the server.
- Narrow offline viewer layout, streaming media with HEAD/range support, title truncation that preserves
  the step counter, and current-step screenshot timestamps.
- Capture-quality warnings when observed sampling gaps or rate are poor.

These reduce concrete first-use and export problems. No accounts, cloud uploads, model dependency,
desktop capture, paid features or editing timeline were added.

## What should wait

Prioritize evidence from five maintainers over additional effects. A selector-authoring aid or adapter
for testreel/demo-machine may be useful if trial users struggle with step authoring or want existing
recorders. Do not build either based only on speculation. Smooth zoom and typing can follow demonstrated
visual-quality demand. A web editor would add a second product surface and is not necessary for this CLI
trial. No predicted Star count or independent user endorsement is supported.

## Release boundary

Windows local acceptance can pass while macOS/Linux execution, unfamiliar-user installation, different
web apps, real adoption and repeat use remain open. A CI workflow is not evidence it has run. The next
release gate should be real cross-platform execution plus first-use trials, not a larger feature list.
