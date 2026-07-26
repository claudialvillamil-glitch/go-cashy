-- Tipo de proveedor: persona natural (identificada con cédula) o persona
-- jurídica (identificada con NIT + dígito de verificación, razón social).
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS tipo_proveedor TEXT NOT NULL DEFAULT 'juridica',
  ADD COLUMN IF NOT EXISTS digito_verificacion TEXT;
-- tipo_proveedor: 'natural' | 'juridica'
