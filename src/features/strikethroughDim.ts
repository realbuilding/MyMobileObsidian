/* 调淡删除线文字颜色 */

export const STRIKETHROUGH_DIM_ID = "mmo-strikethrough-dim";

export const STRIKETHROUGH_DIM_CSS = `
/* 阅读模式 */
.markdown-rendered del,
.markdown-preview-view del {
	color: var(--color-base-40);
	text-decoration-color: var(--color-base-40);
}

/* 实时预览 / 编辑模式 */
.cm-s-obsidian .cm-strikethrough {
	color: var(--color-base-40);
	text-decoration-color: var(--color-base-40);
}
`;
