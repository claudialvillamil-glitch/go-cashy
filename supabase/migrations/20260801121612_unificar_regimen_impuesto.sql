-- Se unifica "Impuesto que factura este proveedor" dentro de
-- "Responsabilidades de IVA e impoconsumo" — antes eran dos campos
-- separados que ambos determinaban qué impuesto se activaba en el recibo.
-- Esta actualización preserva el comportamiento que ya tenía cada
-- proveedor, migrando lo que estaba en tipo_impuesto al nuevo régimen.
UPDATE public.proveedores
SET regimen_tributario = CASE
  WHEN tipo_impuesto = 'impoconsumo' THEN 'responsable_impoconsumo'
  WHEN tipo_impuesto = 'ambos' THEN 'responsable_ambos'
  WHEN tipo_impuesto = 'sin_iva' THEN 'no_responsable_iva'
  WHEN responsable_iva = true THEN 'responsable_iva'
  ELSE 'no_responsable_iva'
END;
