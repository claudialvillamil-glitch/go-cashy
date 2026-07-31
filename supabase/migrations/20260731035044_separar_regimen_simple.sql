-- "Régimen Simple de Tributación" es una condición tributaria independiente
-- de la responsabilidad de IVA (un proveedor puede ser responsable de IVA Y
-- estar en régimen simple a la vez) — por eso se separa en su propio campo,
-- en vez de ser una opción más de la lista de responsabilidad de IVA.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS pertenece_regimen_simple BOOLEAN NOT NULL DEFAULT false;

-- Migra el dato que ya existía marcado como regimen_tributario = 'simple'.
UPDATE public.proveedores
SET pertenece_regimen_simple = true
WHERE regimen_tributario = 'simple';
