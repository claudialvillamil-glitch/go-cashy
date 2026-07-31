-- Cada concepto de gasto (Cafetería, Transporte, etc.) solo necesita
-- marcar si para ReteICA corresponde a "Compras" o "Servicios" — el tope,
-- la tarifa y la cuenta (que varían por agencia) ya viven en
-- Configuración → ReteICA por agencia/concepto.
ALTER TABLE public.conceptos
  ADD COLUMN IF NOT EXISTS concepto_reteica_id UUID REFERENCES public.conceptos_reteica(id);
