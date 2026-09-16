# Contributing

Start with Node 24 LTS, npm ci, npx playwright install chromium and external FFmpeg/ffprobe.
Run npm run build, npm run typecheck, npm test and npm run test:integration.
Run npm run test:acceptance for the full starter export and additional failure/visibility cases.
Run npm run test:kit for the four-deliverable pipeline: CLI initialization, two real sample exports,
offline playback, provenance, missing files, automatic screenshots, overflow and cancellation.
Copy is authored, never inferred from the target page. Do not add network assets to exported HTML.
Before release, also run npm run test:cli, npm run test:ui, npm run test:edges and
npm run test:artifacts. Run browser capture suites sequentially to avoid degrading sample cadence.
Integration tests create unique ignored test-results folders and launch isolated Chromium.

Keep the package small. Change the schema, generated demo.schema.json, documentation and focused tests
together. For rendering changes regenerate the two local examples and inspect decoded frames, captions,
duration and file size. A successful compiler run is not a visual acceptance test.

No auth state, personal data, raw network logs, third-party secrets or user browser profiles in fixtures.
Use fictional sample content. Do not add telemetry, uploads or paid APIs without an explicit design change.

Good first contributions: cross-platform validation, better readable caption wrapping, selector authoring
errors and adapter research. Please open an issue with a reproducible flow before adding editor features.
Contributions are under the project's MIT license. No contribution implies permission to publish on behalf
of another author. Keep third-party attribution intact.
