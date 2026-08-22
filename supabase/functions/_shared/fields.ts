// Row mapping + validation for the `fields` resource (table: `fields`). See
// packages/global/src/store/record-field/useRecordField.tsx for the client
// shape (RecordField) this mirrors — only the table/resource dropped the
// "record" prefix, not the client-side type or hook.

export const FIELD_TYPES = ['metric', 'note'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export const isFieldType = (v: unknown): v is FieldType => (FIELD_TYPES as readonly string[]).includes(v as string);

export function toRecordField(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    icon: r.icon as string,
    description: (r.description as string) ?? '',
    type: r.type as string,
    unit: (r.unit as string) ?? '',
    visibility: (r.visibility as string) ?? 'private',
    updatedAt: r.updated_at as string,
  };
}

export function fromRecordField(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.title !== 'string' || !e.title) throw new Error('Missing title.');
  if (typeof e.icon !== 'string' || !e.icon) throw new Error('Missing icon.');
  if (!isFieldType(e.type)) throw new Error('Invalid type.');

  return {
    id: e.id,
    title: e.title,
    icon: e.icon,
    description: typeof e.description === 'string' ? e.description : '',
    type: e.type,
    unit: typeof e.unit === 'string' ? e.unit : '',
    visibility: e.visibility === 'public' ? 'public' : 'private',
    // Postgres only fills `updated_at`'s default on insert, not update —
    // an upsert has to set it explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
