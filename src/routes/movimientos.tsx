import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { computeAsiento, getFondo, getMovimientos, type Movimiento } from "@/lib/db";
import { fmtDate, fmtMoney, pad } from "@/lib/format";
import { Download, FileSpreadsheet, FileText, Search, Trash2, Eye, Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportExcel, exportPDF, exportReciboPDF } from "@/lib/exports";
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
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todos" | "multi" | "simple">("todos");
  const [detail, setDetail] = useState<Movimiento | null>(null);

  const filtered = useMemo(() => {
    let list = movsQ.data ?? [];
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
  }, [movsQ.data, q, tipo]);

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

  const abrirFactura = async (m: Movimiento) => {
    if (!m.factura_path) return;
    const { data } = await supabase.storage
      .from("facturas")
      .createSignedUrl(m.factura_path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
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
            onClick={() => fondoQ.data && exportExcel(filtered, fondoQ.data)}
            disabled={!filtered.length}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => fondoQ.data && exportPDF(filtered, fondoQ.data)}
            disabled={!filtered.length}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por proveedor, concepto, recibo o factura…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
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
                <tr key={m.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{pad(m.consecutivo)}</td>
                  <td className="px-4 py-3">{fmtDate(m.fecha)}</td>
                  <td className="px-4 py-3">{m.proveedores?.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.conceptos?.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.numero_factura ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtMoney(m.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="capitalize">{m.estado}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetail(m)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => fondoQ.data && exportReciboPDF(m, fondoQ.data)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("¿Eliminar este movimiento?")) del.mutate(m);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recibo N° {detail && pad(detail.consecutivo)}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Fecha" value={fmtDate(detail.fecha)} />
                <Info label="Agencia" value={detail.agencias?.nombre ?? "—"} />
                <Info label="Proveedor" value={detail.proveedores?.nombre ?? ""} />
                <Info label="NIT" value={detail.proveedores?.nit ?? ""} />
                <Info label="Concepto" value={detail.conceptos?.nombre ?? ""} />
                <Info label="Factura" value={detail.numero_factura ?? "—"} />
              </div>
              <div className="p-3 rounded-md bg-muted">
                <div className="text-xs text-muted-foreground mb-1">Detalle</div>
                <div>{detail.detalle}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Info label="Subtotal" value={fmtMoney(detail.subtotal)} />
                <Info label="IVA" value={fmtMoney(detail.iva)} />
                <Info label="Impoconsumo" value={fmtMoney(detail.impoconsumo)} />
                <Info label="Retención" value={fmtMoney(detail.retencion)} />
              </div>
              <div className="flex justify-between p-3 rounded-md bg-primary text-primary-foreground">
                <span>Total</span>
                <span className="font-semibold">{fmtMoney(detail.total)}</span>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase mb-2">Asiento contable</div>
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
                      const { debitos, creditos } = computeAsiento(detail);
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
              </div>

              <div className="flex gap-2">
                {detail.factura_path && (
                  <Button variant="outline" onClick={() => abrirFactura(detail)}>
                    <FileText className="h-4 w-4 mr-2" /> Ver factura
                  </Button>
                )}
                <Button onClick={() => fondoQ.data && exportReciboPDF(detail, fondoQ.data)}>
                  <Download className="h-4 w-4 mr-2" /> Descargar recibo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
