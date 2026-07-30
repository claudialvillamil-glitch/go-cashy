-- Trazabilidad de aprobación: independiente del estado (el responsable
-- puede pagar sin necesitar aprobación previa). Solo registra quién y
-- cuándo lo aprobó el Director de agencia, con su propio usuario.
ALTER TABLE public.reembolsos
  ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ;
