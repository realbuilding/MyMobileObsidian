/* 快速添加任务
   - 在指定笔记右下角显示悬浮“+”按钮（也提供命令，可绑定到移动端工具栏）
   - 点击后调用 Tasks 插件自带的新建任务弹窗，再弹出标签选择
   - 任务追加到单独的“任务存储笔记”，避免与汇总笔记中的 Tasks 查询结果重复
*/

import { MarkdownView, Notice, TFile, normalizePath, setIcon } from "obsidian";
import type MyMobilePlugin from "../main";
import { TagPickerModal } from "../ui/tagPickerModal";
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
.mmo-tag-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 12px;
}
.mmo-tag-chip {
	border-radius: 999px;
	padding: 4px 12px;
	height: auto;
	font-size: var(--font-ui-small);
	background-color: var(--background-modifier-hover);
	color: var(--text-normal);
	box-shadow: none;
	border: 1px solid var(--background-modifier-border);
}
.mmo-tag-chip.is-selected {
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
.mmo-setting-tags .mmo-tag-chip {
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

/** 完整流程：Tasks 弹窗 → 标签选择 → 写入存储笔记 */
export async function quickAddTask(plugin: MyMobilePlugin): Promise<void> {
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

		const newCommon = result.newCommonTags.filter((t) => !s.commonTags.includes(t));
		if (newCommon.length > 0 || result.saveNewToCommon !== s.saveNewTagsToCommon) {
			s.commonTags.push(...newCommon);
			s.saveNewTagsToCommon = result.saveNewToCommon;
			await plugin.saveSettings();
		}
	}

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
