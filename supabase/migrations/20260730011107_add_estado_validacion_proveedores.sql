-- Estado de validación del proveedor: cuando un Responsable de agencia crea
-- un tercero nuevo (por ejemplo, al vuelo desde un recibo), queda como
-- "pendiente" hasta que contabilidad lo revise y valide.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS estado_validacion TEXT NOT NULL DEFAULT 'validado';
-- estado_validacion: 'pendiente' | 'validado'
