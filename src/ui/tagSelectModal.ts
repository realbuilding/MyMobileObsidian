import { App, Modal, Setting } from "obsidian";
import { collectVaultTags } from "../utils/tags";

/** 搜索 Vault 中的全部标签并多选 */
export class TagSelectModal extends Modal {
	private selected: Set<string>;
	private query = "";
	private listEl!: HTMLElement;
	private countEl!: HTMLElement;

	constructor(
		app: App,
		initial: string[],
		private onSubmit: (tags: string[]) => void,
		private submitText = "保存"
	) {
		super(app);
		this.selected = new Set(initial);
	}

	onOpen(): void {
		const { contentEl } = this;
		this.modalEl.addClass("mmo-tag-select-modal");
		this.titleEl.setText("选择标签");

		const search = contentEl.createEl("input", {
			type: "search",
			cls: "mmo-tag-search",
			attr: { placeholder: "搜索标签…" },
		});
		search.addEventListener("input", () => {
			this.query = search.value.trim().toLowerCase();
			this.renderList();
		});

		this.countEl = contentEl.createDiv({ cls: "mmo-tag-count" });
		this.listEl = contentEl.createDiv({ cls: "mmo-tag-list" });
		this.renderList();

		new Setting(contentEl)
			.addButton((b) => b.setButtonText("清空").onClick(() => {
				this.selected.clear();
				this.renderList();
			}))
			.addButton((b) => b.setButtonText(this.submitText).setCta().onClick(() => {
				this.onSubmit([...this.selected]);
				this.close();
			}));
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderList(): void {
		this.listEl.empty();
		this.countEl.setText(`已选 ${this.selected.size} 个`);

		const vaultTags = collectVaultTags(this.app);
		const known = new Set(vaultTags.map((t) => t.tag));
		// 已选但 Vault 中已不存在的标签也要显示，便于取消
		const items = [
			...[...this.selected].filter((t) => !known.has(t)).map((tag) => ({ tag, count: 0 })),
			...vaultTags,
		].filter((t) => !this.query || t.tag.toLowerCase().includes(this.query));

		// 已选的排在前面
		items.sort((a, b) => Number(this.selected.has(b.tag)) - Number(this.selected.has(a.tag)));

		if (items.length === 0) {
			this.listEl.createDiv({ cls: "mmo-tag-empty", text: "没有匹配的标签" });
			return;
		}

		for (const { tag, count } of items) {
			const row = this.listEl.createEl("label", { cls: "mmo-tag-row" });
			const cb = row.createEl("input", { type: "checkbox" });
			cb.checked = this.selected.has(tag);
			row.createSpan({ cls: "mmo-tag-name", text: tag });
			if (count > 0) row.createSpan({ cls: "mmo-tag-num", text: String(count) });
			cb.addEventListener("change", () => {
				if (cb.checked) this.selected.add(tag);
				else this.selected.delete(tag);
				this.countEl.setText(`已选 ${this.selected.size} 个`);
			});
		}
	}
}
