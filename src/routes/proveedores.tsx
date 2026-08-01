import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { getProveedores, getTarifasRetencionRenta, getConceptosReteica, getCodigosCiiu, getMyProfile, type Proveedor } from "@/lib/db";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  REGIMENES_TRIBUTARIOS,
  TIPOS_IDENTIFICACION,
  TIPOS_DECLARANTE_RENTA,
  responsableIvaSegunRegimen,
} from "@/lib/retenciones";
import { DEPARTAMENTOS_COLOMBIA, CIUDADES_POR_DEPARTAMENTO } from "@/lib/colombia";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Upload, Download, Search } from "lucide-react";

export const Route = createFileRoute("/proveedores")({
  head: () => ({
    meta: [
      { title: "Proveedores · Caja Menor" },
      { name: "description", content: "Administración de proveedores del fondo de caja menor." },
    ],
  }),
  component: () => (
    <AppLayout>
      <Provs />
    </AppLayout>
  ),
});

const empty = {
  nombre: "",
  activo: true,
  nit: "",
  tipo_proveedor: "juridica",
  tipo_identificacion: "CC",
  digito_verificacion: "",
  telefono: "",
  email: "",
  direccion: "",
  codigo_ciiu: "",
  pais: "Colombia",
  departamento: "",
  ciudad: "",
  aplica_retencion: false,
  tipo_retencion_renta: "",
  tarifa_retencion_id: "",
  aplica_reteica: false,
  concepto_reteica: "servicios",
  concepto_reteica_id: "",
  tarifa_reteica: 0,
  aplica_reteiva: false,
  responsable_iva: true,
  es_declarante_renta: false,
  tipo_declarante_renta: "contribuyente",
  autorretenedor_renta: false,
  es_gran_contribuyente: false,
  autorretenedor_ica: false,
  es_facturador_electronico: false,
  regimen_tributario: "responsable_iva",
  pertenece_regimen_simple: false,
  tipo_impuesto: "iva",
};

