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
import { Upload, Loader2, FileText } from "lucide-react";
import { fmtMoney, pad } from "@/lib/format";
import { ProveedorPicker } from "@/components/ProveedorPicker";
import { Checkbox } from "@/components/ui/checkbox";

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

  const conceptoSel = useMemo(
    () => consQ.data?.find((c) => c.id === concepto),
    [consQ.data, concepto],
  );

  // Auto-calcular retención sugerida
  const onSubtotalChange = (v: string) => {
    setSubtotal(v);
    if (conceptoSel?.porcentaje_retencion) {
      const s = parseFloat(v) || 0;
      setRetencion(String(Math.round((s * Number(conceptoSel.porcentaje_retencion)) / 100)));
    }
  };

  const total =
    (parseFloat(subtotal) || 0) +
    (parseFloat(iva) || 0) +
    (parseFloat(impoconsumo) || 0) -
    (parseFloat(retencion) || 0);

  const excedeLimite =
    fondoQ.data && total > Number(fondoQ.data.monto_maximo_gasto);

  const canSubmit =
    fecha &&
    proveedor &&
    concepto &&
    detalle.trim() &&
    subtotal !== "" &&
    parseFloat(subtotal) >= 0 &&
    file &&
    !excedeLimite;

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

      const { data, error } = await supabase
        .from("movimientos")
        .insert({
          fecha,
          agencia_id: agencia || null,
          proveedor_id: proveedor,
          concepto_id: concepto,
          detalle,
          subtotal: parseFloat(subtotal),
          iva: parseFloat(iva) || 0,
          impoconsumo: parseFloat(impoconsumo) || 0,
          retencion: parseFloat(retencion) || 0,
          total,
          numero_factura: numeroFactura || null,
          factura_path: path,
          factura_url: urlData?.signedUrl ?? null,
          observaciones: observaciones || null,
          factura_electronica: facturaElectronica,
        })
        .select()
        .single();
      if (error) throw error;
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
          <CardTitle className="text-base">Información del gasto</CardTitle>
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
          <Field label="Detalle *">
            <Input
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Descripción del gasto"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valores</CardTitle>
          {conceptoSel && (
            <p className="text-xs text-muted-foreground">
              Parametrización: gasto <b>{conceptoSel.cuenta_gasto}</b>
              {conceptoSel.cuenta_retencion &&
                ` · retención ${conceptoSel.cuenta_retencion} (${conceptoSel.porcentaje_retencion}%)`}
            </p>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
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
          <div className="md:col-span-4 flex items-center justify-between p-4 rounded-lg bg-muted">
            <span className="text-sm text-muted-foreground">Monto a pagar</span>
            <span className="text-2xl font-semibold">{fmtMoney(total)}</span>
          </div>
          {excedeLimite && (
            <div className="md:col-span-4 text-sm p-3 rounded-md bg-destructive/10 text-destructive">
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
