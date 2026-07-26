-- Información tributaria del proveedor: régimen (afecta si se le practican
-- retenciones normalmente) y si es responsable de IVA.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS responsable_iva BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS regimen_tributario TEXT NOT NULL DEFAULT 'comun';
-- regimen_tributario: 'comun' | 'simple' | 'gran_contribuyente' | 'autorretenedor'
