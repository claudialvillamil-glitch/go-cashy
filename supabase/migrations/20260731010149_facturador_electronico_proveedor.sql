-- Marca si el proveedor factura electrónicamente. Si es así, al elegirlo en
-- un recibo se activa solo "Factura electrónica" y se exige el número de
-- factura; si no lo es, el campo de número de factura queda deshabilitado
-- (no se le exige, ya que normalmente no emite ese tipo de soporte).
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS es_facturador_electronico BOOLEAN NOT NULL DEFAULT false;
