import { useState } from "react";
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

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Selecciona...",
  disabled = false,
  emptyLabel = "No se encontró ningún resultado.",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const coincidencias = busqueda.trim()
    ? options.filter((o) => o.toLowerCase().includes(busqueda.toLowerCase()))
    : options;

  return (
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
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={(val, search) => (val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput
            placeholder="Escribe para buscar..."
            value={busqueda}
            onValueChange={setBusqueda}
            onKeyDown={(e) => {
              if (e.key === "Enter" && coincidencias.length > 0) {
                e.preventDefault();
                onChange(coincidencias[0]);
                setOpen(false);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              <p className="py-4 text-center text-sm text-muted-foreground">{emptyLabel}</p>
            </CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o}
                  value={o}
                  onSelect={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4 mr-2", value === o ? "opacity-100" : "opacity-0")} />
                  {o}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
