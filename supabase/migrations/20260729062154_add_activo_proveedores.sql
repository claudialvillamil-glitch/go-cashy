-- Permite desactivar un proveedor (en vez de eliminarlo) cuando ya tiene
-- movimientos asociados y no se puede borrar por integridad de datos.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
