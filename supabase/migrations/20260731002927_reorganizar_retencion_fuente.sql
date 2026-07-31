-- Reorganización de la retención en la fuente: en vez de una lista plana de
-- tarifas sueltas, se manejan por CONCEPTO (Compras, Servicios), cada uno
-- con dos tarifas (declarante / no declarante de renta) — el proveedor solo
-- necesita marcar si es o no declarante, y el sistema calcula la tarifa
-- correcta según el concepto elegido.

ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS es_declarante_renta BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.conceptos_retencion_renta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tarifa_declarante NUMERIC(5,2) NOT NULL DEFAULT 0,
  tarifa_no_declarante NUMERIC(5,2) NOT NULL DEFAULT 0,
  minimo_uvt NUMERIC(6,2) NOT NULL DEFAULT 0,
  cuenta TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conceptos_retencion_renta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conceptos retencion renta select" ON public.conceptos_retencion_renta;
CREATE POLICY "conceptos retencion renta select" ON public.conceptos_retencion_renta FOR SELECT
  USING (public.is_active_user());
DROP POLICY IF EXISTS "conceptos retencion renta insert" ON public.conceptos_retencion_renta;
CREATE POLICY "conceptos retencion renta insert" ON public.conceptos_retencion_renta FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "conceptos retencion renta update" ON public.conceptos_retencion_renta;
CREATE POLICY "conceptos retencion renta update" ON public.conceptos_retencion_renta FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "conceptos retencion renta delete" ON public.conceptos_retencion_renta;
CREATE POLICY "conceptos retencion renta delete" ON public.conceptos_retencion_renta FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));

INSERT INTO public.conceptos_retencion_renta (nombre, tarifa_declarante, tarifa_no_declarante, minimo_uvt, cuenta)
VALUES
  ('Compras', 2.5, 3.5, 27, '24109503'),
  ('Servicios', 4, 6, 4, '24109503')
ON CONFLICT DO NOTHING;

-- Los movimientos guardan a qué concepto de retención corresponde (nuevo
-- sistema). Se deja el campo viejo (tarifa_retencion_id) intacto para no
-- perder el histórico de los recibos ya creados.
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS concepto_retencion_renta_id UUID REFERENCES public.conceptos_retencion_renta(id);
ALTER TABLE public.movimiento_items
  ADD COLUMN IF NOT EXISTS concepto_retencion_renta_id UUID REFERENCES public.conceptos_retencion_renta(id);
