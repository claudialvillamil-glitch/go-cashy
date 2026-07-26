-- Tipo de impuesto que factura el proveedor: la mayoría cobra IVA, pero
-- algunos (restaurantes, bares, ciertos servicios) cobran Impoconsumo en su
-- lugar. Se usa para preseleccionar automáticamente el tipo de impuesto en
-- el recibo al elegir el proveedor.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS tipo_impuesto TEXT NOT NULL DEFAULT 'iva';
-- tipo_impuesto: 'iva' | 'impoconsumo'
