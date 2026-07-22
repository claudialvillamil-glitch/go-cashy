export const fmtMoney = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0));

export const fmtNumber = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const pad = (n: number, len = 5) => String(n).padStart(len, "0");
