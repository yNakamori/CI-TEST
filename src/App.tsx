import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  applyRules,
  createSampleTasks,
  initialRules,
  isStoredData,
  type Priority,
  type RuleAction,
  type RuleCondition,
  type Task,
  type TaskRule,
  type TaskStatus,
  validateTaskTitle,
} from "./taskRules";

type Page = "tasks" | "rules";
type StatusFilter = "all" | TaskStatus;
interface StoredData {
  tasks: Task[];
  rules: TaskRule[];
}

const storageKey = "flowtask-data-v1";
const statusLabels: Record<TaskStatus, string> = {
  todo: "未着手",
  inProgress: "進行中",
  done: "完了",
};
const priorityLabels: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};
const conditionLabels: Record<RuleCondition, string> = {
  overdue: "期限を超過したとき",
  dueToday: "今日が期限のとき",
};
const actionLabels: Record<RuleAction, string> = {
  highPriority: "優先度を「高」にする",
  startTask: "状態を「進行中」にする",
};

function getToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function loadData(): { data: StoredData; error: string } {
  const fallback = { tasks: createSampleTasks(), rules: initialRules };
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return { data: fallback, error: "" };
    const parsed: unknown = JSON.parse(stored);
    if (isStoredData(parsed)) return { data: parsed, error: "" };
    return {
      data: fallback,
      error: "保存データの形式が正しくないため、サンプルデータを表示しています。",
    };
  } catch {
    return {
      data: fallback,
      error: "保存データを読み込めません。ブラウザーの保存領域を確認してください。",
    };
  }
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  const paths: Record<string, ReactNode> = {
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
    rules: (
      <>
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M8 6h3a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    filter: (
      <>
        <path d="M4 7h16M7 12h10m-7 5h4" />
        <path d="M6 5v4m12-4v4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    close: (
      <>
        <path d="m18 6-12 12M6 6l12 12" />
      </>
    ),
    arrow: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    edit: (
      <>
        <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
      </>
    ),
    zap: (
      <>
        <path d="m13 2-3 9h7L9 22l2-9H4l9-11Z" />
      </>
    ),
    flag: (
      <>
        <path d="M5 21V5m0 0c5-4 9 4 14 0v11c-5 4-9-4-14 0" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    bolt: (
      <>
        <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />
      </>
    ),
    toggle: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="6" />
        <circle cx="16" cy="12" r="4" />
      </>
    ),
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };
  return <svg {...common}>{paths[name] ?? paths.list}</svg>;
}

