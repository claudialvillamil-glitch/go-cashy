-- Igual que "Responsable", ahora cada fondo/agencia puede tener su propio
-- "Nombre de quien autoriza los reembolsos" (solo el nombre, es
-- informativo — aparece como firma "AUTORIZADO POR" en el recibo).
ALTER TABLE public.fondos_agencia
  ADD COLUMN IF NOT EXISTS nombre_aprobador TEXT;
