import { db } from './server';
import { defaultOperations, operationsSchema } from './operations-model';
export async function getOperations() {
  const row = await db()
    .prepare("SELECT value,updated_at FROM settings WHERE key='operations'")
    .first<{ value: string; updated_at: number }>();
  if (!row) return { settings: defaultOperations, version: 0 };
  const parsed = operationsSchema.safeParse(JSON.parse(row.value));
  if (!parsed.success) throw Error('Invalid operations settings');
  return { settings: parsed.data, version: row.updated_at };
}
