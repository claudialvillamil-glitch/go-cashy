-- 1. Prevent self privilege escalation on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() = 'admin' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.rol IS DISTINCT FROM 'pendiente' OR NEW.activo IS DISTINCT FROM false OR NEW.agencia_id IS NOT NULL THEN
      RAISE EXCEPTION 'No autorizado para asignar rol, estado activo o agencia';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.rol IS DISTINCT FROM OLD.rol
     OR NEW.activo IS DISTINCT FROM OLD.activo
     OR NEW.agencia_id IS DISTINCT FROM OLD.agencia_id THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar rol, estado activo o agencia';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2. Fix reembolsos select join bug
DROP POLICY IF EXISTS "reembolsos select" ON public.reembolsos;
CREATE POLICY "reembolsos select" ON public.reembolsos
FOR SELECT TO authenticated
USING (
  get_my_role() = ANY (ARRAY['admin','contador','auditoria','analista_contable'])
  OR EXISTS (
    SELECT 1 FROM public.movimientos m
    WHERE m.reembolso_id = reembolsos.id
      AND m.agencia_id = get_my_agencia()
  )
);

-- 3. movimiento_soportes table (additional support files per movimiento)
CREATE TABLE IF NOT EXISTS public.movimiento_soportes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movimiento_id uuid NOT NULL REFERENCES public.movimientos(id) ON DELETE CASCADE,
  factura_path text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimiento_soportes TO authenticated;
GRANT ALL ON public.movimiento_soportes TO service_role;

ALTER TABLE public.movimiento_soportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimiento_soportes select" ON public.movimiento_soportes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.movimientos m
  WHERE m.id = movimiento_soportes.movimiento_id
    AND (
      get_my_role() = ANY (ARRAY['admin','contador','auditoria','analista_contable'])
      OR m.agencia_id = get_my_agencia()
    )
));

CREATE POLICY "movimiento_soportes insert" ON public.movimiento_soportes
FOR INSERT TO authenticated
WITH CHECK (is_active_user() AND EXISTS (
  SELECT 1 FROM public.movimientos m
  WHERE m.id = movimiento_soportes.movimiento_id
    AND (get_my_role() = 'admin' OR (get_my_role() = 'responsable' AND m.agencia_id = get_my_agencia()))
));

CREATE POLICY "movimiento_soportes update" ON public.movimiento_soportes
FOR UPDATE TO authenticated
USING (is_active_user() AND EXISTS (
  SELECT 1 FROM public.movimientos m
  WHERE m.id = movimiento_soportes.movimiento_id
    AND (get_my_role() = 'admin' OR (get_my_role() = 'responsable' AND m.agencia_id = get_my_agencia()))
));

CREATE POLICY "movimiento_soportes delete" ON public.movimiento_soportes
FOR DELETE TO authenticated
USING (is_active_user() AND EXISTS (
  SELECT 1 FROM public.movimientos m
  WHERE m.id = movimiento_soportes.movimiento_id
    AND (get_my_role() = 'admin' OR (get_my_role() = 'responsable' AND m.agencia_id = get_my_agencia()))
));

-- 4. Scope facturas storage bucket per agencia
CREATE OR REPLACE FUNCTION public.can_read_factura(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_active_user() AND (
    get_my_role() = ANY (ARRAY['admin','contador','auditoria','analista_contable'])
    OR split_part(_name, '/', 1) = COALESCE(get_my_agencia()::text, '~none~')
    OR EXISTS (
      SELECT 1 FROM public.movimientos m
      WHERE m.factura_path = _name AND m.agencia_id = get_my_agencia()
    )
    OR EXISTS (
      SELECT 1 FROM public.movimiento_soportes s
      JOIN public.movimientos m ON m.id = s.movimiento_id
      WHERE s.factura_path = _name AND m.agencia_id = get_my_agencia()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_factura(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_active_user() AND (
    get_my_role() = 'admin'
    OR (get_my_role() = 'responsable'
        AND split_part(_name, '/', 1) = COALESCE(get_my_agencia()::text, '~none~'))
  );
$$;

DROP POLICY IF EXISTS "facturas select activos" ON storage.objects;
DROP POLICY IF EXISTS "facturas insert activos" ON storage.objects;
DROP POLICY IF EXISTS "facturas update activos" ON storage.objects;

CREATE POLICY "facturas select scoped" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'facturas' AND public.can_read_factura(name));

CREATE POLICY "facturas insert scoped" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'facturas' AND public.can_write_factura(name));

CREATE POLICY "facturas update scoped" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'facturas' AND public.can_write_factura(name))
WITH CHECK (bucket_id = 'facturas' AND public.can_write_factura(name));

-- 5. Remove execute rights for anonymous visitors on internal definer functions
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_agencia() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_read_factura(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_write_factura(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_agencia() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;