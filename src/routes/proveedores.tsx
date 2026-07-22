import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { getProveedores, type Proveedor } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/proveedores")({
  head: () => ({
    meta: [
      { title: "Proveedores · Caja Menor" },
      { name: "description", content: "Administración de proveedores del fondo de caja menor." },
    ],
  }),
  component: () => (
    <AppLayout>
      <Provs />
    </AppLayout>
  ),
});

const empty = { nombre: "", nit: "", telefono: "", email: "", direccion: "" };

function Provs() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["proveedores"], queryFn: getProveedores });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Proveedor>>(empty);

  const save = useMutation({
    mutationFn: async () => {
      if (form.id) {
        const { error } = await supabase
          .from("proveedores")
          .update({
            nombre: form.nombre,
            nit: form.nit,
            telefono: form.telefono || null,
            email: form.email || null,
            direccion: form.direccion || null,
          })
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proveedores").insert({
          nombre: form.nombre!,
          nit: form.nit!,
          telefono: form.telefono || null,
          email: form.email || null,
          direccion: form.direccion || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Proveedor guardado");
      qc.invalidateQueries({ queryKey: ["proveedores"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proveedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proveedor eliminado");
      qc.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            {q.data?.length ?? 0} proveedores registrados
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(empty)}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <F label="Nombre / Razón social *">
                <Input
                  value={form.nombre ?? ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </F>
              <F label="NIT / Identificación *">
                <Input
                  value={form.nit ?? ""}
                  onChange={(e) => setForm({ ...form, nit: e.target.value })}
                />
              </F>
              <F label="Teléfono">
                <Input
                  value={form.telefono ?? ""}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </F>
              <F label="Email">
                <Input
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </F>
              <F label="Dirección">
                <Input
                  value={form.direccion ?? ""}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                />
              </F>
              <Button
                className="w-full"
                onClick={() => save.mutate()}
                disabled={!form.nombre || !form.nit || save.isPending}
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
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">NIT</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {q.data?.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.nit}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.telefono ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setForm(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("¿Eliminar proveedor?")) del.mutate(p.id);
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
