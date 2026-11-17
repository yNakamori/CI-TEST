export type TaskStatus = "todo" | "inProgress" | "done";
export type Priority = "low" | "medium" | "high";
export type RuleCondition = "overdue" | "dueToday";
export type RuleAction = "highPriority" | "startTask";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  tags: string[];
  appliedRuleIds: string[];
}

export interface TaskRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  enabled: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTask(value: unknown): value is Task {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    (value.status === "todo" || value.status === "inProgress" || value.status === "done") &&
    (value.priority === "low" || value.priority === "medium" || value.priority === "high") &&
    typeof value.dueDate === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    Array.isArray(value.appliedRuleIds) &&
    value.appliedRuleIds.every((id) => typeof id === "string")
  );
}

function isTaskRule(value: unknown): value is TaskRule {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.condition === "overdue" || value.condition === "dueToday") &&
    (value.action === "highPriority" || value.action === "startTask") &&
    typeof value.enabled === "boolean"
  );
}

export function isStoredData(value: unknown): value is { tasks: Task[]; rules: TaskRule[] } {
  return (
    isRecord(value) &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isTask) &&
    Array.isArray(value.rules) &&
    value.rules.every(isTaskRule)
  );
}

export function validateTaskTitle(title: string): string | null {
  return title.trim() ? null : "タスク名を入力してください。";
}

export const initialRules: TaskRule[] = [
  {
    id: "rule-overdue",
    name: "期限超過タスクを優先",
    condition: "overdue",
    action: "highPriority",
    enabled: true,
  },
  {
    id: "rule-due-today",
    name: "今日が期限のタスクを進行中に",
    condition: "dueToday",
    action: "startTask",
    enabled: true,
  },
];

function localDate(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function applyRules(task: Task, rules: TaskRule[], today = localDate()): Task {
  if (task.status === "done") {
    return { ...task, appliedRuleIds: [] };
  }

  const applicableRules = rules.filter((rule) => {
    if (!rule.enabled || !task.dueDate) return false;
    if (rule.condition === "overdue") return task.dueDate < today;
    return task.dueDate === today;
  });

  const result = { ...task, appliedRuleIds: applicableRules.map((rule) => rule.id) };
  for (const rule of applicableRules) {
    if (rule.action === "highPriority") result.priority = "high";
    if (rule.action === "startTask") result.status = "inProgress";
  }
  return result;
}

export function createSampleTasks(today = localDate()): Task[] {
  const shiftDate = (offset: number) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const samples: Task[] = [
    {
      id: "task-1",
      title: "プロダクト要件の最終レビュー",
      description:
        "関係者からのフィードバックを反映し、次回リリースに向けた要件を確定する。レビュー後に開発チームへ共有。",
      status: "inProgress",
      priority: "medium",
      dueDate: shiftDate(-1),
      tags: ["プロダクト", "レビュー"],
      appliedRuleIds: [],
    },
    {
      id: "task-2",
      title: "ユーザーインタビューの準備",
      description: "参加者への案内とインタビュー項目を確認する。",
      status: "todo",
      priority: "medium",
      dueDate: shiftDate(2),
      tags: ["リサーチ"],
      appliedRuleIds: [],
    },
    {
      id: "task-3",
      title: "デザインシステムを更新",
      description: "新しいコンポーネントの色と余白をデザインシステムに反映する。",
      status: "inProgress",
      priority: "medium",
      dueDate: shiftDate(5),
      tags: ["デザイン"],
      appliedRuleIds: [],
    },
    {
      id: "task-4",
      title: "週次レポートを作成",
      description: "今週の進捗と来週の予定をまとめる。",
      status: "done",
      priority: "low",
      dueDate: shiftDate(-3),
      tags: ["社内"],
      appliedRuleIds: [],
    },
    {
      id: "task-5",
      title: "リリースノートの下書き",
      description: "今回のリリースに含まれる変更点を整理する。",
      status: "todo",
      priority: "high",
      dueDate: shiftDate(8),
      tags: ["リリース"],
      appliedRuleIds: [],
    },
  ];
  return samples.map((task) => applyRules(task, initialRules, today));
}
