import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
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
  es_declarante_renta: false,
  tipo_declarante_renta: "contribuyente",
  autorretenedor_renta: false,
  autorretenedor_ica: false,
  es_facturador_electronico: false,
  regimen_tributario: "responsable_iva",
  pertenece_regimen_simple: false,
  tipo_impuesto: "iva",
};

// Campo de texto directo: escribes el NIT o el nombre y aparecen sugerencias
// abajo (sin necesitar hacer clic en nada más primero). Si escribes un
// número de identificación completo y coincide exacto con un proveedor ya
// creado, se selecciona solo; si no coincide con ninguno, se abre la
// creación automáticamente.
export function ProveedorPicker({
  value,
  onChange,
  onAutoAdvance,
}: {
  value: string;
  onChange: (id: string) => void;
  // Se llama cuando se autoselecciona un proveedor por coincidencia exacta
  // de NIT, para que la pantalla que lo use pueda mover el foco al
  // siguiente campo (ej. Concepto).
  onAutoAdvance?: () => void;
}) {
  const qc = useQueryClient();
  const provsQ = useQuery({ queryKey: ["proveedores"], queryFn: getProveedores });
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [prefill, setPrefill] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = provsQ.data?.find((p) => p.id === value);
  const activos = (provsQ.data ?? []).filter((p) => p.activo);
  const coincidencias = busqueda.trim()
    ? activos.filter((p) =>
        `${p.nombre} ${p.nit}`.toLowerCase().includes(busqueda.toLowerCase()),
      )
    : activos;

  // Mientras no se esté editando, el campo muestra "Nombre — NIT" del
  // proveedor ya seleccionado.
  useEffect(() => {
    if (open) return;
    setBusqueda(selected ? `${selected.nombre} — ${selected.nit}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, open]);

  // Si lo que se escribió parece un número de identificación completo (solo
  // dígitos/puntos/guiones, 5+ caracteres): si coincide EXACTO con el NIT de
  // un proveedor ya creado, se selecciona solo y avanza; si no coincide con
  // ninguno, se abre la pantalla de creación automáticamente.
  useEffect(() => {
    if (!open) return;
    const texto = busqueda.trim();
    const pareceIdentificacion = /^[\d.-]{5,}$/.test(texto);
    if (!pareceIdentificacion) return;
    const timeout = setTimeout(() => {
      const exacto = activos.find((p) => p.nit === texto);
      if (exacto) {
        onChange(exacto.id);
        setOpen(false);
        onAutoAdvance?.();
      } else if (!activos.some((p) => p.nit.includes(texto))) {
        openCreate(texto);
      }
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, open, activos.length]);

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
      const { data: existente } = await supabase
        .from("proveedores")
        .select("id, nombre")
        .eq("nit", form.nit.trim())
        .maybeSingle();
      if (existente) {
        throw new Error(
          `Ya existe un proveedor con ese NIT/identificación: "${existente.nombre}". Búscalo arriba en vez de crear uno nuevo.`,
        );
      }
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
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new Error("Ya existe un proveedor con ese NIT/identificación.");
        }
        throw error;
      }
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={busqueda}
              onFocus={(e) => {
                setOpen(true);
                e.target.select();
              }}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && coincidencias.length > 0) {
                  e.preventDefault();
                  onChange(coincidencias[0].id);
                  setOpen(false);
                  inputRef.current?.blur();
                }
                if (e.key === "Escape") {
                  setOpen(false);
                  inputRef.current?.blur();
                }
              }}
              placeholder="Escribe el NIT o el nombre..."
              className="pl-8"
              autoComplete="off"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 max-h-72 overflow-y-auto"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={() => setOpen(false)}
        >
          {coincidencias.length === 0 ? (
            <div className="py-4 text-center space-y-2 px-2">
              <p className="text-sm text-muted-foreground">No se encontró el proveedor.</p>
              <Button size="sm" variant="secondary" onClick={() => openCreate(busqueda)}>
                <PlusCircle className="h-4 w-4 mr-2" /> Crear proveedor
              </Button>
            </div>
          ) : (
            <div className="py-1">
              {coincidencias.slice(0, 30).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col",
                    value === p.id && "bg-accent",
                  )}
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                    inputRef.current?.blur();
                  }}
                >
                  <span>{p.nombre}</span>
                  <span className="text-xs text-muted-foreground">NIT {p.nit}</span>
                </button>
              ))}
            </div>
          )}
          <div className="border-t p-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={() => openCreate(busqueda)}
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Crear nuevo proveedor
            </Button>
          </div>
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
