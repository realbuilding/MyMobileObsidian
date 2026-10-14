import { App, setIcon } from "obsidian";
import { normalizeTag, tagLabel } from "../utils/tags";
import { TagSelectModal } from "./tagSelectModal";

export interface TagPickResult {
	/** 本次选中的标签 */
	tags: string[];
	/** 本次新输入的标签，默认加入常用标签 */
	newTags: string[];
}

/** 标签选择区域：常用标签 chip 多选，末尾是“添加”和“搜索全部标签”小按钮 */
export class TagField {
	private options: string[];
	private selected = new Set<string>();
	private newTags = new Set<string>();
	private chipsEl: HTMLElement;

	/**
	 * @param tagPrefix 全局过滤器的标签名（如 task）；新标签自动补成 #task/xxx，显示时省略前缀
	 */
	constructor(
		private app: App,
		parent: HTMLElement,
		commonTags: string[],
		private tagPrefix: string | null = null
	) {
		this.options = [...commonTags];
		this.chipsEl = parent.createDiv({ cls: "mmo-chips" });
		this.render();
	}

	getResult(): TagPickResult {
		const tags = this.options.filter((t) => this.selected.has(t));
		return { tags, newTags: tags.filter((t) => this.newTags.has(t)) };
	}

	private render(): void {
		this.chipsEl.empty();
		for (const tag of this.options) {
			const chip = this.chipsEl.createEl("button", {
				cls: "mmo-chip",
				text: tagLabel(tag, this.tagPrefix),
				attr: { title: tag },
			});
			chip.toggleClass("is-selected", this.selected.has(tag));
			chip.addEventListener("click", () => {
				if (this.selected.has(tag)) this.selected.delete(tag);
				else this.selected.add(tag);
				chip.toggleClass("is-selected", this.selected.has(tag));
			});
		}

		const addBtn = this.chipsEl.createEl("button", {
			cls: "mmo-chip mmo-chip-ghost",
			attr: { "aria-label": "添加标签" },
		});
		setIcon(addBtn.createSpan({ cls: "mmo-chip-icon" }), "plus");
		addBtn.appendText("添加");
		addBtn.addEventListener("click", () => this.showInput(addBtn));

		const searchBtn = this.chipsEl.createEl("button", {
			cls: "mmo-chip mmo-chip-ghost",
			attr: { "aria-label": "搜索全部标签" },
		});
		setIcon(searchBtn.createSpan({ cls: "mmo-chip-icon" }), "search");
		searchBtn.addEventListener("click", () => {
			new TagSelectModal(this.app, [...this.selected], (tags) => {
				this.selected = new Set(tags);
				// 从全部标签中选的只用于本次，不自动加入常用
				for (const t of tags) if (!this.options.includes(t)) this.options.push(t);
				this.render();
			}, "确定").open();
		});
	}

	/** 把“添加”按钮替换为行内输入框；回车添加，失焦或 Esc 取消 */
	private showInput(addBtn: HTMLElement): void {
		const input = createEl("input", {
			type: "text",
			cls: "mmo-chip-input",
			attr: { placeholder: this.tagPrefix ? `#${this.tagPrefix}/…` : "新标签" },
		});
		addBtn.replaceWith(input);
		input.focus();

		let done = false;
		const finish = (commit: boolean) => {
			if (done) return;
			done = true;
			const tag = commit ? normalizeTag(input.value, this.tagPrefix) : null;
			if (tag) {
				if (!this.options.includes(tag)) {
					this.options.push(tag);
					this.newTags.add(tag);
				}
				this.selected.add(tag);
			}
			this.render();
		};
		input.addEventListener("keydown", (e) => {
			if (e.isComposing) return;
			if (e.key === "Enter") {
				e.preventDefault();
				e.stopPropagation();
				finish(true);
			} else if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				finish(false);
			}
		});
		input.addEventListener("blur", () => finish(true));
	}
}
