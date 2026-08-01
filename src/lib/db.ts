import { supabase } from "@/integrations/supabase/client";
import { pad } from "./format";

export type Proveedor = {
  id: string;
  activo: boolean;
  estado_validacion: string;
  nombre: string;
  nit: string;
  tipo_proveedor: string;
  tipo_identificacion: string;
  digito_verificacion: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  codigo_ciiu: string | null;
  pais: string;
  departamento: string | null;
  ciudad: string | null;
  aplica_retencion: boolean;
  tipo_retencion_renta: string | null;
  tarifa_retencion_id: string | null;
  es_declarante_renta: boolean;
  tipo_declarante_renta: string;
  autorretenedor_renta: boolean;
  autorretenedor_ica: boolean;
  es_gran_contribuyente: boolean;
  es_facturador_electronico: boolean;
  aplica_reteica: boolean;
  concepto_reteica: string;
  concepto_reteica_id: string | null;
  tarifa_reteica: number;
  aplica_reteiva: boolean;
  responsable_iva: boolean;
  regimen_tributario: string;
  pertenece_regimen_simple: boolean;
  tipo_impuesto: string;
};

export type Concepto = {
  id: string;
  nombre: string;
  cuenta_gasto: string;
  cuenta_iva: string | null;
  cuenta_impoconsumo: string | null;
  cuenta_retencion: string | null;
  concepto_retencion_renta_id: string | null;
  cuenta_reteica: string | null;
  concepto_reteica_id: string | null;
  cuenta_reteiva: string | null;
  cuenta_contrapartida: string;
  porcentaje_retencion: number | null;
  porcentaje_iva: number;
  porcentaje_impoconsumo: number;
  porcentaje_reteica: number;
  porcentaje_reteiva: number;
  orden: number | null;
  activo: boolean;
};

export type Agencia = { id: string; nombre: string; codigo: number | null; monto_asignado: number; prefijo: string | null };

export type TarifaRetencionRenta = {
  id: string;
  nombre: string;
  porcentaje: number;
  minimo_uvt: number;
  cuenta: string | null;
  activo: boolean;
};

// Nuevo sistema de retención en la fuente: por concepto (Compras, Servicios),
// con una tarifa para declarante de renta y otra para no declarante — el
// proveedor solo marca si es declarante o no, y la tarifa se calcula sola.
export type ConceptoRetencionRenta = {
  id: string;
  nombre: string;
  tarifa_declarante: number;
  tarifa_no_declarante: number;
  minimo_uvt: number;
  cuenta: string | null;
  activo: boolean;
};

export async function getConceptosRetencionRenta() {
  const { data, error } = await supabase
    .from("conceptos_retencion_renta")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return data as ConceptoRetencionRenta[];
}

export type BaseReteicaAgencia = {
  id: string;
  agencia_id: string;
  concepto_reteica_id: string;
  base: number;
  base_uvt: number;
};

export async function getBasesReteicaAgencia() {
  const { data, error } = await supabase.from("bases_reteica_agencia").select("*");
  if (error) throw error;
  return data as BaseReteicaAgencia[];
}

export type CodigoCiiu = {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
};

export async function getCodigosCiiu() {
  const { data, error } = await supabase.from("codigos_ciiu").select("*").order("codigo");
  if (error) throw error;
  return data as CodigoCiiu[];
}

export type ConceptoReteicaDB = {
  id: string;
  nombre: string;
  cuenta: string | null;
  activo: boolean;
};

export type TarifaReteicaCiudad = {
  id: string;
  agencia_id: string;
  codigo_ciiu: string | null;
  concepto_reteica_id: string | null;
  tarifa: number;
  tope: number;
  cuenta: string | null;
  activo: boolean;
};

export async function getTarifasReteicaCiudad() {
  const { data, error } = await supabase
    .from("tarifas_reteica_ciudad")
    .select("*, agencias(*)")
    .order("created_at");
  if (error) throw error;
  return data as unknown as (TarifaReteicaCiudad & { agencias?: Agencia })[];
}

export async function getTarifasRetencionRenta() {
  const { data, error } = await supabase
    .from("tarifas_retencion_renta")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return data as TarifaRetencionRenta[];
}

export async function getConceptosReteica() {
  const { data, error } = await supabase.from("conceptos_reteica").select("*").order("nombre");
  if (error) throw error;
  return data as ConceptoReteicaDB[];
}

