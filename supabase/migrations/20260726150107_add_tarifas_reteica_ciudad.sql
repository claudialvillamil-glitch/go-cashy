-- Tarifas de ReteICA por agencia (ciudad) y actividad económica (CIIU).
-- El ICA varía mucho entre municipios y por tipo de actividad, así que cada
-- combinación tiene su propia tarifa, tope mínimo (base gravable mínima) y
-- cuenta contable. codigo_ciiu puede quedar vacío para que sirva como tarifa
-- general de esa agencia (aplica a cualquier actividad que no tenga una fila
-- específica).
CREATE TABLE IF NOT EXISTS public.tarifas_reteica_ciudad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
  codigo_ciiu TEXT,
  tarifa NUMERIC(6,3) NOT NULL DEFAULT 0,
  tope NUMERIC(14,2) NOT NULL DEFAULT 0,
  cuenta TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarifas_reteica_ciudad TO anon, authenticated;
GRANT ALL ON public.tarifas_reteica_ciudad TO service_role;
ALTER TABLE public.tarifas_reteica_ciudad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reteica ciudad select activos" ON public.tarifas_reteica_ciudad FOR SELECT
  USING (public.is_active_user());
CREATE POLICY "reteica ciudad config insert" ON public.tarifas_reteica_ciudad FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
CREATE POLICY "reteica ciudad config update" ON public.tarifas_reteica_ciudad FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
CREATE POLICY "reteica ciudad config delete" ON public.tarifas_reteica_ciudad FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));

-- Guardamos qué fila de tarifa se usó en cada recibo, para contabilizar en
-- la cuenta correcta y poder auditar qué tope/tarifa se aplicó.
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS tarifa_reteica_ciudad_id UUID REFERENCES public.tarifas_reteica_ciudad(id);
