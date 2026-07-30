// Cálculo de festivos en Colombia, incluyendo los que se trasladan al
// siguiente lunes por la Ley Emiliani, y los que dependen de la fecha de
// Pascua (Semana Santa, Ascensión, Corpus Christi, Sagrado Corazón).

function calcularPascua(anio: number): Date {
  // Algoritmo de Meeus/Jones/Butcher para calcular el Domingo de Pascua.
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

function sumarDias(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

// Si una fecha fija no cae en lunes, la Ley Emiliani la traslada al lunes
// siguiente.
function trasladarALunes(fecha: Date): Date {
  const diaSemana = fecha.getDay(); // 0=domingo, 1=lunes, ...
  if (diaSemana === 1) return fecha;
  const diasHastaLunes = diaSemana === 0 ? 1 : 8 - diaSemana;
  return sumarDias(fecha, diasHastaLunes);
}

const mismaFecha = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function festivosColombia(anio: number): Date[] {
  const pascua = calcularPascua(anio);
  const fijos = [
    new Date(anio, 0, 1), // Año nuevo
    new Date(anio, 4, 1), // Día del trabajo
    new Date(anio, 6, 20), // Independencia
    new Date(anio, 7, 7), // Batalla de Boyacá
    new Date(anio, 11, 8), // Inmaculada Concepción
    new Date(anio, 11, 25), // Navidad
  ];
  const trasladables = [
    new Date(anio, 0, 6), // Reyes Magos
    new Date(anio, 2, 19), // San José
    sumarDias(pascua, 43), // Ascensión del Señor
    sumarDias(pascua, 64), // Corpus Christi
    sumarDias(pascua, 71), // Sagrado Corazón
    new Date(anio, 5, 29), // San Pedro y San Pablo
    new Date(anio, 7, 15), // Asunción de la Virgen
    new Date(anio, 9, 12), // Día de la Raza
    new Date(anio, 10, 1), // Todos los Santos
    new Date(anio, 10, 11), // Independencia de Cartagena
  ].map(trasladarALunes);
  const semanaSanta = [
    sumarDias(pascua, -3), // Jueves Santo
    sumarDias(pascua, -2), // Viernes Santo
  ];
  return [...fijos, ...trasladables, ...semanaSanta];
}

export function esFestivoColombia(fecha: Date): boolean {
  return festivosColombia(fecha.getFullYear()).some((f) => mismaFecha(f, fecha));
}

export function esDiaHabilColombia(fecha: Date): boolean {
  return fecha.getDay() !== 0 && !esFestivoColombia(fecha);
}

// Último día hábil de un mes (retrocede desde el último día calendario
// mientras caiga domingo o festivo).
export function ultimoDiaHabilDelMes(anio: number, mesIndex: number): Date {
  let d = new Date(anio, mesIndex + 1, 0); // último día calendario del mes
  while (!esDiaHabilColombia(d)) {
    d = sumarDias(d, -1);
  }
  return d;
}
