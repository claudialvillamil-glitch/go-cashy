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
import { useMemo, useState } from "react";
import { getAgencias, getConceptos, getFondo, getProveedores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, FileText, Plus, Trash2 } from "lucide-react";
import { fmtMoney, pad } from "@/lib/format";
import { ProveedorPicker } from "@/components/ProveedorPicker";
import { Checkbox } from "@/components/ui/checkbox";
import type { Concepto } from "@/lib/db";

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

const RETEFUENTE_OPTIONS = [
  { value: "hotel", label: "Serv. hotel y restaurante (3,5%)", tarifa: 3.5 },
  { value: "serv4", label: "Servicios generales (4%)", tarifa: 4 },
  { value: "serv6", label: "Servicios generales (6%)", tarifa: 6 },
  { value: "fletes", label: "Fletes (1%)", tarifa: 1 },
];

type Taxes = {
  reteica_aplica: boolean;
  reteica_actividad: string;
  reteica_tarifa: string; // por mil
  reteiva_aplica: boolean;
  retefuente_aplica: boolean;
  retefuente_concepto: string;
};

const blankTaxes = (): Taxes => ({
  reteica_aplica: false,
  reteica_actividad: "servicios",
  reteica_tarifa: "0",
  reteiva_aplica: false,
  retefuente_aplica: false,
  retefuente_concepto: "serv4",
});

function calcReteIca(subtotal: number, tarifaPorMil: number) {
  return Math.round((subtotal * tarifaPorMil) / 1000);
}
function calcReteIva(iva: number) {
  return Math.round((iva * 15) / 100);
}
function calcRetefuente(subtotal: number, tarifa: number) {
  return Math.round((subtotal * tarifa) / 100);
}
function tarifaOf(concepto: string) {
  return RETEFUENTE_OPTIONS.find((o) => o.value === concepto)?.tarifa ?? 0;
}

