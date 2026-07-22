import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import {
  getFondo,
  getMovimientosDeReembolso,
  getMovimientosPendientes,
  getReembolsos,
  type Reembolso,
} from "@/lib/db";
import { fmtDate, fmtMoney, pad } from "@/lib/format";
import { Download, FileText, PlusCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportReembolsoPDF } from "@/lib/exports";

export const Route = createFileRoute("/reembolsos")({
  head: () => ({
    meta: [
      { title: "Reembolsos · Caja Menor" },
      {
        name: "description",
        content: "Solicitudes de reembolso para reposición del fondo de caja menor.",
      },
      { property: "og:title", content: "Reembolsos · Caja Menor" },
      {
        property: "og:description",
        content: "Solicitudes de reembolso para reposición del fondo de caja menor.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <Page />
    </AppLayout>
  ),
});

function Page() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["reembolsos"], queryFn: getReembolsos });
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Reembolso | null>(null);

  const del = useMutation({
    mutationFn: async (r: Reembolso) => {
      await supabase.from("movimientos").update({ reembolso_id: null }).eq("reembolso_id", r.id);
      const { error } = await supabase.from("reembolsos").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud eliminada");
      qc.invalidateQueries();
    },
  });

  const updateEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase.from("reembolsos").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["reembolsos"] });
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Solicitudes de reembolso</h1>
          <p className="text-sm text-muted-foreground">
            Agrupa gastos pendientes y genera la solicitud de reposición del fondo.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" /> Nueva solicitud
        </Button>
      </header>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Periodo</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(listQ.data ?? []).map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{pad(r.consecutivo)}</td>
                  <td className="px-4 py-3">{fmtDate(r.fecha)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmtDate(r.periodo_inicio)} → {fmtDate(r.periodo_fin)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmtMoney(r.total)}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={r.estado}
                      onValueChange={(v) => updateEstado.mutate({ id: r.id, estado: v })}
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solicitado">Solicitado</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="pagado">Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                        <FileText className="h-4 w-4 mr-1" /> Ver
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("¿Eliminar la solicitud? Los movimientos quedarán pendientes.")) del.mutate(r);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(listQ.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    Aún no hay solicitudes de reembolso.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <NuevaSolicitud
        open={open}
        onOpenChange={setOpen}
        onCreated={(r) => {
          setDetail(r);
          qc.invalidateQueries();
        }}
      />

      <DetalleReembolso reembolso={detail} onClose={() => setDetail(null)} fondoEmpresa={fondoQ.data?.empresa} />
    </div>
  );
}

