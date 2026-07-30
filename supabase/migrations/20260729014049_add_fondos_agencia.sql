-- Una agencia puede tener más de una caja menor (ej. Armenia tiene la de
-- "Secretaría de Gerencia" y la de la agencia misma). Cada fondo tiene su
-- propia cuenta contable y su propio monto asignado.
CREATE TABLE IF NOT EXISTS public.fondos_agencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
  cuenta_contable TEXT,
  nombre TEXT NOT NULL DEFAULT 'Caja menor',
  monto_asignado NUMERIC(14,2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fondos_agencia TO anon, authenticated;
GRANT ALL ON public.fondos_agencia TO service_role;
ALTER TABLE public.fondos_agencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fondos_agencia select activos" ON public.fondos_agencia;
CREATE POLICY "fondos_agencia select activos" ON public.fondos_agencia FOR SELECT
  USING (public.is_active_user());
DROP POLICY IF EXISTS "fondos_agencia config insert" ON public.fondos_agencia;
CREATE POLICY "fondos_agencia config insert" ON public.fondos_agencia FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
DROP POLICY IF EXISTS "fondos_agencia config update" ON public.fondos_agencia;
CREATE POLICY "fondos_agencia config update" ON public.fondos_agencia FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
DROP POLICY IF EXISTS "fondos_agencia config delete" ON public.fondos_agencia;
CREATE POLICY "fondos_agencia config delete" ON public.fondos_agencia FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));

-- Guardamos con qué fondo/caja menor específico se registró cada gasto.
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS fondo_agencia_id UUID REFERENCES public.fondos_agencia(id);

-- Sembramos los fondos según lo reportado en el archivo de fondos por
-- agencia: cada fila es (código de agencia, nombre del fondo, cuenta, monto).
INSERT INTO public.fondos_agencia (agencia_id, cuenta_contable, nombre, monto_asignado)
SELECT a.id, v.cuenta, v.nombre, v.monto
FROM (VALUES
  (1, '11051001', 'Secretaría de Gerencia', 4000000),
  (1, '11051013', 'Caja menor Agencia Armenia', 1000000),
  (2, '11051003', 'Caja menor Oficina Pereira', 2000000),
  (4, '11051005', 'Caja menor Oficina Tuluá', 1000000),
  (5, '11051006', 'Caja menor Quimbaya', 1000000),
  (6, '11051007', 'Caja menor Chinchiná', 1000000),
  (7, '11051008', 'Caja menor Santa Rosa', 1000000),
  (8, '11051009', 'Caja menor Norte', 1000000),
  (9, '11051010', 'Caja menor La Tebaida', 1000000),
  (14, '11051015', 'Caja menor Fundadores - Ibagué', 1000000),
  (15, '11051016', 'Caja menor La Unión', 1000000),
  (16, '11051017', 'Caja menor Cartago', 1000000),
  (17, '11051018', 'Caja menor Cali', 1000000),
  (18, '11051019', 'Caja menor Mosquera', 700000),
  (19, '11051020', 'Caja menor Zipaquirá', 1000000),
  (20, '11051021', 'Caja menor Popayán', 1000000)
) AS v(codigo, cuenta, nombre, monto)
JOIN public.agencias a ON a.codigo = v.codigo
WHERE NOT EXISTS (
  SELECT 1 FROM public.fondos_agencia fa
  WHERE fa.agencia_id = a.id AND fa.cuenta_contable = v.cuenta
);
