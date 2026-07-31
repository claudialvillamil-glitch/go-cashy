-- Base general de ReteICA por agencia y concepto (Compras/Servicios) — una
-- sola por combinación, en vez de repetirla en cada fila de tarifa por CIIU.
-- Las tarifas específicas por CIIU (tabla tarifas_reteica_ciudad) ahora
-- toman la base desde aquí, en vez de tener su propio "tope" repetido.
CREATE TABLE IF NOT EXISTS public.bases_reteica_agencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID NOT NULL REFERENCES public.agencias(id),
  concepto_reteica_id UUID NOT NULL REFERENCES public.conceptos_reteica(id),
  base NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agencia_id, concepto_reteica_id)
);

ALTER TABLE public.bases_reteica_agencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bases reteica select" ON public.bases_reteica_agencia;
CREATE POLICY "bases reteica select" ON public.bases_reteica_agencia FOR SELECT
  USING (public.is_active_user());
DROP POLICY IF EXISTS "bases reteica insert" ON public.bases_reteica_agencia;
CREATE POLICY "bases reteica insert" ON public.bases_reteica_agencia FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "bases reteica update" ON public.bases_reteica_agencia;
CREATE POLICY "bases reteica update" ON public.bases_reteica_agencia FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "bases reteica delete" ON public.bases_reteica_agencia;
CREATE POLICY "bases reteica delete" ON public.bases_reteica_agencia FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
