import { Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, MyMobileSettings, MyMobileSettingTab } from "./settings";
import { setStyle } from "./features/styleInjector";
import { PROJECT_TODO_SEPARATOR_ID, projectTodoSeparatorCss } from "./features/projectTodoSeparator";
import { STRIKETHROUGH_DIM_ID, STRIKETHROUGH_DIM_CSS } from "./features/strikethroughDim";
import { TASKS_CLEAN_ID, TASKS_CLEAN_CSS } from "./features/tasksClean";
import {
	QUICK_ADD_TASK_CSS,
	QUICK_ADD_TASK_ID,
	quickAddTask,
	refreshQuickAddButtons,
	removeQuickAddButtons,
} from "./features/quickAddTask";

export default class MyMobilePlugin extends Plugin {
	settings: MyMobileSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new MyMobileSettingTab(this.app, this));
		this.applyFeatures();

		this.addCommand({
			id: "quick-add-task",
			name: "快速添加任务",
			callback: () => void quickAddTask(this),
		});

		const refresh = () => refreshQuickAddButtons(this);
		this.app.workspace.onLayoutReady(refresh);
		this.registerEvent(this.app.workspace.on("layout-change", refresh));
		this.registerEvent(this.app.workspace.on("active-leaf-change", refresh));
		this.registerEvent(this.app.workspace.on("file-open", refresh));
		this.registerEvent(
			this.app.vault.on("rename", async (file, oldPath) => {
				if (!(file instanceof TFile)) return;
				const s = this.settings;
				let changed = false;
				if (s.quickAddNotes.includes(oldPath)) {
					s.quickAddNotes = s.quickAddNotes.map((p) => (p === oldPath ? file.path : p));
					changed = true;
				}
				if (s.quickAddTargetPath === oldPath) {
					s.quickAddTargetPath = file.path;
					changed = true;
				}
				if (changed) await this.saveSettings();
				else refresh();
			})
		);
	}

	onunload(): void {
		setStyle(PROJECT_TODO_SEPARATOR_ID, null);
		setStyle(STRIKETHROUGH_DIM_ID, null);
		setStyle(TASKS_CLEAN_ID, null);
		setStyle(QUICK_ADD_TASK_ID, null);
		removeQuickAddButtons();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// 数组需拷贝，避免修改到 DEFAULT_SETTINGS
		this.settings.quickAddNotes = [...this.settings.quickAddNotes];
		this.settings.commonTags = [...this.settings.commonTags];
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
		// 弹窗也依赖这段样式，始终注入
		setStyle(QUICK_ADD_TASK_ID, QUICK_ADD_TASK_CSS);
		refreshQuickAddButtons(this);
	}
}
