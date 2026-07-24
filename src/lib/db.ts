import { supabase } from "@/integrations/supabase/client";

export type Proveedor = {
  id: string;
  nombre: string;
  nit: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
};

export type Concepto = {
  id: string;
  nombre: string;
  cuenta_gasto: string;
  cuenta_iva: string | null;
  cuenta_retencion: string | null;
  cuenta_contrapartida: string;
  porcentaje_retencion: number | null;
  activo: boolean;
};

export type Agencia = { id: string; nombre: string };

export type Movimiento = {
  id: string;
  consecutivo: number;
  fecha: string;
  agencia_id: string | null;
  proveedor_id: string;
  concepto_id: string;
  detalle: string | null;
  subtotal: number;
  iva: number;
  impoconsumo: number;
  retencion: number;
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
  multi_soporte: boolean;
  proveedores?: Proveedor;
  conceptos?: Concepto;
  agencias?: Agencia | null;
  movimiento_items?: MovimientoItem[];
};

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
  total: number;
  orden: number;
  proveedores?: Proveedor;
  conceptos?: Concepto;
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
};

export type FondoConfig = {
  id: string;
  empresa: string;
  responsable: string;
  monto_asignado: number;
  monto_maximo_gasto: number;
};

export async function getFondo(): Promise<FondoConfig> {
  const { data, error } = await supabase.from("fondo_config").select("*").limit(1).single();
  if (error) throw error;
  return data as FondoConfig;
}

export async function getMovimientos() {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*, proveedores(*), conceptos(*), agencias(*), movimiento_items(*, proveedores(*), conceptos(*))")
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
  const { data, error } = await supabase.from("agencias").select("*").order("nombre");
  if (error) throw error;
  return data as Agencia[];
}

export async function getReembolsos() {
  const { data, error } = await supabase
    .from("reembolsos")
    .select("*")
    .order("fecha", { ascending: false })
    .order("consecutivo", { ascending: false });
  if (error) throw error;
  return data as Reembolso[];
}

export async function getMovimientosPendientes() {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*, proveedores(*), conceptos(*), agencias(*), movimiento_items(*, proveedores(*), conceptos(*))")
    .is("reembolso_id", null)
    .order("fecha", { ascending: true });
  if (error) throw error;
  return data as unknown as Movimiento[];
}

export async function getMovimientosDeReembolso(reembolsoId: string) {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*, proveedores(*), conceptos(*), agencias(*), movimiento_items(*, proveedores(*), conceptos(*))")
    .eq("reembolso_id", reembolsoId)
    .order("fecha", { ascending: true });
  if (error) throw error;
  return data as unknown as Movimiento[];
}


export function computeAsiento(mov: Movimiento) {
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
        debitos.push({ cuenta: "51959501", descripcion: `Impoconsumo · ${c.nombre}`, valor: Number(it.impoconsumo) });
      if (Number(it.retencion) > 0 && c.cuenta_retencion)
        creditos.push({ cuenta: c.cuenta_retencion, descripcion: `Retención · ${c.nombre}`, valor: Number(it.retencion) });
    });
    creditos.push({ cuenta: contrapartida, descripcion: "Caja menor", valor: Number(mov.total) });
    return { debitos, creditos };
  }

  const c = mov.conceptos!;
  debitos.push({ cuenta: c.cuenta_gasto, descripcion: `Gasto ${c.nombre}`, valor: mov.subtotal });
  if (mov.iva > 0 && c.cuenta_iva)
    debitos.push({ cuenta: c.cuenta_iva, descripcion: "IVA descontable", valor: mov.iva });
  if (mov.impoconsumo > 0)
    debitos.push({ cuenta: "51959501", descripcion: "Impoconsumo", valor: mov.impoconsumo });
  if (mov.retencion > 0 && c.cuenta_retencion)
    creditos.push({
      cuenta: c.cuenta_retencion,
      descripcion: "Retención en la fuente",
      valor: mov.retencion,
    });
  creditos.push({ cuenta: c.cuenta_contrapartida, descripcion: "Caja menor", valor: mov.total });
  return { debitos, creditos };
}