function NuevaSolicitud({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (r: Reembolso) => void;
}) {
  const qc = useQueryClient();
  const pendQ = useQuery({
    queryKey: ["movimientos-pendientes"],
    queryFn: getMovimientosPendientes,
    enabled: open,
  });
  const today = new Date().toISOString().slice(0, 10);
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState(today);
  const [obs, setObs] = useState("");
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});

  const listaFiltrada = useMemo(() => {
    const all = pendQ.data ?? [];
    return all.filter((m) => {
      if (inicio && m.fecha < inicio) return false;
      if (fin && m.fecha > fin) return false;
      return true;
    });
  }, [pendQ.data, inicio, fin]);

  const seleccionados = useMemo(
    () => listaFiltrada.filter((m) => seleccion[m.id] ?? true),
    [listaFiltrada, seleccion],
  );
  const total = seleccionados.reduce((s, m) => s + Number(m.total), 0);

  const crear = useMutation({
    mutationFn: async () => {
      if (seleccionados.length === 0) throw new Error("Selecciona al menos un movimiento");
      const perInicio = inicio || seleccionados.reduce((min, m) => (m.fecha < min ? m.fecha : min), seleccionados[0].fecha);
      const perFin = fin || seleccionados.reduce((max, m) => (m.fecha > max ? m.fecha : max), seleccionados[0].fecha);
      const { data, error } = await supabase
        .from("reembolsos")
        .insert({
          fecha: today,
          periodo_inicio: perInicio,
          periodo_fin: perFin,
          total,
          observaciones: obs || null,
          estado: "solicitado",
        })
        .select("*")
        .single();
      if (error) throw error;
      const ids = seleccionados.map((m) => m.id);
      const { error: upErr } = await supabase
        .from("movimientos")
        .update({ reembolso_id: data.id })
        .in("id", ids);
      if (upErr) throw upErr;
      return data as Reembolso;
    },
    onSuccess: (r) => {
      toast.success(`Solicitud N° ${pad(r.consecutivo)} creada`);
      qc.invalidateQueries();
      onOpenChange(false);
      setInicio("");
      setObs("");
      setSeleccion({});
      onCreated(r);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de reembolso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Desde</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Movimientos pendientes de reembolso ({listaFiltrada.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 w-8"></th>
                    <th className="px-2 py-2 text-left">Recibo</th>
                    <th className="px-2 py-2 text-left">Fecha</th>
                    <th className="px-2 py-2 text-left">Proveedor</th>
                    <th className="px-2 py-2 text-left">Concepto</th>
                    <th className="px-2 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.map((m) => {
                    const checked = seleccion[m.id] ?? true;
                    return (
                      <tr key={m.id} className="border-t">
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSeleccion((s) => ({ ...s, [m.id]: e.target.checked }))
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 font-mono">{pad(m.consecutivo)}</td>
                        <td className="px-2 py-1.5">{fmtDate(m.fecha)}</td>
                        <td className="px-2 py-1.5">{m.proveedores?.nombre}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{m.conceptos?.nombre}</td>
                        <td className="px-2 py-1.5 text-right">{fmtMoney(m.total)}</td>
                      </tr>
                    );
                  })}
                  {listaFiltrada.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-muted-foreground">
                        No hay movimientos pendientes en este rango.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center p-3 rounded-md bg-primary text-primary-foreground">
            <span className="text-sm">Total a reembolsar ({seleccionados.length} recibos)</span>
            <span className="text-lg font-semibold">{fmtMoney(total)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => crear.mutate()} disabled={crear.isPending || seleccionados.length === 0}>
            Crear solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetalleReembolso({
  reembolso,
  onClose,
  fondoEmpresa,
}: {
  reembolso: Reembolso | null;
  onClose: () => void;
  fondoEmpresa: string | undefined;
}) {
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const movsQ = useQuery({
    queryKey: ["reembolso-movs", reembolso?.id],
    queryFn: () => getMovimientosDeReembolso(reembolso!.id),
    enabled: !!reembolso,
  });

  return (
    <Dialog open={!!reembolso} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Solicitud N° {reembolso && pad(reembolso.consecutivo)}
          </DialogTitle>
        </DialogHeader>
        {reembolso && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Empresa" value={fondoEmpresa ?? ""} />
              <Info label="Fecha solicitud" value={fmtDate(reembolso.fecha)} />
              <Info label="Periodo desde" value={fmtDate(reembolso.periodo_inicio)} />
              <Info label="Periodo hasta" value={fmtDate(reembolso.periodo_fin)} />
              <Info label="Estado" value={reembolso.estado} />
              <Info label="Movimientos" value={String(movsQ.data?.length ?? 0)} />
            </div>
            {reembolso.observaciones && (
              <div className="p-3 rounded-md bg-muted">
                <div className="text-xs text-muted-foreground mb-1">Observaciones</div>
                <div>{reembolso.observaciones}</div>
              </div>
            )}

            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-2 py-2">Recibo</th>
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2">Proveedor</th>
                    <th className="px-2 py-2">Concepto</th>
                    <th className="px-2 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(movsQ.data ?? []).map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-2 py-1.5 font-mono">{pad(m.consecutivo)}</td>
                      <td className="px-2 py-1.5">{fmtDate(m.fecha)}</td>
                      <td className="px-2 py-1.5">{m.proveedores?.nombre}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{m.conceptos?.nombre}</td>
                      <td className="px-2 py-1.5 text-right">{fmtMoney(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between p-3 rounded-md bg-primary text-primary-foreground">
              <span>Total a reembolsar</span>
              <span className="font-semibold">{fmtMoney(reembolso.total)}</span>
            </div>

            <div className="flex gap-2 justify-end">
              <Badge variant="outline" className="mr-auto capitalize">
                {reembolso.estado}
              </Badge>
              <Button
                onClick={() =>
                  fondoQ.data &&
                  movsQ.data &&
                  exportReembolsoPDF(reembolso, movsQ.data, fondoQ.data)
                }
              >
                <Download className="h-4 w-4 mr-2" /> Descargar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium capitalize">{value}</div>
    </div>
  );
}
