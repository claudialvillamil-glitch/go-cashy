
-- Config del fondo (una sola fila)
CREATE TABLE public.fondo_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa TEXT NOT NULL DEFAULT 'Mi Empresa',
  responsable TEXT NOT NULL DEFAULT 'Responsable',
  monto_asignado NUMERIC(14,2) NOT NULL DEFAULT 1000000,
  monto_maximo_gasto NUMERIC(14,2) NOT NULL DEFAULT 500000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fondo_config TO anon, authenticated;
GRANT ALL ON public.fondo_config TO service_role;
ALTER TABLE public.fondo_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read fondo" ON public.fondo_config FOR SELECT USING (true);
CREATE POLICY "public write fondo" ON public.fondo_config FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.agencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencias TO anon, authenticated;
GRANT ALL ON public.agencias TO service_role;
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public agencias" ON public.agencias FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nit TEXT NOT NULL UNIQUE,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proveedores TO anon, authenticated;
GRANT ALL ON public.proveedores TO service_role;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public proveedores" ON public.proveedores FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  cuenta_gasto TEXT NOT NULL,
  cuenta_iva TEXT,
  cuenta_retencion TEXT,
  cuenta_contrapartida TEXT NOT NULL DEFAULT '11050501',
  porcentaje_retencion NUMERIC(5,2) DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conceptos TO anon, authenticated;
GRANT ALL ON public.conceptos TO service_role;
ALTER TABLE public.conceptos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public conceptos" ON public.conceptos FOR ALL USING (true) WITH CHECK (true);

-- Movimientos (recibos de caja menor)
CREATE TABLE public.movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consecutivo SERIAL UNIQUE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  agencia_id UUID REFERENCES public.agencias(id),
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id),
  concepto_id UUID NOT NULL REFERENCES public.conceptos(id),
  detalle TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva NUMERIC(14,2) NOT NULL DEFAULT 0,
  impoconsumo NUMERIC(14,2) NOT NULL DEFAULT 0,
  retencion NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  numero_factura TEXT,
  factura_url TEXT,
  factura_path TEXT,
  estado TEXT NOT NULL DEFAULT 'registrado',
  prioridad TEXT NOT NULL DEFAULT 'recomendada',
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimientos TO anon, authenticated;
GRANT ALL ON public.movimientos TO service_role;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public movimientos" ON public.movimientos FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_movimientos_fecha ON public.movimientos(fecha DESC);
CREATE INDEX idx_movimientos_proveedor ON public.movimientos(proveedor_id);

-- Función updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_mov_updated BEFORE UPDATE ON public.movimientos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_prov_updated BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_fondo_updated BEFORE UPDATE ON public.fondo_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Datos iniciales
INSERT INTO public.fondo_config (empresa, responsable, monto_asignado, monto_maximo_gasto)
VALUES ('Cofincafe', 'Claudia Villamil', 2000000, 500000);

INSERT INTO public.agencias (nombre) VALUES ('Principal'), ('Norte'), ('Sur');

INSERT INTO public.conceptos (nombre, cuenta_gasto, cuenta_iva, cuenta_retencion, porcentaje_retencion) VALUES
  ('Transporte', '51702001', '24080101', '24109503', 3.5),
  ('Papelería', '51101501', '24080101', '24109503', 3.5),
  ('Compra elementos de aseo y cafetería', '51101001', '24080101', '24109503', 3.5),
  ('Gastos de viaje', '51102701', '24080101', '24109503', 3.5),
  ('Mantenimiento', '51301001', '24080101', '24109503', 4.0),
  ('Servicios públicos', '51350501', NULL, NULL, 0);

INSERT INTO public.proveedores (nombre, nit, telefono) VALUES
  ('ALFOMBRANDO S.A.S', '900123456-1', '3001234567'),
  ('Papelería La 15', '900555444-2', '3105554444'),
  ('Taxis Verdes', '901000111-3', '3157778899');