function Nuevo() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const provsQ = useQuery({ queryKey: ["proveedores"], queryFn: getProveedores });
  const consQ = useQuery({ queryKey: ["conceptos"], queryFn: getConceptos });
  const agsQ = useQuery({ queryKey: ["agencias"], queryFn: getAgencias });
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
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
  const [proveedor, setProveedor] = useState<string>("");
  const [concepto, setConcepto] = useState<string>("");
  const [detalle, setDetalle] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [subtotal, setSubtotal] = useState<string>("");
  const [iva, setIva] = useState<string>("0");
  const [impoconsumo, setImpoconsumo] = useState<string>("0");
  const [retencion, setRetencion] = useState<string>("0");
  const [observaciones, setObservaciones] = useState("");
  const [facturaElectronica, setFacturaElectronica] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [multiSoporte, setMultiSoporte] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([blankItem()]);
  const [taxes, setTaxes] = useState<Taxes>(blankTaxes());

  const conceptoSel = useMemo(
    () => consQ.data?.find((c) => c.id === concepto),
    [consQ.data, concepto],
  );

  // Cálculos del bloque simple
  const simpleSub = parseFloat(subtotal) || 0;
  const simpleIva = parseFloat(iva) || 0;
  const simpleImp = parseFloat(impoconsumo) || 0;
  const simpleReteIca = taxes.reteica_aplica
    ? calcReteIca(simpleSub, parseFloat(taxes.reteica_tarifa) || 0)
    : 0;
  const simpleReteIva = taxes.reteiva_aplica ? calcReteIva(simpleIva) : 0;
  const simpleRetefuente = taxes.retefuente_aplica
    ? calcRetefuente(simpleSub, tarifaOf(taxes.retefuente_concepto))
    : parseFloat(retencion) || 0;

  const onSubtotalChange = (v: string) => {
    setSubtotal(v);
    if (!taxes.retefuente_aplica && conceptoSel?.porcentaje_retencion) {
      const s = parseFloat(v) || 0;
      setRetencion(String(Math.round((s * Number(conceptoSel.porcentaje_retencion)) / 100)));
    }
  };

  const itemCalcs = useMemo(() => {
    return items.map((it) => {
      const s = parseFloat(it.subtotal) || 0;
      const i = parseFloat(it.iva) || 0;
      const p = parseFloat(it.impoconsumo) || 0;
      const reteIca = it.reteica_aplica ? calcReteIca(s, parseFloat(it.reteica_tarifa) || 0) : 0;
      const reteIva = it.reteiva_aplica ? calcReteIva(i) : 0;
      const retefuente = it.retefuente_aplica
        ? calcRetefuente(s, tarifaOf(it.retefuente_concepto))
        : parseFloat(it.retencion) || 0;
      const total = s + i + p - retefuente - reteIca - reteIva;
      return { reteIca, reteIva, retefuente, total };
    });
  }, [items]);

  const totalSimple = simpleSub + simpleIva + simpleImp - simpleRetefuente - simpleReteIca - simpleReteIva;
  const totalMulti = itemCalcs.reduce((a, b) => a + b.total, 0);
  const total = multiSoporte ? totalMulti : totalSimple;

  const excedeLimite = fondoQ.data && total > Number(fondoQ.data.monto_maximo_gasto);

  const itemsValidos =
    !multiSoporte ||
    (items.length > 0 &&
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

  const onItemSubtotalChange = (idx: number, v: string) => {
    const it = items[idx];
    const c = consQ.data?.find((x) => x.id === it?.concepto_id);
    const patch: Partial<ItemDraft> = { subtotal: v };
    if (!it?.retefuente_aplica && c?.porcentaje_retencion) {
      const s = parseFloat(v) || 0;
      patch.retencion = String(Math.round((s * Number(c.porcentaje_retencion)) / 100));
    }
    setItem(idx, patch);
  };

  const guardar = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Adjunta la factura");
      const ext = file.name.split(".").pop();
      const path = `${new Date().getFullYear()}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("facturas").upload(path, file, {
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const { data: urlData } = supabase.storage.from("facturas").createSignedUrl
        ? await supabase.storage.from("facturas").createSignedUrl(path, 60 * 60 * 24 * 365)
        : { data: { signedUrl: "" } };

      const first = multiSoporte ? items[0] : null;
      const proveedorId = multiSoporte ? first!.proveedor_id : proveedor;
      const conceptoId = multiSoporte ? first!.concepto_id : concepto;
      const nFact = multiSoporte
        ? (items.map((i) => i.numero_factura).filter(Boolean).join(", ") || null)
        : (numeroFactura || null);
      const fe = multiSoporte ? items.some((i) => i.factura_electronica) : facturaElectronica;

      const sumSub = multiSoporte
        ? items.reduce((a, i) => a + (parseFloat(i.subtotal) || 0), 0)
        : simpleSub;
      const sumIva = multiSoporte
        ? items.reduce((a, i) => a + (parseFloat(i.iva) || 0), 0)
        : simpleIva;
      const sumImp = multiSoporte
        ? items.reduce((a, i) => a + (parseFloat(i.impoconsumo) || 0), 0)
        : simpleImp;
      const sumRet = multiSoporte
        ? itemCalcs.reduce((a, i) => a + i.retefuente, 0)
        : simpleRetefuente;
      const sumReteIca = multiSoporte
        ? itemCalcs.reduce((a, i) => a + i.reteIca, 0)
        : simpleReteIca;
      const sumReteIva = multiSoporte
        ? itemCalcs.reduce((a, i) => a + i.reteIva, 0)
        : simpleReteIva;

      const cabTaxes = multiSoporte
        ? {
            reteica_aplica: items.some((i) => i.reteica_aplica),
            reteica_actividad: null,
            reteica_tarifa: 0,
            reteica_valor: sumReteIca,
            reteiva_aplica: items.some((i) => i.reteiva_aplica),
            reteiva_valor: sumReteIva,
            retefuente_aplica: items.some((i) => i.retefuente_aplica),
            retefuente_concepto: null,
            retefuente_tarifa: 0,
          }
        : {
            reteica_aplica: taxes.reteica_aplica,
            reteica_actividad: taxes.reteica_aplica ? taxes.reteica_actividad : null,
            reteica_tarifa: taxes.reteica_aplica ? parseFloat(taxes.reteica_tarifa) || 0 : 0,
            reteica_valor: sumReteIca,
            reteiva_aplica: taxes.reteiva_aplica,
            reteiva_valor: sumReteIva,
            retefuente_aplica: taxes.retefuente_aplica,
            retefuente_concepto: taxes.retefuente_aplica ? taxes.retefuente_concepto : null,
            retefuente_tarifa: taxes.retefuente_aplica ? tarifaOf(taxes.retefuente_concepto) : 0,
          };

      const { data, error } = await supabase
        .from("movimientos")
        .insert({
          fecha,
          agencia_id: agencia || null,
          proveedor_id: proveedorId,
          concepto_id: conceptoId,
          detalle,
          subtotal: sumSub,
          iva: sumIva,
          impoconsumo: sumImp,
          retencion: sumRet,
          total,
          numero_factura: nFact,
          factura_path: path,
          factura_url: urlData?.signedUrl ?? null,
          observaciones: observaciones || null,
          factura_electronica: fe,
          multi_soporte: multiSoporte,
          ...cabTaxes,
        })
        .select()
        .single();
      if (error) throw error;

      if (multiSoporte && data) {
        const rows = items.map((it, idx) => ({
          movimiento_id: data.id,
          proveedor_id: it.proveedor_id,
          concepto_id: it.concepto_id,
          numero_factura: it.numero_factura || null,
          factura_electronica: it.factura_electronica,
          detalle: it.detalle || null,
          subtotal: parseFloat(it.subtotal) || 0,
          iva: parseFloat(it.iva) || 0,
          impoconsumo: parseFloat(it.impoconsumo) || 0,
          retencion: itemCalcs[idx].retefuente,
          total: itemCalcs[idx].total,
          orden: idx,
          reteica_aplica: it.reteica_aplica,
          reteica_actividad: it.reteica_aplica ? it.reteica_actividad : null,
          reteica_tarifa: it.reteica_aplica ? parseFloat(it.reteica_tarifa) || 0 : 0,
          reteica_valor: itemCalcs[idx].reteIca,
          reteiva_aplica: it.reteiva_aplica,
          reteiva_valor: itemCalcs[idx].reteIva,
          retefuente_aplica: it.retefuente_aplica,
          retefuente_concepto: it.retefuente_aplica ? it.retefuente_concepto : null,
          retefuente_tarifa: it.retefuente_aplica ? tarifaOf(it.retefuente_concepto) : 0,
        }));
        const ins = await supabase.from("movimiento_items").insert(rows);
        if (ins.error) throw ins.error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Recibo registrado correctamente");
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del recibo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="N° Recibo">
            <Input
              value={nextConsQ.data ? pad(nextConsQ.data, 3) : "..."}
              readOnly
              className="font-mono bg-muted"
            />
          </Field>
          <Field label="Fecha *">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Agencia">
            <Select value={agencia} onValueChange={setAgencia}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una agencia" />
              </SelectTrigger>
              <SelectContent>
                {agsQ.data?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Detalle *">
            <Input
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Ej. Legalización de viáticos, viaje a..."
            />
          </Field>

          <div className="md:col-span-2 flex items-start gap-2 p-3 rounded-md border bg-muted/40">
            <Checkbox
              id="multi-soporte"
              checked={multiSoporte}
              onCheckedChange={(v) => setMultiSoporte(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="multi-soporte" className="text-sm font-normal cursor-pointer">
              ¿El recibo contiene varios soportes?
              <span className="block text-xs text-muted-foreground mt-0.5">
                Actívalo si es una legalización de viáticos o compras a varios proveedores. Podrás agregar múltiples conceptos y facturas.
              </span>
            </Label>
          </div>
        </CardContent>
      </Card>

      {!multiSoporte && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proveedor y valores</CardTitle>
            {conceptoSel && (
              <p className="text-xs text-muted-foreground">
                Parametrización: gasto <b>{conceptoSel.cuenta_gasto}</b>
                {conceptoSel.cuenta_retencion &&
                  ` · retención ${conceptoSel.cuenta_retencion} (${conceptoSel.porcentaje_retencion}%)`}
              </p>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Proveedor *">
              <ProveedorPicker value={proveedor} onChange={setProveedor} />
            </Field>
            <Field label="Concepto del gasto *">
              <Select value={concepto} onValueChange={setConcepto}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el concepto" />
                </SelectTrigger>
                <SelectContent>
                  {consQ.data?.filter((c) => c.activo).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Número de factura">
              <Input
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="FV-001"
              />
            </Field>
            <div className="flex items-center gap-2 md:pt-6">
              <Checkbox
                id="factura-electronica"
                checked={facturaElectronica}
                onCheckedChange={(v) => setFacturaElectronica(v === true)}
              />
              <Label htmlFor="factura-electronica" className="text-sm font-normal cursor-pointer">
                El proveedor emite factura electrónica
              </Label>
            </div>

            <div className="md:col-span-2 grid gap-4 md:grid-cols-4">
              <Field label="Subtotal *">
                <Input
                  type="number"
                  min="0"
                  value={subtotal}
                  onChange={(e) => onSubtotalChange(e.target.value)}
                />
              </Field>
              <Field label="IVA">
                <Input type="number" min="0" value={iva} onChange={(e) => setIva(e.target.value)} />
              </Field>
              <Field label="Impoconsumo">
                <Input
                  type="number"
                  min="0"
                  value={impoconsumo}
                  onChange={(e) => setImpoconsumo(e.target.value)}
                />
              </Field>
              <Field label={taxes.retefuente_aplica ? "Retención (auto)" : "Retención"}>
                <Input
                  type="number"
                  min="0"
                  value={taxes.retefuente_aplica ? String(simpleRetefuente) : retencion}
                  readOnly={taxes.retefuente_aplica}
                  className={taxes.retefuente_aplica ? "bg-muted" : ""}
                  onChange={(e) => setRetencion(e.target.value)}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <TaxesBlock
                taxes={taxes}
                onChange={(patch) => setTaxes((p) => ({ ...p, ...patch }))}
                reteIcaValor={simpleReteIca}
                reteIvaValor={simpleReteIva}
                retefuenteValor={simpleRetefuente}
              />
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
              onClick={() => setItems((p) => [...p, blankItem()])}
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
                calc={itemCalcs[idx] ?? { reteIca: 0, reteIva: 0, retefuente: 0, total: 0 }}
                conceptos={consQ.data ?? []}
                onChange={(patch) => setItem(idx, patch)}
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
              El monto supera el límite autorizado por gasto ({fmtMoney(fondoQ.data?.monto_maximo_gasto)}).
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Soporte documental *</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 10 * 1024 * 1024) {
                  toast.error("El archivo supera 10 MB");
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
                <div className="text-sm font-medium">Adjuntar factura</div>
                <div className="text-xs text-muted-foreground">PDF o imagen · máximo 10 MB</div>
              </>
            )}
          </label>
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
          Guardar recibo
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

function TaxesBlock({
  taxes,
  onChange,
  reteIcaValor,
  reteIvaValor,
  retefuenteValor,
  compact = false,
}: {
  taxes: Taxes;
  onChange: (patch: Partial<Taxes>) => void;
  reteIcaValor: number;
  reteIvaValor: number;
  retefuenteValor: number;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-md border bg-muted/30 p-3 space-y-3 ${compact ? "text-sm" : ""}`}>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Retenciones e impuestos
      </div>

      {/* ReteICA */}
      <div className="grid gap-2 md:grid-cols-[auto_1fr_1fr_1fr] md:items-end">
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            checked={taxes.reteica_aplica}
            onCheckedChange={(v) => onChange({ reteica_aplica: v === true })}
          />
          <Label className="text-sm font-normal">ReteICA</Label>
        </div>
        <Field label="Actividad">
          <Select
            value={taxes.reteica_actividad}
            onValueChange={(v) => onChange({ reteica_actividad: v })}
            disabled={!taxes.reteica_aplica}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="servicios">Servicios</SelectItem>
              <SelectItem value="compras">Compras</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tarifa (‰ por mil)">
          <Input
            type="number"
            step="0.001"
            min="0"
            value={taxes.reteica_tarifa}
            disabled={!taxes.reteica_aplica}
            onChange={(e) => onChange({ reteica_tarifa: e.target.value })}
            placeholder="Ej. 9.66"
          />
        </Field>
        <Field label="Valor">
          <Input readOnly value={fmtMoney(reteIcaValor)} className="font-mono bg-muted" />
        </Field>
      </div>

      {/* ReteIVA */}
      <div className="grid gap-2 md:grid-cols-[auto_1fr_1fr_1fr] md:items-end">
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            checked={taxes.reteiva_aplica}
            onCheckedChange={(v) => onChange({ reteiva_aplica: v === true })}
          />
          <Label className="text-sm font-normal">ReteIVA</Label>
        </div>
        <div className="md:col-span-2 text-xs text-muted-foreground">
          Se calcula como 15% del IVA facturado.
        </div>
        <Field label="Valor">
          <Input readOnly value={fmtMoney(reteIvaValor)} className="font-mono bg-muted" />
        </Field>
      </div>

      {/* Retefuente renta */}
      <div className="grid gap-2 md:grid-cols-[auto_1fr_1fr_1fr] md:items-end">
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            checked={taxes.retefuente_aplica}
            onCheckedChange={(v) => onChange({ retefuente_aplica: v === true })}
          />
          <Label className="text-sm font-normal">Retefuente renta</Label>
        </div>
        <Field label="Concepto">
          <Select
            value={taxes.retefuente_concepto}
            onValueChange={(v) => onChange({ retefuente_concepto: v })}
            disabled={!taxes.retefuente_aplica}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETEFUENTE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="hidden md:block" />
        <Field label="Valor">
          <Input readOnly value={fmtMoney(retefuenteValor)} className="font-mono bg-muted" />
        </Field>
      </div>
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
  reteica_aplica: boolean;
  reteica_actividad: string;
  reteica_tarifa: string;
  reteiva_aplica: boolean;
  retefuente_aplica: boolean;
  retefuente_concepto: string;
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
    reteica_aplica: false,
    reteica_actividad: "servicios",
    reteica_tarifa: "0",
    reteiva_aplica: false,
    retefuente_aplica: false,
    retefuente_concepto: "serv4",
  };
}

