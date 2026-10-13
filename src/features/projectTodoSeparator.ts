/* 项目分隔线
   给 frontmatter 含 cssclasses: <cssClass> 的笔记中的 h2 标题
   添加上边框作为项目分隔线，替代容易被折叠影响的 --- 分隔符
*/

const STYLE_ID = "mmo-project-todo-separator";

function buildCss(cssClass: string): string {
	const cls = `.${CSS.escape(cssClass)}`;
	return `
/* 阅读模式 */
${cls} .markdown-preview-view h2 {
	border-top: 1px solid var(--hr-color);
	padding-top: 1.2em;
	margin-top: 1.8em;
}

/* 第一个 h2 不加上边框（页面顶部不需要分隔线） */
${cls} .markdown-preview-view h2:first-of-type {
	border-top: none;
	padding-top: 0;
	margin-top: 0;
}

/* 实时预览模式 */
${cls} .cm-line.HyperMD-header-2 {
	border-top: 1px solid var(--hr-color);
	padding-top: 1em;
	margin-top: 1em;
}
`;
}

/** 按当前设置注入或移除样式；cssClass 为空时视为关闭 */
export function applyProjectTodoSeparator(enabled: boolean, cssClass: string): void {
	removeProjectTodoSeparator();
	const name = cssClass.trim();
	if (!enabled || !name) return;

	const el = document.createElement("style");
	el.id = STYLE_ID;
	el.textContent = buildCss(name);
	document.head.appendChild(el);
}

export function removeProjectTodoSeparator(): void {
	document.getElementById(STYLE_ID)?.remove();
}
