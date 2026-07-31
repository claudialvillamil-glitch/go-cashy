import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout, useAgenciaFiltro } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  getTarifasRetencionRenta,
  getConceptosRetencionRenta,
  getConceptosReteica,
  getTarifasReteicaCiudad,
  getMyProfile,
  getMovimientosDeReembolso,
  getMovimientosPendientes,
  getMovimientos,
  getReembolsos,
  getFondosAgencia,
  folioRecibo,
  type Reembolso,
  type ReciboProvisional,
  type Movimiento,
} from "@/lib/db";
import { fmtDate, fmtMoney, pad } from "@/lib/format";
import { DENOMINACIONES } from "@/lib/arqueo";
import { Download, FileText, PlusCircle, Plus, Trash2, Calculator, Printer, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportReembolsoPDF, exportReembolsoExcel, exportReembolsoConSoportesPDF, exportContabilizacionExcel } from "@/lib/exports";

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
  const { agenciaId: agenciaFiltro, fondoAgenciaId: fondoFiltro } = useAgenciaFiltro();
  const fondosAgQ = useQuery({
    queryKey: ["fondos-agencia"],
    queryFn: getFondosAgencia,
    enabled: !!agenciaFiltro,
  });
  const montoTotalFondo = agenciaFiltro
    ? (fondosAgQ.data ?? [])
        .filter((f) => f.activo && f.agencia_id === agenciaFiltro && (!fondoFiltro || f.id === fondoFiltro))
        .reduce((s, f) => s + Number(f.monto_asignado), 0)
    : Number(fondoQ.data?.monto_asignado ?? 0);
  const pendQ = useQuery({ queryKey: ["movimientos-pendientes"], queryFn: getMovimientosPendientes });
  const todosQ = useQuery({ queryKey: ["movimientos"], queryFn: getMovimientos });
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile });
  const puedeSolicitar = profileQ.data?.rol === "admin" || profileQ.data?.rol === "responsable";
  const esAdmin = profileQ.data?.rol === "admin";
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Reembolso | null>(null);
  const hoy = new Date().toISOString().slice(0, 10);
  const coincideFiltro = (m: Movimiento) =>
    !agenciaFiltro || (m.agencia_id === agenciaFiltro && (!fondoFiltro || m.fondo_agencia_id === fondoFiltro));
  // Valor a reembolsar: solo lo que aún NO está incluido en ninguna solicitud
  // (para no volver a pedir plata ya solicitada anteriormente).
  const valorGastos = (pendQ.data ?? []).filter(coincideFiltro).reduce((s, m) => s + Number(m.total), 0);
  // Saldo actual de caja: sí considera TODO lo no pagado (incluida cualquier
  // solicitud ya radicada pero aún sin pagar), porque esa plata ya salió
  // físicamente de la caja.
  const totalNoPagado = (todosQ.data ?? [])
    .filter((m) => m.reembolsos?.estado !== "pagado" && m.estado !== "anulado")
    .filter(coincideFiltro)
    .reduce((s, m) => s + Number(m.total), 0);

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

  const aprobar = useMutation({
    mutationFn: async (id: string) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("No se pudo identificar el usuario");
      const { error } = await supabase
        .from("reembolsos")
        .update({ aprobado_por: auth.user.id, fecha_aprobacion: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reembolso aprobado");
      qc.invalidateQueries({ queryKey: ["reembolsos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase.from("reembolsos").update({ estado }).eq("id", id);
      if (error) throw error;
      return estado;
    },
    onSuccess: (estado) => {
      qc.invalidateQueries({ queryKey: ["reembolsos"] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      qc.invalidateQueries({ queryKey: ["movimientos-pendientes"] });
      if (estado === "pagado") {
        toast.success(
          "Reembolso marcado como pagado. Recuerda realizar el cheque y el cobro del mismo para terminar el proceso de reembolso.",
          { duration: 10000 },
        );
      } else {
        toast.success("Estado actualizado");
      }
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
        {puedeSolicitar && (
          <Button onClick={() => setOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Nueva solicitud
          </Button>
        )}
      </header>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-3 rounded-md bg-muted">
              <div className="text-xs text-muted-foreground">Monto del fondo</div>
              <div className="text-lg font-semibold">{fmtMoney(montoTotalFondo)}</div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <div className="text-xs text-muted-foreground">Gastos pendientes</div>
              <div className="text-lg font-semibold">{fmtMoney(totalNoPagado)}</div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <div className="text-xs text-muted-foreground">Saldo actual caja</div>
              <div className="text-lg font-semibold">
                {fmtMoney(montoTotalFondo - totalNoPagado)}
              </div>
            </div>
            <div className="p-3 rounded-md bg-primary text-primary-foreground">
              <div className="text-xs opacity-80">Valor a reembolsar</div>
              <div className="text-lg font-semibold">{fmtMoney(totalNoPagado)}</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Fecha de la solicitud: <span className="font-medium text-foreground">{fmtDate(hoy)}</span>
            </p>
            {puedeSolicitar && (
              <Button onClick={() => setOpen(true)} disabled={valorGastos === 0}>
                <PlusCircle className="h-4 w-4 mr-2" /> Solicitar reembolso
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ArqueoCaja />

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
                <th className="px-4 py-3 font-medium">Aprobación</th>
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
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="pagado">Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {r.aprobado_por ? (
                      <div className="text-xs">
                        <Badge variant="secondary">Aprobado</Badge>
                        <div className="text-muted-foreground mt-1">
                          {r.aprobado_por_perfil?.nombre || r.aprobado_por_perfil?.email} ·{" "}
                          {fmtDate(r.fecha_aprobacion)}
                        </div>
                      </div>
                    ) : profileQ.data?.rol === "director_agencia" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => aprobar.mutate(r.id)}
                        disabled={aprobar.isPending}
                      >
                        Aprobar
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                        <FileText className="h-4 w-4 mr-1" /> Ver
                      </Button>
                      {esAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("¿Eliminar la solicitud? Los movimientos quedarán pendientes.")) del.mutate(r);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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

function ArqueoCaja() {
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const montoTotalFondo = Number(fondoQ.data?.monto_asignado ?? 0);
  const pendQ = useQuery({ queryKey: ["movimientos"], queryFn: getMovimientos });
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [provisionales, setProvisionales] = useState<ReciboProvisional[]>([]);
  const [nuevoTercero, setNuevoTercero] = useState("");
  const [nuevoConcepto, setNuevoConcepto] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");

  const totalPendiente = (pendQ.data ?? [])
    .filter((m) => m.reembolsos?.estado !== "pagado" && m.estado !== "anulado")
    .reduce((s, m) => s + Number(m.total), 0);
  const saldoTeorico = montoTotalFondo - totalPendiente;

  const totalEfectivo = DENOMINACIONES.reduce((sum, d) => {
    const cant = parseInt(cantidades[d.valor] ?? "0", 10) || 0;
    return sum + cant * d.valor;
  }, 0);
  const totalProvisionales = provisionales.reduce((s, p) => s + p.monto, 0);
  const totalContado = totalEfectivo + totalProvisionales;
  const hayAlgoIngresado = totalEfectivo > 0 || provisionales.length > 0;

  const diferencia = totalContado - saldoTeorico;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" /> Arqueo de caja
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cuenta el efectivo físico en la caja antes de solicitar el reembolso y compáralo
          contra el saldo que debería haber. Esta es una herramienta que te permite verificar
          el saldo en caja.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Denominación</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium w-28">Cantidad</th>
                <th className="px-3 py-2 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {DENOMINACIONES.map((d) => {
                const cant = parseInt(cantidades[d.valor] ?? "0", 10) || 0;
                return (
                  <tr key={d.valor} className="border-t">
                    <td className="px-3 py-1.5 font-mono">{fmtMoney(d.valor)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">{d.tipo}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        className="h-8"
                        value={cantidades[d.valor] ?? ""}
                        onChange={(e) =>
                          setCantidades((prev) => ({ ...prev, [d.valor]: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium">{fmtMoney(cant * d.valor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs font-semibold">Recibos provisionales (gastos sin legalizar)</Label>
          <p className="text-xs text-muted-foreground">
            Cuentan como efectivo en el arqueo mientras no se legalicen. No pueden quedar
            pendientes en el arqueo de cierre de mes.
          </p>
          {provisionales.length > 0 && (
            <div className="rounded-md border divide-y">
              {provisionales.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span>
                    <b>{p.tercero}</b> — {p.concepto}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{fmtMoney(p.monto)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setProvisionales((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            <Input
              className="h-8"
              placeholder="Tercero"
              value={nuevoTercero}
              onChange={(e) => setNuevoTercero(e.target.value)}
            />
            <Input
              className="h-8"
              placeholder="Concepto"
              value={nuevoConcepto}
              onChange={(e) => setNuevoConcepto(e.target.value)}
            />
            <Input
              className="h-8"
              type="number"
              min="0"
              placeholder="Monto"
              value={nuevoMonto}
              onChange={(e) => setNuevoMonto(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!nuevoTercero.trim() || !nuevoConcepto.trim() || !nuevoMonto}
              onClick={() => {
                setProvisionales((prev) => [
                  ...prev,
                  { tercero: nuevoTercero.trim(), concepto: nuevoConcepto.trim(), monto: Number(nuevoMonto) || 0 },
                ]);
                setNuevoTercero("");
                setNuevoConcepto("");
                setNuevoMonto("");
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </div>
        </div>

        {hayAlgoIngresado ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 rounded-md bg-muted">
              <div className="text-xs text-muted-foreground">
                Total contado {totalProvisionales > 0 && `(incl. ${fmtMoney(totalProvisionales)} provisionales)`}
              </div>
              <div className="text-lg font-semibold">{fmtMoney(totalContado)}</div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <div className="text-xs text-muted-foreground">Saldo teórico del fondo</div>
              <div className="text-lg font-semibold">{fmtMoney(saldoTeorico)}</div>
            </div>
            <div
              className={`p-3 rounded-md ${
                diferencia === 0
                  ? "bg-success/10"
                  : diferencia > 0
                    ? "bg-warning/10"
                    : "bg-destructive/10"
              }`}
            >
              <div className="text-xs text-muted-foreground">
                {diferencia === 0 ? "Cuadra" : diferencia > 0 ? "Sobante" : "Faltante"}
              </div>
              <div
                className={`text-lg font-semibold ${
                  diferencia === 0
                    ? "text-success"
                    : diferencia > 0
                      ? "text-warning"
                      : "text-destructive"
                }`}
              >
                {fmtMoney(Math.abs(diferencia))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ingresa la cantidad de billetes/monedas (o un provisional) para calcular el arqueo.
          </p>
        )}
      </CardContent>
    </Card>
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
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const { agenciaId: agenciaFiltro, fondoAgenciaId: fondoFiltro } = useAgenciaFiltro();
  const fondosAgQ = useQuery({
    queryKey: ["fondos-agencia"],
    queryFn: getFondosAgencia,
    enabled: open && !!agenciaFiltro,
  });
  const montoTotalFondo = agenciaFiltro
    ? (fondosAgQ.data ?? [])
        .filter((f) => f.activo && f.agencia_id === agenciaFiltro && (!fondoFiltro || f.id === fondoFiltro))
        .reduce((s, f) => s + Number(f.monto_asignado), 0)
    : Number(fondoQ.data?.monto_asignado ?? 0);
  const coincideFiltroGlobal = (m: Movimiento) =>
    !agenciaFiltro || (m.agencia_id === agenciaFiltro && (!fondoFiltro || m.fondo_agencia_id === fondoFiltro));
  const pendQ = useQuery({
    queryKey: ["movimientos-pendientes"],
    queryFn: getMovimientosPendientes,
    enabled: open,
  });
  // Para el saldo teórico/porcentaje del fondo usamos TODOS los movimientos
  // no pagados (consistente con el Resumen), no solo los que aún no están en
  // ninguna solicitud — porque un gasto ya solicitado (pero no pagado) sigue
  // descontando del fondo real hasta que se pague.
  const todosNoPagadosQ = useQuery({
    queryKey: ["movimientos"],
    queryFn: getMovimientos,
    enabled: open,
  });
  const today = new Date().toISOString().slice(0, 10);
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState(today);
  const [obs, setObs] = useState("");
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
  const [cantidadesArqueo, setCantidadesArqueo] = useState<Record<number, string>>({});
  const [provisionales, setProvisionales] = useState<ReciboProvisional[]>([]);
  const [esCierreMes, setEsCierreMes] = useState(false);
  const [nuevoTercero, setNuevoTercero] = useState("");
  const [nuevoConcepto, setNuevoConcepto] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");

  const listaFiltrada = useMemo(() => {
    const all = pendQ.data ?? [];
    return all.filter((m) => {
      if (!coincideFiltroGlobal(m)) return false;
      if (inicio && m.fecha < inicio) return false;
      if (fin && m.fecha > fin) return false;
      return true;
    });
  }, [pendQ.data, inicio, fin, agenciaFiltro, fondoFiltro]);

  const seleccionados = useMemo(
    () => listaFiltrada.filter((m) => seleccion[m.id] ?? true),
    [listaFiltrada, seleccion],
  );
  const total = seleccionados.reduce((s, m) => s + Number(m.total), 0);

  const totalPendienteFondo = (todosNoPagadosQ.data ?? [])
    .filter((m) => m.reembolsos?.estado !== "pagado" && m.estado !== "anulado")
    .filter(coincideFiltroGlobal)
    .reduce((s, m) => s + Number(m.total), 0);
  const saldoTeorico = montoTotalFondo - totalPendienteFondo;

  // La solicitud de reembolso debe hacerse cuando el fondo alcanza el % límite
  // configurado (recomendado 90%) o siempre en cierre de mes. Si no se cumple
  // ninguna de las dos, avisamos (no bloqueamos, por si hay una razón válida).
  const limitePct = fondoQ.data ? Number(fondoQ.data.limite_alerta_reembolso_pct) : 90;
  const pctFondoActual = montoTotalFondo > 0 ? (totalPendienteFondo / montoTotalFondo) * 100 : 0;
  const cumpleLimite = pctFondoActual >= limitePct;
  const noCumpleRequisito = !esCierreMes && !cumpleLimite;
  const totalEfectivoArqueo = DENOMINACIONES.reduce((sum, d) => {
    const cant = parseInt(cantidadesArqueo[d.valor] ?? "0", 10) || 0;
    return sum + cant * d.valor;
  }, 0);
  const totalProvisionales = provisionales.reduce((s, p) => s + p.monto, 0);
  // Los recibos provisionales cuentan como si fueran efectivo para efectos del
  // arqueo, porque representan plata que ya salió de caja pero aún no se ha
  // legalizado como gasto formal.
  const totalContadoArqueo = totalEfectivoArqueo + totalProvisionales;
  const diferenciaArqueo = totalContadoArqueo - saldoTeorico;
  const hayAlgoIngresadoArqueo = totalEfectivoArqueo > 0 || provisionales.length > 0;

  const crear = useMutation({
    mutationFn: async () => {
      if (seleccionados.length === 0) throw new Error("Selecciona al menos un movimiento");
      if (esCierreMes && provisionales.length > 0) {
        throw new Error(
          "El arqueo de cierre de mes no puede tener recibos provisionales sin legalizar. Legalízalos primero.",
        );
      }
      const perInicio = inicio || seleccionados.reduce((min, m) => (m.fecha < min ? m.fecha : min), seleccionados[0].fecha);
      const perFin = fin || seleccionados.reduce((max, m) => (m.fecha > max ? m.fecha : max), seleccionados[0].fecha);
      const cantidadesNum: Record<number, number> = {};
      DENOMINACIONES.forEach((d) => {
        const cant = parseInt(cantidadesArqueo[d.valor] ?? "0", 10) || 0;
        if (cant > 0) cantidadesNum[d.valor] = cant;
      });
      const arqueo =
        Object.keys(cantidadesNum).length > 0 || provisionales.length > 0
          ? {
              cantidades: cantidadesNum,
              provisionales,
              esCierreMes,
              totalContado: totalContadoArqueo,
              saldoTeorico,
              diferencia: diferenciaArqueo,
            }
          : null;
      const { data, error } = await supabase
        .from("reembolsos")
        .insert({
          fecha: today,
          periodo_inicio: perInicio,
          periodo_fin: perFin,
          total,
          observaciones: obs || null,
          estado: "pagado",
          arqueo,
          monto_fondo_momento: montoTotalFondo,
          total_gastos_momento: totalPendienteFondo,
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
      toast.warning(
        `Reembolso N° ${pad(r.consecutivo)} registrado como pagado. Es obligatorio gestionar el pago en cheque el día de hoy.`,
        { duration: 12000 },
      );
      qc.invalidateQueries();
      onOpenChange(false);
      setInicio("");
      setObs("");
      setSeleccion({});
      setCantidadesArqueo({});
      setProvisionales([]);
      setEsCierreMes(false);
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
                        <td className="px-2 py-1.5 font-mono">{folioRecibo(m)}</td>
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Arqueo de caja (opcional)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cuenta el efectivo físico antes de radicar la solicitud. Queda guardado con ella.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DENOMINACIONES.map((d) => (
                  <div key={d.valor} className="space-y-1">
                    <Label className="text-xs">{fmtMoney(d.valor)}</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8"
                      value={cantidadesArqueo[d.valor] ?? ""}
                      onChange={(e) =>
                        setCantidadesArqueo((prev) => ({ ...prev, [d.valor]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Recibos provisionales (gastos sin legalizar)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cuentan como efectivo en el arqueo mientras no se legalicen. No pueden quedar
                  pendientes en el arqueo de cierre de mes.
                </p>
                {provisionales.length > 0 && (
                  <div className="rounded-md border divide-y">
                    {provisionales.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-sm">
                        <span>
                          <b>{p.tercero}</b> — {p.concepto}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fmtMoney(p.monto)}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() =>
                              setProvisionales((prev) => prev.filter((_, i) => i !== idx))
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    className="h-8"
                    placeholder="Tercero"
                    value={nuevoTercero}
                    onChange={(e) => setNuevoTercero(e.target.value)}
                  />
                  <Input
                    className="h-8"
                    placeholder="Concepto"
                    value={nuevoConcepto}
                    onChange={(e) => setNuevoConcepto(e.target.value)}
                  />
                  <Input
                    className="h-8"
                    type="number"
                    min="0"
                    placeholder="Monto"
                    value={nuevoMonto}
                    onChange={(e) => setNuevoMonto(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={!nuevoTercero.trim() || !nuevoConcepto.trim() || !nuevoMonto}
                    onClick={() => {
                      setProvisionales((prev) => [
                        ...prev,
                        { tercero: nuevoTercero.trim(), concepto: nuevoConcepto.trim(), monto: Number(nuevoMonto) || 0 },
                      ]);
                      setNuevoTercero("");
                      setNuevoConcepto("");
                      setNuevoMonto("");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t pt-3">
                <Checkbox
                  id="cierre-mes"
                  checked={esCierreMes}
                  onCheckedChange={(v) => setEsCierreMes(v === true)}
                />
                <Label htmlFor="cierre-mes" className="text-sm font-normal cursor-pointer">
                  Este es el arqueo de cierre de mes
                </Label>
              </div>
              {esCierreMes && provisionales.length > 0 && (
                <p className="text-xs text-destructive">
                  No puedes marcar cierre de mes con recibos provisionales sin legalizar. Elimínalos
                  o conviértelos primero en gastos reales.
                </p>
              )}
              {noCumpleRequisito && (
                <div className="text-xs p-2 rounded-md bg-warning/10 text-warning">
                  ⚠ Esta solicitud no cumple el requisito habitual: el fondo lleva{" "}
                  {pctFondoActual.toFixed(1)}% gastado (se recomienda solicitar reembolso al llegar
                  al {limitePct}%), y no marcaste que es cierre de mes. Verifica si de verdad
                  corresponde hacerla ahora.
                </div>
              )}

              {hayAlgoIngresadoArqueo ? (
                <div className="grid gap-2 md:grid-cols-3 text-sm">
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-xs text-muted-foreground">
                      Total contado {totalProvisionales > 0 && `(incluye ${fmtMoney(totalProvisionales)} en provisionales)`}
                    </div>
                    <div className="font-semibold">{fmtMoney(totalContadoArqueo)}</div>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-xs text-muted-foreground">Saldo teórico</div>
                    <div className="font-semibold">{fmtMoney(saldoTeorico)}</div>
                  </div>
                  <div
                    className={`p-2 rounded-md ${
                      diferenciaArqueo === 0
                        ? "bg-success/10"
                        : diferenciaArqueo > 0
                          ? "bg-warning/10"
                          : "bg-destructive/10"
                    }`}
                  >
                    <div className="text-xs text-muted-foreground">
                      {diferenciaArqueo === 0 ? "Cuadra" : diferenciaArqueo > 0 ? "Sobante" : "Faltante"}
                    </div>
                    <div className="font-semibold">{fmtMoney(Math.abs(diferenciaArqueo))}</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ingresa la cantidad de billetes/monedas (o un provisional) para calcular el arqueo.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => crear.mutate()}
            disabled={crear.isPending || seleccionados.length === 0 || (esCierreMes && provisionales.length > 0)}
          >
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
  const tarifasQ = useQuery({ queryKey: ["tarifas-retencion"], queryFn: getTarifasRetencionRenta });
  const conceptosRetencionRentaQ = useQuery({
    queryKey: ["conceptos-retencion-renta"],
    queryFn: getConceptosRetencionRenta,
  });
  const reteicaConceptosQ = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const reteicaCiudadQ = useQuery({ queryKey: ["tarifas-reteica-ciudad"], queryFn: getTarifasReteicaCiudad });
  const pendQ = useQuery({ queryKey: ["movimientos"], queryFn: getMovimientos });
  const montoTotalFondo = Number(fondoQ.data?.monto_asignado ?? 0);
  const totalGastosFondo = (pendQ.data ?? [])
    .filter((m) => m.reembolsos?.estado !== "pagado" && m.estado !== "anulado")
    .reduce((s, m) => s + Number(m.total), 0);
  const movsQ = useQuery({
    queryKey: ["reembolso-movs", reembolso?.id],
    queryFn: () => getMovimientosDeReembolso(reembolso!.id),
    enabled: !!reembolso,
  });

  const generarConSoportes = useMutation({
    mutationFn: async () => {
      if (!reembolso || !movsQ.data || !fondoQ.data) throw new Error("Faltan datos por cargar");
      await exportReembolsoConSoportesPDF(
        reembolso,
        movsQ.data,
        fondoQ.data,
        tarifasQ.data,
        reteicaConceptosQ.data,
        reteicaCiudadQ.data,
      );
    },
    onError: (e: Error) => toast.error("No se pudo generar el reporte: " + e.message),
  });

  return (
    <Dialog open={!!reembolso} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reporte de Reembolso de Caja Menor</DialogTitle>
        </DialogHeader>
        {reembolso && fondoQ.data && (() => {
          // Preferimos la "foto" guardada al momento de crear el reembolso.
          // Si es un reembolso viejo (de antes de este cambio) y no tiene
          // foto guardada, usamos los valores actuales como respaldo.
          const montoHistorico = reembolso.monto_fondo_momento ?? montoTotalFondo;
          const gastosHistorico = reembolso.total_gastos_momento ?? totalGastosFondo;
          const esHistorico = reembolso.monto_fondo_momento != null;
          return (
            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-muted/50 border">
                <Info label="Monto fondo" value={fmtMoney(montoHistorico)} />
                <Info label="Total gastos" value={fmtMoney(gastosHistorico)} />
                <Info
                  label="Total disponible"
                  value={fmtMoney(montoHistorico - gastosHistorico)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {esHistorico
                  ? `Estos valores reflejan cómo estaba el fondo el ${fmtDate(reembolso.fecha)}, cuando se creó este reembolso.`
                  : "Este reembolso es de antes de que empezáramos a guardar el histórico, así que se muestran los valores actuales del fondo."}
              </p>
            </div>
          );
        })()}
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
                      <td className="px-2 py-1.5 font-mono">{folioRecibo(m)}</td>
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

            {reembolso.arqueo && (
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-2 flex items-center gap-2">
                  Arqueo de caja
                  {reembolso.arqueo.esCierreMes && (
                    <Badge variant="outline" className="normal-case">Cierre de mes</Badge>
                  )}
                </div>
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-2 py-2">Denominación</th>
                        <th className="px-2 py-2">Cantidad</th>
                        <th className="px-2 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reembolso.arqueo.cantidades).map(([valor, cant]) => (
                        <tr key={valor} className="border-t">
                          <td className="px-2 py-1.5 font-mono">{fmtMoney(Number(valor))}</td>
                          <td className="px-2 py-1.5">{cant}</td>
                          <td className="px-2 py-1.5 text-right">{fmtMoney(Number(valor) * cant)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {reembolso.arqueo.provisionales && reembolso.arqueo.provisionales.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      Recibos provisionales (sin legalizar al momento del arqueo)
                    </div>
                    <div className="overflow-x-auto border rounded-md">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr className="text-left">
                            <th className="px-2 py-2">Tercero</th>
                            <th className="px-2 py-2">Concepto</th>
                            <th className="px-2 py-2 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reembolso.arqueo.provisionales.map((p, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1.5">{p.tercero}</td>
                              <td className="px-2 py-1.5 text-muted-foreground">{p.concepto}</td>
                              <td className="px-2 py-1.5 text-right">{fmtMoney(p.monto)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <Info label="Total contado" value={fmtMoney(reembolso.arqueo.totalContado)} />
                  <Info label="Saldo teórico" value={fmtMoney(reembolso.arqueo.saldoTeorico)} />
                  <Info
                    label={reembolso.arqueo.diferencia === 0 ? "Cuadra" : reembolso.arqueo.diferencia > 0 ? "Sobante" : "Faltante"}
                    value={fmtMoney(Math.abs(reembolso.arqueo.diferencia))}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 pt-6">
              <div className="text-center">
                <div className="border-t pt-1 text-xs">
                  <div className="font-medium">{fondoQ.data?.responsable || "—"}</div>
                  <div className="text-muted-foreground">Elaborado por</div>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t pt-1 text-xs">
                  <div className="font-medium">{fondoQ.data?.nombre_aprobador || "—"}</div>
                  <div className="text-muted-foreground">Autorizado por</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Badge variant="outline" className="mr-auto capitalize">
                {reembolso.estado}
              </Badge>
              <Button
                variant="outline"
                onClick={() =>
                  fondoQ.data &&
                  movsQ.data &&
                  exportReembolsoExcel(reembolso, movsQ.data, fondoQ.data, tarifasQ.data, reteicaConceptosQ.data, reteicaCiudadQ.data, totalGastosFondo)
                }
              >
                <Download className="h-4 w-4 mr-2" /> Reporte contable (Excel)
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  fondoQ.data &&
                  movsQ.data &&
                  exportContabilizacionExcel(reembolso, movsQ.data, fondoQ.data, tarifasQ.data, reteicaConceptosQ.data, reteicaCiudadQ.data, conceptosRetencionRentaQ.data)
                }
              >
                <Download className="h-4 w-4 mr-2" /> Contabilización (plantilla)
              </Button>
              <Button
                variant="outline"
                onClick={() => generarConSoportes.mutate()}
                disabled={generarConSoportes.isPending || !movsQ.data?.length}
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
                onClick={() =>
                  fondoQ.data &&
                  movsQ.data &&
                  exportReembolsoPDF(reembolso, movsQ.data, fondoQ.data, "imprimir", totalGastosFondo)
                }
              >
                <Printer className="h-4 w-4 mr-2" /> Imprimir
              </Button>
              <Button
                onClick={() =>
                  fondoQ.data &&
                  movsQ.data &&
                  exportReembolsoPDF(reembolso, movsQ.data, fondoQ.data, undefined, totalGastosFondo)
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
