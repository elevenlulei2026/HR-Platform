/** 雪花 ID 须保持字符串传输，禁止 Number() 以免超过 MAX_SAFE_INTEGER 后精度丢失 */
export function normalizeNumericId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined;
  return trimmed;
}
