-- Marca de seguimiento manual: cuando un gasto no tiene factura electrónica,
-- la DIAN exige generar un "Documento Soporte" para poder deducirlo. Como ese
-- trámite no está sistematizado (se hace por fuera de la app), este campo
-- permite marcar cuáles ya se generaron y cuáles siguen pendientes.
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS doc_soporte_generado BOOLEAN NOT NULL DEFAULT false;
