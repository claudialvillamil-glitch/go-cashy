-- % del monto asignado que, al alcanzarse en gastos pendientes de reembolso,
-- dispara un aviso en el dashboard para que el usuario solicite el reembolso.
ALTER TABLE public.fondo_config
  ADD COLUMN IF NOT EXISTS limite_alerta_reembolso_pct NUMERIC(5,2) NOT NULL DEFAULT 80;
