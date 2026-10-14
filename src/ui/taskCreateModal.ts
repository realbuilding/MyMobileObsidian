import { App, Menu, Modal, Notice, Setting, moment, setIcon } from "obsidian";
import { TagField, TagPickResult } from "./tagField";
import { PRIORITY_OPTIONS, Priority, TaskFields } from "../utils/taskLine";

const DATE_FMT = "YYYY-MM-DD";

interface DatePreset {
	label: string;
	date: () => moment.Moment;
}

/** 本周六；周日时取当天 */
function weekend(): moment.Moment {
	const d = moment().startOf("day");
	return d.isoWeekday() === 7 ? d : d.isoWeekday(6);
}

const DUE_PRESETS: DatePreset[] = [
	{ label: "今天", date: () => moment() },
	{ label: "明天", date: () => moment().add(1, "day") },
	{ label: "周末", date: weekend },
	{ label: "下周一", date: () => moment().add(1, "week").isoWeekday(1) },
];

const SCHEDULED_PRESETS: DatePreset[] = DUE_PRESETS.slice(0, 2);

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
	{ value: "every day", label: "每天" },
	{ value: "every weekday", label: "工作日" },
	{ value: "every week", label: "每周" },
	{ value: "every month", label: "每月" },
	{ value: "every year", label: "每年" },
];

const PRIORITY_ICON: Record<Priority, string> = {
	highest: "🔺",
	high: "⏫",
	medium: "🔼",
	none: "",
	low: "🔽",
	lowest: "⏬",
};

/** 日期的简短显示：今天 / 明天 / 10/18 周六 */
function formatDate(v: string): string {
	const d = moment(v, DATE_FMT);
	const diff = d.diff(moment().startOf("day"), "days");
	if (diff === 0) return "今天";
	if (diff === 1) return "明天";
	return d.format("M/D ddd");
}

/**
 * 胶囊按钮：显示当前值，点击弹出菜单（移动端为底部菜单）选择。
 * 未设置时显示字段名并弱化
 */
class Pill {
	readonly el: HTMLButtonElement;

	constructor(parent: HTMLElement, private placeholder: string, onClick: (e: MouseEvent) => void) {
		this.el = parent.createEl("button", { cls: "mmo-pill" });
		this.el.addEventListener("click", onClick);
	}

	set(text: string | null): void {
		this.el.empty();
		this.el.toggleClass("is-set", text !== null);
		this.el.createSpan({ text: text ?? this.placeholder });
		setIcon(this.el.createSpan({ cls: "mmo-pill-caret" }), "chevron-down");
	}
}

/** 单行文本输入弹窗 */
class PromptModal extends Modal {
	constructor(
		app: App,
		private title: string,
		private placeholder: string,
		private initial: string,
		private onSubmit: (v: string) => void
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(this.title);
		const input = this.contentEl.createEl("input", {
			type: "text",
			cls: "mmo-prompt-input",
			attr: { placeholder: this.placeholder },
		});
		input.value = this.initial;
		const submit = () => {
			this.onSubmit(input.value.trim());
			this.close();
		};
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.isComposing) {
				e.preventDefault();
				submit();
			}
		});
		new Setting(this.contentEl).addButton((b) => b.setButtonText("确定").setCta().onClick(submit));
		window.setTimeout(() => input.focus(), 50);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/** 调出系统日期选择器；不支持 showPicker 时退回到带日期输入框的弹窗 */
function pickDate(app: App, initial: string | null, onPick: (v: string) => void): void {
	const input = document.body.createEl("input", { type: "date", cls: "mmo-hidden-date" });
	input.value = initial ?? "";
	const cleanup = () => window.setTimeout(() => input.remove(), 0);
	input.addEventListener("change", () => {
		if (input.value) onPick(input.value);
		cleanup();
	});
	input.addEventListener("blur", cleanup);
	try {
		if (typeof input.showPicker !== "function") throw new Error("showPicker unsupported");
		input.showPicker();
	} catch {
		input.remove();
		new DateModal(app, initial, onPick).open();
	}
}

