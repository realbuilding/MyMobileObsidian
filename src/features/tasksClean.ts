/* Tasks 查询结果样式
   - 统一行间距，背景色区分截止日期紧急程度
   - 日期字段 badge 化（圆角背景，颜色跟随紧急程度）
   - 来源链接降低存在感
   - 优先级改为复选框底色
   - group by 分组标题样式
*/

export const TASKS_CLEAN_ID = "mmo-tasks-clean";

export const TASKS_CLEAN_CSS = `
/* --- 基础行样式：统一间距 + 透明占位 border --- */
.plugin-tasks-query-result li {
	padding: 4px 6px 4px 8px;
	margin-bottom: 2px;
	border-radius: 4px;
	transition: background-color 0.15s ease;
	line-height: 1.55;
}

/* --- 所有日期字段：统一 badge 化（due / start / scheduled / done） --- */
.plugin-tasks-query-result .task-due,
.plugin-tasks-query-result .task-start,
.plugin-tasks-query-result .task-scheduled,
.plugin-tasks-query-result .task-done {
	display: inline-block;
	padding: 1px 7px;
	border-radius: 20px;
	font-size: 0.76em;
	font-variant-numeric: tabular-nums;
	background: rgba(120, 120, 120, 0.10);
	border: 1px solid rgba(120, 120, 120, 0.18);
	vertical-align: middle;
	line-height: 1.6;
}

/* --- Backlink（来源文件）：默认灰色低存在感，hover 行时恢复链接色（移动端无 hover，默认透明度已调高） --- */
.plugin-tasks-query-result .tasks-backlink {
	font-size: 0.72em;
	opacity: 0.7; /* 移动端无 hover，默认透明度比桌面版 (0.45) 高，便于阅读和点击 */
	margin-left: 4px;
	transition: opacity 0.15s ease;
}
.plugin-tasks-query-result .tasks-backlink a,
.plugin-tasks-query-result .tasks-backlink .internal-link {
	color: var(--text-muted);
	text-decoration: none;
}
.plugin-tasks-query-result li:hover .tasks-backlink {
	opacity: 0.9;
}
.plugin-tasks-query-result li:hover .tasks-backlink a,
.plugin-tasks-query-result li:hover .tasks-backlink .internal-link {
	color: var(--link-color, var(--text-accent));
}


/* === 截止日期紧急度高亮 ===
   Tasks 插件会在 .task-due 上注入 data-task-due 属性：
	 today	   — 今天截止
	 future-1d   — 明天截止
	 future-2d   — 后天截止
	 future-3d   — 3 天后截止
	 past-Nd	 — 已逾期 N 天（N = 1…7）
	 past-far	— 逾期超过 7 天
*/

/* --- 已完成的任务：清除底色 + 整体灰化降权 --- */
.plugin-tasks-query-result li:has(input[type="checkbox"]:checked) {
	background-color: transparent !important;
	opacity: 0.55;
	transition: opacity 0.15s ease;
}
.plugin-tasks-query-result li:has(input[type="checkbox"]:checked) .task-description {
	color: var(--text-muted);
}
.plugin-tasks-query-result li:has(input[type="checkbox"]:checked):hover {
	opacity: 0.9;
}
/* 已完成行内的日期 badge 统一回归灰色，不再保留紧急色 */
.plugin-tasks-query-result li:has(input[type="checkbox"]:checked) .task-due,
.plugin-tasks-query-result li:has(input[type="checkbox"]:checked) .task-done {
	color: var(--text-muted) !important;
	background: rgba(120, 120, 120, 0.10) !important;
	border-color: rgba(120, 120, 120, 0.18) !important;
	font-weight: 400 !important;
}

/* ① 已逾期 — 深红 */
.plugin-tasks-query-result li:has(.task-due[data-task-due^="past-"]) {
	background-color: rgba(239, 83, 80, 0.10);
}
.plugin-tasks-query-result li:has(.task-due[data-task-due^="past-"]) .task-due {
	color: #ef5350;
	background: rgba(239, 83, 80, 0.12);
	border-color: rgba(239, 83, 80, 0.35);
	font-weight: 600;
}

/* ② 今天截止 — 珊瑚橙红 */
.plugin-tasks-query-result li:has(.task-due[data-task-due="today"]) {
	background-color: rgba(255, 112, 67, 0.10);
}
.plugin-tasks-query-result li:has(.task-due[data-task-due="today"]) .task-due {
	color: #ff7043;
	background: rgba(255, 112, 67, 0.12);
	border-color: rgba(255, 112, 67, 0.35);
	font-weight: 600;
}

/* ③ 明天截止 — 橙色 */
.plugin-tasks-query-result li:has(.task-due[data-task-due="future-1d"]) {
	background-color: rgba(255, 152, 0, 0.08);
}
.plugin-tasks-query-result li:has(.task-due[data-task-due="future-1d"]) .task-due {
	color: #ff9800;
	background: rgba(255, 152, 0, 0.10);
	border-color: rgba(255, 152, 0, 0.30);
}

/* ④ 后天截止 — 琥珀黄 */
.plugin-tasks-query-result li:has(.task-due[data-task-due="future-2d"]) {
	background-color: rgba(255, 179, 0, 0.07);
}
.plugin-tasks-query-result li:has(.task-due[data-task-due="future-2d"]) .task-due {
	color: #ffb300;
	background: rgba(255, 179, 0, 0.09);
	border-color: rgba(255, 179, 0, 0.28);
}

/* ⑤ 3 天后截止 — 浅黄 */
.plugin-tasks-query-result li:has(.task-due[data-task-due="future-3d"]) {
	background-color: rgba(253, 216, 53, 0.06);
}
.plugin-tasks-query-result li:has(.task-due[data-task-due="future-3d"]) .task-due {
	color: #c8a800;
	background: rgba(253, 216, 53, 0.08);
	border-color: rgba(253, 216, 53, 0.25);
}

/* === 优先级 — 复选框背景色 ===
   隐藏默认优先级 emoji，改为给未完成任务的复选框内部染色。
   已完成任务用 :not(:checked) 自动排除，无需额外规则。
*/

/* 隐藏优先级 emoji */
.plugin-tasks-query-result .task-priority {
	display: none;
}

/* Highest — 深红 */
.plugin-tasks-query-result li:has(.task-priority[data-task-priority="highest"]) .task-list-item-checkbox:not(:checked) {
	background-color: rgba(198, 40, 40, 0.30);
}

/* High — 红 */
.plugin-tasks-query-result li:has(.task-priority[data-task-priority="high"]) .task-list-item-checkbox:not(:checked) {
	background-color: rgba(239, 83, 80, 0.22);
}

/* Medium — 橙 */
.plugin-tasks-query-result li:has(.task-priority[data-task-priority="medium"]) .task-list-item-checkbox:not(:checked) {
	background-color: rgba(255, 152, 0, 0.22);
}

/* Normal — 默认，不处理 */

/* Low — 蓝灰 */
.plugin-tasks-query-result li:has(.task-priority[data-task-priority="low"]) .task-list-item-checkbox:not(:checked) {
	background-color: rgba(120, 144, 156, 0.18);
}

/* Lowest — 浅灰 */
.plugin-tasks-query-result li:has(.task-priority[data-task-priority="lowest"]) .task-list-item-checkbox:not(:checked) {
	background-color: rgba(176, 190, 197, 0.14);
}

/* === group by tags 分组标题样式 ===
   Tasks 插件 group by 生成的标题使用 .tasks-group-heading 类。
*/
.plugin-tasks-query-result .tasks-group-heading {
	font-size: 0.82em;
	font-weight: 600;
	letter-spacing: 0.03em;
	color: var(--color-accent);
	border-left: 3px solid var(--color-accent);
	padding: 3px 0 3px 10px;
	margin: 14px 0 6px 0;
	opacity: 0.85;
	list-style: none;
}
`;
