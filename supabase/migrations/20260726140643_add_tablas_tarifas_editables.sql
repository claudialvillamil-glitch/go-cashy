-- Tarifas de retención en la fuente (renta), editables desde Configuración.
-- Reemplaza el catálogo fijo que antes vivía solo en el código.
CREATE TABLE IF NOT EXISTS public.tarifas_retencion_renta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
  minimo_uvt NUMERIC(5,2) NOT NULL DEFAULT 4,
  cuenta TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarifas_retencion_renta TO anon, authenticated;
GRANT ALL ON public.tarifas_retencion_renta TO service_role;
ALTER TABLE public.tarifas_retencion_renta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public tarifas_retencion_renta" ON public.tarifas_retencion_renta FOR ALL USING (true) WITH CHECK (true);

-- Conceptos de ReteICA (Servicios/Compras/otros), editables desde Configuración.
CREATE TABLE IF NOT EXISTS public.conceptos_reteica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cuenta TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conceptos_reteica TO anon, authenticated;
GRANT ALL ON public.conceptos_reteica TO service_role;
ALTER TABLE public.conceptos_reteica ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public conceptos_reteica" ON public.conceptos_reteica FOR ALL USING (true) WITH CHECK (true);

-- Sembramos los valores que ya existían como catálogo fijo, tomando las
-- cuentas que ya se habían configurado en fondo_config.
INSERT INTO public.tarifas_retencion_renta (nombre, porcentaje, minimo_uvt, cuenta)
SELECT 'Serv. hotel y restaurante', 3.5, 4, cuenta_retencion_hotel FROM public.fondo_config LIMIT 1;
INSERT INTO public.tarifas_retencion_renta (nombre, porcentaje, minimo_uvt, cuenta)
SELECT 'Servicios generales (declarante)', 4, 4, cuenta_retencion_servicios_declarante FROM public.fondo_config LIMIT 1;
INSERT INTO public.tarifas_retencion_renta (nombre, porcentaje, minimo_uvt, cuenta)
SELECT 'Servicios generales (no declarante)', 6, 4, cuenta_retencion_servicios_no_declarante FROM public.fondo_config LIMIT 1;
INSERT INTO public.tarifas_retencion_renta (nombre, porcentaje, minimo_uvt, cuenta)
SELECT 'Fletes', 1, 4, cuenta_retencion_fletes FROM public.fondo_config LIMIT 1;

INSERT INTO public.conceptos_reteica (nombre, cuenta)
SELECT 'Servicios', cuenta_reteica_servicios FROM public.fondo_config LIMIT 1;
INSERT INTO public.conceptos_reteica (nombre, cuenta)
SELECT 'Compras', cuenta_reteica_compras FROM public.fondo_config LIMIT 1;

-- Ahora que la cuenta vive en la tabla, apuntamos el movimiento a la tarifa
-- por su id en vez de por una clave de texto fija.
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS tarifa_retencion_id UUID REFERENCES public.tarifas_retencion_renta(id),
  ADD COLUMN IF NOT EXISTS concepto_reteica_id UUID REFERENCES public.conceptos_reteica(id);
