import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { getConceptos, getConceptosRetencionRenta, getConceptosReteica, type Concepto } from "@/lib/db";
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
  cuenta_impoconsumo: "",
  cuenta_retencion: "24109503",
  concepto_retencion_renta_id: null,
  concepto_reteica_id: null,
  orden: null,
  cuenta_reteica: "",
  cuenta_reteiva: "",
  cuenta_contrapartida: "11050501",
  porcentaje_retencion: 0,
  porcentaje_iva: 19,
  porcentaje_impoconsumo: 8,
  porcentaje_reteica: 0,
  porcentaje_reteiva: 0,
  activo: true,
};

function Cons() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["conceptos"], queryFn: getConceptos });
  const retencionQ = useQuery({ queryKey: ["conceptos-retencion-renta"], queryFn: getConceptosRetencionRenta });
  const reteicaQ = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Concepto>>(empty);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre!,
        cuenta_gasto: form.cuenta_gasto!,
        cuenta_iva: form.cuenta_iva || null,
        cuenta_impoconsumo: form.cuenta_impoconsumo || null,
        cuenta_retencion: form.cuenta_retencion || null,
        concepto_retencion_renta_id: form.concepto_retencion_renta_id || null,
        concepto_reteica_id: form.concepto_reteica_id || null,
        orden: form.orden ? Number(form.orden) : null,
        cuenta_reteica: form.cuenta_reteica || null,
        cuenta_reteiva: form.cuenta_reteiva || null,
        cuenta_contrapartida: form.cuenta_contrapartida || "11050501",
        porcentaje_retencion: Number(form.porcentaje_retencion) || 0,
        porcentaje_iva: Number(form.porcentaje_iva) || 0,
        porcentaje_reteica: Number(form.porcentaje_reteica) || 0,
        porcentaje_reteiva: Number(form.porcentaje_reteiva) || 0,
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
      const [{ count: countMovs }, { count: countItems }] = await Promise.all([
        supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("concepto_id", id),
        supabase
          .from("movimiento_items")
          .select("id", { count: "exact", head: true })
          .eq("concepto_id", id),
      ]);
      const total = (countMovs ?? 0) + (countItems ?? 0);
      if (total > 0) {
        throw new Error(
          `No se puede eliminar: este concepto ya tiene ${total} recibo(s)/soporte(s) registrado(s). Puedes desactivarlo en su lugar.`,
        );
      }
      const { error } = await supabase.from("conceptos").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") {
          throw new Error(
            "No se puede eliminar: este concepto tiene recibos registrados. Puedes desactivarlo en su lugar.",
          );
        }
        throw error;
      }
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar concepto" : "Nuevo concepto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <F label="Nombre *">
                  <Input
                    value={form.nombre ?? ""}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </F>
                <F label="Orden (opcional)">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ej. 1"
                    value={form.orden ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, orden: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </F>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Los conceptos con número más bajo aparecen primero en el desplegable de "Nuevo
                recibo" (útil para los más usados). Los que no tengan número quedan después,
                ordenados alfabéticamente.
              </p>
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
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">IVA</p>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Cuenta IVA">
                    <Input
                      value={form.cuenta_iva ?? ""}
                      onChange={(e) => setForm({ ...form, cuenta_iva: e.target.value })}
                    />
                  </F>
                  <F label="% IVA">
                    <Input
                      type="number"
                      step="1"
                      value={Math.round(Number(form.porcentaje_iva ?? 0))}
                      onChange={(e) =>
                        setForm({ ...form, porcentaje_iva: Math.round(Number(e.target.value)) })
                      }
                    />
                  </F>
                </div>
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Impoconsumo</p>
                <p className="text-xs text-muted-foreground">
                  El % (8%) ya se calcula automático en el recibo; aquí solo defines la cuenta.
                </p>
                <F label="Cuenta impoconsumo">
                  <Input
                    value={form.cuenta_impoconsumo ?? ""}
                    onChange={(e) => setForm({ ...form, cuenta_impoconsumo: e.target.value })}
                  />
                </F>
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Retención en la fuente</p>
                <F label="Concepto de retención (Compras/Servicios)">
                  <Select
                    value={form.concepto_retencion_renta_id ?? "ninguno"}
                    onValueChange={(v) =>
                      setForm({ ...form, concepto_retencion_renta_id: v === "ninguno" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ninguno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguno">Ninguno (no aplica retención)</SelectItem>
                      {retencionQ.data?.filter((r) => r.activo).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Al elegir este gasto en un recibo, la retención se calculará sola según este
                    concepto y si el proveedor es declarante de renta o no.
                  </p>
                </F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Cuenta retención (respaldo)">
                    <Input
                      value={form.cuenta_retencion ?? ""}
                      onChange={(e) => setForm({ ...form, cuenta_retencion: e.target.value })}
                    />
                  </F>
                  <F label="% Retención (respaldo, sistema antiguo)">
                    <Input
                      type="number"
                      step="0.1"
                      value={Number(form.porcentaje_retencion ?? 0)}
                      onChange={(e) =>
                        setForm({ ...form, porcentaje_retencion: Number(e.target.value) })
                      }
                    />
                  </F>
                </div>
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">ReteICA</p>
                <F label="Concepto de ReteICA (Compras/Servicios)">
                  <Select
                    value={form.concepto_reteica_id ?? "ninguno"}
                    onValueChange={(v) =>
                      setForm({ ...form, concepto_reteica_id: v === "ninguno" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ninguno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguno">Ninguno (no aplica ReteICA)</SelectItem>
                      {reteicaQ.data?.filter((r) => r.activo).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    La tarifa, el tope mínimo y la cuenta contable (que varían por agencia) se
                    configuran en Configuración → ReteICA por agencia/concepto.
                  </p>
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
                <th className="px-4 py-3 font-medium">Orden</th>
                <th className="px-4 py-3 font-medium">Cuenta gasto</th>
                <th className="px-4 py-3 font-medium">IVA</th>
                <th className="px-4 py-3 font-medium">% IVA</th>
                <th className="px-4 py-3 font-medium">Impoconsumo</th>
                <th className="px-4 py-3 font-medium">Rete Fuente</th>
                <th className="px-4 py-3 font-medium">%</th>
                <th className="px-4 py-3 font-medium">ReteICA</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {q.data?.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.orden ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.cuenta_gasto}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {c.cuenta_iva ?? "—"}
                  </td>
                  <td className="px-4 py-3">{Math.round(Number(c.porcentaje_iva ?? 0))}%</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {c.cuenta_impoconsumo ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {c.cuenta_retencion ?? "—"}
                  </td>
                  <td className="px-4 py-3">{Number(c.porcentaje_retencion ?? 0)}%</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {reteicaQ.data?.find((r) => r.id === c.concepto_reteica_id)?.nombre ?? "—"}
                  </td>
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
