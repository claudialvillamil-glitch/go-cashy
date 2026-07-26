-- Valor de la UVT vigente (cambia cada año por resolución de la DIAN). Se usa
-- para calcular la cuantía mínima a partir de la cual aplica la retención en
-- la fuente (ej. servicios: 4 UVT). Se deja en 0 por defecto para que la
-- empresa lo configure con el valor del año vigente; mientras esté en 0, no
-- se aplica ningún filtro de cuantía mínima (se respeta el comportamiento
-- anterior).
ALTER TABLE public.fondo_config
  ADD COLUMN IF NOT EXISTS valor_uvt NUMERIC(10,2) NOT NULL DEFAULT 0;
