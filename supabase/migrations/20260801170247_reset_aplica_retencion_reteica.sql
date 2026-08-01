-- "Aplica retención en la fuente" y "Aplica ReteICA" ya no se configuran a
-- nivel de proveedor (ahora dependen 100% del concepto del gasto + la
-- agencia). Se resetean a false en los proveedores que ya existían, para
-- que no queden generando ReteICA por accidente en agencias que no lo
-- manejan.
UPDATE public.proveedores
SET aplica_retencion = false,
    aplica_reteica = false
WHERE aplica_retencion = true OR aplica_reteica = true;