class DateModal extends Modal {
	constructor(app: App, private initial: string | null, private onPick: (v: string) => void) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText("选择日期");
		const input = this.contentEl.createEl("input", { type: "date", cls: "mmo-prompt-input" });
		input.value = this.initial ?? "";
		new Setting(this.contentEl).addButton((b) =>
			b.setButtonText("确定").setCta().onClick(() => {
				if (input.value) this.onPick(input.value);
				this.close();
			})
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/** 日期胶囊：快捷日期 + 选择日期 + 清除 */
class DatePill {
	value: string | null = null;
	private pill: Pill;

	constructor(app: App, parent: HTMLElement, private label: string, private icon: string, presets: DatePreset[]) {
		this.pill = new Pill(parent, label, (e) => {
			const menu = new Menu();
			for (const p of presets) {
				const v = p.date().format(DATE_FMT);
				menu.addItem((i) =>
					i
						.setTitle(`${p.label}（${moment(v, DATE_FMT).format("M/D ddd")}）`)
						.setChecked(this.value === v)
						.onClick(() => this.set(v))
				);
			}
			menu.addItem((i) =>
				i.setTitle("选择日期…").setIcon("calendar").onClick(() => pickDate(app, this.value, (v) => this.set(v)))
			);
			if (this.value) {
				menu.addSeparator();
				menu.addItem((i) => i.setTitle(`清除${label}`).setIcon("x").onClick(() => this.set(null)));
			}
			menu.showAtMouseEvent(e);
		});
		this.set(null);
	}

	private set(v: string | null): void {
		this.value = v;
		this.pill.set(v ? `${this.icon} ${formatDate(v)}` : null);
	}
}

export interface TaskCreateResult {
	fields: TaskFields;
	tagResult: TagPickResult;
}

export interface TaskCreateOptions {
	commonTags: string[];
	addCreatedDate: boolean;
	/** 全局过滤器的标签名，见 TagField */
	tagPrefix: string | null;
	onSubmit: (r: TaskCreateResult) => Promise<void>;
	/** 切换到 Tasks 原生面板 */
	onUseTasksPanel: () => void;
}

/** 自定义的新建任务弹窗 */
export class TaskCreateModal extends Modal {
	private submitting = false;

	constructor(app: App, private opts: TaskCreateOptions) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		this.modalEl.addClass("mmo-task-create-modal");
		this.titleEl.setText("新建任务");

		const desc = contentEl.createEl("textarea", {
			cls: "mmo-task-desc",
			attr: { placeholder: "任务描述…", rows: "2" },
		});

		// 标签
		const tagField = new TagField(this.app, contentEl, this.opts.commonTags, this.opts.tagPrefix);

		// 其余字段：一排胶囊，放不下自动换行
		const pills = contentEl.createDiv({ cls: "mmo-pills" });

		let priority: Priority = "none";
		const prioPill = new Pill(pills, "优先级", (e) => {
			const menu = new Menu();
			for (const { value, label } of PRIORITY_OPTIONS) {
				menu.addItem((i) =>
					i
						.setTitle(value === "none" ? "无" : `${PRIORITY_ICON[value]} ${label}`)
						.setChecked(priority === value)
						.onClick(() => setPriority(value))
				);
			}
			menu.showAtMouseEvent(e);
		});
		const setPriority = (v: Priority) => {
			priority = v;
			const label = PRIORITY_OPTIONS.find((o) => o.value === v)?.label ?? "";
			prioPill.set(v === "none" ? null : `${PRIORITY_ICON[v]} ${label}`);
			prioPill.el.className = `mmo-pill mmo-prio-${v}${v === "none" ? "" : " is-set"}`;
		};
		setPriority("none");

		const due = new DatePill(this.app, pills, "截止日期", "📅", DUE_PRESETS);

		let recurrence = "";
		let whenDone = false;
		const recPill = new Pill(pills, "重复", (e) => {
			const menu = new Menu();
			menu.addItem((i) => i.setTitle("不重复").setChecked(!recurrence).onClick(() => setRecurrence("")));
			for (const { value, label } of RECURRENCE_OPTIONS) {
				menu.addItem((i) =>
					i.setTitle(label).setChecked(recurrence === value).onClick(() => setRecurrence(value))
				);
			}
			const isCustom = !!recurrence && !RECURRENCE_OPTIONS.some((o) => o.value === recurrence);
			menu.addItem((i) =>
				i
					.setTitle(isCustom ? `自定义：${recurrence}` : "自定义…")
					.setChecked(isCustom)
					.onClick(() =>
						new PromptModal(this.app, "自定义重复规则", "如 every 2 weeks on Monday", isCustom ? recurrence : "", (v) =>
							setRecurrence(v.replace(/\s+when done$/, ""))
						).open()
					)
			);
			if (recurrence) {
				menu.addSeparator();
				menu.addItem((i) =>
					i
						.setTitle("从完成日起算（when done）")
						.setChecked(whenDone)
						.onClick(() => {
							whenDone = !whenDone;
							setRecurrence(recurrence);
						})
				);
			}
			menu.showAtMouseEvent(e);
		});
		const setRecurrence = (v: string) => {
			recurrence = v;
			if (!v) {
				recPill.set(null);
				return;
			}
			const label = RECURRENCE_OPTIONS.find((o) => o.value === v)?.label ?? v;
			recPill.set(`🔁 ${label}${whenDone ? "（完成后）" : ""}`);
		};
		setRecurrence("");

		const scheduled = new DatePill(this.app, pills, "计划日期", "⏳", SCHEDULED_PRESETS);

		// 底部
		const footer = contentEl.createDiv({ cls: "mmo-task-footer" });
		const tasksBtn = footer.createEl("button", { cls: "mmo-link-btn", text: "用 Tasks 原生面板" });
		tasksBtn.addEventListener("click", () => {
			this.close();
			this.opts.onUseTasksPanel();
		});
		const submitBtn = footer.createEl("button", { cls: "mod-cta", text: "添加" });

		const submit = async () => {
			if (this.submitting) return;
			const description = desc.value.replace(/\s+/g, " ").trim();
			if (!description) {
				new Notice("请填写任务描述");
				desc.focus();
				return;
			}
			const rec = recurrence && whenDone ? `${recurrence} when done` : recurrence;

			this.submitting = true;
			submitBtn.disabled = true;
			try {
				await this.opts.onSubmit({
					fields: {
						description,
						priority,
						due: due.value,
						scheduled: scheduled.value,
						created: this.opts.addCreatedDate ? moment().format(DATE_FMT) : null,
						recurrence: rec || null,
						tags: [],
					},
					tagResult: tagField.getResult(),
				});
				this.close();
			} finally {
				this.submitting = false;
				submitBtn.disabled = false;
			}
		};
		submitBtn.addEventListener("click", () => void submit());
		desc.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.isComposing) {
				e.preventDefault();
				void submit();
			}
		});

		window.setTimeout(() => desc.focus(), 50);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
