-- "Régimen simple" ya no es una opción en "Tipo de declarante de renta" —
-- vive aparte en el campo "Pertenece al Régimen Simple". Los proveedores
-- que tenían ese valor se dejan en "ninguno".
UPDATE public.proveedores
SET tipo_declarante_renta = 'ninguno'
WHERE tipo_declarante_renta = 'regimen_simple';
