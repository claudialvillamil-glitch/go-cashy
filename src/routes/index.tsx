import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingDown, Receipt, AlertTriangle } from "lucide-react";
import { getFondo, getMovimientos } from "@/lib/db";
import { fmtMoney, fmtDate, pad } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resumen · Caja Menor" },
      {
        name: "description",
        content: "Panel principal del fondo de caja menor: saldo disponible y últimos movimientos.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <Resumen />
    </AppLayout>
  ),
});

function Resumen() {
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const movsQ = useQuery({ queryKey: ["movimientos"], queryFn: getMovimientos });

  const fondo = fondoQ.data;
  const movs = movsQ.data ?? [];

  // El saldo disponible solo se ve afectado por gastos que aún no han sido
  // reembolsados. En cuanto una solicitud de reembolso se marca "pagado",
  // esos gastos ya no restan porque el fondo fue repuesto por la empresa.
  const gastosPendientes = movs.filter((m) => m.reembolsos?.estado !== "pagado" && m.estado !== "anulado");
  const totalPendiente = gastosPendientes.reduce((s, m) => s + Number(m.total), 0);
  const saldo = fondo ? Number(fondo.monto_asignado) - totalPendiente : 0;
  const pct = fondo ? Math.min(100, (totalPendiente / Number(fondo.monto_asignado)) * 100) : 0;

  const MESES_CORTOS = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  const gastosPorMesMap = new Map<string, { mes: string; total: number; orden: string }>();
  gastosPendientes.forEach((m) => {
    const d = new Date(m.fecha + "T00:00:00");
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const etiqueta = `${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
    const actual = gastosPorMesMap.get(clave) ?? { mes: etiqueta, total: 0, orden: clave };
    actual.total += Number(m.total);
    gastosPorMesMap.set(clave, actual);
  });
  const gastosPorMes = [...gastosPorMesMap.values()].sort((a, b) => a.orden.localeCompare(b.orden));

  // Aviso de reembolso: cuando los gastos pendientes llegan al % configurado del
  // fondo, o cuando estamos en los últimos 2 días del mes (cierre de mes).
  const pctReal = fondo ? (totalPendiente / Number(fondo.monto_asignado)) * 100 : 0;
  const limite = fondo ? Number(fondo.limite_alerta_reembolso_pct) : 80;
  const alcanzoLimite = fondo ? pctReal >= limite : false;
  const hoy = new Date();
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const esCierreDeMes = hoy.getDate() >= ultimoDiaMes - 1;
  const hayPendientes = gastosPendientes.length > 0;
  const mostrarAviso = hayPendientes && (alcanzoLimite || esCierreDeMes);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fondo de caja menor</h1>
          <p className="text-sm text-muted-foreground">
            {fondo?.empresa} · Responsable: {fondo?.responsable}
          </p>
        </div>
        <Link to="/nuevo">
          <Button size="lg" className="gap-2">
            <Receipt className="h-4 w-4" />
            Registrar gasto
          </Button>
        </Link>
      </header>

      {mostrarAviso && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-warning/40 bg-warning/10">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Es momento de solicitar el reembolso del fondo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {alcanzoLimite &&
                `Los gastos pendientes ya llegaron al ${pctReal.toFixed(0)}% del fondo (límite: ${limite}%). `}
              {esCierreDeMes && "Estamos cerca del cierre de mes. "}
              Tú decides cuándo crear la solicitud.
            </p>
          </div>
          <Link to="/reembolsos">
            <Button size="sm" variant="outline">
              Ir a reembolsos
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Wallet} label="Monto asignado" value={fmtMoney(fondo?.monto_asignado)} tone="primary" />
        <StatCard icon={TrendingDown} label="Gastos ejecutados" value={fmtMoney(totalPendiente)} tone="warning" />
        <StatCard icon={Wallet} label="Saldo disponible" value={fmtMoney(saldo)} tone="success" />
        <StatCard icon={Receipt} label="Movimientos" value={String(movs.length)} tone="muted" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Utilización del fondo</CardTitle>
          {hayPendientes && (
            <Link to="/reembolsos" className="text-sm text-primary hover:underline">
              Ir a reembolsos →
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {fmtMoney(totalPendiente)} de {fmtMoney(fondo?.monto_asignado)}
            </span>
            <span className="font-medium">{pct.toFixed(1)}%</span>
          </div>
          <Progress value={pct} className="h-3" />
          {hayPendientes ? (
            <p className="text-xs text-muted-foreground mt-2">
              Tienes <b>{gastosPendientes.length}</b> gasto{gastosPendientes.length === 1 ? "" : "s"}{" "}
              por un total de <b>{fmtMoney(totalPendiente)}</b> que todavía{" "}
              <b>no se ha{gastosPendientes.length === 1 ? "" : "n"} reembolsado</b>. Esta suma se
              descuenta del saldo disponible hasta que hagas la solicitud de reembolso.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              No hay gastos pendientes por reembolsar en este momento.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gastos por mes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total gastos pendientes por reembolsar: <span className="font-medium text-foreground">{fmtMoney(totalPendiente)}</span>
          </p>
        </CardHeader>
        <CardContent>
          {gastosPorMes.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Aún no hay datos suficientes para graficar.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gastosPorMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => fmtMoney(v)} width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Últimos movimientos</CardTitle>
          <Link to="/movimientos" className="text-sm text-primary hover:underline">
            Ver todos →
          </Link>
        </CardHeader>
        <CardContent>
          {movs.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Aún no hay movimientos. <Link to="/nuevo" className="text-primary underline">Registra el primero</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 font-medium">Recibo</th>
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 font-medium">Proveedor</th>
                    <th className="py-2 font-medium">Concepto</th>
                    <th className="py-2 font-medium text-right">Total</th>
                    <th className="py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.slice(0, 6).map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2.5 font-mono text-xs">{pad(m.consecutivo)}</td>
                      <td className="py-2.5">{fmtDate(m.fecha)}</td>
                      <td className="py-2.5">{m.proveedores?.nombre}</td>
                      <td className="py-2.5 text-muted-foreground">{m.conceptos?.nombre}</td>
                      <td className="py-2.5 text-right font-medium">{fmtMoney(m.total)}</td>
                      <td className="py-2.5">
                        <Badge variant="secondary" className="capitalize">
                          {m.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "success" | "warning" | "muted";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    muted: "bg-muted text-muted-foreground",
  } as const;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="mt-1.5 text-2xl font-semibold">{value}</div>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
