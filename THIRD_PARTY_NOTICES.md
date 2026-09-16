# Third-party notices

DemoPack's own code is MIT licensed. No code from the four reviewed competitors is incorporated.
Their source documentation snapshots in docs/research retain their original MIT LICENSE files:
Lim Swee Kiat (testreel), 45ck (demo-machine), Patrik Szewczyk (playwright-recast), Hauke Jung (Stepshots).

| Component | Version pinned for this review | License / upstream |
| --- | --- | --- |
| Playwright / playwright-core | 1.63.0 | Apache-2.0, Microsoft Corporation, https://github.com/microsoft/playwright |
| Zod | 4.6.5 | MIT, Colin McDonnell, https://github.com/colinhacks/zod |
| TypeScript (development) | 7.0.2 | Apache-2.0, Microsoft Corporation, https://github.com/microsoft/TypeScript |
| Prettier (development) | 3.9.6 | MIT, James Long and contributors, https://github.com/prettier/prettier |
| @types/node (development) | 24.13.5 | MIT, DefinitelyTyped contributors, https://github.com/DefinitelyTyped/DefinitelyTyped |
| undici-types (development, transitive) | See lockfile | MIT, https://github.com/nodejs/undici |
| @typescript/typescript-* (development, platform compiler) | 7.0.2 | Apache-2.0, Microsoft Corporation; installed platform licenses/third-party notices accompany the compiler |

Dependency distributions retain their license files in node_modules. Copies of installed dependency
license/notice files are also in docs/licenses for inspection. Browser downloads have their own
Chromium and third-party terms, distributed by Playwright; no browser binaries are shipped here.
System fonts are used at runtime and not redistributed.

The TodoMVC demonstration records the JavaScript ES6 example from tastejs/todomvc at commit
ff43b02e59dfa604386bb382034b2cd07c2bcd8a. TodoMVC is MIT licensed, copyright Addy Osmani,
Sindre Sorhus, Pascal Hartig and Stephen Sawchuk. Its notice accompanies the exported example at
docs/todomvc-showcase/TODOMVC-LICENSE.md. This independent demonstration is not an endorsement
by the TodoMVC authors.

FFmpeg and ffprobe are required external programs. Their configuration can make a build LGPL, GPL,
or non-redistributable; see https://ffmpeg.org/legal.html. DemoPack does not bundle these executables
in its npm package or source repository. Users supply a build suitable for their use and jurisdiction.
This local development review installed ffmpeg-static 5.3.0 (package GPL-3.0-or-later) and
ffprobe-static 3.1.0 (wrapper MIT; included FFmpeg binary has separate terms) under ignored .tools/.
The tested binaries identify as FFmpeg 6.1.1 and ffprobe 4.0.2; these are test environment facts,
not claims that they are the latest releases. .tools is excluded from publication.
