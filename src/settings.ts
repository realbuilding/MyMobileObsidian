import { App, PluginSettingTab, Setting } from "obsidian";
import type MyMobilePlugin from "./main";

export interface MyMobileSettings {
	projectTodoSeparator: boolean;
	projectTodoCssClass: string;
	strikethroughDim: boolean;
	tasksClean: boolean;
}

export const DEFAULT_SETTINGS: MyMobileSettings = {
	projectTodoSeparator: true,
	projectTodoCssClass: "project-todo",
	strikethroughDim: true,
	tasksClean: true,
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
	}
}
