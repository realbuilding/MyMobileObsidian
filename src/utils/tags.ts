import { App, getAllTags } from "obsidian";

export interface TagCount {
	tag: string;
	count: number;
}

/** 规范化用户输入的标签：去掉首尾空白和前导 #，空白替换为 -，返回带 # 的形式；无效时返回 null */
export function normalizeTag(input: string): string | null {
	const body = input.trim().replace(/^#+/, "").replace(/\s+/g, "-");
	if (!body) return null;
	return `#${body}`;
}

/** 统计 Vault 中所有标签及出现的笔记数，按数量降序 */
export function collectVaultTags(app: App): TagCount[] {
	const counts = new Map<string, number>();
	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache) continue;
		const tags = new Set(getAllTags(cache) ?? []);
		for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Tasks 插件的字段 emoji（优先级、日期、重复、依赖等） */
const TASKS_FIELD_RE = /\s(?:🔺|⏫|🔼|🔽|⏬|📅|📆|🗓|⏳|⌛|🛫|➕|✅|❌|🔁|🆔|⛔|🏁)/u;

/** 把标签插入到任务描述之后、Tasks 字段之前；已存在的标签跳过 */
export function insertTagsIntoTaskLine(line: string, tags: string[]): string {
	const existing = new Set(line.match(/#[^\s#]+/g) ?? []);
	const toAdd = tags.filter((t) => !existing.has(t));
	if (toAdd.length === 0) return line;

	const tagText = toAdd.join(" ");
	const m = TASKS_FIELD_RE.exec(line);
	if (!m) return `${line} ${tagText}`;
	return `${line.slice(0, m.index)} ${tagText}${line.slice(m.index)}`;
}
