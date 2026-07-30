-- El consecutivo del recibo nunca se debe poder modificar (ni por error, ni
-- por un intento directo desde SQL/API), para no romper la numeración.
CREATE OR REPLACE FUNCTION public.proteger_consecutivo_movimiento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.consecutivo IS DISTINCT FROM OLD.consecutivo THEN
    RAISE EXCEPTION 'El consecutivo del recibo no se puede modificar.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_consecutivo ON public.movimientos;
CREATE TRIGGER proteger_consecutivo
  BEFORE UPDATE ON public.movimientos
  FOR EACH ROW EXECUTE FUNCTION public.proteger_consecutivo_movimiento();
