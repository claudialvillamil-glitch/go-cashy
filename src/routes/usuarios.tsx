import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAgencias, getFondosAgencia, getProfiles, type Profile } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [{ title: "Usuarios · Caja Menor" }],
  }),
  component: () => (
    <AppLayout>
      <Usuarios />
    </AppLayout>
  ),
});

const ROLES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "admin", label: "Administrador" },
  { value: "responsable", label: "Responsable de agencia" },
  { value: "director_agencia", label: "Director de agencia" },
  { value: "contador", label: "Contador (solo lectura)" },
  { value: "auditoria", label: "Gerencia/Auditoría (solo lectura)" },
  { value: "analista_contable", label: "Analista contable (solo lectura)" },
  { value: "auxiliar_contable", label: "Auxiliar contable (solo lectura)" },
];

function Usuarios() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });
  const agsQ = useQuery({ queryKey: ["agencias"], queryFn: getAgencias });
  const fondosQ = useQuery({ queryKey: ["fondos-agencia"], queryFn: getFondosAgencia });

  const actualizar = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Profile, "rol" | "agencia_id" | "activo" | "fondo_agencia_id">>;
    }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Activa las cuentas nuevas y asigna el rol y la agencia de cada persona. Los
          "Responsables de agencia" y "Directores de agencia" solo trabajan/consultan la
          agencia que les asignes aquí.
        </p>
      </header>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Agencia</th>
                <th className="px-4 py-3 font-medium">Fondo/Caja menor</th>
                <th className="px-4 py-3 font-medium">Activo</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {p.nombre || "—"}
                    {p.rol === "pendiente" && (
                      <Badge variant="secondary" className="ml-2">
                        Nuevo
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={p.rol}
                      onValueChange={(v) => actualizar.mutate({ id: p.id, patch: { rol: v as Profile["rol"] } })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={p.agencia_id ?? "ninguna"}
                      onValueChange={(v) =>
                        actualizar.mutate({
                          id: p.id,
                          patch: { agencia_id: v === "ninguna" ? null : v },
                        })
                      }
                      disabled={p.rol !== "responsable" && p.rol !== "director_agencia"}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sin agencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ninguna">Sin agencia</SelectItem>
                        {agsQ.data?.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.codigo != null ? `${a.codigo} - ${a.nombre}` : a.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={p.fondo_agencia_id ?? "auto"}
                      onValueChange={(v) =>
                        actualizar.mutate({
                          id: p.id,
                          patch: { fondo_agencia_id: v === "auto" ? null : v },
                        })
                      }
                      disabled={p.rol !== "responsable" || !p.agencia_id}
                    >
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="Automático" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automático (elige al crear)</SelectItem>
                        {fondosQ.data
                          ?.filter((f) => f.activo && f.agencia_id === p.agencia_id)
                          .map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={p.activo}
                      onCheckedChange={(v) =>
                        actualizar.mutate({ id: p.id, patch: { activo: v === true } })
                      }
                    />
                  </td>
                </tr>
              ))}
              {(q.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    Aún no hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
