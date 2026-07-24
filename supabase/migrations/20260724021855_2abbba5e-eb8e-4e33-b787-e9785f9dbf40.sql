
ALTER TABLE public.movimientos ADD COLUMN IF NOT EXISTS multi_soporte boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.movimiento_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movimiento_id uuid NOT NULL REFERENCES public.movimientos(id) ON DELETE CASCADE,
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id),
  concepto_id uuid NOT NULL REFERENCES public.conceptos(id),
  numero_factura text,
  factura_electronica boolean NOT NULL DEFAULT false,
  detalle text,
  subtotal numeric NOT NULL DEFAULT 0,
  iva numeric NOT NULL DEFAULT 0,
  impoconsumo numeric NOT NULL DEFAULT 0,
  retencion numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movimiento_items_movimiento_id_idx ON public.movimiento_items(movimiento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimiento_items TO anon, authenticated;
GRANT ALL ON public.movimiento_items TO service_role;

ALTER TABLE public.movimiento_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public movimiento_items" ON public.movimiento_items FOR ALL USING (true) WITH CHECK (true);
