import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MyMobileSettings, MyMobileSettingTab } from "./settings";
import { setStyle } from "./features/styleInjector";
import { PROJECT_TODO_SEPARATOR_ID, projectTodoSeparatorCss } from "./features/projectTodoSeparator";
import { STRIKETHROUGH_DIM_ID, STRIKETHROUGH_DIM_CSS } from "./features/strikethroughDim";
import { TASKS_CLEAN_ID, TASKS_CLEAN_CSS } from "./features/tasksClean";

export default class MyMobilePlugin extends Plugin {
	settings: MyMobileSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new MyMobileSettingTab(this.app, this));
		this.applyFeatures();
	}

	onunload(): void {
		setStyle(PROJECT_TODO_SEPARATOR_ID, null);
		setStyle(STRIKETHROUGH_DIM_ID, null);
		setStyle(TASKS_CLEAN_ID, null);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.applyFeatures();
	}

	private applyFeatures(): void {
		const s = this.settings;
		const cssClass = s.projectTodoCssClass.trim();

		setStyle(
			PROJECT_TODO_SEPARATOR_ID,
			s.projectTodoSeparator && cssClass ? projectTodoSeparatorCss(cssClass) : null
		);
		setStyle(STRIKETHROUGH_DIM_ID, s.strikethroughDim ? STRIKETHROUGH_DIM_CSS : null);
		setStyle(TASKS_CLEAN_ID, s.tasksClean ? TASKS_CLEAN_CSS : null);
	}
}
