// Cuantía mínima general (en UVT) para servicios, transporte de carga, etc.
// Se usa tanto para la retención en la fuente como para el ReteIVA, ya que
// éste último sigue la misma base de aplicación.
export const CUANTIA_MINIMA_UVT_SERVICIOS = 4;

// minimoUvt: cuantía mínima en UVT a partir de la cual aplica la retención,
// según las tablas de la DIAN. 4 UVT es la cuantía mínima general para
// servicios (incluye hoteles/restaurantes y transporte de carga). Si tu
// empresa maneja un valor distinto para algún concepto, ajústalo aquí.
export const RENTA_TIPOS = [
  { value: "hotel", label: "Serv. hotel y restaurante", pct: 3.5, minimoUvt: 4 },
  { value: "servicios_declarante", label: "Servicios generales (declarante)", pct: 4, minimoUvt: 4 },
  { value: "servicios_no_declarante", label: "Servicios generales (no declarante)", pct: 6, minimoUvt: 4 },
  { value: "fletes", label: "Fletes", pct: 1, minimoUvt: 4 },
];

export const RETEICA_CONCEPTOS = [
  { value: "servicios", label: "Servicios" },
  { value: "compras", label: "Compras" },
];

export const REGIMENES_TRIBUTARIOS = [
  { value: "no_responsable_iva", label: "No responsable de IVA" },
  { value: "responsable_iva", label: "Responsable de IVA" },
  { value: "gran_contribuyente", label: "Gran contribuyente" },
];

// Clasificación del tipo de declarante de renta — dimensión independiente
// de la responsabilidad de IVA.
export const TIPOS_DECLARANTE_RENTA = [
  { value: "contribuyente", label: "Contribuyente" },
  { value: "no_contribuyente", label: "No contribuyente" },
  { value: "regimen_simple", label: "Régimen simple" },
  { value: "regimen_especial", label: "Régimen especial" },
];

// Ya no se pregunta aparte si es "Responsable de IVA" — se deriva
// directamente de la categoría elegida arriba.
export function responsableIvaSegunRegimen(regimen: string): boolean {
  return regimen === "responsable_iva" || regimen === "gran_contribuyente";
}

export const TIPOS_IDENTIFICACION = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
];


