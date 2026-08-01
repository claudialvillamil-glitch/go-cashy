-- El % de alerta (el gasto no debería superar este % del fondo) queda
-- configurable por fondo/agencia, en vez de estar fijo en 15% en el código.
ALTER TABLE public.fondos_agencia
  ADD COLUMN IF NOT EXISTS porcentaje_alerta_gasto NUMERIC(5,2) NOT NULL DEFAULT 15;