export type Movimiento = {
  id: string;
  consecutivo: number;
  fecha: string;
  agencia_id: string | null;
  fondo_agencia_id: string | null;
  numero_fondo: number | null;
  proveedor_id: string;
  concepto_id: string;
  detalle: string | null;
  subtotal: number;
  iva: number;
  impoconsumo: number;
  retencion: number;
  tipo_retencion_renta: string | null;
  tarifa_retencion_id: string | null;
  concepto_retencion_renta_id: string | null;
  reteica: number;
  concepto_reteica_usado: string | null;
  concepto_reteica_id: string | null;
  tarifa_reteica_ciudad_id: string | null;
  reteiva: number;
  total: number;
  numero_factura: string | null;
  factura_url: string | null;
  factura_path: string | null;
  estado: string;
  prioridad: string;
  observaciones: string | null;
  created_at: string;
  reembolso_id: string | null;
  factura_electronica: boolean;
  doc_soporte_generado: boolean;
  multi_soporte: boolean;
  proveedores?: Proveedor;
  conceptos?: Concepto;
  agencias?: Agencia | null;
  fondos_agencia?: FondoAgencia | null;
  movimiento_items?: MovimientoItem[];
  reembolsos?: { id: string; estado: string } | null;
};

// Número de recibo que se muestra al usuario: si el movimiento tiene un
// fondo específico con prefijo configurado, usa "PREFIJO-0001" (consecutivo
// propio de ese fondo); si no, usa el prefijo de la agencia; si tampoco hay
// prefijo configurado, se ve el consecutivo interno de siempre (5 dígitos).
export function folioRecibo(mov: Movimiento): string {
  const prefijo = mov.fondos_agencia?.prefijo || mov.agencias?.prefijo;
  if (prefijo && mov.numero_fondo != null) {
    return `${prefijo}-${pad(mov.numero_fondo, 4)}`;
  }
  return pad(mov.consecutivo);
}

export type MovimientoItem = {
  id: string;
  movimiento_id: string;
  proveedor_id: string;
  concepto_id: string;
  numero_factura: string | null;
  factura_electronica: boolean;
  detalle: string | null;
  subtotal: number;
  iva: number;
  impoconsumo: number;
  retencion: number;
  concepto_retencion_renta_id: string | null;
  reteica: number;
  reteiva: number;
  total: number;
  orden: number;
  proveedores?: Proveedor;
  conceptos?: Concepto;
};

export type ReciboProvisional = {
  tercero: string;
  concepto: string;
  monto: number;
};

export type ArqueoCaja = {
  cantidades: Record<number, number>;
  provisionales: ReciboProvisional[];
  esCierreMes: boolean;
  totalContado: number;
  saldoTeorico: number;
  diferencia: number;
};

export type Reembolso = {
  id: string;
  consecutivo: number;
  fecha: string;
  periodo_inicio: string;
  periodo_fin: string;
  total: number;
  estado: string;
  observaciones: string | null;
  created_at: string;
  arqueo: ArqueoCaja | null;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  aprobado_por_perfil?: { nombre: string; email: string } | null;
  monto_fondo_momento: number | null;
  total_gastos_momento: number | null;
  agencia_id: string | null;
  fondo_agencia_id: string | null;
};

export type FondoConfig = {
  id: string;
  empresa: string;
  nit_empresa: string;
  responsable: string;
  identificacion_responsable: string;
  monto_asignado: number;
  monto_maximo_gasto: number;
  cuenta_banco: string;
  limite_alerta_reembolso_pct: number;
  nombre_aprobador: string;
  codigo_recibo: string;
  version_recibo: string;
  vigencia_recibo: string;
  valor_uvt: number;
  cuenta_retencion_hotel: string;
  cuenta_retencion_servicios_declarante: string;
  cuenta_retencion_servicios_no_declarante: string;
  cuenta_retencion_fletes: string;
  cuenta_reteica_servicios: string;
  cuenta_reteica_compras: string;
};

export async function getFondo(): Promise<FondoConfig> {
  const { data, error } = await supabase.from("fondo_config").select("*").limit(1).single();
  if (error) throw error;
  return data as FondoConfig;
}

export async function getMovimientos() {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*, proveedores(*), conceptos(*), agencias(*), movimiento_items(*, proveedores(*), conceptos(*)), reembolsos(id, estado), fondos_agencia(*)")
    .order("fecha", { ascending: false })
    .order("consecutivo", { ascending: false });
  if (error) throw error;
  return data as unknown as Movimiento[];
}

export async function getProveedores() {
  const { data, error } = await supabase.from("proveedores").select("*").order("nombre");
  if (error) throw error;
  return data as Proveedor[];
}

