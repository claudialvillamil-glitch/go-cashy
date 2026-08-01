import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import { getTarifasRetencionRenta, getConceptosReteica, getCodigosCiiu } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import {
  REGIMENES_TRIBUTARIOS,
  TIPOS_IDENTIFICACION,
  TIPOS_DECLARANTE_RENTA,
  responsableIvaSegunRegimen,
} from "@/lib/retenciones";
import { DEPARTAMENTOS_COLOMBIA, CIUDADES_POR_DEPARTAMENTO } from "@/lib/colombia";

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// Todos los campos del proveedor (igual que en la pantalla de Proveedores),
// para reutilizar en la creación rápida desde el recibo. `form`/`setForm`
// manejan el objeto de datos; este componente solo pinta los campos.
export function ProveedorFormFields({
  form,
  setForm,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setForm: (f: Record<string, any>) => void;
}) {
  const tarifasQ = useQuery({ queryKey: ["tarifas-retencion"], queryFn: getTarifasRetencionRenta });
  const reteicaConceptosQ = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const ciiuQ = useQuery({ queryKey: ["codigos-ciiu"], queryFn: getCodigosCiiu });
  const [ciudadManual, setCiudadManual] = useState(
    !!form.ciudad && !(CIUDADES_POR_DEPARTAMENTO[form.departamento ?? ""] ?? []).includes(form.ciudad),
  );
  const [primerNombre, setPrimerNombre] = useState("");
  const [segundoNombre, setSegundoNombre] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");
  const [duplicado, setDuplicado] = useState<string | null>(null);

  useEffect(() => {
    const nit = (form.nit ?? "").trim();
    if (!nit) {
      setDuplicado(null);
      return;
    }
    const timeout = setTimeout(async () => {
      let q = supabase.from("proveedores").select("id, nombre").eq("nit", nit);
      if (form.id) q = q.neq("id", form.id);
      const { data } = await q.maybeSingle();
      setDuplicado(data?.nombre ?? null);
    }, 400);
    return () => clearTimeout(timeout);
  }, [form.nit, form.id]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <F label={form.tipo_proveedor === "natural" ? "Número de identificación *" : "NIT *"}>
          <Input
            autoFocus
            value={form.nit ?? ""}
            onChange={(e) => {
              const nit = e.target.value;
              if (form.tipo_proveedor === "natural") {
                setForm({ ...form, nit });
              } else {
                setForm({ ...form, nit });
              }
            }}
          />
        </F>
        {form.tipo_proveedor !== "natural" && (
          <F label="Dígito de verificación">
            <Input
              maxLength={1}
              value={form.digito_verificacion ?? ""}
              onChange={(e) => setForm({ ...form, digito_verificacion: e.target.value.slice(0, 1) })}
            />
          </F>
        )}
      </div>

      <F label="Tipo de proveedor">
        <Select
          value={form.tipo_proveedor ?? "juridica"}
          onValueChange={(v) => setForm({ ...form, tipo_proveedor: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="natural">Persona natural</SelectItem>
            <SelectItem value="juridica">Persona jurídica</SelectItem>
          </SelectContent>
        </Select>
      </F>

      {form.tipo_proveedor === "natural" ? (
        <F label="Tipo de identificación">
          <Select
            value={form.tipo_identificacion ?? "CC"}
            onValueChange={(v) => setForm({ ...form, tipo_identificacion: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_IDENTIFICACION.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
      ) : null}
      {duplicado && (
        <p className="text-xs text-warning -mt-2">
          Ya existe un proveedor con este número: <b>{duplicado}</b>. Ciérralo y búscalo en la
          lista en vez de crear uno nuevo.
        </p>
      )}

      {form.tipo_proveedor === "natural" && !form.id ? (
        <div className="grid grid-cols-2 gap-3">
          <F label="Primer nombre *">
            <Input
              value={primerNombre}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setPrimerNombre(v);
                setForm({
                  ...form,
                  nombre: [v, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(" "),
                });
              }}
            />
          </F>
          <F label="Segundo nombre">
            <Input
              value={segundoNombre}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setSegundoNombre(v);
                setForm({
                  ...form,
                  nombre: [primerNombre, v, primerApellido, segundoApellido].filter(Boolean).join(" "),
                });
              }}
            />
          </F>
          <F label="Primer apellido *">
            <Input
              value={primerApellido}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setPrimerApellido(v);
                setForm({
                  ...form,
                  nombre: [primerNombre, segundoNombre, v, segundoApellido].filter(Boolean).join(" "),
                });
              }}
            />
          </F>
          <F label="Segundo apellido">
            <Input
              value={segundoApellido}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setSegundoApellido(v);
                setForm({
                  ...form,
                  nombre: [primerNombre, segundoNombre, primerApellido, v].filter(Boolean).join(" "),
                });
              }}
            />
          </F>
        </div>
      ) : (
        <F label={form.tipo_proveedor === "natural" ? "Nombres y apellidos *" : "Razón social *"}>
          <Input
            value={form.nombre ?? ""}
            onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })}
          />
        </F>
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id="pff-activo"
          checked={form.activo ?? true}
          onCheckedChange={(v) => setForm({ ...form, activo: v === true })}
        />
        <Label htmlFor="pff-activo" className="text-sm font-normal cursor-pointer">
          Proveedor activo
        </Label>
      </div>

      <F label="Dirección">
        <Input
          value={form.direccion ?? ""}
          onChange={(e) => setForm({ ...form, direccion: e.target.value.toUpperCase() })}
        />
      </F>
      <div className="grid grid-cols-3 gap-3">
        <F label="País">
          <Input value={form.pais ?? "Colombia"} disabled />
        </F>
        <F label="Departamento">
          <SearchableSelect
            value={form.departamento ?? ""}
            onChange={(v) => setForm({ ...form, departamento: v, ciudad: "" })}
            options={DEPARTAMENTOS_COLOMBIA}
            placeholder="Busca..."
          />
        </F>
        <F label="Ciudad">
          <SearchableSelect
            value={ciudadManual ? "Otra (escribir)" : form.ciudad ?? ""}
            onChange={(v) => {
              if (v === "Otra (escribir)") {
                setCiudadManual(true);
                setForm({ ...form, ciudad: "" });
              } else {
                setCiudadManual(false);
                setForm({ ...form, ciudad: v });
              }
            }}
            options={[...(CIUDADES_POR_DEPARTAMENTO[form.departamento ?? ""] ?? []), "Otra (escribir)"]}
            placeholder={form.departamento ? "Busca..." : "Elige depto."}
            disabled={!form.departamento}
          />
        </F>
      </div>
      {ciudadManual && (
        <F label="Nombre de la ciudad/municipio">
          <Input
            placeholder="Escribe el municipio"
            value={form.ciudad ?? ""}
            onChange={(e) => setForm({ ...form, ciudad: e.target.value.toUpperCase() })}
          />
        </F>
      )}

      <div className="grid grid-cols-2 gap-3">
        <F label="Teléfono">
          <Input value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </F>
        <F label="Email">
          <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </F>
      </div>

      <div className="rounded-md border p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Información tributaria</p>
        <F label="Responsabilidades de IVA e impoconsumo">
          <Select
            value={form.regimen_tributario ?? "responsable_iva"}
            onValueChange={(v) =>
              setForm({
                ...form,
                regimen_tributario: v,
                responsable_iva: responsableIvaSegunRegimen(v),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIMENES_TRIBUTARIOS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <F label="Tipo de declarante de renta">
          <Select
            value={form.tipo_declarante_renta ?? "contribuyente"}
            onValueChange={(v) => setForm({ ...form, tipo_declarante_renta: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DECLARANTE_RENTA.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="pff-regimen-simple"
            checked={form.pertenece_regimen_simple ?? false}
            onCheckedChange={(v) =>
              setForm({
                ...form,
                pertenece_regimen_simple: v === true,
                ...(v === true
                  ? { aplica_retencion: false, aplica_reteica: false, aplica_reteiva: true }
                  : {}),
              })
            }
          />
          <Label htmlFor="pff-regimen-simple" className="text-sm font-normal cursor-pointer">
            Pertenece al Régimen Simple de Tributación (RST)
          </Label>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="pff-gran-contribuyente"
            checked={form.es_gran_contribuyente ?? false}
            onCheckedChange={(v) => setForm({ ...form, es_gran_contribuyente: v === true })}
          />
          <Label htmlFor="pff-gran-contribuyente" className="text-sm font-normal cursor-pointer">
            Es Gran Contribuyente
          </Label>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="pff-autorret-renta"
            checked={form.autorretenedor_renta ?? false}
            onCheckedChange={(v) =>
              setForm({
                ...form,
                autorretenedor_renta: v === true,
                ...(v === true ? { aplica_retencion: false } : {}),
              })
            }
          />
          <Label htmlFor="pff-autorret-renta" className="text-sm font-normal cursor-pointer">
            Autorretenedor de renta (no se le practica retención en la fuente)
          </Label>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="pff-autorret-ica"
            checked={form.autorretenedor_ica ?? false}
            onCheckedChange={(v) =>
              setForm({
                ...form,
                autorretenedor_ica: v === true,
                ...(v === true ? { aplica_reteica: false } : {}),
              })
            }
          />
          <Label htmlFor="pff-autorret-ica" className="text-sm font-normal cursor-pointer">
            Autorretenedor de ICA (no se le practica ReteICA)
          </Label>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="pff-declarante"
            checked={form.es_declarante_renta ?? false}
            onCheckedChange={(v) => setForm({ ...form, es_declarante_renta: v === true })}
          />
          <Label htmlFor="pff-declarante" className="text-sm font-normal cursor-pointer">
            Declarante de renta (afecta la tarifa de retención en la fuente)
          </Label>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="pff-facturador-elec"
            checked={form.es_facturador_electronico ?? false}
            onCheckedChange={(v) => setForm({ ...form, es_facturador_electronico: v === true })}
          />
          <Label htmlFor="pff-facturador-elec" className="text-sm font-normal cursor-pointer">
            Obligatorio factura electrónica como soporte de pago
          </Label>
        </div>
        <F label="Código CIIU (actividad económica)">
          <Select
            value={form.codigo_ciiu || "ninguno"}
            onValueChange={(v) => setForm({ ...form, codigo_ciiu: v === "ninguno" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona la actividad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguno">Ninguno</SelectItem>
              {ciiuQ.data?.filter((c) => c.activo).map((c) => (
                <SelectItem key={c.id} value={c.codigo}>
                  {c.codigo} - {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        {form.pertenece_regimen_simple && (
          <p className="text-xs text-warning">
            Régimen simple: no aplica retención en la fuente ni ReteICA (se desactivaron
            automáticamente).
          </p>
        )}
      </div>

      <div className="rounded-md border p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Retenciones automáticas</p>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="pff-retencion"
            checked={form.aplica_retencion ?? false}
            onCheckedChange={(v) => setForm({ ...form, aplica_retencion: v === true })}
          />
          <Label htmlFor="pff-retencion" className="text-sm font-normal cursor-pointer">
            Aplica retención en la fuente (renta)
          </Label>
        </div>
        {form.aplica_retencion && (
          <Select
            value={form.tarifa_retencion_id ?? ""}
            onValueChange={(v) => setForm({ ...form, tarifa_retencion_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              {tarifasQ.data?.filter((t) => t.activo).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nombre} ({Number(t.porcentaje)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="pff-reteica"
            checked={form.aplica_reteica ?? false}
            onCheckedChange={(v) => setForm({ ...form, aplica_reteica: v === true })}
          />
          <Label htmlFor="pff-reteica" className="text-sm font-normal cursor-pointer">
            Aplica ReteICA
          </Label>
        </div>
        {form.aplica_reteica && (
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={form.concepto_reteica_id ?? ""}
              onValueChange={(v) => setForm({ ...form, concepto_reteica_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Servicios o compras" />
              </SelectTrigger>
              <SelectContent>
                {reteicaConceptosQ.data?.filter((t) => t.activo).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Tarifa por mil, ej. 9.66"
              value={form.tarifa_reteica ?? 0}
              onChange={(e) => setForm({ ...form, tarifa_reteica: Number(e.target.value) })}
            />
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="pff-reteiva"
            checked={form.aplica_reteiva ?? false}
            onCheckedChange={(v) => setForm({ ...form, aplica_reteiva: v === true })}
          />
          <Label htmlFor="pff-reteiva" className="text-sm font-normal cursor-pointer">
            Aplica ReteIVA (15% del IVA)
          </Label>
        </div>
      </div>
    </div>
  );
}
