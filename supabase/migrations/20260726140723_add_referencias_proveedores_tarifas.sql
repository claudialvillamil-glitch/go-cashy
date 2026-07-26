-- Los proveedores ahora referencian la tarifa de retención y el concepto de
-- ReteICA por id (en vez de una clave de texto fija), para que apunten a las
-- tablas editables tarifas_retencion_renta y conceptos_reteica.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS tarifa_retencion_id UUID REFERENCES public.tarifas_retencion_renta(id),
  ADD COLUMN IF NOT EXISTS concepto_reteica_id UUID REFERENCES public.conceptos_reteica(id);

-- Migramos lo que ya estaba guardado como texto a la nueva referencia por id.
UPDATE public.proveedores p
SET tarifa_retencion_id = t.id
FROM public.tarifas_retencion_renta t
WHERE p.tipo_retencion_renta = 'hotel' AND t.nombre = 'Serv. hotel y restaurante';

UPDATE public.proveedores p
SET tarifa_retencion_id = t.id
FROM public.tarifas_retencion_renta t
WHERE p.tipo_retencion_renta = 'servicios_declarante' AND t.nombre = 'Servicios generales (declarante)';

UPDATE public.proveedores p
SET tarifa_retencion_id = t.id
FROM public.tarifas_retencion_renta t
WHERE p.tipo_retencion_renta = 'servicios_no_declarante' AND t.nombre = 'Servicios generales (no declarante)';

UPDATE public.proveedores p
SET tarifa_retencion_id = t.id
FROM public.tarifas_retencion_renta t
WHERE p.tipo_retencion_renta = 'fletes' AND t.nombre = 'Fletes';

UPDATE public.proveedores p
SET concepto_reteica_id = c.id
FROM public.conceptos_reteica c
WHERE p.concepto_reteica = 'servicios' AND c.nombre = 'Servicios';

UPDATE public.proveedores p
SET concepto_reteica_id = c.id
FROM public.conceptos_reteica c
WHERE p.concepto_reteica = 'compras' AND c.nombre = 'Compras';
