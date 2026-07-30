-- Consecutivo de recibo por fondo (agencia), con prefijo configurable (ej.
-- "AR" para Agencia Armenia, "ARG" para Secretaría de Gerencia, "PE" para
-- Pereira). El consecutivo global interno (movimientos.consecutivo) se
-- mantiene como está (uso interno, ordenamiento), y se agrega un número de
-- folio POR FONDO específico para mostrar como "N° Recibo" al usuario.
ALTER TABLE public.fondos_agencia
  ADD COLUMN IF NOT EXISTS prefijo TEXT;

ALTER TABLE public.agencias
  ADD COLUMN IF NOT EXISTS prefijo TEXT;

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS numero_fondo INTEGER;

-- Sembramos los prefijos sugeridos por el usuario para las agencias que ya
-- mencionó, como referencia (se pueden editar en Configuración).
UPDATE public.agencias SET prefijo = 'AR' WHERE codigo = 1 AND prefijo IS NULL;
UPDATE public.agencias SET prefijo = 'PE' WHERE codigo = 2 AND prefijo IS NULL;
UPDATE public.agencias SET prefijo = 'TU' WHERE codigo = 4 AND prefijo IS NULL;
UPDATE public.agencias SET prefijo = 'QU' WHERE codigo = 5 AND prefijo IS NULL;

UPDATE public.fondos_agencia fa SET prefijo = 'AR'
  FROM public.agencias a
  WHERE fa.agencia_id = a.id AND a.codigo = 1 AND fa.nombre ILIKE '%agencia%' AND fa.prefijo IS NULL;
UPDATE public.fondos_agencia fa SET prefijo = 'ARG'
  FROM public.agencias a
  WHERE fa.agencia_id = a.id AND a.codigo = 1 AND fa.nombre ILIKE '%gerencia%' AND fa.prefijo IS NULL;
