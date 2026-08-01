-- "Gran Contribuyente" pasa a ser un campo independiente (checkbox), igual
-- que Régimen Simple, en vez de ser una opción más de la responsabilidad de
-- IVA — un proveedor puede ser Gran Contribuyente y a la vez responsable o
-- no de IVA.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS es_gran_contribuyente BOOLEAN NOT NULL DEFAULT false;

-- Migra los que ya estaban marcados con el régimen "gran_contribuyente".
UPDATE public.proveedores
SET es_gran_contribuyente = true,
    regimen_tributario = 'responsable_iva'
WHERE regimen_tributario = 'gran_contribuyente';
