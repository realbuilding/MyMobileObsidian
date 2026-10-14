import { App, Modal, Notice, moment } from "obsidian";
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
	{ value: "", label: "不重复" },
	{ value: "every day", label: "每天" },
	{ value: "every weekday", label: "工作日" },
	{ value: "every week", label: "每周" },
	{ value: "every month", label: "每月" },
	{ value: "every year", label: "每年" },
	{ value: "custom", label: "自定义…" },
];

/** 日期选择：快捷按钮 + 系统日历；再次点击已选按钮可取消 */
class DateField {
	value: string | null = null;
	private chips: { el: HTMLElement; preset: DatePreset }[] = [];
	private input: HTMLInputElement;
	private hint: HTMLElement;

	constructor(parent: HTMLElement, presets: DatePreset[]) {
		const row = parent.createDiv({ cls: "mmo-chips" });
		for (const preset of presets) {
			const el = row.createEl("button", { cls: "mmo-chip", text: preset.label });
			el.addEventListener("click", () => {
				const v = preset.date().format(DATE_FMT);
				this.set(this.value === v ? null : v);
			});
			this.chips.push({ el, preset });
		}
		const pick = row.createEl("label", { cls: "mmo-chip mmo-date-pick" });
		pick.appendText("📅 选择");
		this.input = pick.createEl("input", { type: "date" });
		this.input.addEventListener("change", () => this.set(this.input.value || null));

		this.hint = parent.createDiv({ cls: "mmo-date-hint" });
		this.set(null);
	}

	private set(v: string | null): void {
		this.value = v;
		this.input.value = v ?? "";
		for (const { el, preset } of this.chips) {
			el.toggleClass("is-selected", v !== null && preset.date().format(DATE_FMT) === v);
		}
		this.hint.empty();
		if (!v) {
			this.hint.setText("未设置");
			this.hint.addClass("is-empty");
			return;
		}
		this.hint.removeClass("is-empty");
		this.hint.setText(`已选：${moment(v, DATE_FMT).format("M月D日 ddd")}`);
		const clear = this.hint.createEl("button", { cls: "mmo-link-btn", text: "清除" });
		clear.addEventListener("click", () => this.set(null));
	}
}

export interface TaskCreateResult {
	fields: TaskFields;
	tagResult: TagPickResult;
}

export interface TaskCreateOptions {
	commonTags: string[];
	saveNewToCommon: boolean;
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

		// 优先级
		this.section("优先级");
		let priority: Priority = "none";
		const prioRow = contentEl.createDiv({ cls: "mmo-chips mmo-segment" });
		const prioEls = PRIORITY_OPTIONS.map(({ value, label }) => {
			const el = prioRow.createEl("button", { cls: `mmo-chip mmo-prio-${value}`, text: label });
			el.addEventListener("click", () => {
				priority = value;
				prioEls.forEach((p, i) => p.toggleClass("is-selected", PRIORITY_OPTIONS[i].value === value));
			});
			el.toggleClass("is-selected", value === priority);
			return el;
		});

		// 截止日期
		this.section("截止日期");
		const due = new DateField(contentEl, DUE_PRESETS);

		// 标签
		this.section("标签");
		const tagField = new TagField(this.app, contentEl, this.opts.commonTags, this.opts.saveNewToCommon, this.opts.tagPrefix);

		// 更多
		const more = contentEl.createEl("details", { cls: "mmo-more" });
		more.createEl("summary", { text: "更多（重复 / 计划日期）" });

		this.section("重复", more);
		const recRow = more.createDiv({ cls: "mmo-rec-row" });
		const recSelect = recRow.createEl("select", { cls: "dropdown" });
		for (const { value, label } of RECURRENCE_OPTIONS) recSelect.createEl("option", { value, text: label });
		const recCustom = recRow.createEl("input", {
			type: "text",
			attr: { placeholder: "如 every 2 weeks on Monday" },
		});
		recCustom.hide();
		const whenDoneLabel = more.createEl("label", { cls: "mmo-inline-check" });
		const whenDone = whenDoneLabel.createEl("input", { type: "checkbox" });
		whenDoneLabel.appendText("从完成日起算（when done）");
		whenDoneLabel.hide();
		recSelect.addEventListener("change", () => {
			recCustom.toggle(recSelect.value === "custom");
			whenDoneLabel.toggle(recSelect.value !== "");
		});

		this.section("计划日期", more);
		const scheduled = new DateField(more, SCHEDULED_PRESETS);

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
			let recurrence = recSelect.value === "custom" ? recCustom.value.trim() : recSelect.value;
			if (recurrence && whenDone.checked && !/when done$/.test(recurrence)) recurrence += " when done";

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
						recurrence: recurrence || null,
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

	private section(title: string, parent: HTMLElement = this.contentEl): void {
		parent.createDiv({ cls: "mmo-section-title", text: title });
	}
}
