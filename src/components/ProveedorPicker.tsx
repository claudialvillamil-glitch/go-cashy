import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getProveedores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProveedorFormFields } from "@/components/ProveedorFormFields";

const formVacio = {
  nombre: "",
  activo: true,
  nit: "",
  tipo_proveedor: "juridica",
  tipo_identificacion: "CC",
  digito_verificacion: "",
  telefono: "",
  email: "",
  direccion: "",
  codigo_ciiu: "",
  pais: "Colombia",
  departamento: "",
  ciudad: "",
  aplica_retencion: false,
  tarifa_retencion_id: "",
  aplica_reteica: false,
  concepto_reteica_id: "",
  tarifa_reteica: 0,
  aplica_reteiva: false,
  responsable_iva: true,
  es_declarante_renta: true,
  es_facturador_electronico: false,
  regimen_tributario: "comun",
  tipo_impuesto: "iva",
};

export function ProveedorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const qc = useQueryClient();
  const provsQ = useQuery({ queryKey: ["proveedores"], queryFn: getProveedores });
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [prefill, setPrefill] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const selected = provsQ.data?.find((p) => p.id === value);
  const activos = (provsQ.data ?? []).filter((p) => p.activo);
  const coincidencias = busqueda.trim()
    ? activos.filter((p) =>
        `${p.nombre} ${p.nit}`.toLowerCase().includes(busqueda.toLowerCase()),
      )
    : activos;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<Record<string, any>>(formVacio);

  const openCreate = (q?: string) => {
    const query = (q ?? "").trim();
    const looksLikeNit = /^[\d.-]+$/.test(query);
    setForm({ ...formVacio, nombre: looksLikeNit ? "" : query, nit: looksLikeNit ? query : "" });
    setPrefill(query);
    setDialog(true);
    setOpen(false);
  };

  const crear = useMutation({
    mutationFn: async () => {
      if (!form.nombre.trim() || !form.nit.trim()) throw new Error("Nombre y NIT son obligatorios");
      const { data: auth } = await supabase.auth.getUser();
      const { data: perfil } = auth?.user
        ? await supabase.from("profiles").select("rol").eq("id", auth.user.id).maybeSingle()
        : { data: null };
      const { data, error } = await supabase
        .from("proveedores")
        .insert({
          ...form,
          nombre: form.nombre.trim(),
          nit: form.nit.trim(),
          telefono: form.telefono || null,
          email: form.email || null,
          direccion: form.direccion || null,
          departamento: form.departamento || null,
          ciudad: form.ciudad || null,
          codigo_ciiu: form.codigo_ciiu || null,
          tarifa_retencion_id: form.tarifa_retencion_id || null,
          concepto_reteica_id: form.concepto_reteica_id || null,
          estado_validacion: perfil?.rol === "responsable" ? "pendiente" : "validado",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (p) => {
      toast.success(
        p.estado_validacion === "pendiente"
          ? "Proveedor creado. Queda pendiente de validación por contabilidad."
          : "Proveedor creado",
      );
      qc.invalidateQueries({ queryKey: ["proveedores"] });
      onChange(p.id);
      setDialog(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setBusqueda("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? `${selected.nombre} — ${selected.nit}` : "Buscar por nombre o NIT..."}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command
            filter={(val, search) => {
              return val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder="Buscar por nombre o NIT..."
              value={busqueda}
              onValueChange={setBusqueda}
              onKeyDown={(e) => {
                if (e.key === "Enter" && coincidencias.length > 0) {
                  e.preventDefault();
                  onChange(coincidencias[0].id);
                  setOpen(false);
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">No se encontró el proveedor.</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const input = document.querySelector<HTMLInputElement>(
                        "[cmdk-input]",
                      );
                      openCreate(input?.value);
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" /> Crear proveedor
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {activos.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.nombre} ${p.nit}`}
                    onSelect={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 mr-2",
                        value === p.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{p.nombre}</span>
                      <span className="text-xs text-muted-foreground">NIT {p.nit}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <div className="border-t p-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => openCreate()}
                >
                  <PlusCircle className="h-4 w-4 mr-2" /> Crear nuevo proveedor
                </Button>
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo proveedor</DialogTitle>
          </DialogHeader>
          {prefill && (
            <p className="text-xs text-muted-foreground -mt-2">
              Prellenado desde la búsqueda: "{prefill}"
            </p>
          )}
          <ProveedorFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => crear.mutate()} disabled={crear.isPending}>
              {crear.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
