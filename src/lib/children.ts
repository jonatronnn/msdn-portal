type ChecklistTask = { title: string; sort_order: number; completed_at: string | null };

// How far through the starter checklist a child is, and the step to do next:
// the first unticked step in checklist order.
export function checklistProgress<T extends ChecklistTask>(tasks: T[]) {
  const ordered = [...tasks].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  return {
    done: ordered.filter((t) => t.completed_at).length,
    total: ordered.length,
    next: ordered.find((t) => !t.completed_at) ?? null,
  };
}
