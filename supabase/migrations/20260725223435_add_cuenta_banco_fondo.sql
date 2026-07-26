-- Cuenta contable desde la que la empresa repone el fondo de caja menor
-- (se usa como crédito en el asiento de reposición al pagar un reembolso).
ALTER TABLE public.fondo_config
  ADD COLUMN IF NOT EXISTS cuenta_banco TEXT NOT NULL DEFAULT '24109503';
