import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getFondo } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración · Caja Menor" },
      { name: "description", content: "Configuración del fondo de caja menor de la empresa." },
    ],
  }),
  component: () => (
    <AppLayout>
      <Conf />
    </AppLayout>
  ),
});

function Conf() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const [empresa, setEmpresa] = useState("");
  const [responsable, setResponsable] = useState("");
  const [monto, setMonto] = useState("");
  const [maximo, setMaximo] = useState("");

  useEffect(() => {
    if (q.data) {
      setEmpresa(q.data.empresa);
      setResponsable(q.data.responsable);
      setMonto(String(q.data.monto_asignado));
      setMaximo(String(q.data.monto_maximo_gasto));
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!q.data) return;
      const { error } = await supabase
        .from("fondo_config")
        .update({
          empresa,
          responsable,
          monto_asignado: Number(monto),
          monto_maximo_gasto: Number(maximo),
        })
        .eq("id", q.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuración actualizada");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración del fondo</h1>
        <p className="text-sm text-muted-foreground">
          Datos generales de la empresa y parámetros del fondo de caja menor.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Empresa</Label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Responsable del fondo</Label>
            <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Monto asignado al fondo (COP)</Label>
            <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Monto máximo por gasto (COP)</Label>
            <Input type="number" value={maximo} onChange={(e) => setMaximo(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
