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

  const conceptoSel = useMemo(
    () => consQ.data?.find((c) => c.id === concepto),
    [consQ.data, concepto],
  );

  // Auto-calcular retención sugerida (modo simple)
  const onSubtotalChange = (v: string) => {
    setSubtotal(v);
    if (conceptoSel?.porcentaje_retencion) {
      const s = parseFloat(v) || 0;
      setRetencion(String(Math.round((s * Number(conceptoSel.porcentaje_retencion)) / 100)));
    }
  };

  const itemTotals = useMemo(() => {
    return items.map((it) => {
      const s = parseFloat(it.subtotal) || 0;
      const i = parseFloat(it.iva) || 0;
      const p = parseFloat(it.impoconsumo) || 0;
      const r = parseFloat(it.retencion) || 0;
      return s + i + p - r;
    });
  }, [items]);

  const totalSimple =
    (parseFloat(subtotal) || 0) +
    (parseFloat(iva) || 0) +
    (parseFloat(impoconsumo) || 0) -
    (parseFloat(retencion) || 0);

  const totalMulti = itemTotals.reduce((a, b) => a + b, 0);
  const total = multiSoporte ? totalMulti : totalSimple;

  const excedeLimite =
    fondoQ.data && total > Number(fondoQ.data.monto_maximo_gasto);

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
    const c = consQ.data?.find((x) => x.id === items[idx]?.concepto_id);
    const patch: Partial<ItemDraft> = { subtotal: v };
    if (c?.porcentaje_retencion) {
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

      // Cabecera: en modo multi tomamos la 1a línea como proveedor/concepto principal
      const first = multiSoporte ? items[0] : null;
      const proveedorId = multiSoporte ? first!.proveedor_id : proveedor;
      const conceptoId = multiSoporte ? first!.concepto_id : concepto;
      const nFact = multiSoporte
        ? (items.map((i) => i.numero_factura).filter(Boolean).join(", ") || null)
        : (numeroFactura || null);
      const fe = multiSoporte ? items.some((i) => i.factura_electronica) : facturaElectronica;

      const sumSub = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.subtotal) || 0), 0) : parseFloat(subtotal);
      const sumIva = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.iva) || 0), 0) : (parseFloat(iva) || 0);
      const sumImp = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.impoconsumo) || 0), 0) : (parseFloat(impoconsumo) || 0);
      const sumRet = multiSoporte ? items.reduce((a, i) => a + (parseFloat(i.retencion) || 0), 0) : (parseFloat(retencion) || 0);

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
          retencion: parseFloat(it.retencion) || 0,
          total: itemTotals[idx],
          orden: idx,
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
              <Field label="Retención">
                <Input
                  type="number"
                  min="0"
                  value={retencion}
                  onChange={(e) => setRetencion(e.target.value)}
                />
              </Field>
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
                total={itemTotals[idx] ?? 0}
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
