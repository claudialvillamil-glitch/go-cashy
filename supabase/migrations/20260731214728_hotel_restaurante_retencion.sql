-- "Servicios de hotel y restaurante" es una categoría de retención en la
-- fuente aparte de "Servicios" genérico — tarifa fija del 3.5% (no
-- distingue declarante/no declarante), base mínima 4 UVT.
INSERT INTO public.conceptos_retencion_renta (nombre, tarifa_declarante, tarifa_no_declarante, minimo_uvt, cuenta)
SELECT 'Servicios de hotel y restaurante', 3.5, 3.5, 4, '24109503'
WHERE NOT EXISTS (
  SELECT 1 FROM public.conceptos_retencion_renta WHERE nombre = 'Servicios de hotel y restaurante'
);
