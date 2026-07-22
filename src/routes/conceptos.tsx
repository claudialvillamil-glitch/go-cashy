import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { getConceptos, type Concepto } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/conceptos")({
  head: () => ({
    meta: [
      { title: "Conceptos contables · Caja Menor" },
      {
        name: "description",
        content:
          "Parametrización contable de los conceptos de gasto: cuentas y porcentajes de retención.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <Cons />
    </AppLayout>
  ),
});

const empty: Partial<Concepto> = {
  nombre: "",
  cuenta_gasto: "",
  cuenta_iva: "24080101",
  cuenta_retencion: "24109503",
  cuenta_contrapartida: "11050501",
  porcentaje_retencion: 0,
  activo: true,
};

function Cons() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["conceptos"], queryFn: getConceptos });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Concepto>>(empty);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre!,
        cuenta_gasto: form.cuenta_gasto!,
        cuenta_iva: form.cuenta_iva || null,
        cuenta_retencion: form.cuenta_retencion || null,
        cuenta_contrapartida: form.cuenta_contrapartida || "11050501",
        porcentaje_retencion: Number(form.porcentaje_retencion) || 0,
        activo: form.activo ?? true,
      };
      if (form.id) {
        const { error } = await supabase.from("conceptos").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("conceptos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Concepto guardado");
      qc.invalidateQueries({ queryKey: ["conceptos"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("conceptos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concepto eliminado");
      qc.invalidateQueries({ queryKey: ["conceptos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conceptos contables</h1>
          <p className="text-sm text-muted-foreground">
            Parametrización de cuentas y retenciones por tipo de gasto.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(empty)}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo concepto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar concepto" : "Nuevo concepto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <F label="Nombre *">
                <Input
                  value={form.nombre ?? ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Cuenta gasto *">
                  <Input
                    value={form.cuenta_gasto ?? ""}
                    onChange={(e) => setForm({ ...form, cuenta_gasto: e.target.value })}
                  />
                </F>
                <F label="Cuenta contrapartida (caja)">
                  <Input
                    value={form.cuenta_contrapartida ?? ""}
                    onChange={(e) => setForm({ ...form, cuenta_contrapartida: e.target.value })}
                  />
                </F>
                <F label="Cuenta IVA">
                  <Input
                    value={form.cuenta_iva ?? ""}
                    onChange={(e) => setForm({ ...form, cuenta_iva: e.target.value })}
                  />
                </F>
                <F label="Cuenta retención">
                  <Input
                    value={form.cuenta_retencion ?? ""}
                    onChange={(e) => setForm({ ...form, cuenta_retencion: e.target.value })}
                  />
                </F>
                <F label="% Retención">
                  <Input
                    type="number"
                    step="0.1"
                    value={form.porcentaje_retencion ?? 0}
                    onChange={(e) =>
                      setForm({ ...form, porcentaje_retencion: Number(e.target.value) })
                    }
                  />
                </F>
              </div>
              <Button
                className="w-full"
                onClick={() => save.mutate()}
                disabled={!form.nombre || !form.cuenta_gasto || save.isPending}
              >
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Concepto</th>
                <th className="px-4 py-3 font-medium">Cuenta gasto</th>
                <th className="px-4 py-3 font-medium">IVA</th>
                <th className="px-4 py-3 font-medium">Retención</th>
                <th className="px-4 py-3 font-medium">%</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {q.data?.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.cuenta_gasto}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {c.cuenta_iva ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {c.cuenta_retencion ?? "—"}
                  </td>
                  <td className="px-4 py-3">{c.porcentaje_retencion ?? 0}%</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.activo ? "default" : "secondary"}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setForm(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("¿Eliminar concepto?")) del.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
