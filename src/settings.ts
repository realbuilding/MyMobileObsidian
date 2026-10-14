import { App, PluginSettingTab, Setting } from "obsidian";
import type MyMobilePlugin from "./main";
import { FileSuggestModal } from "./ui/fileSuggestModal";
import { TagSelectModal } from "./ui/tagSelectModal";

export interface MyMobileSettings {
	projectTodoSeparator: boolean;
	projectTodoCssClass: string;
	strikethroughDim: boolean;
	tasksClean: boolean;
	quickAddEnabled: boolean;
	/** 显示悬浮“添加任务”按钮的笔记路径 */
	quickAddNotes: string[];
	/** 悬浮按钮距底部距离（px），用于避开移动端底部导航栏 */
	quickAddButtonBottom: number;
	/** 快速添加的任务写入的笔记路径 */
	quickAddTargetPath: string;
	/** 新建任务使用的面板：自定义弹窗或 Tasks 原生面板 */
	quickAddPanel: "custom" | "tasks";
	quickAddCreatedDate: boolean;
	/** 手动指定的 Tasks 全局过滤器；留空则自动读取 Tasks 设置 */
	tasksGlobalFilter: string;
	quickAddTagPicker: boolean;
	commonTags: string[];
}

export const DEFAULT_SETTINGS: MyMobileSettings = {
	projectTodoSeparator: true,
	projectTodoCssClass: "project-todo",
	strikethroughDim: true,
	tasksClean: true,
	quickAddEnabled: true,
	quickAddNotes: [],
	quickAddButtonBottom: 110,
	quickAddTargetPath: "Inbox/Tasks Inbox.md",
	quickAddPanel: "custom",
	quickAddCreatedDate: true,
	tasksGlobalFilter: "",
	quickAddTagPicker: true,
	commonTags: [],
};

export class MyMobileSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: MyMobilePlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("项目分隔线").setHeading();

		new Setting(containerEl)
			.setName("启用")
			.setDesc("为指定 cssclass 笔记中的二级标题添加上边框，作为项目分隔线")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.projectTodoSeparator).onChange(async (v) => {
					this.plugin.settings.projectTodoSeparator = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("cssclass 名称")
			.setDesc("笔记 frontmatter 中 cssclasses 的取值")
			.addText((t) =>
				t
					.setPlaceholder(DEFAULT_SETTINGS.projectTodoCssClass)
					.setValue(this.plugin.settings.projectTodoCssClass)
					.onChange(async (v) => {
						this.plugin.settings.projectTodoCssClass = v.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("删除线").setHeading();

		new Setting(containerEl)
			.setName("调淡删除线文字")
			.setDesc("降低删除线文字及删除线本身的颜色对比度")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.strikethroughDim).onChange(async (v) => {
					this.plugin.settings.strikethroughDim = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setName("Tasks 查询样式").setHeading();

		new Setting(containerEl)
			.setName("启用")
			.setDesc("优化 Tasks 插件查询结果的显示：截止日期紧急度高亮、日期 badge、优先级复选框底色、分组标题")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.tasksClean).onChange(async (v) => {
					this.plugin.settings.tasksClean = v;
					await this.plugin.saveSettings();
				})
			);

		this.displayQuickAdd(containerEl);
	}

	private displayQuickAdd(containerEl: HTMLElement): void {
		const s = this.plugin.settings;

		new Setting(containerEl).setName("快速添加任务").setHeading();

		new Setting(containerEl)
			.setName("启用悬浮按钮")
			.setDesc("在下方指定的笔记右下角显示“+”按钮，点击后打开新建任务弹窗。也可使用命令「快速添加任务」")
			.addToggle((t) =>
				t.setValue(s.quickAddEnabled).onChange(async (v) => {
					s.quickAddEnabled = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("按钮距底部距离")
			.setDesc("单位 px。按钮被底部导航栏挡住时调大")
			.addSlider((sl) =>
				sl
					.setLimits(0, 300, 2)
					.setValue(s.quickAddButtonBottom)
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.quickAddButtonBottom = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("显示按钮的笔记")
			.setDesc(s.quickAddNotes.length === 0 ? "尚未添加笔记" : "")
			.addButton((b) =>
				b.setButtonText("添加笔记").onClick(() => {
					new FileSuggestModal(this.app, async (file) => {
						if (!s.quickAddNotes.includes(file.path)) s.quickAddNotes.push(file.path);
						await this.plugin.saveSettings();
						this.display();
					}).open();
				})
			);
		for (const path of s.quickAddNotes) {
			new Setting(containerEl)
				.setDesc(path)
				.setClass("mmo-setting-indent")
				.addExtraButton((b) =>
					b.setIcon("x").setTooltip("移除").onClick(async () => {
						s.quickAddNotes = s.quickAddNotes.filter((p) => p !== path);
						await this.plugin.saveSettings();
						this.display();
					})
				);
		}

		new Setting(containerEl)
			.setName("任务存储笔记")
			.setDesc("新任务追加到这篇笔记末尾。建议使用单独的笔记，不要设为汇总笔记本身，以免与 Tasks 查询结果重复")
			.addButton((b) =>
				b.setButtonText("选择笔记").onClick(() => {
					new FileSuggestModal(this.app, async (file) => {
						s.quickAddTargetPath = file.path;
						await this.plugin.saveSettings();
						this.display();
					}).open();
				})
			);
		new Setting(containerEl)
			.setDesc(s.quickAddTargetPath || DEFAULT_SETTINGS.quickAddTargetPath)
			.setClass("mmo-setting-indent");

		new Setting(containerEl)
			.setName("新建面板")
			.setDesc("自定义面板支持快捷选择优先级、日期和标签；也可改用 Tasks 原生面板")
			.addDropdown((d) =>
				d
					.addOption("custom", "自定义面板")
					.addOption("tasks", "Tasks 原生面板")
					.setValue(s.quickAddPanel)
					.onChange(async (v) => {
						s.quickAddPanel = v === "tasks" ? "tasks" : "custom";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("自动写入创建日期")
			.setDesc("自定义面板新建任务时添加 ➕ 创建日期")
			.addToggle((t) =>
				t.setValue(s.quickAddCreatedDate).onChange(async (v) => {
					s.quickAddCreatedDate = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Tasks 全局过滤器")
			.setDesc("留空则自动读取 Tasks 插件的设置；读取不到时在此手动填写")
			.addText((t) =>
				t
					.setPlaceholder("自动读取")
					.setValue(s.tasksGlobalFilter)
					.onChange(async (v) => {
						s.tasksGlobalFilter = v.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Tasks 原生面板后选择标签")
			.setDesc("使用 Tasks 原生面板时，确认后再弹出标签选择")
			.addToggle((t) =>
				t.setValue(s.quickAddTagPicker).onChange(async (v) => {
					s.quickAddTagPicker = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("常用标签")
			.setDesc("添加任务时只从这些标签中选择，新输入的标签会自动加入。点击「管理」搜索 Vault 中的全部标签并多选")
			.addButton((b) =>
				b.setButtonText("管理").onClick(() => {
					new TagSelectModal(this.app, s.commonTags, async (tags) => {
						s.commonTags = tags;
						await this.plugin.saveSettings();
						this.display();
					}).open();
				})
			);
		const tagsEl = containerEl.createDiv({ cls: "mmo-setting-tags" });
		if (s.commonTags.length === 0) {
			tagsEl.createSpan({ cls: "mmo-tag-empty", text: "尚未设置常用标签" });
		}
		for (const tag of s.commonTags) tagsEl.createSpan({ cls: "mmo-chip", text: tag });
	}
}
