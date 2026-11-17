import { describe, expect, it } from "vitest";
import { applyRules, initialRules, validateTaskTitle, type Task, type TaskRule } from "./taskRules";

const task: Task = {
  id: "test-task",
  title: "テストタスク",
  description: "",
  status: "todo",
  priority: "low",
  dueDate: "2026-11-01",
  tags: [],
  appliedRuleIds: [],
};

describe("applyRules", () => {
  it("期限切れの未完了タスクの優先度を高にする", () => {
    const result = applyRules(task, initialRules, "2026-11-02");
    expect(result.priority).toBe("high");
    expect(result.appliedRuleIds).toEqual(["rule-overdue"]);
  });

  it("今日が期限ならタスクを進行中にする", () => {
    const result = applyRules(task, initialRules, "2026-11-01");
    expect(result.status).toBe("inProgress");
    expect(result.appliedRuleIds).toEqual(["rule-due-today"]);
  });

  it("完了済みタスクにはルールを適用しない", () => {
    const result = applyRules({ ...task, status: "done" }, initialRules, "2026-11-02");
    expect(result.priority).toBe("low");
    expect(result.appliedRuleIds).toEqual([]);
  });

  it("無効なルールは適用しない", () => {
    const disabledRules: TaskRule[] = initialRules.map((rule) => ({
      ...rule,
      enabled: false,
    }));
    const result = applyRules(task, disabledRules, "2026-11-02");
    expect(result.priority).toBe("low");
    expect(result.appliedRuleIds).toEqual([]);
  });
});

describe("validateTaskTitle", () => {
  it("空白だけのタイトルを拒否する", () => {
    expect(validateTaskTitle("   ")).toBe("タスク名を入力してください。");
  });

  it("有効なタイトルを受け付ける", () => {
    expect(validateTaskTitle(" レポート ")).toBeNull();
  });
});
