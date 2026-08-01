-- Catálogo configurable de códigos CIIU (actividad económica), para elegir
-- por "código - nombre" en vez de digitarlo a mano. Se siembra con algunas
-- actividades comunes en proveedores de caja menor; se pueden agregar más
-- desde Configuración según se necesiten.
CREATE TABLE IF NOT EXISTS public.codigos_ciiu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.codigos_ciiu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "codigos ciiu select" ON public.codigos_ciiu;
CREATE POLICY "codigos ciiu select" ON public.codigos_ciiu FOR SELECT
  USING (public.is_active_user());
DROP POLICY IF EXISTS "codigos ciiu insert" ON public.codigos_ciiu;
CREATE POLICY "codigos ciiu insert" ON public.codigos_ciiu FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "codigos ciiu update" ON public.codigos_ciiu;
CREATE POLICY "codigos ciiu update" ON public.codigos_ciiu FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "codigos ciiu delete" ON public.codigos_ciiu;
CREATE POLICY "codigos ciiu delete" ON public.codigos_ciiu FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));

INSERT INTO public.codigos_ciiu (codigo, nombre) VALUES
  ('4711', 'Comercio al por menor en establecimientos no especializados'),
  ('4721', 'Comercio al por menor de alimentos'),
  ('4771', 'Comercio al por menor de prendas de vestir'),
  ('4772', 'Comercio al por menor de productos farmacéuticos'),
  ('4773', 'Comercio al por menor de otros productos nuevos'),
  ('4661', 'Comercio al por mayor de combustibles sólidos, líquidos y gaseosos'),
  ('4731', 'Comercio al por menor de combustible para vehículos'),
  ('4923', 'Transporte de carga por carretera'),
  ('4922', 'Transporte de pasajeros por carretera'),
  ('5611', 'Expendio a la mesa de comidas preparadas (restaurantes)'),
  ('5612', 'Expendio por autoservicio de comidas preparadas (cafeterías)'),
  ('5613', 'Expendio de comidas preparadas en cafeterías'),
  ('5619', 'Otros tipos de expendio de comidas preparadas'),
  ('5511', 'Alojamiento en hoteles'),
  ('8010', 'Actividades de seguridad privada'),
  ('8129', 'Otras actividades de limpieza de edificios e instalaciones industriales'),
  ('7911', 'Actividades de agencias de viaje'),
  ('6120', 'Actividades de telecomunicaciones inalámbricas'),
  ('3511', 'Generación de energía eléctrica'),
  ('3600', 'Captación, tratamiento y distribución de agua'),
  ('8299', 'Otras actividades de servicio de apoyo a las empresas')
ON CONFLICT (codigo) DO NOTHING;
