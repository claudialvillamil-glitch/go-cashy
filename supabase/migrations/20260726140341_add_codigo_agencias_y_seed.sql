-- Código numérico de la agencia (identificador interno de la empresa).
ALTER TABLE public.agencias
  ADD COLUMN IF NOT EXISTS codigo INTEGER;

-- Evita duplicar el mismo código de agencia.
CREATE UNIQUE INDEX IF NOT EXISTS agencias_codigo_key ON public.agencias (codigo);

-- Crea las agencias solicitadas (si el código ya existe, no lo duplica).
INSERT INTO public.agencias (codigo, nombre) VALUES
  (1, 'Armenia'),
  (2, 'Pereira'),
  (4, 'Tuluá'),
  (5, 'Quimbaya'),
  (6, 'Chinchiná'),
  (7, 'Santa Rosa'),
  (8, 'Fundadores'),
  (9, 'La Tebaida'),
  (13, 'Buga'),
  (14, 'Ibagué'),
  (15, 'La Unión'),
  (16, 'Cartago'),
  (17, 'Cali'),
  (18, 'Mosquera'),
  (19, 'Zipaquirá'),
  (20, 'Popayán')
ON CONFLICT (codigo) DO NOTHING;
