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

const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const DECENAS = [
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve",
];
const DECENAS_10 = [
  "", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa",
];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

function gruposDeTres(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = c > 0 ? CENTENAS[c] : "";
  if (resto > 0) {
    texto += (texto ? " " : "");
    if (resto < 10) texto += UNIDADES[resto];
    else if (resto < 20) texto += DECENAS[resto - 10];
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      texto += DECENAS_10[d] + (u > 0 ? ` y ${UNIDADES[u]}` : "");
    }
  }
  return texto;
}

/** Convierte un valor entero en pesos a su representación en letras (es-CO). */
export function numeroALetras(valor: number): string {
  const n = Math.round(Math.abs(valor));
  if (n === 0) return "CERO PESOS M/CTE";

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const cientos = n % 1000;

  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? "un millón" : `${gruposDeTres(millones)} millones`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? "mil" : `${gruposDeTres(miles)} mil`);
  }
  if (cientos > 0) {
    partes.push(gruposDeTres(cientos));
  }

  const texto = partes.join(" ").trim() || "cero";
  return `${texto.toUpperCase()} PESOS M/CTE`;
}
