-- Tipo de identificación para personas naturales (cédula de ciudadanía,
-- cédula de extranjería o pasaporte). No aplica a personas jurídicas (usan NIT).
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS tipo_identificacion TEXT NOT NULL DEFAULT 'CC';
-- tipo_identificacion: 'CC' | 'CE' | 'PA'
