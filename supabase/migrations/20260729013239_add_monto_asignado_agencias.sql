-- Monto asignado de caja menor por agencia (cada agencia tiene su propio
-- fondo, en vez de un solo monto global para toda la empresa).
ALTER TABLE public.agencias
  ADD COLUMN IF NOT EXISTS monto_asignado NUMERIC(14,2) NOT NULL DEFAULT 0;
