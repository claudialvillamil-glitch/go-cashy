-- Guardamos el monto del fondo y el total de gastos pendientes tal como
-- estaban en el momento exacto de crear cada reembolso, para que el
-- historial no cambie con el tiempo (antes se recalculaba con los valores
-- actuales, lo cual no reflejaba fielmente cómo estaba todo en ese momento).
ALTER TABLE public.reembolsos
  ADD COLUMN IF NOT EXISTS monto_fondo_momento NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS total_gastos_momento NUMERIC(14,2);
