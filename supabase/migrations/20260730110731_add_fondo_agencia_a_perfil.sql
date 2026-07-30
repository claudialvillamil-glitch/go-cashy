-- Cuando una agencia tiene más de una caja menor (ej. Armenia tiene
-- "Secretaría de Gerencia" y "Agencia Armenia"), el admin puede vincular al
-- usuario responsable a UNA de ellas específicamente, para que no tenga
-- que elegirla cada vez que registra un recibo.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fondo_agencia_id UUID REFERENCES public.fondos_agencia(id);
