import { App } from "obsidian";
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

/** 标签选择区域：常用标签 chip 多选 + 新标签输入 + 搜索全部标签 */
export class TagField {
	private options: string[];
	private selected = new Set<string>();
	private newTags = new Set<string>();
	private saveNewToCommon: boolean;
	private chipsEl: HTMLElement;

	constructor(private app: App, parent: HTMLElement, commonTags: string[], saveNewToCommon: boolean) {
		this.options = [...commonTags];
		this.saveNewToCommon = saveNewToCommon;

		this.chipsEl = parent.createDiv({ cls: "mmo-chips" });
		this.renderChips();

		const addRow = parent.createDiv({ cls: "mmo-tag-add-row" });
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
				e.stopPropagation();
				add();
			}
		});
		addBtn.addEventListener("click", add);

		const footer = parent.createDiv({ cls: "mmo-tag-footer" });
		const saveLabel = footer.createEl("label", { cls: "mmo-inline-check" });
		const saveCb = saveLabel.createEl("input", { type: "checkbox" });
		saveCb.checked = this.saveNewToCommon;
		saveLabel.appendText("新标签保存为常用");
		saveCb.addEventListener("change", () => (this.saveNewToCommon = saveCb.checked));

		const searchBtn = footer.createEl("button", { cls: "mmo-link-btn", text: "搜索全部标签" });
		searchBtn.addEventListener("click", () => {
			new TagSelectModal(this.app, [...this.selected], (tags) => {
				this.selected = new Set(tags);
				// 从全部标签中选的只用于本次，不自动加入常用
				for (const t of tags) if (!this.options.includes(t)) this.options.push(t);
				this.renderChips();
			}, "确定").open();
		});
	}

	getResult(): TagPickResult {
		const tags = this.options.filter((t) => this.selected.has(t));
		return {
			tags,
			newCommonTags: this.saveNewToCommon ? tags.filter((t) => this.newTags.has(t)) : [],
			saveNewToCommon: this.saveNewToCommon,
		};
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
			const chip = this.chipsEl.createEl("button", { cls: "mmo-chip", text: tag });
			chip.toggleClass("is-selected", this.selected.has(tag));
			chip.addEventListener("click", () => {
				if (this.selected.has(tag)) this.selected.delete(tag);
				else this.selected.add(tag);
				chip.toggleClass("is-selected", this.selected.has(tag));
			});
		}
	}
}
