-- Cada fondo (una agencia puede tener más de uno, ej. "Secretaría de
-- Gerencia" y "Agencia Armenia") puede tener su propio responsable, con su
-- identificación — necesaria para contabilizar la cuenta 24109503 a nombre
-- de la persona correcta según de qué fondo salió el dinero.
ALTER TABLE public.fondos_agencia
  ADD COLUMN IF NOT EXISTS responsable TEXT,
  ADD COLUMN IF NOT EXISTS identificacion_responsable TEXT;
