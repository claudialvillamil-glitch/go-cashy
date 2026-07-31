-- Cada agencia puede tener un tope y tarifa de ReteICA DISTINTO para
-- Compras y para Servicios (antes solo había uno por agencia, sin
-- distinguir el concepto).
ALTER TABLE public.tarifas_reteica_ciudad
  ADD COLUMN IF NOT EXISTS concepto_reteica_id UUID REFERENCES public.conceptos_reteica(id);
