# Release introduction draft — not published

DemoPack turns explicit web steps into a small release-material folder: detailed video, short video, portrait image-and-copy video, and authored project article, plus a README GIF, screenshots and offline preview. Everything is derived from one actual
browser run, so a changed caption or page state does not require manually reconciling separate captures.

It is for maintainers who can describe a short web flow and would rather rerun it than repeat screen
recording and screenshot work before every release. Runs stay local, require no account or model API
key, and use fictional example data. The initial implementation is deliberately small: one page, human
captions, a few actions and a bounded crop zoom.

This is not a replacement for an editor or a claim of new recording technology. testreel, demo-machine,
playwright-recast and Stepshots already cover substantial parts of this space. The experiment is whether
the complete GitHub material pack saves enough work to use again.

Try the local starter, export one flow for a project you maintain, and tell us where it breaks or requires
manual correction. Windows has local validation; other platform evidence is still needed. Repository and
issue links will be filled in only after the owner approves publication and supplies account/repository.

## 中文介绍草稿

**配合 Codex，基本不用自己动手写脚本、录屏和整理材料。** 描述项目和要展示的功能，让 Codex 协助写配置与文案、运行 DemoPack 并验收。环境权限、必要登录和最终确认仍由你处理；复杂页面可能需要调整。[直接复制提示词](USE-WITH-CODEX.zh-CN.md)。

DemoPack 把一份明确的网页操作步骤，生成详细视频、简短视频、竖屏图文视频和作者填写的项目介绍，同时保留 README 短 GIF、截图与离线预览。
这些文件来自同一次真实浏览器运行，减少每次发版前反复录屏、截图、对照修改说明的工作。

它面向维护网页项目的开源作者和独立开发者，本地执行，不需要账号或模型 API Key。首版只支持短而明确的
单页流程，不做剪辑器。录制和美化并不新颖；我们想验证的是，把 GitHub 发布材料一次整理好，是否真的值得
维护者采用并在下次发版继续使用。目前是本地可评审版本，欢迎在真实项目上测试后指出问题。

## Five target-user trials — questions, not outreach

Recruit only after separate authorization. No contact has been made. Use five maintainers of different
web projects: a component library, developer dashboard, small SaaS, documentation tool, and solo side
project. Include at least one Windows and one macOS/Linux maintainer; include one Chinese-caption flow.
Each should use their own non-sensitive demo data and a 20–40 second flow.

Ask every participant the same five questions:

1. Can you install it and export a first playable pack without live assistance? Record OS, elapsed setup
   and authoring time, failed commands, and the exact point where help was needed.
2. Which captions, selectors, screenshots or GIF timings did you have to repair before the result was
   usable? Keep a count and compare with your usual recording workflow.
3. Which of the four deliverables did you actually use in your README, release notes, docs or social draft? Inspect a local diff or
   voluntarily shared public change; “looks useful” is not adoption evidence.
4. Move the pack to another folder and preview it offline. Do the video, screenshots and Markdown still
   work? What installation/export detail would stop you recommending it?
5. At your next real UI change or release, did you rerun the saved config? If not, what did you use instead
   and why? Follow up only with their consent; repeat use matters more than a one-time Star.

Decision rule for this tiny qualitative trial: aim for 4/5 independent exports, at least 3/5 actual asset
uses, and at least 2 repeat uses when another release opportunity occurs. These are provisional learning
thresholds, not statistically reliable market estimates. Measure “no new release yet” separately from
churn. If authoring dominates time, improve selectors/init before adding visual effects. If users want
their existing recorder, test an importer instead of increasing capture scope.
