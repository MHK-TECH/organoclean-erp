/**
 * Decimal-safe money & quantity helpers. Money = integer minor units.
 * Quantities = strings parsed via plain number arithmetic for display only;
 * ledger math happens in SQL with explicit rounding at write time.
 */

export function toMinor(amount: number, digits = 2): number {
  return Math.round(amount * 10 ** digits);
}

export function fromMinor(minor: number, digits = 2): number {
  return minor / 10 ** digits;
}

export function formatMoney(minor: number, currency = "PKR", digits = 2): string {
  return `${currency} ${fromMinor(minor, digits).toFixed(digits)}`;
}

/** Parses a decimal string safely; returns null when invalid or negative. */
export function parseQty(raw: FormDataEntryValue | string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 1e12) return null;
  return String(Number(n.toFixed(6)));
}

export function parseQtyPositive(raw: FormDataEntryValue | string | null | undefined): string | null {
  const q = parseQty(raw);
  if (q === null || Number(q) <= 0) return null;
  return q;
}

export function parseMinor(raw: FormDataEntryValue | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/[,\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > Number.MAX_SAFE_INTEGER) return null;
  return Math.round(n);
}

export function parseInt(raw: FormDataEntryValue | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

export function requireFrom<T extends string>(
  fd: FormData,
  key: string,
  allowed?: readonly T[],
): T {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  if (s === "") throw new Error(`FormError: missing required field "${key}"`);
  if (allowed && !allowed.includes(s as T)) throw new Error(`FormError: invalid value for "${key}"`);
  return s as T;
}

export function optionalStr(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}
