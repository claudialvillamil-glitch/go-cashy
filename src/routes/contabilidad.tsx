import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout, useAgenciaFiltro } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import {
  getAgencias,
  getConceptos,
  getMovimientos,
  getProveedores,
  getFondo,
  getTarifasRetencionRenta,
  getConceptosRetencionRenta,
  getConceptosReteica,
  getTarifasReteicaCiudad,
  folioRecibo,
  type Movimiento,
} from "@/lib/db";
import { fmtDate, fmtMoney, pad } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Eye, ExternalLink as ExternalLinkIcon, FileSpreadsheet, FileText, Loader2, Printer } from "lucide-react";
import { exportAsientosContablesExcel, exportLibroCajaMenorConSoportesPDF, exportExcel, exportPDF } from "@/lib/exports";

export const Route = createFileRoute("/contabilidad")({
  head: () => ({
    meta: [
      { title: "Contabilidad · Caja Menor" },
      {
        name: "description",
        content:
          "Detalle contable de cada gasto: subtotales, IVA, retenciones, soportes y documentos DIAN pendientes.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <Contabilidad />
    </AppLayout>
  ),
});

function Contabilidad() {
  const qc = useQueryClient();
  const movsQ = useQuery({ queryKey: ["movimientos"], queryFn: getMovimientos });
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const tarifasQ = useQuery({ queryKey: ["tarifas-retencion"], queryFn: getTarifasRetencionRenta });
  const conceptosRetencionRentaQ = useQuery({
    queryKey: ["conceptos-retencion-renta"],
    queryFn: getConceptosRetencionRenta,
  });
  const reteicaConceptosQ = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const reteicaCiudadQ = useQuery({ queryKey: ["tarifas-reteica-ciudad"], queryFn: getTarifasReteicaCiudad });
  const agsQ = useQuery({ queryKey: ["agencias"], queryFn: getAgencias });
  const provsQ = useQuery({ queryKey: ["proveedores"], queryFn: getProveedores });
  const consQ = useQuery({ queryKey: ["conceptos"], queryFn: getConceptos });

  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [reciboDesde, setReciboDesde] = useState("");
  const [reciboHasta, setReciboHasta] = useState("");
  const [agencia, setAgencia] = useState<string>("todas");
  const [proveedor, setProveedor] = useState<string>("todos");
  const [concepto, setConcepto] = useState<string>("todos");
  const [estado, setEstado] = useState<string>("todos");
  const [docSoporte, setDocSoporte] = useState<string>("todos");
  const [soporte, setSoporte] = useState<string>("todos");
  const [detalle, setDetalle] = useState<Movimiento | null>(null);

  const toggleDoc = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: boolean }) => {
      const { error } = await supabase
        .from("movimientos")
        .update({ doc_soporte_generado: valor })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimientos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const movs = movsQ.data ?? [];

  const { agenciaId: agenciaFiltroGlobal, fondoAgenciaId: fondoFiltroGlobal } = useAgenciaFiltro();
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return movs.filter((m) => {
      if (agenciaFiltroGlobal && m.agencia_id !== agenciaFiltroGlobal) return false;
      if (fondoFiltroGlobal && m.fondo_agencia_id !== fondoFiltroGlobal) return false;
      if (desde && m.fecha < desde) return false;
      if (hasta && m.fecha > hasta) return false;
      if (reciboDesde && m.consecutivo < Number(reciboDesde)) return false;
      if (reciboHasta && m.consecutivo > Number(reciboHasta)) return false;
      if (agencia !== "todas" && m.agencia_id !== agencia) return false;
      if (proveedor !== "todos" && m.proveedor_id !== proveedor) return false;
      if (concepto !== "todos" && m.concepto_id !== concepto) return false;
      if (estado === "reembolsado" && m.reembolsos?.estado !== "pagado") return false;
      if (estado === "pendiente" && m.reembolsos?.estado === "pagado") return false;
      if (docSoporte === "pendiente" && (m.factura_electronica || m.doc_soporte_generado)) return false;
      if (docSoporte === "generado" && (m.factura_electronica || !m.doc_soporte_generado)) return false;
      if (docSoporte === "no_aplica" && !m.factura_electronica) return false;
      if (soporte === "con" && !m.factura_path) return false;
      if (soporte === "sin" && m.factura_path) return false;
      if (q) {
        const texto = [
          m.proveedores?.nombre,
          m.proveedores?.nit,
          m.conceptos?.nombre,
          m.detalle,
          m.numero_factura,
          folioRecibo(m),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [movs, busqueda, desde, hasta, reciboDesde, reciboHasta, agencia, proveedor, concepto, estado, docSoporte, soporte, agenciaFiltroGlobal, fondoFiltroGlobal]);

  const noReembolsados = filtrados.filter(
    (m) => m.reembolsos?.estado !== "pagado" && m.estado !== "anulado",
  );

  const generarConSoportes = useMutation({
    mutationFn: async () => {
      if (!fondoQ.data) throw new Error("Falta cargar el fondo");
      await exportLibroCajaMenorConSoportesPDF(
        filtrados,
        fondoQ.data,
        tarifasQ.data,
        reteicaConceptosQ.data,
        reteicaCiudadQ.data,
      );
    },
    onError: (e: Error) => toast.error("No se pudo generar el reporte: " + e.message),
  });

  const pendientesDocSoporte = filtrados.filter(
    (m) => !m.factura_electronica && !m.doc_soporte_generado,
  ).length;
  const sinSoporte = filtrados.filter((m) => !m.factura_path).length;

  const totales = filtrados.reduce(
    (acc, m) => ({
      subtotal: acc.subtotal + Number(m.subtotal),
      iva: acc.iva + Number(m.iva),
      retencion: acc.retencion + Number(m.retencion),
      reteica: acc.reteica + Number(m.reteica),
      reteiva: acc.reteiva + Number(m.reteiva),
      total: acc.total + Number(m.total),
    }),
    { subtotal: 0, iva: 0, retencion: 0, reteica: 0, reteiva: 0, total: 0 },
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contabilidad</h1>
          <p className="text-sm text-muted-foreground">
            Detalle de cada gasto para subir al programa contable, con seguimiento de soportes y
            documentos DIAN.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            disabled={generarConSoportes.isPending || filtrados.length === 0}
            onClick={() => generarConSoportes.mutate()}
          >
            {generarConSoportes.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Recibos + soportes (PDF)
          </Button>
          <Button
            variant="outline"
            disabled={!fondoQ.data || filtrados.length === 0}
            onClick={() =>
              fondoQ.data &&
              exportAsientosContablesExcel(
                filtrados,
                fondoQ.data,
                tarifasQ.data,
                reteicaConceptosQ.data,
                reteicaCiudadQ.data,
                conceptosRetencionRentaQ.data,
              )
            }
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar asientos contables (Excel)
          </Button>
          <Button
            variant="outline"
            disabled={!fondoQ.data || filtrados.length === 0}
            onClick={() => fondoQ.data && exportExcel(filtrados, fondoQ.data)}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Reporte de gastos y saldo (Excel)
          </Button>
          <Button
            variant="outline"
            disabled={!fondoQ.data || noReembolsados.length === 0}
            onClick={() =>
              fondoQ.data &&
              exportPDF(noReembolsados, fondoQ.data, undefined, tarifasQ.data, reteicaConceptosQ.data, reteicaCiudadQ.data, conceptosRetencionRentaQ.data)
            }
          >
            <FileText className="h-4 w-4 mr-2" /> Reporte gastos y saldos (PDF)
          </Button>
          <Button
            variant="outline"
            disabled={!fondoQ.data || noReembolsados.length === 0}
            onClick={() =>
              fondoQ.data &&
              exportPDF(noReembolsados, fondoQ.data, "imprimir", tarifasQ.data, reteicaConceptosQ.data, reteicaCiudadQ.data, conceptosRetencionRentaQ.data)
            }
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir reporte
          </Button>
        </div>
      </header>

      {pendientesDocSoporte > 0 && (
        <div className="p-3 rounded-lg border border-warning/40 bg-warning/10 text-sm">
          <span className="font-medium">{pendientesDocSoporte}</span> gasto
          {pendientesDocSoporte === 1 ? "" : "s"} sin factura electrónica todavía necesita
          {pendientesDocSoporte === 1 ? "" : "n"} que generes el Documento Soporte en la DIAN.
        </div>
      )}

      {sinSoporte > 0 && (
        <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
          <span className="font-medium">{sinSoporte}</span> gasto{sinSoporte === 1 ? "" : "s"} no
          tiene{sinSoporte === 1 ? "" : "n"} ningún archivo de soporte adjunto. Revísalo{sinSoporte === 1 ? "" : "s"} antes de subir a contabilidad.
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por proveedor, NIT, concepto, detalle o N° de factura/recibo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Recibo desde</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ej. 100"
                value={reciboDesde}
                onChange={(e) => setReciboDesde(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Recibo hasta</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ej. 200"
                value={reciboHasta}
                onChange={(e) => setReciboHasta(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Agencia</Label>
              <Select value={agencia} onValueChange={setAgencia}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {agsQ.data?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.codigo != null ? `${a.codigo} - ${a.nombre}` : a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Proveedor</Label>
              <Select value={proveedor} onValueChange={setProveedor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {provsQ.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Concepto</Label>
              <Select value={concepto} onValueChange={setConcepto}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {consQ.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente de reembolso</SelectItem>
                  <SelectItem value="reembolsado">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Documento soporte DIAN</Label>
              <Select value={docSoporte} onValueChange={setDocSoporte}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="generado">Ya generado</SelectItem>
                  <SelectItem value="no_aplica">No aplica (F.E.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Archivo de soporte</Label>
              <Select value={soporte} onValueChange={setSoporte}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="con">Con soporte adjunto</SelectItem>
                  <SelectItem value="sin">Sin soporte adjunto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Recibo</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Proveedor</th>
                <th className="px-3 py-2 font-medium">NIT</th>
                <th className="px-3 py-2 font-medium">Concepto</th>
                <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                <th className="px-3 py-2 font-medium text-right">IVA</th>
                <th className="px-3 py-2 font-medium text-right">Rte.Fte</th>
                <th className="px-3 py-2 font-medium text-right">ReteICA</th>
                <th className="px-3 py-2 font-medium text-right">ReteIVA</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
                <th className="px-3 py-2 font-medium">Emite factura</th>
                <th className="px-3 py-2 font-medium">Doc. soporte DIAN</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m) => (
                <FilaMovimiento
                  key={m.id}
                  m={m}
                  onToggleDoc={(v) => toggleDoc.mutate({ id: m.id, valor: v })}
                  onVerDetalle={() => setDetalle(m)}
                />
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={14} className="text-center py-10 text-muted-foreground">
                    No hay movimientos con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
            {filtrados.length > 0 && (
              <tfoot className="bg-muted/50 font-medium">
                <tr>
                  <td className="px-3 py-2" colSpan={5}>
                    Totales ({filtrados.length})
                  </td>
                  <td className="px-3 py-2 text-right">{fmtMoney(totales.subtotal)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(totales.iva)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(totales.retencion)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(totales.reteica)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(totales.reteiva)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(totales.total)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>

      <DetalleGastoDialog movimiento={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}

function FilaMovimiento({
  m,
  onToggleDoc,
  onVerDetalle,
}: {
  m: Movimiento;
  onToggleDoc: (v: boolean) => void;
  onVerDetalle: () => void;
}) {
  const requiereDoc = !m.factura_electronica;
  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="px-3 py-2 font-mono">{folioRecibo(m)}</td>
      <td className="px-3 py-2">{fmtDate(m.fecha)}</td>
      <td className="px-3 py-2">{m.proveedores?.nombre}</td>
      <td className="px-3 py-2 font-mono">{m.proveedores?.nit}</td>
      <td className="px-3 py-2 text-muted-foreground">{m.conceptos?.nombre}</td>
      <td className="px-3 py-2 text-right">{fmtMoney(m.subtotal)}</td>
      <td className="px-3 py-2 text-right">{fmtMoney(m.iva)}</td>
      <td className="px-3 py-2 text-right">{fmtMoney(m.retencion)}</td>
      <td className="px-3 py-2 text-right">{fmtMoney(m.reteica)}</td>
      <td className="px-3 py-2 text-right">{fmtMoney(m.reteiva)}</td>
      <td className="px-3 py-2 text-right font-medium">{fmtMoney(m.total)}</td>
      <td className="px-3 py-2">
        <Badge variant={m.factura_electronica ? "default" : "secondary"}>
          {m.factura_electronica ? "Sí" : "No"}
        </Badge>
      </td>
      <td className="px-3 py-2">
        {requiereDoc ? (
          <div className="flex items-center gap-1.5">
            <Checkbox checked={m.doc_soporte_generado} onCheckedChange={(v) => onToggleDoc(v === true)} />
            <span className={m.doc_soporte_generado ? "text-success" : "text-warning"}>
              {m.doc_soporte_generado ? "Generado" : "Pendiente"}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">No aplica</span>
        )}
      </td>
      <td className="px-3 py-2">
        <Button size="icon" variant="ghost" onClick={onVerDetalle} title="Ver detalle">
          <Eye className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

function DetalleGastoDialog({
  movimiento,
  onClose,
}: {
  movimiento: Movimiento | null;
  onClose: () => void;
}) {
  const [urlSoporte, setUrlSoporte] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setUrlSoporte(null);
    if (!movimiento?.factura_path) return;
    setCargando(true);
    supabase.storage
      .from("facturas")
      .createSignedUrl(movimiento.factura_path, 60 * 10)
      .then(({ data, error }) => {
        setCargando(false);
        if (error || !data?.signedUrl) {
          toast.error("No se pudo cargar el soporte");
          return;
        }
        setUrlSoporte(data.signedUrl);
      });
  }, [movimiento?.factura_path]);

  if (!movimiento) return null;
  const m = movimiento;
  const esImagen = /\.(jpe?g|png|webp|gif)$/i.test(m.factura_path ?? "");
  const esPdf = /\.pdf$/i.test(m.factura_path ?? "");

  return (
    <Dialog open={!!movimiento} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del gasto N° {folioRecibo(m)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Fecha" value={fmtDate(m.fecha)} />
            <Info label="Agencia" value={m.agencias?.nombre ?? "—"} />
            <Info label="Proveedor" value={m.proveedores?.nombre ?? ""} />
            <Info label="NIT" value={m.proveedores?.nit ?? ""} />
            <Info label="Concepto" value={m.conceptos?.nombre ?? ""} />
            <Info label="Cuenta gasto" value={m.conceptos?.cuenta_gasto ?? ""} />
            <Info label="Emite factura electrónica" value={m.factura_electronica ? "Sí" : "No"} />
            <Info label="Estado" value={m.reembolsos?.estado === "pagado" ? "Reembolsado" : "Pendiente"} />
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 rounded-md bg-muted">
            <Info label="Subtotal" value={fmtMoney(m.subtotal)} />
            <Info label="IVA" value={fmtMoney(m.iva)} />
            <Info label="Impoconsumo" value={fmtMoney(m.impoconsumo)} />
            <Info label="Rte. Fuente" value={fmtMoney(m.retencion)} />
            <Info label="ReteICA" value={fmtMoney(m.reteica)} />
            <Info label="ReteIVA" value={fmtMoney(m.reteiva)} />
          </div>
          <div className="flex justify-between p-3 rounded-md bg-primary text-primary-foreground">
            <span>Total</span>
            <span className="font-semibold">{fmtMoney(m.total)}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Soporte escaneado</p>
              {urlSoporte && (
                <a
                  href={urlSoporte}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Abrir en pestaña nueva <ExternalLinkIcon className="h-3 w-3" />
                </a>
              )}
            </div>
            {!m.factura_path && (
              <div className="border rounded-md p-6 text-center text-sm text-destructive">
                No hay ningún archivo de soporte adjunto para este gasto.
              </div>
            )}
            {m.factura_path && cargando && (
              <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">
                Cargando soporte...
              </div>
            )}
            {m.factura_path && !cargando && urlSoporte && (
              <div className="border rounded-md overflow-hidden bg-muted/30">
                {esImagen && (
                  <img src={urlSoporte} alt="Soporte del gasto" className="w-full max-h-[500px] object-contain" />
                )}
                {esPdf && (
                  <>
                    <iframe src={urlSoporte} title="Soporte del gasto" className="w-full h-[500px]" />
                    <p className="text-xs text-muted-foreground text-center py-2 border-t">
                      ¿No ves el PDF arriba? Usa el enlace "Abrir en pestaña nueva".
                    </p>
                  </>
                )}
                {!esImagen && !esPdf && (
                  <div className="p-6 text-center text-sm">
                    <a href={urlSoporte} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Abrir archivo de soporte
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
