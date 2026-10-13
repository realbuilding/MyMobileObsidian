import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MyMobileSettings, MyMobileSettingTab } from "./settings";
import { applyProjectTodoSeparator, removeProjectTodoSeparator } from "./features/projectTodoSeparator";

export default class MyMobilePlugin extends Plugin {
	settings: MyMobileSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new MyMobileSettingTab(this.app, this));
		this.applyFeatures();
	}

	onunload(): void {
		removeProjectTodoSeparator();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.applyFeatures();
	}

	private applyFeatures(): void {
		const { projectTodoSeparator, projectTodoCssClass } = this.settings;
		applyProjectTodoSeparator(projectTodoSeparator, projectTodoCssClass);
	}
}