export async function getConceptos() {
  const { data, error } = await supabase.from("conceptos").select("*").order("nombre");
  if (error) throw error;
  return data as Concepto[];
}

export async function getAgencias() {
  const { data, error } = await supabase.from("agencias").select("*").order("codigo");
  if (error) throw error;
  return data as Agencia[];
}

export type FondoAgencia = {
  id: string;
  agencia_id: string;
  cuenta_contable: string | null;
  nombre: string;
  monto_asignado: number;
  monto_maximo_gasto: number;
  activo: boolean;
  responsable: string | null;
  identificacion_responsable: string | null;
  nombre_aprobador: string | null;
  prefijo: string | null;
};

export async function getFondosAgencia() {
  const { data, error } = await supabase
    .from("fondos_agencia")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return data as FondoAgencia[];
}

export type MovimientoSoporte = {
  id: string;
  movimiento_id: string;
  factura_path: string;
  orden: number;
};

export async function getSoportesAdicionales(movimientoId: string) {
  const { data, error } = await supabase
    .from("movimiento_soportes")
    .select("*")
    .eq("movimiento_id", movimientoId)
    .order("orden");
  if (error) throw error;
  return data as MovimientoSoporte[];
}

export type Profile = {
  id: string;
  nombre: string;
  email: string;
  rol:
    | "pendiente"
    | "admin"
    | "responsable"
    | "contador"
    | "auditoria"
    | "analista_contable"
    | "director_agencia"
    | "auxiliar_contable";
  agencia_id: string | null;
  fondo_agencia_id: string | null;
  activo: boolean;
  agencias?: Agencia | null;
};

export async function getMyProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*, agencias(*)")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Profile | null;
}

export async function getProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, agencias(*)")
    .order("created_at");
  if (error) throw error;
  return data as unknown as Profile[];
}

export async function getReembolsos() {
  const { data, error } = await supabase
    .from("reembolsos")
    .select("*, aprobado_por_perfil:profiles!reembolsos_aprobado_por_fkey(nombre, email)")
    .order("fecha", { ascending: false })
    .order("consecutivo", { ascending: false });
  if (error) throw error;
  return data as unknown as Reembolso[];
}

export async function getMovimientosPendientes() {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*, proveedores(*), conceptos(*), agencias(*), movimiento_items(*, proveedores(*), conceptos(*)), fondos_agencia(*)")
    .is("reembolso_id", null)
    .neq("estado", "anulado")
    .order("fecha", { ascending: true });
  if (error) throw error;
  return data as unknown as Movimiento[];
}

export async function getMovimientosDeReembolso(reembolsoId: string) {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*, proveedores(*), conceptos(*), agencias(*), movimiento_items(*, proveedores(*), conceptos(*)), fondos_agencia(*)")
    .eq("reembolso_id", reembolsoId)
    .order("fecha", { ascending: true });
  if (error) throw error;
  return data as unknown as Movimiento[];
}


// Devuelve la cuenta configurada para la tarifa de retención en la fuente
// usada en el recibo. Prioriza la tabla editable (por id); si el recibo es
// viejo y solo tiene la clave de texto, cae al catálogo fijo en fondo_config;
// si no hay nada, usa la cuenta del concepto contable (comportamiento previo).
// Un proveedor no lleva retención en la fuente si es Régimen Simple,
// autorretenedor de renta, entidad no contribuyente, o régimen especial.
export function exentoRetencionRenta(
  p: { pertenece_regimen_simple?: boolean; autorretenedor_renta?: boolean; tipo_declarante_renta?: string } | null | undefined,
): boolean {
  if (!p) return false;
  return (
    !!p.pertenece_regimen_simple ||
    !!p.autorretenedor_renta ||
    p.tipo_declarante_renta === "no_contribuyente" ||
    p.tipo_declarante_renta === "regimen_especial"
  );
}

