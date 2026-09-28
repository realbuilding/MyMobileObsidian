# MyMobileObsidian

个人自用的 Obsidian 移动端插件，通过 BRAT 从**公开** GitHub 仓库安装更新。

## 隐私规则（必须遵守）

本仓库是公开的，任何提交都会被所有人看到。

- 不在代码、注释、测试、文档、commit message 中写入：真实笔记标题/内容、Vault 目录结构、人名、公司/项目名、邮箱、token、本机绝对路径（如 `/Users/...`）。
- 个性化配置（目录名、标签、模板路径等）一律做成**插件设置项**，默认值用通用占位（如 `Inbox/`、`Daily/`），真实值只存在于运行时的 `data.json`（已被 .gitignore 忽略）。
- 测试样本使用虚构内容，真实笔记只放在被忽略的 `test-vault/` 或 `private/` 目录中。
- 提交前检查 `git diff --cached` 中是否含上述信息。
