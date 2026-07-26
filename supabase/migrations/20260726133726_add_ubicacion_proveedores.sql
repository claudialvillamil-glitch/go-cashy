-- Ubicación del proveedor: país (Colombia por defecto), departamento y
-- ciudad. El departamento determina qué ciudades se sugieren en el formulario.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS pais TEXT NOT NULL DEFAULT 'Colombia',
  ADD COLUMN IF NOT EXISTS departamento TEXT,
  ADD COLUMN IF NOT EXISTS ciudad TEXT;