function cuentaRetencionPorTipo(
  tarifaId: string | null | undefined,
  tipoTexto: string | null | undefined,
  tarifas: TarifaRetencionRenta[] | undefined,
  fondo: FondoConfig | undefined,
  fallback: string | null,
  conceptoRetencionId?: string | null,
  esDeclarante?: boolean,
  conceptosRetencionRenta?: ConceptoRetencionRenta[],
): { cuenta: string | null; nombre: string } {
  // Nuevo sistema (por concepto Compras/Servicios + declarante/no declarante)
  // tiene prioridad si el movimiento ya lo usa.
  if (conceptoRetencionId && conceptosRetencionRenta) {
    const cr = conceptosRetencionRenta.find((x) => x.id === conceptoRetencionId);
    if (cr) {
      return {
        cuenta: cr.cuenta || fallback,
        nombre: `${cr.nombre} (${esDeclarante ? "declarante" : "no declarante"})`,
      };
    }
  }
  if (tarifaId && tarifas) {
    const t = tarifas.find((x) => x.id === tarifaId);
    if (t) return { cuenta: t.cuenta || fallback, nombre: t.nombre };
  }
  if (fondo && tipoTexto) {
    if (tipoTexto === "hotel") return { cuenta: fondo.cuenta_retencion_hotel, nombre: "Serv. hotel y restaurante" };
    if (tipoTexto === "servicios_declarante")
      return { cuenta: fondo.cuenta_retencion_servicios_declarante, nombre: "Servicios generales (declarante)" };
    if (tipoTexto === "servicios_no_declarante")
      return { cuenta: fondo.cuenta_retencion_servicios_no_declarante, nombre: "Servicios generales (no declarante)" };
    if (tipoTexto === "fletes") return { cuenta: fondo.cuenta_retencion_fletes, nombre: "Fletes" };
  }
  return { cuenta: fallback, nombre: "" };
}

// Igual que arriba, pero para el concepto de ReteICA (Servicios/Compras).
// Prioriza la tarifa específica de agencia + CIIU (tarifas_reteica_ciudad)
// sobre el concepto genérico, ya que es la configuración más precisa.
function cuentaReteicaPorConcepto(
  tarifaCiudadId: string | null | undefined,
  tarifasCiudad: TarifaReteicaCiudad[] | undefined,
  conceptoId: string | null | undefined,
  conceptoTexto: string | null | undefined,
  conceptos: ConceptoReteicaDB[] | undefined,
  fondo: FondoConfig | undefined,
  fallback: string | null,
): { cuenta: string | null; nombre: string } {
  if (tarifaCiudadId && tarifasCiudad) {
    const t = tarifasCiudad.find((x) => x.id === tarifaCiudadId);
    if (t?.cuenta) return { cuenta: t.cuenta, nombre: "Tarifa por agencia/CIIU" };
  }
  if (conceptoId && conceptos) {
    const c = conceptos.find((x) => x.id === conceptoId);
    if (c) return { cuenta: c.cuenta || fallback, nombre: c.nombre };
  }
  if (fondo && conceptoTexto === "servicios" && fondo.cuenta_reteica_servicios) {
    return { cuenta: fondo.cuenta_reteica_servicios, nombre: "Servicios" };
  }
  if (fondo && conceptoTexto === "compras" && fondo.cuenta_reteica_compras) {
    return { cuenta: fondo.cuenta_reteica_compras, nombre: "Compras" };
  }
  return { cuenta: fallback, nombre: "" };
}

