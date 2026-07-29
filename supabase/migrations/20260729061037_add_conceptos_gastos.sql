-- Conceptos de gastos con sus cuentas contables de subtotal, IVA e
-- impoconsumo, según lo confirmado por el usuario. Se evita duplicar si el
-- concepto ya existe (por nombre).

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Implementos de aseo', '51101001', '51101002', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Implementos de aseo');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Cafetería y restaurante', '51101101', '51101102', 19, '51101103', '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Cafetería y restaurante');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Transporte urbano e intermunicipal', '51101401', '51101402', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Transporte urbano e intermunicipal');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Combustible', '51101401', '51101402', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Combustible');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Papelería y útiles de oficina', '51101501', '51101502', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Papelería y útiles de oficina');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Correo', '51101301', NULL, 0, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Correo');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Servicios públicos', '51101201', '51101202', 19, '51101203', '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Servicios públicos');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Exámenes médicos ingresos y retiros', '51100101', '51100102', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Exámenes médicos ingresos y retiros');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Certificados tradición y cámara de comercio', '51102401', '51102402', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Certificados tradición y cámara de comercio');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Servicio de hotel', '51102701', '51102702', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Servicio de hotel');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Mantenimiento y reparaciones', '51100601', '51100602', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Mantenimiento y reparaciones');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Cuentas por pagar', '24109502', NULL, 0, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Cuentas por pagar');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Pagos Fondo de bienestar', '26250505', '26250506', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Pagos Fondo de bienestar');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, porcentaje_iva, cuenta_impoconsumo, cuenta_contrapartida, activo)
SELECT 'Fondo de solidaridad', '26100505', '26100506', 19, NULL, '11050501', true
WHERE NOT EXISTS (SELECT 1 FROM public.conceptos WHERE nombre = 'Fondo de solidaridad');