function App() {
  const [stored, setStored] = useState(loadData);
  const [page, setPage] = useState<Page>("tasks");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>("task-1");
  const [modal, setModal] = useState<"task" | "rule" | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState(stored.error);
  const { tasks, rules } = stored.data;
  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;

  useEffect(() => {
    if (stored.error) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(stored.data));
      setStorageError("");
    } catch {
      setStorageError("ブラウザーに保存できませんでした。ストレージの空き容量を確認してください。");
    }
  }, [stored.data, stored.error]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return tasks.filter((task) => {
      const matchesFilter = filter === "all" || task.status === filter;
      const matchesPriority = !priorityOnly || task.priority === "high";
      const matchesSearch =
        !query ||
        task.title.toLocaleLowerCase().includes(query) ||
        task.description.toLocaleLowerCase().includes(query) ||
        task.tags.some((tag) => tag.toLocaleLowerCase().includes(query));
      return matchesFilter && matchesPriority && matchesSearch;
    });
  }, [filter, priorityOnly, search, tasks]);

  function updateTasks(transform: (current: Task[]) => Task[]) {
    setStored((current) => ({
      ...current,
      data: { ...current.data, tasks: transform(current.data.tasks) },
    }));
  }

  function saveTask(values: Omit<Task, "id" | "appliedRuleIds">, id?: string) {
    const task = applyRules(
      { ...values, id: id ?? crypto.randomUUID(), appliedRuleIds: [] },
      rules,
      getToday(),
    );
    updateTasks((current) =>
      id ? current.map((item) => (item.id === id ? task : item)) : [task, ...current],
    );
    setSelectedId(task.id);
    setModal(null);
    setEditingTask(null);
    setToast(id ? "タスクを更新しました" : "タスクを追加しました");
  }

  function completeTask(task: Task) {
    const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    const updated = { ...task, status: nextStatus };
    const normalized =
      nextStatus === "done"
        ? { ...updated, appliedRuleIds: [] }
        : applyRules(updated, rules, getToday());
    updateTasks((current) => current.map((item) => (item.id === task.id ? normalized : item)));
    setToast(nextStatus === "done" ? "タスクを完了にしました" : "タスクを未完了に戻しました");
  }

  function deleteTask(task: Task) {
    if (!window.confirm(`「${task.title}」を削除しますか？`)) return;
    updateTasks((current) => current.filter((item) => item.id !== task.id));
    setSelectedId(null);
    setToast("タスクを削除しました");
  }

  function toggleRule(rule: TaskRule) {
    const nextRules = rules.map((item) =>
      item.id === rule.id ? { ...item, enabled: !item.enabled } : item,
    );
    setStored((current) => ({ ...current, data: { ...current.data, rules: nextRules } }));
    setToast(rule.enabled ? "ルールを停止しました" : "ルールを有効にしました");
  }

  function addRule(condition: RuleCondition, action: RuleAction) {
    const newRule: TaskRule = {
      id: crypto.randomUUID(),
      condition,
      action,
      enabled: true,
      name: `${conditionLabels[condition].replace("とき", "")}：${actionLabels[action]}`,
    };
    setStored((current) => ({
      ...current,
      data: { ...current.data, rules: [...current.data.rules, newRule] },
    }));
    setModal(null);
    setToast("ルールを追加しました");
  }

  function removeRule(rule: TaskRule) {
    if (!window.confirm(`「${rule.name}」を削除しますか？`)) return;
    setStored((current) => ({
      ...current,
      data: {
        rules: current.data.rules.filter((item) => item.id !== rule.id),
        tasks: current.data.tasks.map((task) => ({
          ...task,
          appliedRuleIds: task.appliedRuleIds.filter((id) => id !== rule.id),
        })),
      },
    }));
    setToast("ルールを削除しました");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="check" size={20} />
          </span>
          <span>Flowtask</span>
        </div>
        <nav className="side-nav" aria-label="メインメニュー">
          <button
            className={`nav-item ${page === "tasks" ? "active" : ""}`}
            onClick={() => setPage("tasks")}
          >
            <Icon name="list" />
            <span>タスク</span>
            <span className="nav-count">{tasks.length}</span>
          </button>
          <button
            className={`nav-item ${page === "rules" ? "active" : ""}`}
            onClick={() => setPage("rules")}
          >
            <Icon name="rules" />
            <span>ルール</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="automation-card">
            <strong>
              <Icon name="zap" size={17} /> 自動化は稼働中
            </strong>
            <p>{rules.filter((rule) => rule.enabled).length}件のルールがタスクを整理しています</p>
          </div>
          <div className="profile">
            <span className="avatar">YK</span>
            <span className="profile-name">
              <strong>山田 健太</strong>
              <small>プロダクトチーム</small>
            </span>
            <button className="icon-button" aria-label="プロフィールメニュー">
              <Icon name="more" />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <h1>{page === "tasks" ? "タスク" : "ルール"}</h1>
            <p>
              {page === "tasks"
                ? "作業を整理して、チームの進捗を把握しましょう"
                : "タスクを自動で整理するルールを管理します"}
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => {
              setEditingTask(null);
              setModal(page === "tasks" ? "task" : "rule");
            }}
          >
            <Icon name="plus" size={17} />
            {page === "tasks" ? "タスクを追加" : "ルールを追加"}
          </button>
        </header>

        {storageError && (
          <div className="storage-warning" role="status">
            {storageError}
          </div>
        )}

        {page === "tasks" ? (
          <div className={`workspace ${selectedTask ? "has-detail" : ""}`}>
            <section className="task-area" aria-label="タスク一覧">
              <div className="toolbar">
                <label className="search-box">
                  <Icon name="search" size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="タスクを検索"
                    aria-label="タスクを検索"
                  />
                  {search && (
                    <button
                      className="clear-search"
                      onClick={() => setSearch("")}
                      aria-label="検索をクリア"
                    >
                      <Icon name="close" size={15} />
                    </button>
                  )}
                </label>
                <div className="filter-tabs" role="group" aria-label="状態で絞り込む">
                  {(["all", "todo", "inProgress", "done"] as StatusFilter[]).map((value) => (
                    <button
                      key={value}
                      className={filter === value ? "selected" : ""}
                      onClick={() => setFilter(value)}
                    >
                      {value === "all" ? "すべて" : statusLabels[value]}
                    </button>
                  ))}
                </div>
                <button
                  className={`button filter-button ${priorityOnly ? "filter-active" : ""}`}
                  aria-pressed={priorityOnly}
                  onClick={() => setPriorityOnly((value) => !value)}
                >
                  <Icon name="filter" size={16} />
                  {priorityOnly ? "高優先度" : "絞り込み"}
                </button>
              </div>
              <div className="column-head">
                <span>タスク名</span>
                <span>ステータス</span>
                <span>優先度</span>
                <span>期限</span>
                <span />
              </div>
              <div className="task-list">
                {filteredTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={selectedId === task.id}
                    onSelect={() => setSelectedId(task.id)}
                  />
                ))}
                {filteredTasks.length === 0 && (
                  <div className="empty-state">
                    <span>
                      <Icon name="search" size={22} />
                    </span>
                    <strong>タスクが見つかりません</strong>
                    <p>検索条件やフィルターを変更してください。</p>
                  </div>
                )}
              </div>
              <p className="task-count">{filteredTasks.length}件のタスクを表示</p>
            </section>
            {selectedTask && (
              <TaskDetails
                task={selectedTask}
                rules={rules}
                onClose={() => setSelectedId(null)}
                onComplete={() => completeTask(selectedTask)}
                onEdit={() => {
                  setEditingTask(selectedTask);
                  setModal("task");
                }}
                onDelete={() => deleteTask(selectedTask)}
              />
            )}
          </div>
        ) : (
          <section className="rules-area">
            <div className="rules-intro">
              <span className="intro-icon">
                <Icon name="zap" size={20} />
              </span>
              <div>
                <h2>自動化ルール</h2>
                <p>条件に一致したタスクに、設定した動作を自動で適用します。</p>
              </div>
            </div>
            <div className="rule-list">
              {rules.map((rule) => (
                <article className={`rule-card ${rule.enabled ? "" : "disabled"}`} key={rule.id}>
                  <span className="rule-icon">
                    <Icon name="bolt" size={19} />
                  </span>
                  <div className="rule-copy">
                    <h3>{rule.name}</h3>
                    <p>
                      <span>条件</span>
                      {conditionLabels[rule.condition]} <span className="rule-arrow">→</span>{" "}
                      <span>動作</span>
                      {actionLabels[rule.action]}
                    </p>
                  </div>
                  <button
                    className={`switch ${rule.enabled ? "on" : ""}`}
                    role="switch"
                    aria-checked={rule.enabled}
                    aria-label={`${rule.name}を${rule.enabled ? "停止" : "有効化"}`}
                    onClick={() => toggleRule(rule)}
                  >
                    <span />
                  </button>
                  <button
                    className="icon-button delete-rule"
                    aria-label={`${rule.name}を削除`}
                    onClick={() => removeRule(rule)}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </article>
              ))}
              {rules.length === 0 && (
                <div className="empty-state">
                  <strong>ルールはまだありません</strong>
                  <p>ルールを追加してタスク整理を自動化しましょう。</p>
                </div>
              )}
            </div>
            <div className="rule-tip">
              <Icon name="checkCircle" size={18} />
              <span>有効なルールは、タスクの追加・編集時に自動で適用されます。</span>
            </div>
          </section>
        )}
      </main>

      {modal === "task" && (
        <TaskModal task={editingTask} onClose={() => setModal(null)} onSave={saveTask} />
      )}
      {modal === "rule" && <RuleModal onClose={() => setModal(null)} onSave={addRule} />}
      {toast && (
        <div className="toast" role="status">
          <Icon name="checkCircle" size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  selected,
  onSelect,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
}) {
  const isOverdue = task.dueDate && task.dueDate < getToday() && task.status !== "done";
  return (
    <button className={`task-row ${selected ? "selected" : ""}`} onClick={onSelect}>
      <span className="task-name-cell">
        <strong>{task.title}</strong>
        <span className="task-meta">
          {task.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
          {task.appliedRuleIds.length > 0 && (
            <span className="automated">
              <Icon name="zap" size={12} />
              自動化済み
            </span>
          )}
        </span>
      </span>
      <span>
        <span className={`status-pill status-${task.status}`}>{statusLabels[task.status]}</span>
      </span>
      <span className={`priority priority-${task.priority}`}>
        <Icon name="flag" size={14} />
        {priorityLabels[task.priority]}
      </span>
      <span className={`due-date ${isOverdue ? "overdue" : ""}`}>
        <Icon name="calendar" size={14} />
        {task.dueDate ? formatDate(task.dueDate) : "—"}
      </span>
      <span className="row-chevron">
        <Icon name="arrow" size={16} />
      </span>
    </button>
  );
}

function TaskDetails({
  task,
  rules,
  onClose,
  onComplete,
  onEdit,
  onDelete,
}: {
  task: Task;
  rules: TaskRule[];
  onClose: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const appliedRules = rules.filter((rule) => task.appliedRuleIds.includes(rule.id));
  return (
    <aside className="detail-panel" aria-label="タスク詳細">
      <div className="detail-header">
        <span>タスク詳細</span>
        <button className="icon-button" onClick={onClose} aria-label="詳細を閉じる">
          <Icon name="close" />
        </button>
      </div>
      <div className="detail-content">
        <div className="detail-title">
          <button
            className={`complete-button ${task.status === "done" ? "completed" : ""}`}
            onClick={onComplete}
            aria-label={task.status === "done" ? "未完了に戻す" : "タスクを完了"}
          >
            <Icon name="check" size={15} />
          </button>
          <h2>{task.title}</h2>
        </div>
        <p className="detail-description">{task.description || "説明はありません。"}</p>
        <div className="detail-properties">
          <Property label="ステータス">
            <span className={`status-pill status-${task.status}`}>{statusLabels[task.status]}</span>
          </Property>
          <Property label="優先度">
            <span className={`priority priority-${task.priority}`}>
              <Icon name="flag" size={14} />
              {priorityLabels[task.priority]}
            </span>
          </Property>
          <Property label="期限">
            <span className="property-value">
              <Icon name="calendar" size={15} />
              {task.dueDate ? formatDate(task.dueDate) : "未設定"}
            </span>
          </Property>
          <Property label="タグ">
            <span className="tag-list">
              {task.tags.length ? task.tags.map((tag) => <span key={tag}>#{tag}</span>) : "なし"}
            </span>
          </Property>
        </div>
        <section className="applied-section">
          <h3>
            <Icon name="zap" size={16} />
            適用されたルール
          </h3>
          {appliedRules.length ? (
            appliedRules.map((rule) => (
              <div className="applied-rule" key={rule.id}>
                <span>
                  <Icon name="check" size={13} />
                </span>
                {rule.name}
              </div>
            ))
          ) : (
            <p className="no-rule">適用されたルールはありません</p>
          )}
        </section>
        <div className="detail-actions">
          <button className="button edit-button" onClick={onEdit}>
            <Icon name="edit" size={15} />
            編集
          </button>
          <button className="button delete-button" onClick={onDelete} aria-label="タスクを削除">
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="property-row">
      <span className="property-label">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function TaskModal({
  task,
  onClose,
  onSave,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (values: Omit<Task, "id" | "appliedRuleIds">, id?: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const titleError = validateTaskTitle(title);
    if (titleError) {
      setError(titleError);
      return;
    }
    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        dueDate,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
      task?.id,
    );
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="modal-card" onSubmit={submit} aria-labelledby="task-modal-title">
        <div className="modal-heading">
          <div>
            <h2 id="task-modal-title">{task ? "タスクを編集" : "タスクを追加"}</h2>
            <p>必要な情報を入力してください。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="閉じる">
            <Icon name="close" />
          </button>
        </div>
        <label className="field-label">
          タスク名 <span className="required">必須</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError("");
            }}
            placeholder="例：週次レポートを作成"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <label className="field-label">
          説明
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="タスクの内容を入力"
          />
        </label>
        <div className="form-grid">
          <label className="field-label">
            ステータス
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              <option value="todo">未着手</option>
              <option value="inProgress">進行中</option>
              <option value="done">完了</option>
            </select>
          </label>
          <label className="field-label">
            優先度
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label className="field-label">
            期限
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <label className="field-label">
            タグ <small>カンマ区切り</small>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="例：デザイン, 社内"
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="button cancel-button" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="button primary">
            {task ? "変更を保存" : "タスクを追加"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RuleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (condition: RuleCondition, action: RuleAction) => void;
}) {
  const [condition, setCondition] = useState<RuleCondition>("overdue");
  const [action, setAction] = useState<RuleAction>("highPriority");
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="modal-card rule-modal"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(condition, action);
        }}
      >
        <div className="modal-heading">
          <div>
            <h2>ルールを追加</h2>
            <p>条件と、タスクに適用する動作を選びます。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="閉じる">
            <Icon name="close" />
          </button>
        </div>
        <label className="field-label">
          条件
          <select
            value={condition}
            onChange={(event) => setCondition(event.target.value as RuleCondition)}
          >
            <option value="overdue">期限を超過したとき</option>
            <option value="dueToday">今日が期限のとき</option>
          </select>
        </label>
        <label className="field-label">
          動作
          <select value={action} onChange={(event) => setAction(event.target.value as RuleAction)}>
            <option value="highPriority">優先度を「高」にする</option>
            <option value="startTask">状態を「進行中」にする</option>
          </select>
        </label>
        <div className="rule-preview">
          <Icon name="zap" size={16} />
          {conditionLabels[condition]} <span>→</span> {actionLabels[action]}
        </div>
        <div className="modal-actions">
          <button type="button" className="button cancel-button" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="button primary">
            ルールを追加
          </button>
        </div>
      </form>
    </div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(year, month - 1, day));
}

export default App;
