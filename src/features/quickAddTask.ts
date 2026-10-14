/* 快速添加任务
   - 在指定笔记右下角显示悬浮“+”按钮（也提供命令，可绑定到移动端工具栏）
   - 点击后打开自定义的新建任务弹窗（也可切换为 Tasks 插件自带的弹窗 + 标签选择）
   - 任务追加到单独的“任务存储笔记”，避免与汇总笔记中的 Tasks 查询结果重复
*/

import { MarkdownView, Notice, TFile, normalizePath, setIcon } from "obsidian";
import type MyMobilePlugin from "../main";
import { TagPickerModal } from "../ui/tagPickerModal";
import type { TagPickResult } from "../ui/tagField";
import { TaskCreateModal } from "../ui/taskCreateModal";
import { buildTaskLine, readTasksFormat } from "../utils/taskLine";
import { insertTagsIntoTaskLine } from "../utils/tags";

export const QUICK_ADD_TASK_ID = "mmo-quick-add-task";

const BUTTON_CLS = "mmo-quick-add-btn";

export const QUICK_ADD_TASK_CSS = `
.mmo-has-quick-add {
	position: relative;
}
/* 选择器加上 .view-content > button 提高优先级，避免被主题/移动端按钮样式覆盖 */
.view-content > button.${BUTTON_CLS} {
	position: absolute;
	right: 20px;
	/* 移动端底部导航栏是悬浮在内容上方的，距离由设置项控制 */
	bottom: calc(var(--mmo-quick-add-bottom, 24px) + env(safe-area-inset-bottom, 0px));
	z-index: var(--layer-cover, 5);
	width: 52px;
	height: 52px;
	padding: 0;
	border: none;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--interactive-accent) !important;
	color: var(--text-on-accent) !important;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}
.view-content > button.${BUTTON_CLS} svg {
	width: 26px;
	height: 26px;
	stroke-width: 2;
}
.view-content > button.${BUTTON_CLS}:hover,
.view-content > button.${BUTTON_CLS}:active {
	background-color: var(--interactive-accent-hover) !important;
}

/* 标签选择弹窗 */
.mmo-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 12px;
}
.mmo-chip {
	border-radius: 999px;
	padding: 4px 12px;
	height: auto;
	font-size: var(--font-ui-small);
	background-color: var(--background-modifier-hover);
	color: var(--text-normal);
	box-shadow: none;
	border: 1px solid var(--background-modifier-border);
}
.mmo-chip.is-selected {
	background-color: var(--interactive-accent);
	color: var(--text-on-accent);
	border-color: var(--interactive-accent);
}
.mmo-tag-add-row {
	display: flex;
	gap: 8px;
}
.mmo-tag-add-row input {
	flex: 1;
	min-width: 0;
}
.mmo-tag-empty {
	color: var(--text-muted);
	font-size: var(--font-ui-small);
	padding: 8px 0;
}

.mmo-tag-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-top: 8px;
}
.mmo-inline-check {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: var(--font-ui-small);
	color: var(--text-muted);
}
.mmo-link-btn {
	background: none !important;
	box-shadow: none !important;
	border: none;
	padding: 0 4px;
	height: auto;
	color: var(--text-accent);
	font-size: var(--font-ui-small);
	cursor: pointer;
}

/* 新建任务弹窗 */
.mmo-task-desc {
	width: 100%;
	resize: vertical;
	font-size: var(--font-ui-medium);
}
.mmo-section-title {
	font-size: var(--font-ui-small);
	font-weight: 600;
	color: var(--text-muted);
	margin: 14px 0 6px;
}
.mmo-segment {
	flex-wrap: nowrap;
	gap: 4px;
	margin-bottom: 0;
}
.mmo-segment .mmo-chip {
	flex: 1;
	padding: 4px 0;
	justify-content: center;
}
.mmo-chip.mmo-prio-highest.is-selected { background-color: #c62828; border-color: #c62828; color: #fff; }
.mmo-chip.mmo-prio-high.is-selected { background-color: #ef5350; border-color: #ef5350; color: #fff; }
.mmo-chip.mmo-prio-medium.is-selected { background-color: #ff9800; border-color: #ff9800; color: #fff; }
.mmo-chip.mmo-prio-low.is-selected { background-color: #78909c; border-color: #78909c; color: #fff; }
.mmo-chip.mmo-prio-lowest.is-selected { background-color: #b0bec5; border-color: #b0bec5; color: #fff; }
.mmo-date-pick {
	position: relative;
	display: inline-flex;
	align-items: center;
	cursor: pointer;
}
/* 透明的原生日期输入覆盖在 chip 上，点击即调出系统日历 */
.mmo-date-pick input[type="date"] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	opacity: 0;
	padding: 0;
	border: none;
}
.mmo-date-hint {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: var(--font-ui-small);
	color: var(--text-normal);
	margin-top: -4px;
}
.mmo-date-hint.is-empty {
	color: var(--text-faint);
}
.mmo-more {
	margin-top: 14px;
	border-top: 1px solid var(--background-modifier-border);
	padding-top: 10px;
}
.mmo-more summary {
	font-size: var(--font-ui-small);
	color: var(--text-muted);
	cursor: pointer;
}
.mmo-rec-row {
	display: flex;
	gap: 8px;
	margin-bottom: 6px;
}
.mmo-rec-row input {
	flex: 1;
	min-width: 0;
}
.mmo-task-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 18px;
}

/* 全部标签搜索多选弹窗 */
.mmo-tag-search {
	width: 100%;
}
.mmo-tag-count {
	color: var(--text-muted);
	font-size: var(--font-ui-small);
	margin: 8px 0 4px;
}
.mmo-tag-list {
	max-height: 50vh;
	overflow-y: auto;
	border: 1px solid var(--background-modifier-border);
	border-radius: var(--radius-s);
}
.mmo-tag-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	border-bottom: 1px solid var(--background-modifier-border);
}
.mmo-tag-row:last-child {
	border-bottom: none;
}
.mmo-tag-name {
	flex: 1;
	word-break: break-all;
}
.mmo-tag-num {
	color: var(--text-faint);
	font-size: var(--font-ui-smaller);
}

/* 设置页 */
.mmo-setting-indent {
	padding-left: 1.5em;
	border-top: none;
}
/* 设置页常用标签展示 */
.mmo-setting-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 0 0 12px;
}
.mmo-setting-tags .mmo-chip {
	cursor: default;
}
`;

