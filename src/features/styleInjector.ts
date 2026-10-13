/** 按 id 注入或替换一段全局样式；css 为 null 时移除 */
export function setStyle(id: string, css: string | null): void {
	document.getElementById(id)?.remove();
	if (css === null) return;

	const el = document.createElement("style");
	el.id = id;
	el.textContent = css;
	document.head.appendChild(el);
}
