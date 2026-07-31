import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import {
  getAgencias,
  getConceptos,
  getFondo,
  getProveedores,
  getConceptosRetencionRenta,
  getTarifasRetencionRenta,
  getConceptosReteica,
  getTarifasReteicaCiudad,
  getBasesReteicaAgencia,
  getFondosAgencia,
  getMyProfile,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, FileText, Plus, Trash2 } from "lucide-react";
import { fmtMoney, pad } from "@/lib/format";
import { ProveedorPicker } from "@/components/ProveedorPicker";
import { ConceptoPicker } from "@/components/ConceptoPicker";
import { Checkbox } from "@/components/ui/checkbox";
import type { Concepto, Movimiento, MovimientoItem, Proveedor } from "@/lib/db";
import { exportReciboPDF } from "@/lib/exports";
import { CUANTIA_MINIMA_UVT_SERVICIOS, REGIMENES_TRIBUTARIOS } from "@/lib/retenciones";

export const Route = createFileRoute("/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo recibo · Caja Menor" },
      { name: "description", content: "Registra un nuevo gasto en el fondo de caja menor." },
    ],
  }),
  component: () => (
    <AppLayout>
      <Nuevo />
    </AppLayout>
  ),
});

// Guarda un borrador en el navegador mientras se llena el recibo, para que
// si el usuario tiene que salir (ej. a crear un concepto en Configuración)
// pueda continuar donde iba al volver. No se puede guardar el archivo de la
// factura (hay que volver a adjuntarlo), pero sí todo lo demás.
const CLAVE_BORRADOR = "go-cashy-borrador-recibo";

