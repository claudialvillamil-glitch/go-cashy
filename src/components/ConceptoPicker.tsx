import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { getConceptos } from "@/lib/db";

export function ConceptoPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const consQ = useQuery({ queryKey: ["conceptos"], queryFn: getConceptos });
  const [open, setOpen] = useState(false);

  const activos = (consQ.data ?? [])
    .filter((c) => c.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const selected = activos.find((c) => c.id === value);

  return (
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
            {selected ? selected.nombre : "Busca el concepto (o digita la primera letra)..."}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={(val, search) => (val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Busca el concepto..." />
          <CommandList>
            <CommandEmpty>
              <p className="py-4 text-center text-sm text-muted-foreground">
                No se encontró ningún concepto.
              </p>
            </CommandEmpty>
            <CommandGroup>
              {activos.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.nombre}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4 mr-2", value === c.id ? "opacity-100" : "opacity-0")} />
                  {c.nombre}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
