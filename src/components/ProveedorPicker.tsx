import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  es_gran_contribuyente: false,
  es_facturador_electronico: false,
  regimen_tributario: "responsable_iva",
  pertenece_regimen_simple: false,
  tipo_impuesto: "iva",
};

// Campo de texto directo por NIT: no muestra ninguna lista mientras se
// escribe (con muchos proveedores cargados sería una lista enorme). Se
// escribe el número de identificación completo y, cuando coincide exacto
// con uno ya creado, se trae el nombre solo y avanza al siguiente campo; si
// no existe ningún proveedor con ese número, se abre la creación con el
// aviso "El tercero no existe".
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
  const [texto, setTexto] = useState("");
  const [dialog, setDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = provsQ.data?.find((p) => p.id === value);
  const activos = (provsQ.data ?? []).filter((p) => p.activo);

  // Mientras no se esté editando, el campo muestra "Nombre — NIT" del
  // proveedor ya seleccionado.
  useEffect(() => {
    setTexto(selected ? `${selected.nombre} — ${selected.nit}` : "");
  }, [selected?.id]);

  const buscarPorNit = (nitBuscado: string) => {
    const exacto = activos.find((p) => p.nit === nitBuscado);
    if (exacto) {
      onChange(exacto.id);
      onAutoAdvance?.();
    } else {
      openCreate(nitBuscado);
    }
  };

  // Busca automáticamente unos milisegundos después de dejar de escribir,
  // sin depender de que el usuario presione Enter o salga del campo — así
  // funciona igual si borra el número y escribe uno nuevo.
  useEffect(() => {
    const nitBuscado = texto.trim();
    const displaySeleccionado = selected ? `${selected.nombre} — ${selected.nit}` : "";
    if (!nitBuscado || nitBuscado === displaySeleccionado) return;
    const pareceIdentificacion = /^[\d.-]{7,}$/.test(nitBuscado);
    if (!pareceIdentificacion) return;
    const timeout = setTimeout(() => buscarPorNit(nitBuscado), 900);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, activos.length]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<Record<string, any>>(formVacio);

  const openCreate = (nitBuscado: string) => {
    setForm({ ...formVacio, nit: nitBuscado });
    setDialog(true);
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
          `Ya existe un proveedor con ese NIT/identificación: "${existente.nombre}".`,
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
          tipo_impuesto:
            form.regimen_tributario === "responsable_impoconsumo"
              ? "impoconsumo"
              : form.regimen_tributario === "responsable_ambos"
                ? "ambos"
                : form.regimen_tributario === "no_responsable_iva" || form.regimen_tributario === "sin_iva"
                  ? "sin_iva"
                  : "iva",
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
      onAutoAdvance?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={texto}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setTexto(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const nitBuscado = texto.trim();
              if (nitBuscado) buscarPorNit(nitBuscado);
            }
          }}
          onBlur={() => {
            const nitBuscado = texto.trim();
            // Si lo que quedó no corresponde al proveedor ya seleccionado
            // (o está vacío), buscamos por ese número al salir del campo.
            if (nitBuscado && nitBuscado !== `${selected?.nombre} — ${selected?.nit}`) {
              buscarPorNit(nitBuscado);
            } else if (!nitBuscado) {
              onChange("");
            }
          }}
          placeholder="Escribe el número de identificación completo..."
          className="pl-8"
          autoComplete="off"
        />
        {selected && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              onChange("");
              setTexto("");
              inputRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>El tercero no existe</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            No hay ningún proveedor con el número <b>{form.nit}</b>. Completa los datos para
            crearlo.
          </p>
          <ProveedorFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialog(false);
                setTexto(selected ? `${selected.nombre} — ${selected.nit}` : "");
              }}
            >
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