export function computeAsiento(
  mov: Movimiento,
  fondo?: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
  conceptosRetencionRenta?: ConceptoRetencionRenta[],
) {
  const debitos: Array<{ cuenta: string; descripcion: string; valor: number }> = [];
  const creditos: Array<{ cuenta: string; descripcion: string; valor: number }> = [];

  const items = mov.multi_soporte && mov.movimiento_items && mov.movimiento_items.length > 0
    ? [...mov.movimiento_items].sort((a, b) => a.orden - b.orden)
    : null;

  if (items) {
    let contrapartida = mov.conceptos?.cuenta_contrapartida ?? "11050501";
    items.forEach((it) => {
      const c = it.conceptos;
      if (!c) return;
      contrapartida = c.cuenta_contrapartida;
      debitos.push({ cuenta: c.cuenta_gasto, descripcion: `Gasto ${c.nombre}`, valor: Number(it.subtotal) });
      if (Number(it.iva) > 0 && c.cuenta_iva)
        debitos.push({ cuenta: c.cuenta_iva, descripcion: `IVA descontable · ${c.nombre}`, valor: Number(it.iva) });
      if (Number(it.impoconsumo) > 0)
        debitos.push({
          cuenta: c.cuenta_impoconsumo || "51959501",
          descripcion: `Impoconsumo · ${c.nombre}`,
          valor: Number(it.impoconsumo),
        });
      if (Number(it.retencion) > 0) {
        const { cuenta } = cuentaRetencionPorTipo(
          null,
          null,
          tarifas,
          fondo,
          c.cuenta_retencion,
          it.concepto_retencion_renta_id,
          it.proveedores?.es_declarante_renta,
          conceptosRetencionRenta,
        );
        if (cuenta) creditos.push({ cuenta, descripcion: `Rete Fuente · ${c.nombre}`, valor: Number(it.retencion) });
      }
      if (Number(it.reteica) > 0) {
        const { cuenta } = cuentaReteicaPorConcepto(null, undefined, null, null, conceptosReteica, fondo, c.cuenta_reteica);
        if (cuenta) creditos.push({ cuenta, descripcion: `ReteICA · ${c.nombre}`, valor: Number(it.reteica) });
      }
      if (Number(it.reteiva) > 0)
        creditos.push({
          cuenta: c.cuenta_reteiva || fondo?.cuenta_banco || "24109503",
          descripcion: `ReteIVA · ${c.nombre}`,
          valor: Number(it.reteiva),
        });
    });
    creditos.push({ cuenta: contrapartida, descripcion: "Caja menor", valor: Number(mov.total) });
    return { debitos, creditos };
  }

  const c = mov.conceptos!;
  debitos.push({ cuenta: c.cuenta_gasto, descripcion: `Gasto ${c.nombre}`, valor: mov.subtotal });
  if (mov.iva > 0 && c.cuenta_iva)
    debitos.push({ cuenta: c.cuenta_iva, descripcion: "IVA descontable", valor: mov.iva });
  if (mov.impoconsumo > 0)
    debitos.push({
      cuenta: c.cuenta_impoconsumo || "51959501",
      descripcion: "Impoconsumo",
      valor: mov.impoconsumo,
    });
  if (mov.retencion > 0) {
    const { cuenta, nombre } = cuentaRetencionPorTipo(
      mov.tarifa_retencion_id,
      mov.tipo_retencion_renta,
      tarifas,
      fondo,
      c.cuenta_retencion,
      mov.concepto_retencion_renta_id,
      mov.proveedores?.es_declarante_renta,
      conceptosRetencionRenta,
    );
    if (cuenta) {
      creditos.push({
        cuenta,
        descripcion: `Retención en la fuente${nombre ? ` · ${nombre}` : ""}`,
        valor: mov.retencion,
      });
    }
  }
  if (mov.reteica > 0) {
    const { cuenta, nombre } = cuentaReteicaPorConcepto(
      mov.tarifa_reteica_ciudad_id,
      tarifasReteicaCiudad,
      mov.concepto_reteica_id,
      mov.concepto_reteica_usado,
      conceptosReteica,
      fondo,
      c.cuenta_reteica,
    );
    if (cuenta) {
      creditos.push({
        cuenta,
        descripcion: `ReteICA${nombre ? ` · ${nombre}` : ""}`,
        valor: mov.reteica,
      });
    }
  }
  if (mov.reteiva > 0)
    creditos.push({
      cuenta: c.cuenta_reteiva || fondo?.cuenta_banco || "24109503",
      descripcion: "ReteIVA",
      valor: mov.reteiva,
    });
  creditos.push({ cuenta: c.cuenta_contrapartida, descripcion: "Caja menor", valor: mov.total });
  return { debitos, creditos };
}

// Asiento de reposición: cuando la empresa repone el fondo (reembolso pagado),
// se debita la(s) cuenta(s) de caja menor por el total y se acredita la cuenta
// bancaria/contable configurada en el fondo (fondo_config.cuenta_banco).
export function computeAsientoReposicion(movs: Movimiento[], fondo: FondoConfig) {
  const debitos: Array<{ cuenta: string; descripcion: string; valor: number }> = [];
  const porCuenta = new Map<string, number>();

  movs.forEach((mov) => {
    const cuenta = mov.conceptos?.cuenta_contrapartida ?? "11050501";
    porCuenta.set(cuenta, (porCuenta.get(cuenta) ?? 0) + Number(mov.total));
  });

  porCuenta.forEach((valor, cuenta) => {
    debitos.push({ cuenta, descripcion: "Reposición caja menor", valor });
  });

  const total = movs.reduce((s, m) => s + Number(m.total), 0);
  const idResponsable = fondo.identificacion_responsable
    ? ` · ${fondo.responsable} C.C./NIT ${fondo.identificacion_responsable}`
    : ` · ${fondo.responsable}`;
  const creditos = [
    {
      cuenta: fondo.cuenta_banco,
      descripcion: `Reposición fondo caja menor${idResponsable}`,
      valor: total,
    },
  ];

  return { debitos, creditos };
}
