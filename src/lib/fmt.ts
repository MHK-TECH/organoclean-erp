export function money(minor: number | null | undefined, currency = "PKR"): string {
  const n = (minor ?? 0) / 100;
  return `${currency} ${n.toFixed(2)}`;
}

export function moneyDigits(minor: number | null | undefined, currency: string, digits: number): string {
  const n = (minor ?? 0) / 10 ** digits;
  return `${currency} ${n.toFixed(digits)}`;
}

export function qtyFmt(q: string | number | null | undefined, unit?: string | null): string {
  const n = Number(q ?? 0);
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return unit ? `${s} ${unit}` : s;
}

export function dt(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : "—";
}

export function shortNo(no: string): string {
  return no;
}