function Provs() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["proveedores"], queryFn: getProveedores });
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile });
  const [filtroValidacion, setFiltroValidacion] = useState<"todos" | "pendiente" | "validado">("todos");
  const [busqueda, setBusqueda] = useState("");
  const proveedoresFiltrados = (q.data ?? []).filter(
    (p) =>
      (filtroValidacion === "todos" || p.estado_validacion === filtroValidacion) &&
      (!busqueda.trim() ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.nit.toLowerCase().includes(busqueda.toLowerCase())),
  );
  const pendientesCount = (q.data ?? []).filter((p) => p.estado_validacion === "pendiente").length;
  const tarifasQ = useQuery({ queryKey: ["tarifas-retencion"], queryFn: getTarifasRetencionRenta });
  const reteicaConceptosQ = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const ciiuQ = useQuery({ queryKey: ["codigos-ciiu"], queryFn: getCodigosCiiu });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Proveedor>>(empty);
  const [ciudadManual, setCiudadManual] = useState(false);
  const [primerNombre, setPrimerNombre] = useState("");
  const [segundoNombre, setSegundoNombre] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");
  const [duplicado, setDuplicado] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const nit = (form.nit ?? "").trim();
    if (!nit) {
      setDuplicado(null);
      return;
    }
    const timeout = setTimeout(async () => {
      let query = supabase.from("proveedores").select("id, nombre").eq("nit", nit);
      if (form.id) query = query.neq("id", form.id);
      const { data } = await query.maybeSingle();
      setDuplicado(data?.nombre ?? null);
    }, 400);
    return () => clearTimeout(timeout);
  }, [form.nit, form.id]);

  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      {
        Nombre: "ALFOMBRANDO S.A.S",
        NIT: "900123456-1",
        Teléfono: "3001234567",
        Email: "contacto@alfombrando.com",
        Dirección: "Cra 10 # 20-30",
        "Responsable de IVA (Sí/No)": "Sí",
        "Régimen (no_responsable_iva/responsable_iva)": "responsable_iva",
        "Régimen Simple (Sí/No)": "No",
        "Gran Contribuyente (Sí/No)": "No",
      },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Proveedores");
    XLSX.writeFile(wb, "plantilla-proveedores.xlsx");
  };

  const exportarProveedores = () => {
    const filas = (q.data ?? []).map((p) => ({
      Nombre: p.nombre,
      "Tipo de proveedor": p.tipo_proveedor === "natural" ? "Persona natural" : "Persona jurídica",
      "Tipo identificación": p.tipo_proveedor === "natural" ? p.tipo_identificacion : "NIT",
      Identificación: p.nit,
      Teléfono: p.telefono ?? "",
      Email: p.email ?? "",
      Dirección: p.direccion ?? "",
      "Código CIIU": p.codigo_ciiu ?? "",
      País: p.pais,
      Departamento: p.departamento ?? "",
      Ciudad: p.ciudad ?? "",
      Régimen: REGIMENES_TRIBUTARIOS.find((r) => r.value === p.regimen_tributario)?.label ?? "",
      "Régimen Simple": p.pertenece_regimen_simple ? "Sí" : "No",
      "Gran Contribuyente": p.es_gran_contribuyente ? "Sí" : "No",
      "Responsable de IVA": p.responsable_iva ? "Sí" : "No",
      "Impuesto que factura": p.tipo_impuesto === "impoconsumo" ? "Impoconsumo" : "IVA",
      "Aplica Rte. Fuente": p.aplica_retencion ? "Sí" : "No",
      "Tipo Rte. Fuente": tarifasQ.data?.find((t) => t.id === p.tarifa_retencion_id)?.nombre ?? "",
      "Aplica ReteICA": p.aplica_reteica ? "Sí" : "No",
      "Aplica ReteIVA": p.aplica_reteiva ? "Sí" : "No",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, "Proveedores");
    XLSX.writeFile(wb, `proveedores-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const importar = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const existentes = new Set((q.data ?? []).map((p) => p.nit.trim()));
      const payload: Array<{
        nombre: string;
        nit: string;
        telefono: string | null;
        email: string | null;
        direccion: string | null;
        codigo_ciiu: string | null;
        responsable_iva: boolean;
        regimen_tributario: string;
        pertenece_regimen_simple: boolean;
        es_gran_contribuyente: boolean;
      }> = [];
      let omitidos = 0;

      for (const row of rows) {
        const nombre = String(row["Nombre"] ?? row["nombre"] ?? "").trim();
        const nit = String(row["NIT"] ?? row["nit"] ?? "").trim();
        if (!nombre || !nit) {
          omitidos++;
          continue;
        }
        if (existentes.has(nit)) {
          omitidos++;
          continue;
        }
        existentes.add(nit);
        const regimenSimpleRaw = String(row["Régimen Simple (Sí/No)"] ?? row["Régimen Simple"] ?? "no")
          .trim()
          .toLowerCase();
        const pertenece_regimen_simple = ["si", "sí", "s", "true", "yes"].includes(regimenSimpleRaw);
        const regimenRaw = String(
          row["Régimen (no_responsable_iva/responsable_iva)"] ?? row["Régimen"] ?? "responsable_iva",
        )
          .trim()
          .toLowerCase();
        // Compatibilidad con nombres de régimen antiguos, por si se importa
        // un archivo exportado antes de este cambio. "gran_contribuyente" y
        // "autorretenedor" ya no son un régimen — se marcan como Gran
        // Contribuyente aparte.
        const esGranContribuyenteImportado = ["gran_contribuyente", "autorretenedor"].includes(regimenRaw);
        const regimenNormalizado = regimenRaw === "comun" || regimenRaw === "simple" ? "responsable_iva" : regimenRaw;
        const regimen_tributario = ["no_responsable_iva", "responsable_iva", "responsable_impoconsumo", "responsable_ambos", "sin_iva"].includes(regimenNormalizado)
          ? regimenNormalizado
          : "responsable_iva";
        const respIvaRaw = String(
          row["Responsable de IVA (Sí/No)"] ?? row["Responsable de IVA"] ?? "",
        )
          .trim()
          .toLowerCase();
        const granContribuyenteRaw = String(
          row["Gran Contribuyente (Sí/No)"] ?? row["Gran Contribuyente"] ?? "",
        )
          .trim()
          .toLowerCase();
        payload.push({
          nombre,
          nit,
          telefono: String(row["Teléfono"] ?? row["Telefono"] ?? "").trim() || null,
          email: String(row["Email"] ?? "").trim() || null,
          direccion: String(row["Dirección"] ?? row["Direccion"] ?? "").trim() || null,
          codigo_ciiu: String(row["Código CIIU"] ?? row["Codigo CIIU"] ?? "").trim() || null,
          // Si el archivo trae explícitamente "Responsable de IVA", respeta
          // ese valor; si no, se deriva del régimen elegido.
          responsable_iva: respIvaRaw
            ? !["no", "n", "false"].includes(respIvaRaw)
            : responsableIvaSegunRegimen(regimen_tributario),
          regimen_tributario,
          pertenece_regimen_simple,
          es_gran_contribuyente: granContribuyenteRaw
            ? ["si", "sí", "s", "true", "yes"].includes(granContribuyenteRaw)
            : esGranContribuyenteImportado,
        });
      }

      if (payload.length > 0) {
        const { error } = await supabase.from("proveedores").insert(payload);
        if (error) throw error;
      }
      return { creados: payload.length, omitidos };
    },
    onSuccess: ({ creados, omitidos }) => {
      qc.invalidateQueries({ queryKey: ["proveedores"] });
      toast.success(
        `${creados} proveedor${creados === 1 ? "" : "es"} importado${creados === 1 ? "" : "s"}` +
          (omitidos > 0 ? ` · ${omitidos} omitido${omitidos === 1 ? "" : "s"} (sin datos o NIT repetido)` : ""),
      );
    },
    onError: (e: Error) => toast.error("Error al importar: " + e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const esRegimenSimple = !!form.pertenece_regimen_simple;
      const payload = {
        nombre: form.nombre,
        activo: form.activo ?? true,
        nit: form.nit,
        tipo_proveedor: form.tipo_proveedor || "juridica",
        tipo_identificacion: form.tipo_proveedor === "natural" ? form.tipo_identificacion || "CC" : "CC",
        digito_verificacion:
          form.tipo_proveedor === "juridica" ? form.digito_verificacion || null : null,
        telefono: form.telefono || null,
        email: form.email || null,
        direccion: form.direccion || null,
        codigo_ciiu: form.codigo_ciiu || null,
        pais: form.pais || "Colombia",
        departamento: form.departamento || null,
        ciudad: form.ciudad || null,
        aplica_retencion: esRegimenSimple ? false : form.aplica_retencion ?? false,
        tarifa_retencion_id: esRegimenSimple ? null : form.tarifa_retencion_id || null,
        aplica_reteica: esRegimenSimple ? false : form.aplica_reteica ?? false,
        concepto_reteica_id: form.concepto_reteica_id || null,
        tarifa_reteica: Number(form.tarifa_reteica) || 0,
        aplica_reteiva: form.aplica_reteiva ?? false,
        responsable_iva: form.responsable_iva ?? true,
        pertenece_regimen_simple: form.pertenece_regimen_simple ?? false,
        es_declarante_renta: form.es_declarante_renta ?? false,
        es_facturador_electronico: form.es_facturador_electronico ?? false,
        tipo_declarante_renta: form.tipo_declarante_renta || "contribuyente",
        autorretenedor_renta: form.autorretenedor_renta ?? false,
        es_gran_contribuyente: form.es_gran_contribuyente ?? false,
        autorretenedor_ica: form.autorretenedor_ica ?? false,
        regimen_tributario: form.regimen_tributario || "responsable_iva",
        tipo_impuesto:
          form.regimen_tributario === "responsable_impoconsumo"
            ? "impoconsumo"
            : form.regimen_tributario === "responsable_ambos"
              ? "ambos"
              : form.regimen_tributario === "no_responsable_iva" || form.regimen_tributario === "sin_iva"
                ? "sin_iva"
                : "iva",
      };
      if (form.id) {
        const { error } = await supabase.from("proveedores").update(payload).eq("id", form.id);
        if (error) {
          if (error.code === "23505") {
            throw new Error("Ya existe otro proveedor con ese NIT/identificación.");
          }
          throw error;
        }
      } else {
        const { data: existente } = await supabase
          .from("proveedores")
          .select("id, nombre")
          .eq("nit", form.nit!)
          .maybeSingle();
        if (existente) {
          throw new Error(
            `Ya existe un proveedor con ese NIT/identificación: "${existente.nombre}". Verifica antes de crear uno nuevo.`,
          );
        }
        const esResponsable = profileQ.data?.rol === "responsable";
        const { error } = await supabase.from("proveedores").insert({
          ...payload,
          nombre: form.nombre!,
          nit: form.nit!,
          estado_validacion: esResponsable ? "pendiente" : "validado",
        });
        if (error) {
          if (error.code === "23505") {
            throw new Error("Ya existe un proveedor con ese NIT/identificación.");
          }
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Proveedor guardado");
      qc.invalidateQueries({ queryKey: ["proveedores"] });
      setOpen(false);
      setForm(empty);
      setCiudadManual(false);
      setPrimerNombre("");
      setSegundoNombre("");
      setPrimerApellido("");
      setSegundoApellido("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proveedores")
        .update({ estado_validacion: "validado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proveedor validado");
      qc.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const [{ count: countMovs }, { count: countItems }] = await Promise.all([
        supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("proveedor_id", id),
        supabase
          .from("movimiento_items")
          .select("id", { count: "exact", head: true })
          .eq("proveedor_id", id),
      ]);
      if ((countMovs ?? 0) > 0 || (countItems ?? 0) > 0) {
        throw new Error(
          "No se puede eliminar: este proveedor ya tiene movimientos/recibos registrados. Si ya no lo usas, márcalo como inactivo en vez de eliminarlo.",
        );
      }
      const { error } = await supabase.from("proveedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proveedor eliminado");
      qc.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            {q.data?.length ?? 0} proveedores registrados
            {pendientesCount > 0 && (
              <span className="ml-2 text-warning">
                · {pendientesCount} pendiente{pendientesCount === 1 ? "" : "s"} de validación
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por identificación o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={filtroValidacion} onValueChange={(v) => setFiltroValidacion(v as typeof filtroValidacion)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendientes de validación</SelectItem>
              <SelectItem value="validado">Validados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={descargarPlantilla}>
            <Download className="h-4 w-4 mr-2" /> Plantilla Excel
          </Button>
          <Button variant="outline" onClick={exportarProveedores} disabled={!q.data?.length}>
            <Download className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importar.mutate(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importar.isPending}
          >
            <Upload className="h-4 w-4 mr-2" /> Importar Excel
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setForm(empty);
                  setCiudadManual(false);
                  setPrimerNombre("");
                  setSegundoNombre("");
                  setPrimerApellido("");
                  setSegundoApellido("");
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
              </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <F label={form.tipo_proveedor === "natural" ? "Número de identificación *" : "NIT *"}>
                  <Input
                    autoFocus
                    value={form.nit ?? ""}
                    onChange={(e) => setForm({ ...form, nit: e.target.value })}
                  />
                </F>
                {form.tipo_proveedor !== "natural" && (
                  <F label="Dígito de verificación">
                    <Input
                      maxLength={1}
                      value={form.digito_verificacion ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, digito_verificacion: e.target.value.slice(0, 1) })
                      }
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
                  Ya existe un proveedor con este número: <b>{duplicado}</b>. Ciérralo y búscalo
                  en la lista en vez de crear uno nuevo.
                </p>
              )}
              {form.tipo_proveedor === "natural" && !form.id ? (
                <div className="md:col-span-2 grid grid-cols-2 gap-3">
                  <F label="Primer nombre *">
                    <Input
                      value={primerNombre}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase();
                        setPrimerNombre(v);
                        setForm({
                          ...form,
                          nombre: [v, segundoNombre, primerApellido, segundoApellido]
                            .filter(Boolean)
                            .join(" "),
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
                          nombre: [primerNombre, v, primerApellido, segundoApellido]
                            .filter(Boolean)
                            .join(" "),
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
                          nombre: [primerNombre, segundoNombre, v, segundoApellido]
                            .filter(Boolean)
                            .join(" "),
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
                          nombre: [primerNombre, segundoNombre, primerApellido, v]
                            .filter(Boolean)
                            .join(" "),
                        });
                      }}
                    />
                  </F>
                </div>
              ) : (
                <F
                  label={
                    form.tipo_proveedor === "natural"
                      ? "Nombres y apellidos *"
                      : "Razón social *"
                  }
                >
                  <Input
                    value={form.nombre ?? ""}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })}
                  />
                </F>
              )}
              <div className="flex items-center gap-2 -mt-2">
                <Checkbox
                  id="prov-activo"
                  checked={form.activo ?? true}
                  onCheckedChange={(v) => setForm({ ...form, activo: v === true })}
                />
                <Label htmlFor="prov-activo" className="text-sm font-normal cursor-pointer">
                  Proveedor activo (desmarca en vez de eliminar si ya tiene movimientos)
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
                    placeholder="Busca el departamento..."
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
                    placeholder={form.departamento ? "Busca la ciudad..." : "Elige primero el departamento"}
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

              <F label="Teléfono">
                <Input
                  value={form.telefono ?? ""}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </F>
              <F label="Email">
                <Input
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </F>

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
                    id="prov-regimen-simple"
                    checked={form.pertenece_regimen_simple ?? false}
                    onCheckedChange={(v) =>
                      setForm({
                        ...form,
                        pertenece_regimen_simple: v === true,
                        // En régimen simple no aplica retención en la fuente ni ReteICA;
                        // el ReteIVA sí aplica siempre (se activa solo), sujeto a la base mínima.
                        ...(v === true
                          ? { aplica_retencion: false, aplica_reteica: false, aplica_reteiva: true }
                          : {}),
                      })
                    }
                  />
                  <Label htmlFor="prov-regimen-simple" className="text-sm font-normal cursor-pointer">
                    Pertenece al Régimen Simple de Tributación (RST)
                  </Label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="prov-gran-contribuyente"
                    checked={form.es_gran_contribuyente ?? false}
                    onCheckedChange={(v) => setForm({ ...form, es_gran_contribuyente: v === true })}
                  />
                  <Label htmlFor="prov-gran-contribuyente" className="text-sm font-normal cursor-pointer">
                    Es Gran Contribuyente
                  </Label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="prov-autorret-renta"
                    checked={form.autorretenedor_renta ?? false}
                    onCheckedChange={(v) =>
                      setForm({
                        ...form,
                        autorretenedor_renta: v === true,
                        ...(v === true ? { aplica_retencion: false } : {}),
                      })
                    }
                  />
                  <Label htmlFor="prov-autorret-renta" className="text-sm font-normal cursor-pointer">
                    Autorretenedor de renta (no se le practica retención en la fuente)
                  </Label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="prov-autorret-ica"
                    checked={form.autorretenedor_ica ?? false}
                    onCheckedChange={(v) =>
                      setForm({
                        ...form,
                        autorretenedor_ica: v === true,
                        ...(v === true ? { aplica_reteica: false } : {}),
                      })
                    }
                  />
                  <Label htmlFor="prov-autorret-ica" className="text-sm font-normal cursor-pointer">
                    Autorretenedor de ICA (no se le practica ReteICA)
                  </Label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="prov-declarante"
                    checked={form.es_declarante_renta ?? false}
                    onCheckedChange={(v) => setForm({ ...form, es_declarante_renta: v === true })}
                  />
                  <Label htmlFor="prov-declarante" className="text-sm font-normal cursor-pointer">
                    Declarante de renta (afecta la tarifa de retención en la fuente)
                  </Label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="prov-facturador-elec"
                    checked={form.es_facturador_electronico ?? false}
                    onCheckedChange={(v) => setForm({ ...form, es_facturador_electronico: v === true })}
                  />
                  <Label htmlFor="prov-facturador-elec" className="text-sm font-normal cursor-pointer">
                    Facturador electrónico (Obligatorio factura electrónica como soporte de pago)
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
                    automáticamente). El ReteIVA sí aplica si el monto supera la cuantía mínima.
                  </p>
                )}
                {form.es_gran_contribuyente && (
                  <p className="text-xs text-warning">
                    Los grandes contribuyentes generalmente no llevan retención en la fuente
                    normal — verifica antes de aplicarla.
                  </p>
                )}
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Retenciones automáticas
                </p>
                <p className="text-xs text-muted-foreground">
                  La retención en la fuente y el ReteICA ya se calculan solos según el concepto
                  del gasto elegido en el recibo y la agencia — no dependen de este proveedor.
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="prov-reteiva"
                    checked={form.aplica_reteiva ?? false}
                    onCheckedChange={(v) => setForm({ ...form, aplica_reteiva: v === true })}
                  />
                  <Label htmlFor="prov-reteiva" className="text-sm font-normal cursor-pointer">
                    Aplica ReteIVA (15% del IVA)
                  </Label>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => save.mutate()}
                disabled={!form.nombre || !form.nit || save.isPending}
              >
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </header>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">NIT</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Régimen</th>
                <th className="px-4 py-3 font-medium">Retenciones</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados.map((p) => (
                <tr key={p.id} className={`border-t hover:bg-muted/30 ${!p.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    {p.nombre}
                    {!p.activo && (
                      <Badge variant="secondary" className="ml-2">
                        Inactivo
                      </Badge>
                    )}
                    {p.estado_validacion === "pendiente" && (
                      <Badge variant="destructive" className="ml-2">
                        Pendiente validación
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {p.tipo_proveedor === "natural" &&
                      `${TIPOS_IDENTIFICACION.find((t) => t.value === p.tipo_identificacion)?.value ?? "CC"} `}
                    {p.nit}
                    {p.digito_verificacion && `-${p.digito_verificacion}`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.telefono ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      {REGIMENES_TRIBUTARIOS.find((r) => r.value === p.regimen_tributario)?.label ??
                        "—"}
                      {p.pertenece_regimen_simple && " · Régimen Simple"}
                      {p.es_gran_contribuyente && " · Gran Contribuyente"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Factura:{" "}
                      {p.tipo_impuesto === "ambos"
                        ? "IVA + Impoconsumo"
                        : p.tipo_impuesto === "impoconsumo"
                          ? "Impoconsumo"
                          : "IVA"}
                      {!p.responsable_iva && p.tipo_impuesto !== "impoconsumo" && " · No resp. IVA"}
                    </div>
                    {p.codigo_ciiu && (
                      <div className="text-xs text-muted-foreground">CIIU {p.codigo_ciiu}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {p.aplica_retencion && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          Rte.Fuente
                        </span>
                      )}
                      {p.aplica_reteica && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          ReteICA
                        </span>
                      )}
                      {p.aplica_reteiva && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          ReteIVA
                        </span>
                      )}
                      {!p.aplica_retencion && !p.aplica_reteica && !p.aplica_reteiva && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {p.estado_validacion === "pendiente" &&
                        ["admin", "contador", "analista_contable"].includes(profileQ.data?.rol ?? "") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => validar.mutate(p.id)}
                            disabled={validar.isPending}
                          >
                            Validar
                          </Button>
                        )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const regimenValidos = ["no_responsable_iva", "responsable_iva", "responsable_impoconsumo", "responsable_ambos", "sin_iva"];
                          const regimenNormalizado = regimenValidos.includes(p.regimen_tributario)
                            ? p.regimen_tributario
                            : "responsable_iva";
                          // Compatibilidad con datos viejos donde "gran_contribuyente" o
                          // "autorretenedor" vivían dentro del régimen tributario.
                          const yaEraGranContribuyente =
                            p.regimen_tributario === "gran_contribuyente" ||
                            p.regimen_tributario === "autorretenedor";
                          setForm({
                            ...p,
                            regimen_tributario: regimenNormalizado,
                            es_gran_contribuyente: p.es_gran_contribuyente || yaEraGranContribuyente,
                          });
                          const listaCiudades = CIUDADES_POR_DEPARTAMENTO[p.departamento ?? ""] ?? [];
                          setCiudadManual(!!p.ciudad && !listaCiudades.includes(p.ciudad));
                          setPrimerNombre("");
                          setSegundoNombre("");
                          setPrimerApellido("");
                          setSegundoApellido("");
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("¿Eliminar proveedor?")) del.mutate(p.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
