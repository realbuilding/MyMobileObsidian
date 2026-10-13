import { App, Modal, Setting } from "obsidian";
import { normalizeTag } from "../utils/tags";
import { TagSelectModal } from "./tagSelectModal";

export interface TagPickResult {
	/** 本次选中的标签 */
	tags: string[];
	/** 需要追加到常用标签的新标签 */
	newCommonTags: string[];
	/** “新标签保存为常用”开关的最终状态 */
	saveNewToCommon: boolean;
}

/** 添加任务时选择标签：从常用标签中多选，或输入新标签 */
export class TagPickerModal extends Modal {
	private options: string[];
	private selected = new Set<string>();
	private newTags = new Set<string>();
	private saveNewToCommon: boolean;
	private chipsEl!: HTMLElement;
	private resolve!: (r: TagPickResult) => void;

	constructor(app: App, commonTags: string[], saveNewToCommon: boolean) {
		super(app);
		this.options = [...commonTags];
		this.saveNewToCommon = saveNewToCommon;
	}

	/** 打开并等待结果；关闭弹窗即视为确认当前选择 */
	pick(): Promise<TagPickResult> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		const { contentEl } = this;
		this.modalEl.addClass("mmo-tag-picker-modal");
		this.titleEl.setText("选择标签");

		this.chipsEl = contentEl.createDiv({ cls: "mmo-tag-chips" });
		this.renderChips();

		const addRow = contentEl.createDiv({ cls: "mmo-tag-add-row" });
		const input = addRow.createEl("input", {
			type: "text",
			attr: { placeholder: "新标签，回车添加" },
		});
		const addBtn = addRow.createEl("button", { text: "添加" });
		const add = () => {
			const tag = normalizeTag(input.value);
			input.value = "";
			if (!tag) return;
			if (!this.options.includes(tag)) {
				this.options.push(tag);
				this.newTags.add(tag);
			}
			this.selected.add(tag);
			this.renderChips();
		};
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.isComposing) {
				e.preventDefault();
				add();
			}
		});
		addBtn.addEventListener("click", add);

		new Setting(contentEl)
			.setName("新标签保存为常用")
			.addToggle((t) => t.setValue(this.saveNewToCommon).onChange((v) => (this.saveNewToCommon = v)));

		new Setting(contentEl)
			.addButton((b) =>
				b.setButtonText("搜索全部标签").onClick(() => {
					new TagSelectModal(this.app, [...this.selected], (tags) => {
						this.selected = new Set(tags);
						// 从全部标签中选的只用于本次，不自动加入常用
						for (const t of tags) if (!this.options.includes(t)) this.options.push(t);
						this.renderChips();
					}, "确定").open();
				})
			)
			.addButton((b) => b.setButtonText("完成").setCta().onClick(() => this.close()));
	}

	onClose(): void {
		this.contentEl.empty();
		const tags = this.options.filter((t) => this.selected.has(t));
		this.resolve?.({
			tags,
			newCommonTags: this.saveNewToCommon ? tags.filter((t) => this.newTags.has(t)) : [],
			saveNewToCommon: this.saveNewToCommon,
		});
	}

	private renderChips(): void {
		this.chipsEl.empty();
		if (this.options.length === 0) {
			this.chipsEl.createDiv({
				cls: "mmo-tag-empty",
				text: "还没有常用标签，可在插件设置中配置，或在下方输入新标签",
			});
			return;
		}
		for (const tag of this.options) {
			const chip = this.chipsEl.createEl("button", { cls: "mmo-tag-chip", text: tag });
			chip.toggleClass("is-selected", this.selected.has(tag));
			chip.addEventListener("click", () => {
				if (this.selected.has(tag)) this.selected.delete(tag);
				else this.selected.add(tag);
				chip.toggleClass("is-selected", this.selected.has(tag));
			});
		}
	}
}
