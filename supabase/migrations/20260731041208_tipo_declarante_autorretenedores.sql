-- Clasificación del tipo de declarante de renta del proveedor (dimensión
-- independiente de la responsabilidad de IVA y del Régimen Simple ya
-- existentes), más los dos indicadores de autorretención: un
-- autorretenedor no lleva retención en SU propio impuesto (renta o ICA,
-- según cuál marque), porque él mismo se practica la retención.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS tipo_declarante_renta TEXT NOT NULL DEFAULT 'contribuyente',
  ADD COLUMN IF NOT EXISTS autorretenedor_renta BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autorretenedor_ica BOOLEAN NOT NULL DEFAULT false;
