-- El monto máximo de pago (límite que bloquea el gasto en Nuevo recibo)
-- también debe poder configurarse por fondo/agencia, no solo de forma
-- global. Si un fondo específico no tiene uno configurado (0 = sin
-- límite propio), se usa el global de Configuración → Datos generales
-- como respaldo.
ALTER TABLE public.fondos_agencia
  ADD COLUMN IF NOT EXISTS monto_maximo_gasto NUMERIC(14,2) NOT NULL DEFAULT 0;
