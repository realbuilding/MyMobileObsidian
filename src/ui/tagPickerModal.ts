import { App, Modal, Setting } from "obsidian";
import { TagField, TagPickResult } from "./tagField";

/** 使用 Tasks 原生面板后，单独弹出的标签选择 */
export class TagPickerModal extends Modal {
	private field!: TagField;
	private resolve!: (r: TagPickResult) => void;

	constructor(
		app: App,
		private commonTags: string[],
		private saveNewToCommon: boolean,
		private tagPrefix: string | null = null
	) {
		super(app);
	}

	/** 打开并等待结果；关闭弹窗即视为确认当前选择 */
	pick(): Promise<TagPickResult> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		this.modalEl.addClass("mmo-tag-picker-modal");
		this.titleEl.setText("选择标签");
		this.field = new TagField(this.app, this.contentEl, this.commonTags, this.saveNewToCommon, this.tagPrefix);
		new Setting(this.contentEl).addButton((b) => b.setButtonText("完成").setCta().onClick(() => this.close()));
	}

	onClose(): void {
		this.resolve?.(this.field.getResult());
		this.contentEl.empty();
	}
}
