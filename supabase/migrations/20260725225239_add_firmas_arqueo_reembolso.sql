-- Nombre de quien autoriza los reembolsos (firma "Autorizado por" en el
-- formato de libro de caja menor). El responsable del fondo ya existe en
-- fondo_config.responsable y se usa como firma "Elaborado por".
ALTER TABLE public.fondo_config
  ADD COLUMN IF NOT EXISTS nombre_aprobador TEXT NOT NULL DEFAULT '';

-- Arqueo de caja realizado al momento de crear la solicitud de reembolso
-- (conteo de billetes/monedas, total contado, saldo teórico y diferencia).
ALTER TABLE public.reembolsos
  ADD COLUMN IF NOT EXISTS arqueo JSONB;
