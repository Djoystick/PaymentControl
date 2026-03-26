import type { SelectedScenario, WorkspaceKind } from "@/lib/auth/types";

export const resolveScenarioForWorkspaceKind = (
  workspaceKind: WorkspaceKind,
): SelectedScenario => {
  return workspaceKind === "family" ? "family" : "single";
};
