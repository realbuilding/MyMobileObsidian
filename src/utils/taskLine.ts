import { App, normalizePath } from "obsidian";

export type Priority = "highest" | "high" | "medium" | "none" | "low" | "lowest";

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
	{ value: "highest", label: "最高" },
	{ value: "high", label: "高" },
	{ value: "medium", label: "中" },
	{ value: "none", label: "无" },
	{ value: "low", label: "低" },
	{ value: "lowest", label: "最低" },
];

const PRIORITY_EMOJI: Record<Priority, string> = {
	highest: "🔺",
	high: "⏫",
	medium: "🔼",
	none: "",
	low: "🔽",
	lowest: "⏬",
};

export interface TaskFields {
	description: string;
	priority: Priority;
	/** YYYY-MM-DD */
	due: string | null;
	scheduled: string | null;
	created: string | null;
	/** Tasks 的重复规则文本，如 every week */
	recurrence: string | null;
	tags: string[];
}

export interface TasksFormat {
	globalFilter: string;
	dataview: boolean;
}

/** 按 Tasks 的格式生成一行任务（emoji 或 Dataview 格式） */
export function buildTaskLine(f: TaskFields, fmt: TasksFormat): string {
	const desc = f.description.replace(/\s+/g, " ").trim();
	const parts: string[] = ["- [ ]"];

	const gf = fmt.globalFilter.trim();
	if (gf && !desc.split(" ").includes(gf)) parts.push(gf);
	parts.push(desc);

	const existing = new Set(desc.match(/#[^\s#]+/g) ?? []);
	for (const t of f.tags) if (t !== gf && !existing.has(t)) parts.push(t);

	const recurrence = f.recurrence?.trim();
	if (fmt.dataview) {
		if (f.priority !== "none") parts.push(`[priority:: ${f.priority}]`);
		if (recurrence) parts.push(`[repeat:: ${recurrence}]`);
		if (f.created) parts.push(`[created:: ${f.created}]`);
		if (f.scheduled) parts.push(`[scheduled:: ${f.scheduled}]`);
		if (f.due) parts.push(`[due:: ${f.due}]`);
	} else {
		if (f.priority !== "none") parts.push(PRIORITY_EMOJI[f.priority]);
		if (recurrence) parts.push(`🔁 ${recurrence}`);
		if (f.created) parts.push(`➕ ${f.created}`);
		if (f.scheduled) parts.push(`⏳ ${f.scheduled}`);
		if (f.due) parts.push(`📅 ${f.due}`);
	}
	return parts.join(" ");
}

/** 从 Tasks 插件的 data.json 读取全局过滤器和任务格式；读取失败返回 null */
export async function readTasksFormat(app: App): Promise<TasksFormat | null> {
	try {
		const path = normalizePath(`${app.vault.configDir}/plugins/obsidian-tasks-plugin/data.json`);
		const data = JSON.parse(await app.vault.adapter.read(path));
		return {
			globalFilter: typeof data.globalFilter === "string" ? data.globalFilter : "",
			dataview: data.taskFormat === "dataview",
		};
	} catch {
		return null;
	}
}