interface TasksApiV1 {
	createTaskLineModal(): Promise<string>;
}

function getTasksApi(plugin: MyMobilePlugin): TasksApiV1 | null {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const tasks = (plugin.app as any).plugins?.plugins?.["obsidian-tasks-plugin"];
	return tasks?.apiV1 ?? null;
}

/** 根据设置为每个 Markdown 视图添加或移除悬浮按钮 */
export function refreshQuickAddButtons(plugin: MyMobilePlugin): void {
	const { quickAddEnabled, quickAddNotes, quickAddButtonBottom } = plugin.settings;
	plugin.app.workspace.iterateAllLeaves((leaf) => {
		if (!(leaf.view instanceof MarkdownView)) return;
		const view = leaf.view;
		const container = view.contentEl;
		const existing = container.querySelector<HTMLElement>(`:scope > .${BUTTON_CLS}`);
		const want = quickAddEnabled && !!view.file && quickAddNotes.includes(view.file.path);

		if (want && !existing) {
			container.addClass("mmo-has-quick-add");
			const btn = container.createEl("button", {
				cls: BUTTON_CLS,
				attr: { "aria-label": "快速添加任务" },
			});
			btn.style.setProperty("--mmo-quick-add-bottom", `${quickAddButtonBottom}px`);
			// 用“待办清单”图标，避免和新建笔记的加号混淆；旧版本图标库缺失时退回到复选框
			setIcon(btn, "list-todo");
			if (!btn.querySelector("svg")) setIcon(btn, "check-square");
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				void quickAddTask(plugin);
			});
		} else if (want && existing) {
			existing.style.setProperty("--mmo-quick-add-bottom", `${quickAddButtonBottom}px`);
		} else if (!want && existing) {
			existing.remove();
			container.removeClass("mmo-has-quick-add");
		}
	});
}

