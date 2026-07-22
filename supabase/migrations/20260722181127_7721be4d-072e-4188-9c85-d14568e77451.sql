
CREATE SEQUENCE IF NOT EXISTS reembolsos_consecutivo_seq START 1;

CREATE TABLE public.reembolsos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consecutivo integer NOT NULL DEFAULT nextval('reembolsos_consecutivo_seq'),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  periodo_inicio date NOT NULL,
  periodo_fin date NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'solicitado',
  observaciones text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reembolsos TO anon, authenticated;
GRANT ALL ON public.reembolsos TO service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE reembolsos_consecutivo_seq TO anon, authenticated, service_role;

ALTER TABLE public.reembolsos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reembolsos" ON public.reembolsos FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_reembolsos_updated_at
BEFORE UPDATE ON public.reembolsos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.movimientos
  ADD COLUMN reembolso_id uuid REFERENCES public.reembolsos(id) ON DELETE SET NULL;

CREATE INDEX idx_movimientos_reembolso ON public.movimientos(reembolso_id);
