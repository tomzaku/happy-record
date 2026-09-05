import { fetchChecklistTemplateById } from './checklistTemplatesApi';
import type { ChecklistTemplate } from './checklistTemplateTypes';

// Shared by useChecklistTemplates.tsx, useChecklistTemplatesQuery.ts, and
// useChecklistTemplateDetail.tsx — all three fetch one template by id the same way.
export async function fetchOneTemplate(id: string): Promise<ChecklistTemplate | null> {
  const result = await fetchChecklistTemplateById(id);
  if (!result) throw new Error('Failed to fetch checklist template');
  return result.templates[0] ?? null;
}
