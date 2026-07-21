import { isPrivateTask } from "./work";

// Updates are a shared, company-wide feed. Private tasks must never reach it.
// Belt and braces: we refuse to create an update for a private task, and we
// also filter on read, so anything posted before this rule existed disappears
// and a task flipped to private after the fact takes its updates with it.
export function isPrivateUpdate(u, tasks) {
  if (!u) return false;
  if (u.private) return true; // stamped at creation
  const t = (tasks || []).find((x) => x.id === u.taskId);
  return isPrivateTask(t);
}

export function publicUpdates(updates, tasks) {
  return (updates || []).filter((u) => !isPrivateUpdate(u, tasks));
}
