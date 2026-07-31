-- Cada reembolso queda vinculado directamente a la agencia y al fondo
-- específico (antes solo se sabía indirectamente a través de sus
-- movimientos), para poder filtrar la lista de Reembolsos por agencia igual
-- que las demás pantallas.
ALTER TABLE public.reembolsos
  ADD COLUMN IF NOT EXISTS agencia_id UUID REFERENCES public.agencias(id),
  ADD COLUMN IF NOT EXISTS fondo_agencia_id UUID REFERENCES public.fondos_agencia(id);

-- Rellena los reembolsos que ya existían, tomando la agencia/fondo de sus
-- propios movimientos (deberían ser todos iguales dentro de un mismo
-- reembolso).
UPDATE public.reembolsos r
SET
  agencia_id = m.agencia_id,
  fondo_agencia_id = m.fondo_agencia_id
FROM (
  SELECT DISTINCT ON (reembolso_id) reembolso_id, agencia_id, fondo_agencia_id
  FROM public.movimientos
  WHERE reembolso_id IS NOT NULL
  ORDER BY reembolso_id, id
) m
WHERE r.id = m.reembolso_id AND r.agencia_id IS NULL;
