import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout, useAgenciaFiltro } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import {
  computeAsiento,
  getFondo,
  getMovimientos,
  getTarifasRetencionRenta,
  getConceptosReteica,
  getTarifasReteicaCiudad,
  getMyProfile,
  getAgencias,
  getSoportesAdicionales,
  folioRecibo,
  type Movimiento,
} from "@/lib/db";
import { ProveedorPicker } from "@/components/ProveedorPicker";
import { ConceptoPicker } from "@/components/ConceptoPicker";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtDate, fmtMoney, pad } from "@/lib/format";
import { Download, FileText, FileSpreadsheet, Search, Trash2, Eye, Layers, Printer, Ban, RotateCcw, Pencil, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportReciboPDF, exportSaldoPendientesPDF, exportSaldoPendientesExcel } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/movimientos")({
  head: () => ({
    meta: [
      { title: "Movimientos · Caja Menor" },
      { name: "description", content: "Historial y exportación de movimientos de caja menor." },
    ],
  }),
  component: () => (
    <AppLayout>
      <Movs />
    </AppLayout>
  ),
});

function Movs() {
  const qc = useQueryClient();
  const movsQ = useQuery({ queryKey: ["movimientos"], queryFn: getMovimientos });
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile });
  const esAdmin = profileQ.data?.rol === "admin";
  const puedeEditar = esAdmin || profileQ.data?.rol === "analista_contable";
  const tarifasQ = useQuery({ queryKey: ["tarifas-retencion"], queryFn: getTarifasRetencionRenta });
  const reteicaConceptosQ = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const reteicaCiudadQ = useQuery({ queryKey: ["tarifas-reteica-ciudad"], queryFn: getTarifasReteicaCiudad });
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todos" | "multi" | "simple">("todos");
  const [detail, setDetail] = useState<Movimiento | null>(null);
  const [preview, setPreview] = useState<{ label: string; url: string; path: string } | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const soportesExtraQ = useQuery({
    queryKey: ["soportes-extra", detail?.id],
    queryFn: () => getSoportesAdicionales(detail!.id),
    enabled: !!detail,
  });
  const [editItem, setEditItem] = useState<Movimiento | null>(null);

  const { agenciaId: agenciaFiltro, fondoAgenciaId: fondoFiltro } = useAgenciaFiltro();
  const filtered = useMemo(() => {
    let list = movsQ.data ?? [];
    if (agenciaFiltro) {
      list = list.filter(
        (m) => m.agencia_id === agenciaFiltro && (!fondoFiltro || m.fondo_agencia_id === fondoFiltro),
      );
    }
    if (tipo === "multi") list = list.filter((m) => m.multi_soporte);
    else if (tipo === "simple") list = list.filter((m) => !m.multi_soporte);
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(
      (m) =>
        m.proveedores?.nombre?.toLowerCase().includes(s) ||
        m.conceptos?.nombre?.toLowerCase().includes(s) ||
        m.detalle?.toLowerCase().includes(s) ||
        String(m.consecutivo).includes(s) ||
        m.numero_factura?.toLowerCase().includes(s) ||
        m.movimiento_items?.some(
          (it) =>
            it.proveedores?.nombre?.toLowerCase().includes(s) ||
            it.numero_factura?.toLowerCase().includes(s),
        ),
    );
  }, [movsQ.data, q, tipo, agenciaFiltro, fondoFiltro]);

  const noReembolsados = useMemo(
    () => filtered.filter((m) => m.reembolsos?.estado !== "pagado" && m.estado !== "anulado"),
    [filtered],
  );

  const del = useMutation({
    mutationFn: async (m: Movimiento) => {
      if (m.factura_path) await supabase.storage.from("facturas").remove([m.factura_path]);
      const { error } = await supabase.from("movimientos").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimiento eliminado");
      qc.invalidateQueries();
    },
  });

  const anular = useMutation({
    mutationFn: async (m: Movimiento) => {
      const motivo = prompt("Motivo de anulación (opcional):") ?? "";
      const { error } = await supabase
        .from("movimientos")
        .update({
          estado: "anulado",
          observaciones: motivo ? `${m.observaciones ? m.observaciones + " · " : ""}Anulado: ${motivo}` : m.observaciones,
        })
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimiento anulado");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reversar = useMutation({
    mutationFn: async (m: Movimiento) => {
      const { error } = await supabase
        .from("movimientos")
        .update({ estado: "registrado" })
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anulación reversada");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const abrirFactura = async (m: Movimiento) => {
    if (!m.factura_path) return;
    await verArchivo("Factura", m.factura_path);
  };

  const verArchivo = async (label: string, path: string) => {
    setCargandoPreview(true);
    const { data, error } = await supabase.storage.from("facturas").createSignedUrl(path, 60 * 10);
    setCargandoPreview(false);
    if (error || !data?.signedUrl) {
      toast.error("No se pudo cargar el archivo: " + (error?.message ?? "no se encontró la URL."));
      return;
    }
    setPreview({ label, url: data.signedUrl, path });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {movsQ.data?.length ?? 0} registros
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!fondoQ.data || noReembolsados.length === 0}
            onClick={() => fondoQ.data && exportSaldoPendientesPDF(noReembolsados, fondoQ.data)}
          >
            <FileText className="h-4 w-4 mr-2" /> Reporte actual CM (PDF)
          </Button>
          <Button
            variant="outline"
            disabled={!fondoQ.data || noReembolsados.length === 0}
            onClick={() => fondoQ.data && exportSaldoPendientesExcel(noReembolsados, fondoQ.data)}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Reporte actual CM (Excel)
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por proveedor, concepto, recibo o factura…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
            <SelectTrigger className="md:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los recibos</SelectItem>
              <SelectItem value="multi">Solo con varios soportes</SelectItem>
              <SelectItem value="simple">Solo con un soporte</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Recibo</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Concepto</th>
                <th className="px-4 py-3 font-medium">Factura</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className={`border-t hover:bg-muted/30 ${m.estado === "anulado" ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs">{folioRecibo(m)}</td>
                  <td className="px-4 py-3">{fmtDate(m.fecha)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{m.proveedores?.nombre}</span>
                      {m.multi_soporte && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Layers className="h-3 w-3" />
                          {m.movimiento_items?.length ?? 0} soportes
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.conceptos?.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.numero_factura ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtMoney(m.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.estado === "anulado" ? "destructive" : "secondary"} className="capitalize">
                      {m.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetail(m)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => fondoQ.data && exportReciboPDF(m, fondoQ.data, undefined, tarifasQ.data, reteicaConceptosQ.data, reteicaCiudadQ.data)}
                        title="Descargar recibo"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => fondoQ.data && exportReciboPDF(m, fondoQ.data, "imprimir", tarifasQ.data, reteicaConceptosQ.data, reteicaCiudadQ.data)}
                        title="Imprimir recibo"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      {puedeEditar && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar"
                          onClick={() => setEditItem(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {m.estado !== "anulado" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Anular"
                          onClick={() => {
                            if (confirm("¿Anular este movimiento? Quedará marcado como anulado, sin borrarlo.")) {
                              anular.mutate(m);
                            }
                          }}
                        >
                          <Ban className="h-4 w-4 text-warning" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Reversar anulación"
                          onClick={() => {
                            if (confirm("¿Reversar la anulación de este movimiento? Volverá a contar como gasto activo.")) {
                              reversar.mutate(m);
                            }
                          }}
                        >
                          <RotateCcw className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      {esAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Eliminar"
                          onClick={() => {
                            if (confirm("¿Eliminar este movimiento? Esta acción no se puede deshacer.")) del.mutate(m);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                    Sin movimientos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recibo N° {detail && folioRecibo(detail)} (vista de solo lectura)</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Información del recibo</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <CampoLectura label="N° Recibo" value={folioRecibo(detail)} />
                  <CampoLectura label="Fecha" value={fmtDate(detail.fecha)} />
                  <CampoLectura label="Agencia" value={detail.agencias?.nombre ?? "—"} />
                  <CampoLectura label="Varios soportes" value={detail.multi_soporte ? "Sí" : "No"} />
                  {detail.multi_soporte && (
                    <div className="md:col-span-2">
                      <CampoLectura
                        label="Beneficiario (empleado a quien se le entregó el dinero)"
                        value={detail.proveedores?.nombre ?? ""}
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <CampoLectura label="Detalle" value={detail.detalle ?? ""} />
                  </div>
                  {detail.observaciones && (
                    <div className="md:col-span-2">
                      <CampoLectura label="Observaciones" value={detail.observaciones} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {!detail.multi_soporte ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Proveedor y valores</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <CampoLectura label="Proveedor" value={detail.proveedores?.nombre ?? ""} />
                    </div>
                    <CampoLectura label="NIT / Identificación" value={detail.proveedores?.nit ?? ""} />
                    <CampoLectura label="Concepto" value={detail.conceptos?.nombre ?? ""} />
                    <CampoLectura label="N° Factura" value={detail.numero_factura ?? "—"} />
                    <CampoLectura label="Factura electrónica" value={detail.factura_electronica ? "Sí" : "No"} />
                    <CampoLectura label="Subtotal" value={fmtMoney(detail.subtotal)} />
                    <CampoLectura label="IVA" value={fmtMoney(detail.iva)} />
                    <CampoLectura label="Impoconsumo" value={fmtMoney(detail.impoconsumo)} />
                    <CampoLectura label="Retención en la fuente" value={fmtMoney(detail.retencion)} />
                    <CampoLectura label="ReteICA" value={fmtMoney(detail.reteica)} />
                    <CampoLectura label="ReteIVA" value={fmtMoney(detail.reteiva)} />
                    <div className="md:col-span-2 flex justify-between items-center p-3 rounded-md bg-primary text-primary-foreground">
                      <span className="text-sm">Total</span>
                      <span className="font-semibold">{fmtMoney(detail.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Soportes del recibo ({detail.movimiento_items?.length ?? 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[...(detail.movimiento_items ?? [])]
                      .sort((a, b) => a.orden - b.orden)
                      .map((it, i) => (
                        <div key={i} className="p-4 rounded-lg border space-y-3">
                          <div className="text-xs font-medium text-muted-foreground">
                            Soporte #{i + 1}
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <CampoLectura label="Proveedor" value={it.proveedores?.nombre ?? ""} />
                            <CampoLectura label="Concepto" value={it.conceptos?.nombre ?? ""} />
                            <CampoLectura label="N° Factura" value={it.numero_factura ?? "—"} />
                            <CampoLectura label="Factura electrónica" value={it.factura_electronica ? "Sí" : "No"} />
                            <div className="md:col-span-2">
                              <CampoLectura label="Detalle" value={it.detalle ?? ""} />
                            </div>
                            <CampoLectura label="Subtotal" value={fmtMoney(it.subtotal)} />
                            <CampoLectura label="IVA" value={fmtMoney(it.iva)} />
                            <CampoLectura label="Total del soporte" value={fmtMoney(it.total)} />
                          </div>
                        </div>
                      ))}
                    <div className="flex justify-between items-center p-3 rounded-md bg-primary text-primary-foreground">
                      <span className="text-sm">Total del recibo</span>
                      <span className="font-semibold">{fmtMoney(detail.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Asiento contable</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-xs border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Cuenta</th>
                        <th className="px-2 py-1.5 text-left">Descripción</th>
                        <th className="px-2 py-1.5 text-right">Débito</th>
                        <th className="px-2 py-1.5 text-right">Crédito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const { debitos, creditos } = computeAsiento(detail, fondoQ.data, tarifasQ.data, reteicaConceptosQ.data, reteicaCiudadQ.data);
                        return [
                          ...debitos.map((d, i) => (
                            <tr key={"d" + i} className="border-t">
                              <td className="px-2 py-1.5 font-mono">{d.cuenta}</td>
                              <td className="px-2 py-1.5">{d.descripcion}</td>
                              <td className="px-2 py-1.5 text-right">{fmtMoney(d.valor)}</td>
                              <td className="px-2 py-1.5"></td>
                            </tr>
                          )),
                          ...creditos.map((c, i) => (
                            <tr key={"c" + i} className="border-t">
                              <td className="px-2 py-1.5 font-mono">{c.cuenta}</td>
                              <td className="px-2 py-1.5">{c.descripcion}</td>
                              <td className="px-2 py-1.5"></td>
                              <td className="px-2 py-1.5 text-right">{fmtMoney(c.valor)}</td>
                            </tr>
                          )),
                        ];
                      })()}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Soporte documental</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2 flex-wrap">
                  {detail.factura_path && (
                    <Button variant="outline" onClick={() => abrirFactura(detail)}>
                      <FileText className="h-4 w-4 mr-2" /> Ver factura
                    </Button>
                  )}
                  {soportesExtraQ.data?.map((s, i) => (
                    <Button key={s.id} variant="outline" onClick={() => verArchivo(`Soporte adicional ${i + 1}`, s.factura_path)}>
                      <FileText className="h-4 w-4 mr-2" /> Soporte adicional {i + 1}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditarMovimientoDialog movimiento={editItem} onClose={() => setEditItem(null)} />

      <Dialog open={!!preview || cargandoPreview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.label ?? "Cargando..."}</DialogTitle>
          </DialogHeader>
          {cargandoPreview ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : preview ? (
            <div className="space-y-3">
              {/\.(jpe?g|png|webp|gif)$/i.test(preview.path) ? (
                <img src={preview.url} alt={preview.label} className="w-full max-h-[70vh] object-contain rounded-md border" />
              ) : /\.pdf$/i.test(preview.path) ? (
                <iframe src={preview.url} title={preview.label} className="w-full h-[70vh] rounded-md border" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se puede previsualizar este tipo de archivo directamente.
                </p>
              )}
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Abrir en pestaña nueva / descargar
              </a>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampoLectura({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex min-h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
        {value || "—"}
      </div>
    </div>
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

function EditarMovimientoDialog({
  movimiento,
  onClose,
}: {
  movimiento: Movimiento | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const agsQ = useQuery({ queryKey: ["agencias"], queryFn: getAgencias });
  const [fecha, setFecha] = useState("");
  const [agencia, setAgencia] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [concepto, setConcepto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [facturaElectronica, setFacturaElectronica] = useState(false);
  const [subtotal, setSubtotal] = useState("0");
  const [iva, setIva] = useState("0");
  const [impoconsumo, setImpoconsumo] = useState("0");
  const [retencion, setRetencion] = useState("0");
  const [reteica, setReteica] = useState("0");
  const [reteiva, setReteiva] = useState("0");

  useEffect(() => {
    if (movimiento) {
      setFecha(movimiento.fecha);
      setAgencia(movimiento.agencia_id ?? "");
      setProveedor(movimiento.proveedor_id);
      setConcepto(movimiento.concepto_id);
      setDetalle(movimiento.detalle ?? "");
      setNumeroFactura(movimiento.numero_factura ?? "");
      setFacturaElectronica(movimiento.factura_electronica);
      setSubtotal(String(movimiento.subtotal));
      setIva(String(movimiento.iva));
      setImpoconsumo(String(movimiento.impoconsumo));
      setRetencion(String(movimiento.retencion));
      setReteica(String(movimiento.reteica));
      setReteiva(String(movimiento.reteiva));
    }
  }, [movimiento]);

  const total =
    (parseFloat(subtotal) || 0) +
    (parseFloat(iva) || 0) +
    (parseFloat(impoconsumo) || 0) -
    (parseFloat(retencion) || 0) -
    (parseFloat(reteica) || 0) -
    (parseFloat(reteiva) || 0);

  const guardar = useMutation({
    mutationFn: async () => {
      if (!movimiento) return;
      const { error } = await supabase
        .from("movimientos")
        .update({
          fecha,
          agencia_id: agencia || null,
          proveedor_id: proveedor,
          concepto_id: concepto,
          detalle: detalle || null,
          numero_factura: numeroFactura || null,
          factura_electronica: facturaElectronica,
          subtotal: parseFloat(subtotal) || 0,
          iva: parseFloat(iva) || 0,
          impoconsumo: parseFloat(impoconsumo) || 0,
          retencion: parseFloat(retencion) || 0,
          reteica: parseFloat(reteica) || 0,
          reteiva: parseFloat(reteiva) || 0,
          total,
        })
        .eq("id", movimiento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimiento actualizado");
      qc.invalidateQueries();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!movimiento) return null;

  return (
    <Dialog open={!!movimiento} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar recibo N° {folioRecibo(movimiento)}</DialogTitle>
        </DialogHeader>

        {movimiento.multi_soporte ? (
          <p className="text-sm text-muted-foreground">
            Este recibo tiene varios soportes. Por ahora, la edición completa de cada soporte no
            está disponible aquí — solo puedes anular/reversar o editarlo desde soporte técnico.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Agencia</Label>
              <Select value={agencia} onValueChange={setAgencia}>
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
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Proveedor</Label>
              <ProveedorPicker value={proveedor} onChange={setProveedor} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Concepto</Label>
              <ConceptoPicker value={concepto} onChange={setConcepto} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Detalle</Label>
              <Input value={detalle} onChange={(e) => setDetalle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">N° Factura</Label>
              <Input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="edit-fe"
                checked={facturaElectronica}
                onCheckedChange={(v) => setFacturaElectronica(v === true)}
              />
              <Label htmlFor="edit-fe" className="text-sm font-normal cursor-pointer">
                Factura electrónica
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Subtotal</Label>
              <Input type="number" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IVA</Label>
              <Input type="number" value={iva} onChange={(e) => setIva(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Impoconsumo</Label>
              <Input type="number" value={impoconsumo} onChange={(e) => setImpoconsumo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Retención en la fuente</Label>
              <Input type="number" value={retencion} onChange={(e) => setRetencion(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ReteICA</Label>
              <Input type="number" value={reteica} onChange={(e) => setReteica(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ReteIVA</Label>
              <Input type="number" value={reteiva} onChange={(e) => setReteiva(e.target.value)} />
            </div>

            <div className="md:col-span-2 p-3 rounded-md bg-muted flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total recalculado</span>
              <span className="text-lg font-semibold">{fmtMoney(total)}</span>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
                Guardar cambios
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