function ItemRow({
  index,
  item,
  calc,
  conceptos,
  onChange,
  onSubtotalChange,
  onRemove,
  canRemove,
}: {
  index: number;
  item: ItemDraft;
  calc: { reteIca: number; reteIva: number; retefuente: number; total: number };
  conceptos: Concepto[];
  onChange: (patch: Partial<ItemDraft>) => void;
  onSubtotalChange: (v: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const c = conceptos.find((x) => x.id === item.concepto_id);
  const itemTaxes: Taxes = {
    reteica_aplica: item.reteica_aplica,
    reteica_actividad: item.reteica_actividad,
    reteica_tarifa: item.reteica_tarifa,
    reteiva_aplica: item.reteiva_aplica,
    retefuente_aplica: item.retefuente_aplica,
    retefuente_concepto: item.retefuente_concepto,
  };
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
            onChange={(v) => onChange({ proveedor_id: v })}
          />
        </Field>
        <Field label="Concepto *">
          <Select
            value={item.concepto_id}
            onValueChange={(v) => onChange({ concepto_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el concepto" />
            </SelectTrigger>
            <SelectContent>
              {conceptos.filter((x) => x.activo).map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  {x.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
        <Field label="Detalle">
          <Input
            value={item.detalle}
            onChange={(e) => onChange({ detalle: e.target.value })}
            placeholder="Descripción del soporte"
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
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
        <Field label={item.retefuente_aplica ? "Retención (auto)" : "Retención"}>
          <Input
            type="number"
            min="0"
            value={item.retefuente_aplica ? String(calc.retefuente) : item.retencion}
            readOnly={item.retefuente_aplica}
            className={item.retefuente_aplica ? "bg-muted" : ""}
            onChange={(e) => onChange({ retencion: e.target.value })}
          />
        </Field>
        <Field label="Total línea">
          <Input readOnly value={fmtMoney(calc.total)} className="font-mono bg-muted" />
        </Field>
      </div>

      <TaxesBlock
        taxes={itemTaxes}
        onChange={(patch) => onChange(patch as Partial<ItemDraft>)}
        reteIcaValor={calc.reteIca}
        reteIvaValor={calc.reteIva}
        retefuenteValor={calc.retefuente}
        compact
      />

      {c && (
        <p className="text-xs text-muted-foreground">
          Cuenta gasto <b>{c.cuenta_gasto}</b>
          {c.cuenta_retencion && ` · retención ${c.cuenta_retencion} (${c.porcentaje_retencion}%)`}
        </p>
      )}
    </div>
  );
}
