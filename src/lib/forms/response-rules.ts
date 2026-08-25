import type { Prisma } from "@/generated/prisma/client";

type RuleLike = {
  conditionFieldId: string;
  operator: string;
  comparisonValue: Prisma.JsonValue | null;
  targetFieldId: string;
  action: string;
  priority: number;
};

type FieldState = {
  visible: boolean;
  required: boolean;
  enabled: boolean;
};

function compare(
  operator: string,
  actual: unknown,
  expected: unknown,
): boolean {
  switch (operator) {
    case "EQUALS":
      return actual === expected;

    case "NOT_EQUALS":
      return actual !== expected;

    case "CONTAINS":
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual ?? "").includes(
            String(expected ?? ""),
          );

    case "NOT_CONTAINS":
      return Array.isArray(actual)
        ? !actual.includes(expected)
        : !String(actual ?? "").includes(
            String(expected ?? ""),
          );

    case "GREATER_THAN":
      return Number(actual) > Number(expected);

    case "GREATER_THAN_OR_EQUAL":
      return Number(actual) >= Number(expected);

    case "LESS_THAN":
      return Number(actual) < Number(expected);

    case "LESS_THAN_OR_EQUAL":
      return Number(actual) <= Number(expected);

    case "IS_EMPTY":
      return (
        actual === null ||
        actual === undefined ||
        actual === ""
      );

    case "IS_NOT_EMPTY":
      return !(
        actual === null ||
        actual === undefined ||
        actual === ""
      );

    case "IN":
      return (
        Array.isArray(expected) &&
        expected.includes(actual)
      );

    case "NOT_IN":
      return (
        Array.isArray(expected) &&
        !expected.includes(actual)
      );

    default:
      return false;
  }
}

export function evaluateRules(
  fieldIds: string[],
  rules: RuleLike[],
  answersByFieldId: Record<string, unknown>,
) {
  const states = new Map<
    string,
    FieldState
  >();

  for (const fieldId of fieldIds) {
    states.set(fieldId, {
      visible: true,
      required: false,
      enabled: true,
    });
  }

  const sortedRules = [...rules].sort(
    (a, b) => a.priority - b.priority,
  );

  for (const rule of sortedRules) {
    const actual =
      answersByFieldId[
        rule.conditionFieldId
      ];

    const matched = compare(
      rule.operator,
      actual,
      rule.comparisonValue,
    );

    if (!matched) {
      continue;
    }

    const state =
      states.get(rule.targetFieldId);

    if (!state) {
      continue;
    }

    switch (rule.action) {
      case "SHOW":
        state.visible = true;
        break;

      case "HIDE":
        state.visible = false;
        break;

      case "REQUIRE":
        state.required = true;
        break;

      case "OPTIONAL":
        state.required = false;
        break;

      case "ENABLE":
        state.enabled = true;
        break;

      case "DISABLE":
        state.enabled = false;
        break;
    }
  }

  return states;
}
