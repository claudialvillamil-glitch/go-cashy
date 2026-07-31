-- El valor por defecto de "declarante de renta" pasa a ser NO (false), ya
-- que en la práctica la mayoría de proveedores pequeños de caja menor no lo
-- son. Aplica solo a proveedores NUEVOS (no cambia los que ya existen).
ALTER TABLE public.proveedores
  ALTER COLUMN es_declarante_renta SET DEFAULT false;
