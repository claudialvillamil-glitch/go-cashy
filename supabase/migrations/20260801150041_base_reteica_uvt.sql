-- La base de ReteICA por agencia ahora se guarda en UVT (igual que la
-- retención en la fuente), para que se actualice sola en pesos cada vez
-- que cambie el valor de la UVT vigente, en vez de un monto fijo en pesos
-- que quedaba desactualizado cada año.
ALTER TABLE public.bases_reteica_agencia
  ADD COLUMN IF NOT EXISTS base_uvt NUMERIC(8,2) NOT NULL DEFAULT 0;