function Nuevo() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const provsQ = useQuery({ queryKey: ["proveedores"], queryFn: getProveedores });
  const consQ = useQuery({ queryKey: ["conceptos"], queryFn: getConceptos });
  const agsQ = useQuery({ queryKey: ["agencias"], queryFn: getAgencias });
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const tarifasQ = useQuery({ queryKey: ["tarifas-retencion"], queryFn: getTarifasRetencionRenta });
  const conceptosRetencionRentaQ = useQuery({
    queryKey: ["conceptos-retencion-renta"],
    queryFn: getConceptosRetencionRenta,
  });
  const reteicaConceptosQ = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const reteicaCiudadQ = useQuery({ queryKey: ["tarifas-reteica-ciudad"], queryFn: getTarifasReteicaCiudad });
  const basesReteicaQ = useQuery({ queryKey: ["bases-reteica-agencia"], queryFn: getBasesReteicaAgencia });
  const fondosAgenciaQ = useQuery({ queryKey: ["fondos-agencia"], queryFn: getFondosAgencia });
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile });
  const nextConsQ = useQuery({
    queryKey: ["next-consecutivo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimientos")
        .select("consecutivo")
        .order("consecutivo", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0]?.consecutivo ?? 0) + 1;
    },
  });

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [agencia, setAgencia] = useState<string>("");
  const [fondoAgenciaId, setFondoAgenciaId] = useState<string>("");
  const [proveedor, setProveedor] = useState<string>("");
  const [concepto, setConcepto] = useState<string>("");
  const [detalle, setDetalle] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [subtotal, setSubtotal] = useState<string>("");
  const [iva, setIva] = useState<string>("0");
  const [impoconsumo, setImpoconsumo] = useState<string>("0");
  const [retencion, setRetencion] = useState<string>("0");
  const [reteica, setReteica] = useState<string>("0");
  const [reteiva, setReteiva] = useState<string>("0");
  const [aplicaRetencion, setAplicaRetencion] = useState(false);
  const [tarifaRetencionId, setTarifaRetencionId] = useState<string>("");
  const [conceptoRetencionRentaId, setConceptoRetencionRentaId] = useState<string>("");
  const [aplicaReteica, setAplicaReteica] = useState(false);
  const [conceptoReteicaId, setConceptoReteicaId] = useState<string>("");
  const [tarifaReteica, setTarifaReteica] = useState<string>("");
  const [aplicaReteiva, setAplicaReteiva] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [facturaElectronica, setFacturaElectronica] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [archivosAdicionales, setArchivosAdicionales] = useState<File[]>([]);
  const [multiSoporte, setMultiSoporte] = useState(false);
  const [beneficiarioId, setBeneficiarioId] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([blankItem()]);

  // --- Borrador automático (ver nota arriba) ---
  const [borradorDisponible, setBorradorDisponible] = useState(false);
  const [borradorGuardadoEn, setBorradorGuardadoEn] = useState<string | null>(null);
  const [borradorYaDecidido, setBorradorYaDecidido] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CLAVE_BORRADOR);
      if (raw) {
        const datos = JSON.parse(raw);
        setBorradorDisponible(true);
        setBorradorGuardadoEn(datos._guardadoEn ?? null);
      }
    } catch {
      // Ignorar si el borrador está corrupto
    }
  }, []);

  const restaurarBorrador = () => {
    try {
      const raw = sessionStorage.getItem(CLAVE_BORRADOR);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.agencia !== undefined) setAgencia(d.agencia);
      if (d.fondoAgenciaId !== undefined) setFondoAgenciaId(d.fondoAgenciaId);
      if (d.proveedor !== undefined) setProveedor(d.proveedor);
      if (d.concepto !== undefined) setConcepto(d.concepto);
      if (d.detalle !== undefined) setDetalle(d.detalle);
      if (d.numeroFactura !== undefined) setNumeroFactura(d.numeroFactura);
      if (d.subtotal !== undefined) setSubtotal(d.subtotal);
      if (d.iva !== undefined) setIva(d.iva);
      if (d.impoconsumo !== undefined) setImpoconsumo(d.impoconsumo);
      if (d.retencion !== undefined) setRetencion(d.retencion);
      if (d.reteica !== undefined) setReteica(d.reteica);
      if (d.reteiva !== undefined) setReteiva(d.reteiva);
      if (d.aplicaRetencion !== undefined) setAplicaRetencion(d.aplicaRetencion);
      if (d.conceptoRetencionRentaId !== undefined) setConceptoRetencionRentaId(d.conceptoRetencionRentaId);
      if (d.conceptoReteicaId !== undefined) setConceptoReteicaId(d.conceptoReteicaId);
      if (d.tarifaReteica !== undefined) setTarifaReteica(d.tarifaReteica);
      if (d.aplicaReteiva !== undefined) setAplicaReteiva(d.aplicaReteiva);
      if (d.observaciones !== undefined) setObservaciones(d.observaciones);
      if (d.facturaElectronica !== undefined) setFacturaElectronica(d.facturaElectronica);
      if (d.multiSoporte !== undefined) setMultiSoporte(d.multiSoporte);
      if (d.beneficiarioId !== undefined) setBeneficiarioId(d.beneficiarioId);
      if (Array.isArray(d.items) && d.items.length > 0) setItems(d.items);
      toast.success("Borrador restaurado. Recuerda volver a adjuntar la factura.");
    } catch {
      toast.error("No se pudo restaurar el borrador.");
    }
    setBorradorYaDecidido(true);
  };

  const descartarBorrador = () => {
    sessionStorage.removeItem(CLAVE_BORRADOR);
    setBorradorYaDecidido(true);
    setBorradorDisponible(false);
  };

  // Guarda automáticamente (con un pequeño retraso) cada vez que algo del
  // formulario cambia, mientras el usuario ya decidió qué hacer con un
  // borrador anterior (para no pisarlo antes de que elija restaurar o no).
  useEffect(() => {
    if (borradorDisponible && !borradorYaDecidido) return;
    const timeout = setTimeout(() => {
      const vacio =
        !proveedor && !concepto && !subtotal && !detalle && items.length === 1 && !items[0].proveedor_id;
      if (vacio) return;
      const datos = {
        _guardadoEn: new Date().toISOString(),
        agencia,
        fondoAgenciaId,
        proveedor,
        concepto,
        detalle,
        numeroFactura,
        subtotal,
        iva,
        impoconsumo,
        retencion,
        reteica,
        reteiva,
        aplicaRetencion,
        conceptoRetencionRentaId,
        conceptoReteicaId,
        tarifaReteica,
        aplicaReteiva,
        observaciones,
        facturaElectronica,
        multiSoporte,
        beneficiarioId,
        items,
      };
      try {
        sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(datos));
      } catch {
        // Si sessionStorage falla (modo privado, etc.), no hacemos nada.
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [
    agencia, fondoAgenciaId, proveedor, concepto, detalle, numeroFactura, subtotal, iva,
    impoconsumo, retencion, reteica, reteiva, aplicaRetencion, conceptoRetencionRentaId,
    conceptoReteicaId, tarifaReteica, aplicaReteiva, observaciones, facturaElectronica,
    multiSoporte, beneficiarioId, items, borradorDisponible, borradorYaDecidido,
  ]);


  // La agencia queda predeterminada a la primera disponible en cuanto carga la lista.
  useEffect(() => {
    if (!agencia && agsQ.data && agsQ.data.length > 0) {
      setAgencia(agsQ.data[0].id);
    }
  }, [agsQ.data, agencia]);

  const conceptoSel = useMemo(
    () => consQ.data?.find((c) => c.id === concepto),
    [consQ.data, concepto],
  );

  const proveedorSel = useMemo(
    () => provsQ.data?.find((p) => p.id === proveedor),
    [provsQ.data, proveedor],
  );

  // El IVA y el Impoconsumo ya no se eligen manualmente: se activan solos
  // según cómo esté configurado el proveedor (si es responsable de IVA, y
  // qué impuesto factura). El valor calculado sigue siendo editable.
  const aplicaIva =
    !!proveedorSel?.responsable_iva &&
    (proveedorSel?.tipo_impuesto === "iva" || proveedorSel?.tipo_impuesto === "ambos");
  const aplicaImpoconsumo =
    proveedorSel?.tipo_impuesto === "impoconsumo" || proveedorSel?.tipo_impuesto === "ambos";

  // Si el proveedor está marcado como facturador electrónico, se activa solo
  // "El proveedor emite factura electrónica" (y se exige el número); si no
  // lo es, se desactiva y el campo de número de factura queda deshabilitado.
  useEffect(() => {
    if (!proveedor) return;
    setFacturaElectronica(!!proveedorSel?.es_facturador_electronico);
    if (!proveedorSel?.es_facturador_electronico) setNumeroFactura("");
  }, [proveedor]);

  // Si el gasto elegido (concepto) ya tiene un concepto de retención asignado
  // en Configuración (Compras/Servicios), lo aplicamos solos — el usuario no
  // tiene que acordarse de elegirlo cada vez. Sigue pudiendo desmarcarlo o
  // cambiarlo manualmente si hace falta. No aplica si el proveedor es
  // Régimen Simple o autorretenedor de renta.
  useEffect(() => {
    const exentoRenta = proveedorSel?.pertenece_regimen_simple || proveedorSel?.autorretenedor_renta;
    if (conceptoSel?.concepto_retencion_renta_id && !exentoRenta) {
      setConceptoRetencionRentaId(conceptoSel.concepto_retencion_renta_id);
      setAplicaRetencion(true);
    } else {
      setConceptoRetencionRentaId("");
      setAplicaRetencion(false);
    }
  }, [concepto, proveedor]);

  // Lo mismo para ReteICA: el gasto ya indica si es "Compras" o "Servicios",
  // y de ahí sale la tarifa/tope de la agencia (Configuración). No aplica si
  // el proveedor es Régimen Simple o autorretenedor de ICA.
  useEffect(() => {
    const exentoIca = proveedorSel?.pertenece_regimen_simple || proveedorSel?.autorretenedor_ica;
    if (conceptoSel?.concepto_reteica_id && !exentoIca) {
      setConceptoReteicaId(conceptoSel.concepto_reteica_id);
    } else {
      setConceptoReteicaId("");
    }
  }, [concepto, proveedor]);

  // Auto-calcular IVA sugerido según el concepto (modo simple)
  const onSubtotalChange = (v: string) => {
    setSubtotal(v);
  };

  const onConceptoChange = (id: string) => {
    setConcepto(id);
  };

  // Al elegir el proveedor, autocompletamos las retenciones que tenga
  // configuradas (siguen siendo editables después).
  const onProveedorChange = (id: string) => {
    setProveedor(id);
    const p = provsQ.data?.find((x) => x.id === id);
    if (!p) return;
    const esRegimenSimple = p.pertenece_regimen_simple;
    // Un autorretenedor (de renta o de ICA) no lleva retención en ese
    // impuesto específico, porque se la practica él mismo.
    setAplicaRetencion(esRegimenSimple || p.autorretenedor_renta ? false : p.aplica_retencion);
    setTarifaRetencionId(p.tarifa_retencion_id ?? "");
    setAplicaReteica(esRegimenSimple || p.autorretenedor_ica ? false : p.aplica_reteica);
    setTarifaReteica(p.aplica_reteica ? String(p.tarifa_reteica) : "");
    setAplicaReteiva(p.aplica_reteiva);
  };

  // IVA: se calcula automático cuando la casilla "Aplica IVA" está marcada.
  useEffect(() => {
    if (!aplicaIva) {
      setIva("0");
      return;
    }
    const s = parseFloat(subtotal) || 0;
    setIva(String(Math.round((s * Number(conceptoSel?.porcentaje_iva ?? 0)) / 100)));
  }, [aplicaIva, subtotal, conceptoSel?.porcentaje_iva]);

  // Impoconsumo: 8% del subtotal, redondeado sin decimales. Puede aplicar al
  // mismo tiempo que el IVA (algunos proveedores cobran ambos en la misma factura).
  useEffect(() => {
    if (!aplicaImpoconsumo) {
      setImpoconsumo("0");
      return;
    }
    const s = parseFloat(subtotal) || 0;
    setImpoconsumo(String(Math.round(s * 0.08)));
  }, [aplicaImpoconsumo, subtotal]);

  // Valores base compartidos para validar la cuantía mínima (4 UVT) tanto en
  // retención en la fuente como en ReteIVA.
  const subtotalNum = parseFloat(subtotal) || 0;
  const uvtValor = Number(fondoQ.data?.valor_uvt ?? 0);

  // Retención en la fuente (renta): base * % / 100, redondeado. La tarifa
  // depende del CONCEPTO elegido (Compras/Servicios) y de si el proveedor es
  // o no declarante de renta (dato propio del proveedor, ya no de la tarifa).
  const esDeclarante = proveedorSel?.es_declarante_renta ?? true;
  const conceptoRetencionSel = conceptosRetencionRentaQ.data?.find((c) => c.id === conceptoRetencionRentaId);
  const tarifaAplicable = conceptoRetencionSel
    ? Number(esDeclarante ? conceptoRetencionSel.tarifa_declarante : conceptoRetencionSel.tarifa_no_declarante)
    : 0;
  const cuantiaMinimaRetencion =
    conceptoRetencionSel && uvtValor > 0 ? Number(conceptoRetencionSel.minimo_uvt) * uvtValor : 0;
  const retencionBloqueada =
    cuantiaMinimaRetencion > 0 && subtotalNum > 0 && subtotalNum < cuantiaMinimaRetencion;

  useEffect(() => {
    if (retencionBloqueada && aplicaRetencion) {
      setAplicaRetencion(false);
    }
  }, [retencionBloqueada]);

  useEffect(() => {
    if (!aplicaRetencion) {
      setRetencion("0");
      return;
    }
    const s = parseFloat(subtotal) || 0;
    setRetencion(conceptoRetencionSel ? String(Math.round((s * tarifaAplicable) / 100)) : "0");
  }, [aplicaRetencion, conceptoRetencionRentaId, esDeclarante, subtotal, conceptosRetencionRentaQ.data]);

  // ReteICA: busca la tarifa configurada para esta agencia + concepto
  // (Compras/Servicios, que puede tener un tope distinto) + el CIIU del
  // proveedor (o la tarifa general de esa agencia/concepto). Se puede
  // seguir ajustando manualmente si hace falta.
  const tarifaReteicaCiudadSel = useMemo(() => {
    if (!conceptoReteicaId) return null;
    const candidatas = (reteicaCiudadQ.data ?? []).filter(
      (t) => t.activo && t.agencia_id === agencia && t.concepto_reteica_id === conceptoReteicaId,
    );
    const ciiu = proveedorSel?.codigo_ciiu?.trim();
    const exacta = ciiu ? candidatas.find((t) => t.codigo_ciiu === ciiu) : undefined;
    const general = candidatas.find((t) => !t.codigo_ciiu);
    return exacta ?? general ?? null;
  }, [reteicaCiudadQ.data, agencia, conceptoReteicaId, proveedorSel?.codigo_ciiu]);

  // Al cambiar la tarifa detectada (por cambio de agencia o proveedor),
  // precargamos su valor en el campo (sigue siendo editable).
  useEffect(() => {
    if (tarifaReteicaCiudadSel) {
      setTarifaReteica(String(Number(tarifaReteicaCiudadSel.tarifa)));
    }
  }, [tarifaReteicaCiudadSel]);

  // La base mínima ahora vive por agencia + concepto (una sola, sin
  // importar el CIIU), en vez de repetirse en cada fila de tarifa.
  const baseReteicaSel = useMemo(() => {
    if (!conceptoReteicaId) return null;
    return (
      basesReteicaQ.data?.find(
        (b) => b.agencia_id === agencia && b.concepto_reteica_id === conceptoReteicaId,
      ) ?? null
    );
  }, [basesReteicaQ.data, agencia, conceptoReteicaId]);

  const reteicaBloqueadaPorTope =
    !!baseReteicaSel && Number(baseReteicaSel.base) > 0 && subtotalNum > 0 && subtotalNum < Number(baseReteicaSel.base);

  useEffect(() => {
    if (reteicaBloqueadaPorTope && aplicaReteica) {
      setAplicaReteica(false);
    }
  }, [reteicaBloqueadaPorTope]);

  // Si hay una tarifa configurada para esta agencia + proveedor (por CIIU) y
  // no está bloqueada por el tope, el ReteICA se activa solo. El usuario
  // puede desmarcarlo si en un caso puntual no debe aplicar. Excepción: a
  // los autorretenedores de ICA y a Régimen Simple nunca se les practica.
  useEffect(() => {
    if (proveedorSel?.pertenece_regimen_simple || proveedorSel?.autorretenedor_ica) {
      return;
    }
    if (tarifaReteicaCiudadSel && !reteicaBloqueadaPorTope && subtotalNum > 0) {
      setAplicaReteica(true);
    }
  }, [
    tarifaReteicaCiudadSel,
    reteicaBloqueadaPorTope,
    subtotalNum,
    proveedorSel?.pertenece_regimen_simple,
    proveedorSel?.autorretenedor_ica,
  ]);

  // ReteICA: base * tarifa por mil / 1.000, redondeado sin decimales.
  useEffect(() => {
    if (!aplicaReteica) {
      setReteica("0");
      return;
    }
    const s = parseFloat(subtotal) || 0;
    const tarifa = parseFloat(tarifaReteica) || 0;
    setReteica(String(Math.round((s * tarifa) / 1000)));
  }, [aplicaReteica, tarifaReteica, subtotal]);

  // ReteIVA: 15% del valor del IVA, redondeado sin decimales. Aplica la misma
  // cuantía mínima (en UVT) que la retención en la fuente, porque sigue la
  // misma base de aplicación (el monto del subtotal de la operación). Si no
  // se supera, la casilla queda bloqueada (no solo el monto en $0).
  const cuantiaMinimaGeneral = uvtValor > 0 ? CUANTIA_MINIMA_UVT_SERVICIOS * uvtValor : 0;
  const reteivaBloqueada =
    cuantiaMinimaGeneral > 0 && subtotalNum > 0 && subtotalNum < cuantiaMinimaGeneral;

  useEffect(() => {
    if (reteivaBloqueada && aplicaReteiva) {
      setAplicaReteiva(false);
    }
  }, [reteivaBloqueada]);

  useEffect(() => {
    if (!aplicaReteiva) {
      setReteiva("0");
      return;
    }
    const i = parseFloat(iva) || 0;
    setReteiva(String(Math.round(i * 0.15)));
  }, [aplicaReteiva, iva]);

  const itemTotals = useMemo(() => {
    return items.map((it) => {
      const s = parseFloat(it.subtotal) || 0;
      const i = parseFloat(it.iva) || 0;
      const p = parseFloat(it.impoconsumo) || 0;
      const r = parseFloat(it.retencion) || 0;
      const rica = parseFloat(it.reteica) || 0;
      const riva = parseFloat(it.reteiva) || 0;
      return s + i + p - r - rica - riva;
    });
  }, [items]);

  const totalSimple =
    (parseFloat(subtotal) || 0) +
    (parseFloat(iva) || 0) +
    (parseFloat(impoconsumo) || 0) -
    (parseFloat(retencion) || 0) -
    (parseFloat(reteica) || 0) -
    (parseFloat(reteiva) || 0);

  const totalMulti = itemTotals.reduce((a, b) => a + b, 0);
  const total = multiSoporte ? totalMulti : totalSimple;

  // Alerta (no bloquea el guardado): el pago no debe superar el 15% del
  // fondo de caja menor elegido para esta agencia (una agencia puede tener
  // más de un fondo, ej. "Secretaría de Gerencia" y "Agencia").
  const fondosDeAgencia = (fondosAgenciaQ.data ?? []).filter(
    (f) => f.activo && f.agencia_id === agencia,
  );
  // Si el usuario tiene un fondo fijo asignado en Usuarios (y pertenece a la
  // agencia elegida), se usa automático y no hay que seleccionarlo.
  const fondoFijoUsuario = profileQ.data?.fondo_agencia_id ?? null;
  const fondoFijoValido =
    !!fondoFijoUsuario && fondosDeAgencia.some((f) => f.id === fondoFijoUsuario);
  const fondoAgenciaSel = fondoFijoValido
    ? fondosDeAgencia.find((f) => f.id === fondoFijoUsuario)
    : fondosDeAgencia.find((f) => f.id === fondoAgenciaId) ?? fondosDeAgencia[0];
  const maxPorAgencia =
    fondoAgenciaSel && Number(fondoAgenciaSel.monto_asignado) > 0
      ? Number(fondoAgenciaSel.monto_asignado) * 0.15
      : null;
  const excedeTopeAgencia = maxPorAgencia !== null && total > maxPorAgencia;

  // El límite por gasto viene primero del fondo/agencia específico (si se
  // configuró uno mayor a 0); si no, se usa el límite global de
  // Configuración → Datos generales como respaldo.
  const limiteMontoMaximo =
    fondoAgenciaSel && Number(fondoAgenciaSel.monto_maximo_gasto) > 0
      ? Number(fondoAgenciaSel.monto_maximo_gasto)
      : Number(fondoQ.data?.monto_maximo_gasto ?? 0);
  const excedeLimite = limiteMontoMaximo > 0 && total > limiteMontoMaximo;

  const itemsValidos =
    !multiSoporte ||
    (!!beneficiarioId &&
      items.length > 0 &&
      items.every(
        (it) =>
          it.proveedor_id &&
          it.concepto_id &&
          it.subtotal !== "" &&
          parseFloat(it.subtotal) >= 0,
      ));

  const canSubmit =
    fecha &&
    detalle.trim() &&
    file &&
    !excedeLimite &&
    itemsValidos &&
    (multiSoporte
      ? items.length > 0
      : proveedor && concepto && subtotal !== "" && parseFloat(subtotal) >= 0);

  const setItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  // Retención en la fuente (renta) para un ítem de "varios soportes": mismo
  // sistema que en modo simple (Compras/Servicios + declarante/no
  // declarante), exceptuando Régimen Simple y autorretenedores de renta.
  const calcularRetencionRentaItem = (
    concepto: Concepto | undefined,
    proveedor: Proveedor | undefined,
    subtotal: number,
  ): string => {
    if (!concepto?.concepto_retencion_renta_id || !proveedor) return "0";
    if (proveedor.pertenece_regimen_simple || proveedor.autorretenedor_renta) return "0";
    const cr = conceptosRetencionRentaQ.data?.find((c) => c.id === concepto.concepto_retencion_renta_id);
    if (!cr) return "0";
    const minima = uvtValor > 0 ? Number(cr.minimo_uvt) * uvtValor : 0;
    if (minima > 0 && subtotal < minima) return "0";
    const tarifa = proveedor.es_declarante_renta ? Number(cr.tarifa_declarante) : Number(cr.tarifa_no_declarante);
    return String(Math.round((subtotal * tarifa) / 100));
  };

  const onItemSubtotalChange = (idx: number, v: string) => {
    const c = consQ.data?.find((x) => x.id === items[idx]?.concepto_id);
    const p = provsQ.data?.find((x) => x.id === items[idx]?.proveedor_id);
    const patch: Partial<ItemDraft> = { subtotal: v };
    const s = parseFloat(v) || 0;
    const cuantiaMinima = uvtValor > 0 ? CUANTIA_MINIMA_UVT_SERVICIOS * uvtValor : 0;
    const superaBase = cuantiaMinima === 0 || s >= cuantiaMinima;
    if (c) {
      const ivaCalc = Math.round((s * Number(c.porcentaje_iva ?? 0)) / 100);
      patch.iva = String(ivaCalc);
      // Régimen Simple: no aplica retención en la fuente ni ReteICA.
      patch.reteica =
        c.porcentaje_reteica && !p?.pertenece_regimen_simple && !p?.autorretenedor_ica
          ? String(Math.round((s * Number(c.porcentaje_reteica)) / 100))
          : "0";
      // ReteIVA depende del proveedor (15% fijo sobre el IVA), no del
      // concepto — sí aplica en Régimen Simple, siempre que supere la base.
      patch.reteiva =
        p?.aplica_reteiva && superaBase ? String(Math.round(ivaCalc * 0.15)) : "0";
      patch.retencion = calcularRetencionRentaItem(c, p, s);
    }
    setItem(idx, patch);
  };

  const onItemConceptoChange = (idx: number, conceptoId: string) => {
    const c = consQ.data?.find((x) => x.id === conceptoId);
    const p = provsQ.data?.find((x) => x.id === items[idx]?.proveedor_id);
    const s = parseFloat(items[idx]?.subtotal ?? "") || 0;
    const cuantiaMinima = uvtValor > 0 ? CUANTIA_MINIMA_UVT_SERVICIOS * uvtValor : 0;
    const superaBase = cuantiaMinima === 0 || s >= cuantiaMinima;
    const patch: Partial<ItemDraft> = { concepto_id: conceptoId };
    if (c && s > 0) {
      const ivaCalc = Math.round((s * Number(c.porcentaje_iva ?? 0)) / 100);
      patch.iva = String(ivaCalc);
      patch.reteica =
        !p?.pertenece_regimen_simple && !p?.autorretenedor_ica
          ? String(Math.round((s * Number(c.porcentaje_reteica ?? 0)) / 100))
          : "0";
      patch.reteiva = p?.aplica_reteiva && superaBase ? String(Math.round(ivaCalc * 0.15)) : "0";
      patch.retencion = calcularRetencionRentaItem(c, p, s);
    }
    setItem(idx, patch);
  };

  // Si cambia el proveedor de un ítem (sin tocar concepto/subtotal), hay que
  // recalcular igual — un proveedor en Régimen Simple no lleva retención en
  // la fuente ni ReteICA, aunque el concepto sí las tenga configuradas.
  const onItemProveedorChange = (idx: number, proveedorId: string) => {
    const c = consQ.data?.find((x) => x.id === items[idx]?.concepto_id);
    const p = provsQ.data?.find((x) => x.id === proveedorId);
    const s = parseFloat(items[idx]?.subtotal ?? "") || 0;
    const cuantiaMinima = uvtValor > 0 ? CUANTIA_MINIMA_UVT_SERVICIOS * uvtValor : 0;
    const superaBase = cuantiaMinima === 0 || s >= cuantiaMinima;
    const patch: Partial<ItemDraft> = { proveedor_id: proveedorId };
    if (c && s > 0) {
      const ivaCalc = Math.round((s * Number(c.porcentaje_iva ?? 0)) / 100);
      patch.reteica =
        !p?.pertenece_regimen_simple && !p?.autorretenedor_ica
          ? String(Math.round((s * Number(c.porcentaje_reteica ?? 0)) / 100))
          : "0";
      patch.reteiva = p?.aplica_reteiva && superaBase ? String(Math.round(ivaCalc * 0.15)) : "0";
      patch.retencion = calcularRetencionRentaItem(c, p, s);
    }
    setItem(idx, patch);
  };

  // Comprime fotos (no PDFs) antes de subir: las fotos de celular pesan
  // varios MB y eso es lo que hace lenta/fallida la subida en conexiones
  // débiles. Reducimos tamaño y calidad manteniendo buena legibilidad.
  const comprimirImagen = (archivo: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!archivo.type.startsWith("image/")) return resolve(archivo);
      const img = new Image();
      const url = URL.createObjectURL(archivo);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxW = 1600;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(archivo);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= archivo.size) return resolve(archivo);
            resolve(new File([blob], archivo.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.75,
        );
      };
      img.onerror = () => resolve(archivo);
      img.src = url;
    });
  };

  const guardar = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Adjunta la factura");
      if (!multiSoporte && facturaElectronica && !numeroFactura.trim()) {
        throw new Error("Este proveedor es facturador electrónico: ingresa el número de factura.");
      }
      const archivoFinal = await comprimirImagen(file);
      if (archivoFinal.size > 5 * 1024 * 1024) {
        throw new Error("El archivo (incluso comprimido) supera 5 MB. Intenta con otra foto o un PDF más liviano.");
      }
      const ext = archivoFinal.name.split(".").pop();
      const carpeta = agencia || "central";
      const path = `${carpeta}/${new Date().getFullYear()}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      let up = await supabase.storage.from("facturas").upload(path, archivoFinal, {
        contentType: archivoFinal.type,
      });
      if (up.error) {
        // Reintenta una vez más ante fallos transitorios de red (común en
        // conexiones débiles de agencia).
        up = await supabase.storage.from("facturas").upload(path, archivoFinal, {
          contentType: archivoFinal.type,
        });
      }
      if (up.error) throw up.error;
      const { data: urlData } = supabase.storage.from("facturas").createSignedUrl
        ? await supabase.storage.from("facturas").createSignedUrl(path, 60 * 60 * 24 * 365)
        : { data: { signedUrl: "" } };

      // Cabecera: en modo multi tomamos la 1a línea como proveedor/concepto principal
      const first = multiSoporte ? items[0] : null;
      const proveedorId = multiSoporte ? beneficiarioId : proveedor;
      const conceptoId = multiSoporte ? first!.concepto_id : concepto;
      const nFact = multiSoporte
        ? (items.map((i) => i.numero_factura).filter(Boolean).join(", ") || null)
        : (numeroFactura || null);
      const fe = multiSoporte ? items.some((i) => i.factura_electronica) : facturaElectronica;

      const sumSub = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.subtotal) || 0), 0) : parseFloat(subtotal);
      const sumIva = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.iva) || 0), 0) : (parseFloat(iva) || 0);
      const sumImp = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.impoconsumo) || 0), 0) : (parseFloat(impoconsumo) || 0);
      const sumRet = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.retencion) || 0), 0) : (parseFloat(retencion) || 0);
      const sumReteica = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.reteica) || 0), 0) : (parseFloat(reteica) || 0);
      const sumReteiva = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.reteiva) || 0), 0) : (parseFloat(reteiva) || 0);

      // Consecutivo propio de este fondo/agencia (para el N° de recibo con
      // prefijo, ej. "AR-0001"). Si no hay fondo específico, se cuenta por
      // agencia sola.
      let numeroFondo: number | null = null;
      if (fondoAgenciaSel?.id) {
        const { data: maxRow } = await supabase
          .from("movimientos")
          .select("numero_fondo")
          .eq("fondo_agencia_id", fondoAgenciaSel.id)
          .order("numero_fondo", { ascending: false })
          .limit(1)
          .maybeSingle();
        numeroFondo = (maxRow?.numero_fondo ?? 0) + 1;
      } else if (agencia) {
        const { data: maxRow } = await supabase
          .from("movimientos")
          .select("numero_fondo")
          .eq("agencia_id", agencia)
          .is("fondo_agencia_id", null)
          .order("numero_fondo", { ascending: false })
          .limit(1)
          .maybeSingle();
        numeroFondo = (maxRow?.numero_fondo ?? 0) + 1;
      }

      const { data, error } = await supabase
        .from("movimientos")
        .insert({
          fecha,
          agencia_id: agencia || null,
          fondo_agencia_id: fondoAgenciaSel?.id || null,
          numero_fondo: numeroFondo,
          proveedor_id: proveedorId,
          concepto_id: conceptoId,
          detalle,
          subtotal: sumSub,
          iva: sumIva,
          impoconsumo: sumImp,
          retencion: sumRet,
          tarifa_retencion_id: !multiSoporte && aplicaRetencion ? tarifaRetencionId || null : null,
          concepto_retencion_renta_id:
            !multiSoporte && aplicaRetencion ? conceptoRetencionRentaId || null : null,
          concepto_reteica_id: !multiSoporte && aplicaReteica ? conceptoReteicaId || null : null,
          tarifa_reteica_ciudad_id:
            !multiSoporte && aplicaReteica ? tarifaReteicaCiudadSel?.id || null : null,
          reteica: sumReteica,
          reteiva: sumReteiva,
          total,
          numero_factura: nFact,
          factura_path: path,
          factura_url: urlData?.signedUrl ?? null,
          observaciones: observaciones || null,
          factura_electronica: fe,
          multi_soporte: multiSoporte,
        })
        .select()
        .single();
      if (error) throw error;

      // Subimos los soportes adicionales (si el pago viene respaldado por
      // más de una factura/documento) y los ligamos a este movimiento.
      for (let i = 0; i < archivosAdicionales.length; i++) {
        const original = archivosAdicionales[i];
        const comprimido = await comprimirImagen(original);
        const extraExt = comprimido.name.split(".").pop();
        const extraPath = `${carpeta}/${new Date().getFullYear()}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-extra${i}.${extraExt}`;
        const upExtra = await supabase.storage.from("facturas").upload(extraPath, comprimido, {
          contentType: comprimido.type,
        });
        if (upExtra.error) continue; // no interrumpe el guardado principal
        await supabase
          .from("movimiento_soportes")
          .insert({ movimiento_id: data.id, factura_path: extraPath, orden: i });
      }

      let rows: {
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
      }[] = [];
      if (multiSoporte && data) {
        rows = items.map((it, idx) => ({
          movimiento_id: data.id,
          proveedor_id: it.proveedor_id,
          concepto_id: it.concepto_id,
          numero_factura: it.numero_factura || null,
          factura_electronica: it.factura_electronica,
          detalle: it.detalle || null,
          subtotal: parseFloat(it.subtotal) || 0,
          iva: parseFloat(it.iva) || 0,
          impoconsumo: parseFloat(it.impoconsumo) || 0,
          retencion: parseFloat(it.retencion) || 0,
          concepto_retencion_renta_id:
            consQ.data?.find((c) => c.id === it.concepto_id)?.concepto_retencion_renta_id ?? null,
          reteica: parseFloat(it.reteica) || 0,
          reteiva: parseFloat(it.reteiva) || 0,
          total: itemTotals[idx],
          orden: idx,
        }));
        const ins = await supabase.from("movimiento_items").insert(rows);
        if (ins.error) throw ins.error;
      }

      // Enriquecemos el movimiento recién creado con las relaciones (proveedor,
      // concepto, agencia) que ya tenemos en memoria, para poder imprimirlo de
      // inmediato sin tener que volver a consultarlo.
      const movimientoParaImprimir: Movimiento = {
        ...(data as unknown as Movimiento),
        proveedores: provsQ.data?.find((p) => p.id === data.proveedor_id),
        conceptos: consQ.data?.find((c) => c.id === data.concepto_id),
        agencias: agsQ.data?.find((a) => a.id === data.agencia_id) ?? null,
        movimiento_items: multiSoporte
          ? rows.map((r) => ({
              ...(r as unknown as MovimientoItem),
              proveedores: provsQ.data?.find((p) => p.id === r.proveedor_id),
              conceptos: consQ.data?.find((c) => c.id === r.concepto_id),
            }))
          : undefined,
      };

      return movimientoParaImprimir;
    },
    onSuccess: (mov) => {
      sessionStorage.removeItem(CLAVE_BORRADOR);
      if (fondoQ.data) {
        const fondo = fondoQ.data;
        toast.custom(
          (t) => (
            <div className="bg-background border rounded-lg shadow-lg p-4 w-full max-w-sm">
              <p className="text-sm font-medium mb-3">Recibo registrado correctamente</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    exportReciboPDF(mov, fondo, "imprimir", tarifasQ.data, reteicaConceptosQ.data, reteicaCiudadQ.data);
                    toast.dismiss(t);
                  }}
                >
                  Imprimir
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    exportReciboPDF(mov, fondo, "descargar", tarifasQ.data, reteicaConceptosQ.data, reteicaCiudadQ.data);
                    toast.dismiss(t);
                  }}
                >
                  Descargar PDF
                </Button>
              </div>
            </div>
          ),
          { duration: 10000 },
        );
      } else {
        toast.success("Recibo registrado correctamente");
      }
      qc.invalidateQueries();
      nav({ to: "/movimientos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Registrar recibo de caja menor</h1>
        <p className="text-sm text-muted-foreground">
          Completa todos los campos y adjunta la factura como soporte.
        </p>
      </header>

      {borradorDisponible && !borradorYaDecidido && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-primary/40 bg-primary/5 flex-wrap">
          <div>
            <p className="text-sm font-medium">Tienes un recibo sin terminar</p>
            <p className="text-xs text-muted-foreground">
              {borradorGuardadoEn
                ? `Guardado automáticamente el ${new Date(borradorGuardadoEn).toLocaleString("es-CO")}. `
                : ""}
              Recuerda que tendrás que volver a adjuntar la factura.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={descartarBorrador}>
              Empezar de cero
            </Button>
            <Button size="sm" onClick={restaurarBorrador}>
              Continuar donde iba
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <CardTitle className="text-base">Información del recibo</CardTitle>
          <div className="flex items-start gap-2">
            <Checkbox
              id="multi-soporte"
              checked={multiSoporte}
              onCheckedChange={(v) => setMultiSoporte(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="multi-soporte" className="text-sm font-normal cursor-pointer text-right">
              ¿El recibo contiene varios soportes?
            </Label>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {multiSoporte && (
            <div className="md:col-span-2 space-y-3">
              <div className="p-3 rounded-md border bg-muted/40 text-xs text-muted-foreground">
                Esta opción se usa principalmente para la <b>legalización de gastos de viaje</b>{" "}
                entregados a un empleado, quien aparece como beneficiario en el recibo de caja
                menor. La contabilización se generará con base en los soportes agregados abajo.
              </div>
              <Field label="Beneficiario/quien realizó los pagos *">
                <ProveedorPicker
                  value={beneficiarioId}
                  onChange={(id) => {
                    setBeneficiarioId(id);
                    if (detalle.trim()) {
                      setItems((prev) => prev.map((it) => ({ ...it, detalle })));
                    }
                  }}
                />
              </Field>
            </div>
          )}
          <Field label="N° Recibo">
            <Input
              value={nextConsQ.data ? pad(nextConsQ.data, 3) : "..."}
              readOnly
              className="font-mono bg-muted"
            />
          </Field>
          <Field label="Fecha *">
            <Input type="date" value={fecha} readOnly disabled className="bg-muted" />
          </Field>
          <Field label="Agencia">
            <Select
              value={agencia}
              onValueChange={(v) => {
                setAgencia(v);
                setFondoAgenciaId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una agencia" />
              </SelectTrigger>
              <SelectContent>
                {agsQ.data?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.codigo != null ? `${a.codigo} - ${a.nombre}` : a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {fondosDeAgencia.length > 1 && !fondoFijoValido && (
            <Field label="Fondo / Caja menor">
              <Select value={fondoAgenciaSel?.id ?? ""} onValueChange={setFondoAgenciaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el fondo" />
                </SelectTrigger>
                <SelectContent>
                  {fondosDeAgencia.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {fondoFijoValido && (
            <div className="md:col-span-2 -mt-2">
              <p className="text-xs text-muted-foreground">
                Este recibo se registrará en tu fondo asignado: <b>{fondoAgenciaSel?.nombre}</b>.
              </p>
            </div>
          )}
          <Field label="Detalle *">
            <Input
              value={detalle}
              onChange={(e) => {
                setDetalle(e.target.value);
                if (multiSoporte) {
                  setItems((prev) => prev.map((it) => ({ ...it, detalle: e.target.value })));
                }
              }}
              placeholder="Ej. Legalización de viáticos, viaje a..."
            />
          </Field>
        </CardContent>
      </Card>

      {!multiSoporte && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proveedor y valores</CardTitle>
            {conceptoSel && (
              <p className="text-xs text-muted-foreground">
                Parametrización: gasto <b>{conceptoSel.cuenta_gasto}</b>
                {conceptoSel.cuenta_iva &&
                  ` · IVA ${conceptoSel.cuenta_iva} (${Math.round(Number(conceptoSel.porcentaje_iva))}%)`}
                {conceptoSel.cuenta_retencion && ` · cta. retención ${conceptoSel.cuenta_retencion}`}
                {conceptoSel.cuenta_reteica && ` · cta. ReteICA ${conceptoSel.cuenta_reteica}`}
              </p>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Proveedor *">
              <ProveedorPicker value={proveedor} onChange={onProveedorChange} />
              {proveedorSel && (
                <p className="text-xs text-muted-foreground mt-1">
                  {REGIMENES_TRIBUTARIOS.find((r) => r.value === proveedorSel.regimen_tributario)?.label}
                  {proveedorSel.pertenece_regimen_simple && " · Régimen Simple"}
                  {proveedorSel.autorretenedor_renta && " · Autorretenedor renta"}
                  {proveedorSel.autorretenedor_ica && " · Autorretenedor ICA"}
                </p>
              )}
              {proveedorSel && proveedorSel.pertenece_regimen_simple && (
                <p className="text-xs text-warning mt-0.5">
                  Régimen simple: no aplica retención en la fuente ni ReteICA (quedaron
                  deshabilitadas). El ReteIVA sí aplica si el monto supera la cuantía mínima.
                </p>
              )}
              {proveedorSel && !proveedorSel.pertenece_regimen_simple && proveedorSel.autorretenedor_renta && (
                <p className="text-xs text-warning mt-0.5">
                  Autorretenedor de renta: no aplica retención en la fuente (quedó deshabilitada).
                </p>
              )}
              {proveedorSel && !proveedorSel.pertenece_regimen_simple && proveedorSel.autorretenedor_ica && (
                <p className="text-xs text-warning mt-0.5">
                  Autorretenedor de ICA: no aplica ReteICA (quedó deshabilitada).
                </p>
              )}
              {proveedorSel && proveedorSel.regimen_tributario === "gran_contribuyente" && (
                <p className="text-xs text-warning mt-0.5">
                  Este proveedor generalmente no lleva retención en la fuente normal — verifica
                  antes de aplicarla.
                </p>
              )}
            </Field>
            <Field label="Concepto del gasto *">
              <ConceptoPicker value={concepto} onChange={onConceptoChange} />
            </Field>
            <Field label={facturaElectronica ? "Número de factura *" : "Número de factura"}>
              <Input
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="FV-001"
                disabled={!facturaElectronica}
                className={!facturaElectronica ? "bg-muted" : ""}
              />
            </Field>
            <div className="flex flex-col gap-1 md:pt-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="factura-electronica"
                  checked={facturaElectronica}
                  onCheckedChange={(v) => setFacturaElectronica(v === true)}
                />
                <Label htmlFor="factura-electronica" className="text-sm font-normal cursor-pointer">
                  El proveedor emite factura electrónica
                </Label>
              </div>
              {proveedor && (
                <p className="text-xs text-muted-foreground">
                  {proveedorSel?.es_facturador_electronico
                    ? "Este proveedor está marcado como facturador electrónico."
                    : "Este proveedor no está marcado como facturador electrónico."}
                </p>
              )}
              {facturaElectronica && (
                <p className="text-xs text-warning">
                  Valida que la factura esté a nombre de {fondoQ.data?.empresa || "la empresa"}.
                </p>
              )}
            </div>

            <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
              <Field label="Subtotal *">
                <Input
                  type="number"
                  min="0"
                  value={subtotal}
                  onChange={(e) => onSubtotalChange(e.target.value)}
                />
              </Field>
              {aplicaIva && (
                <Field label="IVA (según proveedor, editable)">
                  <Input type="number" min="0" value={iva} onChange={(e) => setIva(e.target.value)} />
                </Field>
              )}
              {aplicaImpoconsumo && (
                <Field label="Impoconsumo 8% (según proveedor, editable)">
                  <Input
                    type="number"
                    min="0"
                    value={impoconsumo}
                    onChange={(e) => setImpoconsumo(e.target.value)}
                  />
                </Field>
              )}
              {proveedor && !aplicaIva && !aplicaImpoconsumo && (
                <p className="text-xs text-muted-foreground self-center">
                  Este proveedor no factura IVA ni Impoconsumo, según su configuración.
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-3">
              <Label className="text-sm font-medium">Retenciones practicadas</Label>
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aplica-retencion"
                    checked={aplicaRetencion}
                    disabled={proveedorSel?.pertenece_regimen_simple || proveedorSel?.autorretenedor_renta || retencionBloqueada}
                    onCheckedChange={(v) => setAplicaRetencion(v === true)}
                  />
                  <Label htmlFor="aplica-retencion" className="text-sm font-normal cursor-pointer">
                    Aplica retención en la fuente (renta)
                  </Label>
                </div>
                {aplicaRetencion && (
                  <div className="grid gap-3 md:grid-cols-2 pt-1">
                    <Field label="Concepto">
                      <Select value={conceptoRetencionRentaId} onValueChange={setConceptoRetencionRentaId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Compras o Servicios" />
                        </SelectTrigger>
                        <SelectContent>
                          {conceptosRetencionRentaQ.data?.filter((c) => c.activo).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre} ({Number(esDeclarante ? c.tarifa_declarante : c.tarifa_no_declarante)}%
                              {" "}· {esDeclarante ? "declarante" : "no declarante"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {proveedor && (
                        <p className="text-xs text-muted-foreground mt-1">
                          El proveedor está marcado como{" "}
                          <b>{esDeclarante ? "declarante" : "no declarante"}</b> de renta.
                        </p>
                      )}
                    </Field>
                    <Field label="Retención calculada (editable)">
                      <Input
                        type="number"
                        min="0"
                        value={retencion}
                        onChange={(e) => setRetencion(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
                {retencionBloqueada && (
                  <p className="text-xs text-warning">
                    El monto no supera la cuantía mínima ({Number(conceptoRetencionSel?.minimo_uvt ?? 4)} UVT ={" "}
                    {fmtMoney(Number(conceptoRetencionSel?.minimo_uvt ?? 4) * uvtValor)}), así que la retención
                    en la fuente queda bloqueada para este gasto.
                  </p>
                )}
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aplica-reteiva"
                    checked={aplicaReteiva}
                    disabled={reteivaBloqueada}
                    onCheckedChange={(v) => setAplicaReteiva(v === true)}
                  />
                  <Label htmlFor="aplica-reteiva" className="text-sm font-normal cursor-pointer">
                    Aplica ReteIVA (15% del IVA)
                  </Label>
                </div>
                {aplicaReteiva && (
                  <div className="grid gap-3 md:grid-cols-2 pt-1">
                    <Field label="ReteIVA calculado (editable)">
                      <Input
                        type="number"
                        min="0"
                        value={reteiva}
                        onChange={(e) => setReteiva(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
                {reteivaBloqueada && (
                  <p className="text-xs text-warning">
                    El monto no supera la cuantía mínima (4 UVT ={" "}
                    {fmtMoney(cuantiaMinimaGeneral)}), la misma base que la retención en la
                    fuente, así que el ReteIVA queda bloqueado para este gasto.
                  </p>
                )}
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aplica-reteica"
                    checked={aplicaReteica}
                    disabled={proveedorSel?.pertenece_regimen_simple || proveedorSel?.autorretenedor_ica || reteicaBloqueadaPorTope}
                    onCheckedChange={(v) => setAplicaReteica(v === true)}
                  />
                  <Label htmlFor="aplica-reteica" className="text-sm font-normal cursor-pointer">
                    Aplica ReteICA
                  </Label>
                </div>
                {aplicaReteica && (
                  <div className="grid gap-3 md:grid-cols-3 pt-1">
                    <Field label="Concepto">
                      <Select value={conceptoReteicaId} onValueChange={setConceptoReteicaId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Servicios o compras" />
                        </SelectTrigger>
                        <SelectContent>
                          {reteicaConceptosQ.data?.filter((t) => t.activo).map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Tarifa por mil (‰)">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ej. 9.66"
                        value={tarifaReteica}
                        onChange={(e) => setTarifaReteica(e.target.value)}
                      />
                    </Field>
                    <Field label="ReteICA calculado (editable)">
                      <Input
                        type="number"
                        min="0"
                        value={reteica}
                        onChange={(e) => setReteica(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
                {tarifaReteicaCiudadSel && !reteicaBloqueadaPorTope && (
                  <p className="text-xs text-muted-foreground">
                    Tarifa detectada para esta agencia ·{" "}
                    {reteicaConceptosQ.data?.find((c) => c.id === conceptoReteicaId)?.nombre}
                    {tarifaReteicaCiudadSel.codigo_ciiu ? ` y CIIU ${tarifaReteicaCiudadSel.codigo_ciiu}` : " (general)"}:{" "}
                    {Number(tarifaReteicaCiudadSel.tarifa)}‰. Se aplicó automáticamente.
                  </p>
                )}
                {reteicaBloqueadaPorTope && (
                  <p className="text-xs text-warning">
                    El subtotal no supera el tope mínimo ({fmtMoney(Number(baseReteicaSel?.base ?? 0))})
                    configurado para esta agencia/
                    {reteicaConceptosQ.data?.find((c) => c.id === conceptoReteicaId)?.nombre.toLowerCase()},
                    así que el ReteICA queda bloqueado.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {multiSoporte && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Soportes del recibo</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Agrega una línea por cada factura o soporte. Cada línea puede tener su propio proveedor y concepto contable.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems((p) => [
                  ...p,
                  {
                    ...blankItem(),
                    detalle,
                  },
                ])
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Agregar soporte
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((it, idx) => (
              <ItemRow
                key={it.key}
                index={idx}
                item={it}
                total={itemTotals[idx] ?? 0}
                conceptos={consQ.data ?? []}
                empresa={fondoQ.data?.empresa}
                onChange={(patch) => setItem(idx, patch)}
                onProveedorChange={(v) => onItemProveedorChange(idx, v)}
                onConceptoChange={(v) => onItemConceptoChange(idx, v)}
                onSubtotalChange={(v) => onItemSubtotalChange(idx, v)}
                onRemove={() =>
                  setItems((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))
                }
                canRemove={items.length > 1}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <span className="text-sm text-muted-foreground">
              {multiSoporte ? `Total del recibo (${items.length} soportes)` : "Monto a pagar"}
            </span>
            <span className="text-2xl font-semibold">{fmtMoney(total)}</span>
          </div>
          {excedeLimite && (
            <div className="mt-3 text-sm p-3 rounded-md bg-destructive/10 text-destructive">
              El monto supera el límite autorizado por gasto ({fmtMoney(limiteMontoMaximo)}).
            </div>
          )}
          {excedeTopeAgencia && (
            <div className="mt-3 text-sm p-3 rounded-md bg-warning/10 text-warning">
              ⚠ El monto supera el 15% del fondo "{fondoAgenciaSel?.nombre}" (máximo:{" "}
              {fmtMoney(maxPorAgencia ?? 0)}). Verifica antes de continuar.
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Soporte documental *</CardTitle>
          <p className="text-xs text-warning">
            ⚠ Importante: adjunta la factura o el soporte correspondiente. Es un requisito
            obligatorio para que el proceso de caja menor se ejecute correctamente.
          </p>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && !f.type.startsWith("image/") && f.size > 5 * 1024 * 1024) {
                  toast.error("El archivo supera 5 MB");
                  return;
                }
                if (f && f.type.startsWith("image/") && f.size > 25 * 1024 * 1024) {
                  toast.error("La foto es demasiado pesada (supera 25 MB), intenta con otra.");
                  return;
                }
                setFile(f ?? null);
              }}
            />
            {file ? (
              <>
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-sm font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB · Cambiar archivo
                </div>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-sm font-medium">Adjuntar factura/soporte del gasto</div>
                <div className="text-xs text-muted-foreground">PDF o imagen · máximo 5 MB</div>
              </>
            )}
          </label>

          {file && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  ¿Este pago viene respaldado por más de una factura/documento? Agrega los que
                  falten.
                </p>
                <label className="text-xs text-primary hover:underline cursor-pointer">
                  + Agregar soportes (uno o varios)
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const nuevos = Array.from(e.target.files ?? []);
                      const validos: File[] = [];
                      for (const f of nuevos) {
                        if (!f.type.startsWith("image/") && f.size > 5 * 1024 * 1024) {
                          toast.error(`"${f.name}" supera 5 MB, no se agregó.`);
                          continue;
                        }
                        if (f.type.startsWith("image/") && f.size > 25 * 1024 * 1024) {
                          toast.error(`"${f.name}" es demasiado pesada (supera 25 MB), no se agregó.`);
                          continue;
                        }
                        validos.push(f);
                      }
                      setArchivosAdicionales((prev) => [...prev, ...validos]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {archivosAdicionales.length > 0 && (
                <div className="rounded-md border divide-y">
                  {archivosAdicionales.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="truncate">
                        {f.name} <span className="text-xs text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span>
                      </span>
                      <button
                        type="button"
                        className="text-xs text-destructive hover:underline"
                        onClick={() => setArchivosAdicionales((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Textarea
            className="mt-4"
            placeholder="Observaciones (opcional)"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => nav({ to: "/" })}>
          Cancelar
        </Button>
        <Button
          disabled={!canSubmit || guardar.isPending}
          onClick={() => guardar.mutate()}
          size="lg"
        >
          {guardar.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {guardar.isPending ? "Subiendo y guardando..." : "Guardar recibo"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

type ItemDraft = {
  key: string;
  proveedor_id: string;
  concepto_id: string;
  numero_factura: string;
  factura_electronica: boolean;
  detalle: string;
  subtotal: string;
  iva: string;
  impoconsumo: string;
  retencion: string;
  reteica: string;
  reteiva: string;
};

function blankItem(): ItemDraft {
  return {
    key: Math.random().toString(36).slice(2),
    proveedor_id: "",
    concepto_id: "",
    numero_factura: "",
    factura_electronica: false,
    detalle: "",
    subtotal: "",
    iva: "0",
    impoconsumo: "0",
    retencion: "0",
    reteica: "0",
    reteiva: "0",
  };
}

function ItemRow({
  index,
  item,
  total,
  conceptos,
  empresa,
  onChange,
  onProveedorChange,
  onConceptoChange,
  onSubtotalChange,
  onRemove,
  canRemove,
}: {
  index: number;
  item: ItemDraft;
  total: number;
  conceptos: Concepto[];
  empresa?: string;
  onChange: (patch: Partial<ItemDraft>) => void;
  onProveedorChange: (v: string) => void;
  onConceptoChange: (v: string) => void;
  onSubtotalChange: (v: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const c = conceptos.find((x) => x.id === item.concepto_id);
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          Soporte #{index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canRemove}
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Proveedor *">
          <ProveedorPicker
            value={item.proveedor_id}
            onChange={onProveedorChange}
          />
        </Field>
        <Field label="Concepto *">
          <ConceptoPicker value={item.concepto_id} onChange={onConceptoChange} />
        </Field>
        <Field label="N° factura">
          <Input
            value={item.numero_factura}
            onChange={(e) => onChange({ numero_factura: e.target.value })}
            placeholder="FV-001"
          />
        </Field>
        <div className="flex items-center gap-2 md:pt-6">
          <Checkbox
            id={`fe-${item.key}`}
            checked={item.factura_electronica}
            onCheckedChange={(v) => onChange({ factura_electronica: v === true })}
          />
          <Label
            htmlFor={`fe-${item.key}`}
            className="text-sm font-normal cursor-pointer"
          >
            Factura electrónica
          </Label>
          {item.factura_electronica && (
            <p className="text-xs text-warning ml-2">
              Valida que la factura esté a nombre de {empresa || "la empresa"}.
            </p>
          )}
        </div>
        <Field label="Detalle">
          <Input
            value={item.detalle}
            onChange={(e) => onChange({ detalle: e.target.value })}
            placeholder="Descripción del soporte"
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Subtotal *">
          <Input
            type="number"
            min="0"
            value={item.subtotal}
            onChange={(e) => onSubtotalChange(e.target.value)}
          />
        </Field>
        <Field label="IVA">
          <Input
            type="number"
            min="0"
            value={item.iva}
            onChange={(e) => onChange({ iva: e.target.value })}
          />
        </Field>
        <Field label="Impoconsumo">
          <Input
            type="number"
            min="0"
            value={item.impoconsumo}
            onChange={(e) => onChange({ impoconsumo: e.target.value })}
          />
        </Field>
        <Field label="Rete Fuente">
          <Input
            type="number"
            min="0"
            value={item.retencion}
            onChange={(e) => onChange({ retencion: e.target.value })}
          />
        </Field>
        <Field label="ReteICA">
          <Input
            type="number"
            min="0"
            value={item.reteica}
            onChange={(e) => onChange({ reteica: e.target.value })}
          />
        </Field>
        <Field label="ReteIVA">
          <Input
            type="number"
            min="0"
            value={item.reteiva}
            onChange={(e) => onChange({ reteiva: e.target.value })}
          />
        </Field>
        <Field label="Total línea">
          <Input readOnly value={fmtMoney(total)} className="font-mono bg-muted" />
        </Field>
      </div>
      {c && (
        <p className="text-xs text-muted-foreground">
          Cuenta gasto <b>{c.cuenta_gasto}</b>
          {c.cuenta_iva && ` · IVA ${c.cuenta_iva} (${Math.round(Number(c.porcentaje_iva))}%)`}
          {c.cuenta_reteica && ` · ReteICA ${c.cuenta_reteica} (${Number(c.porcentaje_reteica)}%)`}
        </p>
      )}
    </div>
  );
}

