-- Se unifican "excluido" y "exento" en un solo valor (ya no se distinguen
-- como opciones separadas en el formulario).
UPDATE public.proveedores
SET tipo_impuesto = 'sin_iva'
WHERE tipo_impuesto IN ('excluido', 'exento');
