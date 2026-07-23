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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getProveedores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const selected = provsQ.data?.find((p) => p.id === value);

  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  const openCreate = (q?: string) => {
    const query = (q ?? "").trim();
    const looksLikeNit = /^[\d.-]+$/.test(query);
    setNombre(looksLikeNit ? "" : query);
    setNit(looksLikeNit ? query : "");
    setTelefono("");
    setEmail("");
    setPrefill(query);
    setDialog(true);
    setOpen(false);
  };

  const crear = useMutation({
    mutationFn: async () => {
      if (!nombre.trim() || !nit.trim()) throw new Error("Nombre y NIT son obligatorios");
      const { data, error } = await supabase
        .from("proveedores")
        .insert({
          nombre: nombre.trim(),
          nit: nit.trim(),
          telefono: telefono || null,
          email: email || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (p) => {
      toast.success("Proveedor creado");
      qc.invalidateQueries({ queryKey: ["proveedores"] });
      onChange(p.id);
      setDialog(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
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
            <CommandInput placeholder="Buscar por nombre o NIT..." />
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
                {(provsQ.data ?? []).map((p) => (
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo proveedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>NIT *</Label>
              <Input value={nit} onChange={(e) => setNit(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Teléfono</Label>
                <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {prefill && (
              <p className="text-xs text-muted-foreground">
                Prellenado desde la búsqueda: "{prefill}"
              </p>
            )}
          </div>
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
