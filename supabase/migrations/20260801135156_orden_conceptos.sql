-- Orden de aparición del concepto en el desplegable de "Nuevo recibo" (los
-- más usados van primero). Los que no tengan número asignado aparecen
-- después, ordenados alfabéticamente.
ALTER TABLE public.conceptos
  ADD COLUMN IF NOT EXISTS orden INTEGER;
