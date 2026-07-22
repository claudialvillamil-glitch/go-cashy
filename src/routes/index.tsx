import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingDown, Receipt, Users } from "lucide-react";
import { getFondo, getMovimientos, getProveedores } from "@/lib/db";
import { fmtMoney, fmtDate, pad } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Caja Menor" },
      {
        name: "description",
        content: "Panel principal del fondo de caja menor: saldo disponible y últimos movimientos.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  ),
});

function Dashboard() {
  const fondoQ = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const movsQ = useQuery({ queryKey: ["movimientos"], queryFn: getMovimientos });
  const provsQ = useQuery({ queryKey: ["proveedores"], queryFn: getProveedores });

  const fondo = fondoQ.data;
  const movs = movsQ.data ?? [];
  const total = movs.reduce((s, m) => s + Number(m.total), 0);
  const saldo = fondo ? Number(fondo.monto_asignado) - total : 0;
  const pct = fondo ? Math.min(100, (total / Number(fondo.monto_asignado)) * 100) : 0;

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

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Wallet} label="Monto asignado" value={fmtMoney(fondo?.monto_asignado)} tone="primary" />
        <StatCard icon={TrendingDown} label="Gastos ejecutados" value={fmtMoney(total)} tone="warning" />
        <StatCard icon={Wallet} label="Saldo disponible" value={fmtMoney(saldo)} tone="success" />
        <StatCard icon={Receipt} label="Movimientos" value={String(movs.length)} tone="muted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Utilización del fondo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {fmtMoney(total)} de {fmtMoney(fondo?.monto_asignado)}
            </span>
            <span className="font-medium">{pct.toFixed(1)}%</span>
          </div>
          <Progress value={pct} className="h-3" />
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Proveedores registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{provsQ.data?.length ?? 0}</div>
            <Link to="/proveedores" className="text-sm text-primary hover:underline">
              Administrar →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Límite por gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{fmtMoney(fondo?.monto_maximo_gasto)}</div>
            <p className="text-sm text-muted-foreground">
              Máximo autorizado por movimiento individual.
            </p>
          </CardContent>
        </Card>
      </div>
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