export function removeQuickAddButtons(): void {
	document.querySelectorAll(`.${BUTTON_CLS}`).forEach((el) => el.remove());
	document.querySelectorAll(".mmo-has-quick-add").forEach((el) => el.removeClass("mmo-has-quick-add"));
}

/** 快速添加入口：按设置打开自定义弹窗或 Tasks 原生面板 */
export async function quickAddTask(plugin: MyMobilePlugin): Promise<void> {
	if (plugin.settings.quickAddPanel === "tasks") {
		await quickAddViaTasks(plugin);
		return;
	}

	const s = plugin.settings;
	new TaskCreateModal(plugin.app, {
		commonTags: s.commonTags,
		saveNewToCommon: s.saveNewTagsToCommon,
		addCreatedDate: s.quickAddCreatedDate,
		onUseTasksPanel: () => void quickAddViaTasks(plugin),
		onSubmit: async ({ fields, tagResult }) => {
			const auto = await readTasksFormat(plugin.app);
			const globalFilter = s.tasksGlobalFilter.trim() || auto?.globalFilter || "";
			const line = buildTaskLine(
				{ ...fields, tags: tagResult.tags },
				{ globalFilter, dataview: auto?.dataview ?? false }
			);
			await saveTagResult(plugin, tagResult);
			await writeTaskLine(plugin, line);
		},
	}).open();
}

/** Tasks 原生面板 → 标签选择 → 写入存储笔记 */
async function quickAddViaTasks(plugin: MyMobilePlugin): Promise<void> {
	const api = getTasksApi(plugin);
	if (!api) {
		new Notice("未检测到 Tasks 插件，请确认已安装并启用");
		return;
	}

	let line = (await api.createTaskLineModal())?.trimEnd();
	if (!line) return; // 在 Tasks 弹窗中取消

	const s = plugin.settings;
	if (s.quickAddTagPicker) {
		const result = await new TagPickerModal(plugin.app, s.commonTags, s.saveNewTagsToCommon).pick();
		line = insertTagsIntoTaskLine(line, result.tags);
		await saveTagResult(plugin, result);
	}
	await writeTaskLine(plugin, line);
}

async function saveTagResult(plugin: MyMobilePlugin, result: TagPickResult): Promise<void> {
	const s = plugin.settings;
	const newCommon = result.newCommonTags.filter((t) => !s.commonTags.includes(t));
	if (newCommon.length > 0 || result.saveNewToCommon !== s.saveNewTagsToCommon) {
		s.commonTags.push(...newCommon);
		s.saveNewTagsToCommon = result.saveNewToCommon;
		await plugin.saveSettings();
	}
}

async function writeTaskLine(plugin: MyMobilePlugin, line: string): Promise<void> {
	try {
		const file = await appendLine(plugin, line);
		new Notice(`已添加到 ${file.basename}`);
	} catch (e) {
		console.error("[MyMobileObsidian] 添加任务失败", e);
		new Notice(`添加任务失败：${e instanceof Error ? e.message : String(e)}`);
		// 写入失败时把任务行放到剪贴板，避免内容丢失
		await navigator.clipboard?.writeText(line).catch(() => undefined);
	}
}

async function appendLine(plugin: MyMobilePlugin, line: string): Promise<TFile> {
	const { vault } = plugin.app;
	let path = normalizePath(plugin.settings.quickAddTargetPath.trim() || "Tasks Inbox.md");
	if (!path.endsWith(".md")) path += ".md";

	const existing = vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		await vault.process(existing, (data) => {
			if (data === "") return `${line}\n`;
			return `${data.endsWith("\n") ? data : `${data}\n`}${line}\n`;
		});
		return existing;
	}
	if (existing) throw new Error(`${path} 不是文件`);

	const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
	if (dir && !vault.getAbstractFileByPath(dir)) await vault.createFolder(dir);
	return vault.create(path, `${line}\n`);
}
