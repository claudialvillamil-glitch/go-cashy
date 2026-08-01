import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getAgencias,
  getFondo,
  getTarifasRetencionRenta,
  getConceptosRetencionRenta,
  getConceptosReteica,
  getCodigosCiiu,
  getBasesReteicaAgencia,
  getTarifasReteicaCiudad,
  getFondosAgencia,
} from "@/lib/db";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Plus, Trash2, Building2 } from "lucide-react";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración · Caja Menor" },
      { name: "description", content: "Configuración del fondo de caja menor de la empresa." },
    ],
  }),
  component: () => (
    <AppLayout>
      <Conf />
    </AppLayout>
  ),
});

function Conf() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["fondo"], queryFn: getFondo });
  const [empresa, setEmpresa] = useState("");
  const [nitEmpresa, setNitEmpresa] = useState("");
  const [responsable, setResponsable] = useState("");
  const [identificacionResponsable, setIdentificacionResponsable] = useState("");
  const [monto, setMonto] = useState("");
  const [maximo, setMaximo] = useState("");
  const [cuentaBanco, setCuentaBanco] = useState("");
  const [cuentaRetHotel, setCuentaRetHotel] = useState("");
  const [cuentaRetServDecl, setCuentaRetServDecl] = useState("");
  const [cuentaRetServNoDecl, setCuentaRetServNoDecl] = useState("");
  const [cuentaRetFletes, setCuentaRetFletes] = useState("");
  const [limiteAlerta, setLimiteAlerta] = useState("");
  const [nombreAprobador, setNombreAprobador] = useState("");
  const [codigoRecibo, setCodigoRecibo] = useState("");
  const [versionRecibo, setVersionRecibo] = useState("");
  const [vigenciaRecibo, setVigenciaRecibo] = useState("");
  const [valorUvt, setValorUvt] = useState("");

  useEffect(() => {
    if (q.data) {
      setEmpresa(q.data.empresa);
      setNitEmpresa(q.data.nit_empresa);
      setResponsable(q.data.responsable);
      setIdentificacionResponsable(q.data.identificacion_responsable);
      setMonto(String(q.data.monto_asignado));
      setMaximo(String(q.data.monto_maximo_gasto));
      setCuentaBanco(q.data.cuenta_banco);
      setCuentaRetHotel(q.data.cuenta_retencion_hotel);
      setCuentaRetServDecl(q.data.cuenta_retencion_servicios_declarante);
      setCuentaRetServNoDecl(q.data.cuenta_retencion_servicios_no_declarante);
      setCuentaRetFletes(q.data.cuenta_retencion_fletes);
      setLimiteAlerta(String(q.data.limite_alerta_reembolso_pct));
      setNombreAprobador(q.data.nombre_aprobador);
      setCodigoRecibo(q.data.codigo_recibo);
      setVersionRecibo(q.data.version_recibo);
      setVigenciaRecibo(q.data.vigencia_recibo);
      setValorUvt(String(q.data.valor_uvt));
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!q.data) return;
      const { error } = await supabase
        .from("fondo_config")
        .update({
          empresa,
          nit_empresa: nitEmpresa,
          responsable,
          identificacion_responsable: identificacionResponsable,
          monto_asignado: Number(monto),
          monto_maximo_gasto: Number(maximo),
          cuenta_banco: cuentaBanco,
          cuenta_retencion_hotel: cuentaRetHotel,
          cuenta_retencion_servicios_declarante: cuentaRetServDecl,
          cuenta_retencion_servicios_no_declarante: cuentaRetServNoDecl,
          cuenta_retencion_fletes: cuentaRetFletes,
          limite_alerta_reembolso_pct: Number(limiteAlerta) || 80,
          nombre_aprobador: nombreAprobador,
          codigo_recibo: codigoRecibo,
          version_recibo: versionRecibo,
          vigencia_recibo: vigenciaRecibo,
          valor_uvt: Number(valorUvt) || 0,
        })
        .eq("id", q.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuración actualizada");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración del fondo</h1>
        <p className="text-sm text-muted-foreground">
          Datos generales de la empresa y parámetros del fondo de caja menor.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Empresa</Label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">NIT de la empresa</Label>
            <Input value={nitEmpresa} onChange={(e) => setNitEmpresa(e.target.value)} placeholder="900.123.456-1" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cuenta banco (reposición del fondo)</Label>
            <Input value={cuentaBanco} onChange={(e) => setCuentaBanco(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Se usa como contrapartida al generar el asiento cuando se paga un reembolso.
            </p>
          </div>

          <div className="md:col-span-2 rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">Configuración de respaldo</p>
            <p className="text-xs text-muted-foreground">
              Aplica solo en caso de no presentar información detallada del fondo por agencia
              (Configuración → Fondos de caja menor por agencia).
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Responsable del fondo</Label>
                <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">C.C./NIT del responsable</Label>
                <Input
                  value={identificacionResponsable}
                  onChange={(e) => setIdentificacionResponsable(e.target.value)}
                  placeholder="Ej. 1094900000"
                />
                <p className="text-xs text-muted-foreground">
                  Se usa para contabilizar la cuenta de reposición (24109503) a nombre de esta
                  persona.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Monto asignado al fondo (COP)</Label>
                <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Monto máximo por gasto (COP)</Label>
                <Input type="number" value={maximo} onChange={(e) => setMaximo(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">Cuentas de retención en la fuente por tarifa</p>
            <p className="text-xs text-muted-foreground">
              Cada tarifa que se elige en el recibo se contabiliza en su propia cuenta.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Serv. hotel y restaurante (3.5%)</Label>
                <Input value={cuentaRetHotel} onChange={(e) => setCuentaRetHotel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Servicios generales declarante (4%)</Label>
                <Input
                  value={cuentaRetServDecl}
                  onChange={(e) => setCuentaRetServDecl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Servicios generales no declarante (6%)</Label>
                <Input
                  value={cuentaRetServNoDecl}
                  onChange={(e) => setCuentaRetServNoDecl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fletes (1%)</Label>
                <Input value={cuentaRetFletes} onChange={(e) => setCuentaRetFletes(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">% del fondo que dispara el aviso de reembolso</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={limiteAlerta}
              onChange={(e) => setLimiteAlerta(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Al llegar a este % de gastos pendientes, verás un aviso para solicitar el reembolso.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre de quien autoriza los reembolsos</Label>
            <Input
              value={nombreAprobador}
              onChange={(e) => setNombreAprobador(e.target.value)}
              placeholder="Ej. Claudia Villamil"
            />
            <p className="text-xs text-muted-foreground">
              Aparece como firma "Autorizado por" en el formato de libro de caja menor. El
              "Elaborado por" usa el responsable del fondo.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor de la UVT vigente</Label>
            <Input
              type="number"
              min="0"
              value={valorUvt}
              onChange={(e) => setValorUvt(e.target.value)}
              placeholder="Ej. 49799 (año 2025)"
            />
            <p className="text-xs text-muted-foreground">
              Se usa para calcular la cuantía mínima (4 UVT) a partir de la cual se aplica
              automáticamente la retención en la fuente. Actualízalo cada año. Si lo dejas en 0,
              no se filtra por cuantía mínima.
            </p>
          </div>
          <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Código del formato de recibo</Label>
              <Input
                value={codigoRecibo}
                onChange={(e) => setCodigoRecibo(e.target.value)}
                placeholder="Ej. GF P6 12R1"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Versión</Label>
              <Input
                value={versionRecibo}
                onChange={(e) => setVersionRecibo(e.target.value)}
                placeholder="Ej. 02"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vigencia</Label>
              <Input
                value={vigenciaRecibo}
                onChange={(e) => setVigenciaRecibo(e.target.value)}
                placeholder="Ej. 02-sept-19"
              />
            </div>
            <p className="text-xs text-muted-foreground md:col-span-3">
              Datos de control documental que se imprimen al pie del recibo individual en PDF.
            </p>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      <AgenciasCard />
      <ConceptosRetencionRentaCard />
      <TarifasRetencionCard />
      <ConceptosReteicaCard />
      <CodigosCiiuCard />
      <BasesReteicaAgenciaCard />
      <TarifasReteicaCiudadCard />
      <FondosAgenciaCard />
    </div>
  );
}

function AgenciasCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["agencias"], queryFn: getAgencias });
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [prefijo, setPrefijo] = useState("");

  const crear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("agencias").insert({
        nombre: nombre.trim(),
        codigo: codigo ? Number(codigo) : null,
        prefijo: prefijo.trim().toUpperCase() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agencia creada");
      setNombre("");
      setCodigo("");
      setPrefijo("");
      qc.invalidateQueries({ queryKey: ["agencias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarPrefijo = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: string }) => {
      const { error } = await supabase
        .from("agencias")
        .update({ prefijo: valor.trim().toUpperCase() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prefijo actualizado");
      qc.invalidateQueries({ queryKey: ["agencias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agencias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agencia eliminada");
      qc.invalidateQueries({ queryKey: ["agencias"] });
    },
    onError: (e: Error) =>
      toast.error(
        "No se pudo eliminar. Verifica que no tenga movimientos registrados. " + e.message,
      ),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Agencias
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Crea las agencias o sucursales del fondo de caja menor. El prefijo se usa para el N° de
          recibo (ej. "AR-0001"); si lo dejas vacío, se sigue usando el consecutivo normal.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Código"
            className="w-24"
            type="number"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <Input
            placeholder="Nombre de la agencia (ej. Norte)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nombre.trim()) crear.mutate();
            }}
          />
          <Input
            placeholder="Prefijo (ej. AR)"
            className="w-28"
            value={prefijo}
            onChange={(e) => setPrefijo(e.target.value)}
          />
          <Button onClick={() => crear.mutate()} disabled={!nombre.trim() || crear.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Agregar
          </Button>
        </div>

        <div className="rounded-md border divide-y">
          {q.data?.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <span className="text-sm font-medium truncate">
                {a.codigo != null && (
                  <span className="text-muted-foreground font-mono mr-2">{a.codigo}</span>
                )}
                {a.nombre}
              </span>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Prefijo"
                  defaultValue={a.prefijo ?? ""}
                  className="w-24 h-8 text-sm"
                  onBlur={(e) => {
                    const valor = e.target.value;
                    if (valor.toUpperCase() !== (a.prefijo ?? "")) {
                      actualizarPrefijo.mutate({ id: a.id, valor });
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar la agencia "${a.nombre}"?`)) eliminar.mutate(a.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {(q.data?.length ?? 0) === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay agencias registradas.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ConceptosRetencionRentaCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["conceptos-retencion-renta"], queryFn: getConceptosRetencionRenta });

  const actualizar = useMutation({
    mutationFn: async ({
      id,
      campo,
      valor,
    }: {
      id: string;
      campo: "tarifa_declarante" | "tarifa_no_declarante" | "minimo_uvt" | "cuenta";
      valor: string | number;
    }) => {
      const patch =
        campo === "tarifa_declarante"
          ? { tarifa_declarante: Number(valor) }
          : campo === "tarifa_no_declarante"
            ? { tarifa_no_declarante: Number(valor) }
            : campo === "minimo_uvt"
              ? { minimo_uvt: Number(valor) }
              : { cuenta: String(valor) || null };
      const { error } = await supabase.from("conceptos_retencion_renta").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Actualizado");
      qc.invalidateQueries({ queryKey: ["conceptos-retencion-renta"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("conceptos_retencion_renta").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conceptos-retencion-renta"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Retención en la fuente por concepto</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cada concepto tiene una tarifa para proveedores declarantes de renta y otra para no
          declarantes — el sistema elige la correcta según lo que marques en cada proveedor.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.data?.map((c) => (
          <div key={c.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={c.activo}
                onCheckedChange={(v) => toggleActivo.mutate({ id: c.id, activo: v === true })}
              />
              <span className="text-sm font-medium">{c.nombre}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-6">
              <div>
                <Label className="text-xs text-muted-foreground">% Declarante</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={c.tarifa_declarante}
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    const valor = Number(e.target.value) || 0;
                    if (valor !== Number(c.tarifa_declarante)) {
                      actualizar.mutate({ id: c.id, campo: "tarifa_declarante", valor });
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">% No declarante</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={c.tarifa_no_declarante}
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    const valor = Number(e.target.value) || 0;
                    if (valor !== Number(c.tarifa_no_declarante)) {
                      actualizar.mutate({ id: c.id, campo: "tarifa_no_declarante", valor });
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Base mínima (UVT)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={c.minimo_uvt}
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    const valor = Number(e.target.value) || 0;
                    if (valor !== Number(c.minimo_uvt)) {
                      actualizar.mutate({ id: c.id, campo: "minimo_uvt", valor });
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cuenta contable</Label>
                <Input
                  defaultValue={c.cuenta ?? ""}
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    const valor = e.target.value;
                    if (valor !== (c.cuenta ?? "")) {
                      actualizar.mutate({ id: c.id, campo: "cuenta", valor });
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay conceptos de retención configurados.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TarifasRetencionCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["tarifas-retencion"], queryFn: getTarifasRetencionRenta });
  const [nombre, setNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [minimoUvt, setMinimoUvt] = useState("4");
  const [cuenta, setCuenta] = useState("");

  const crear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tarifas_retencion_renta").insert({
        nombre: nombre.trim(),
        porcentaje: Number(porcentaje) || 0,
        minimo_uvt: Number(minimoUvt) || 0,
        cuenta: cuenta.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarifa creada");
      setNombre("");
      setPorcentaje("");
      setMinimoUvt("4");
      setCuenta("");
      qc.invalidateQueries({ queryKey: ["tarifas-retencion"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("tarifas_retencion_renta")
        .update({ activo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas-retencion"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tarifas_retencion_renta").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarifa eliminada");
      qc.invalidateQueries({ queryKey: ["tarifas-retencion"] });
    },
    onError: (e: Error) =>
      toast.error("No se pudo eliminar (puede estar en uso en algún recibo). " + e.message),
  });

  const actualizarCampo = useMutation({
    mutationFn: async ({
      id,
      campo,
      valor,
    }: {
      id: string;
      campo: "porcentaje" | "minimo_uvt" | "cuenta";
      valor: string | number;
    }) => {
      const patch =
        campo === "porcentaje"
          ? { porcentaje: Number(valor) || 0 }
          : campo === "minimo_uvt"
            ? { minimo_uvt: Number(valor) || 0 }
            : { cuenta: String(valor).trim() || null };
      const { error } = await supabase.from("tarifas_retencion_renta").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Actualizado");
      qc.invalidateQueries({ queryKey: ["tarifas-retencion"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tarifas de retención en la fuente</CardTitle>
        <p className="text-sm text-muted-foreground">
          Estas son las opciones que aparecen al elegir "Aplica retención en la fuente" en un
          recibo. Crea las que necesites, con su % y su cuenta contable.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Input
            className="md:col-span-2"
            placeholder="Nombre (ej. Honorarios)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Input
            type="number"
            step="0.1"
            placeholder="%"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
          />
          <Input
            type="number"
            step="0.1"
            placeholder="UVT mínimo"
            value={minimoUvt}
            onChange={(e) => setMinimoUvt(e.target.value)}
          />
          <Input placeholder="Cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} />
        </div>
        <Button
          onClick={() => crear.mutate()}
          disabled={!nombre.trim() || !porcentaje || crear.isPending}
        >
          <Plus className="h-4 w-4 mr-2" /> Agregar tarifa
        </Button>

        <div className="rounded-md border divide-y">
          {q.data?.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Checkbox
                  checked={t.activo}
                  onCheckedChange={(v) => toggleActivo.mutate({ id: t.id, activo: v === true })}
                />
                <div className="text-sm font-medium truncate">{t.nombre}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">%</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={t.porcentaje}
                    className="w-16 h-8 text-sm"
                    onBlur={(e) => {
                      const valor = Number(e.target.value) || 0;
                      if (valor !== Number(t.porcentaje)) {
                        actualizarCampo.mutate({ id: t.id, campo: "porcentaje", valor });
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">UVT mín.</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={t.minimo_uvt}
                    className="w-20 h-8 text-sm"
                    onBlur={(e) => {
                      const valor = Number(e.target.value) || 0;
                      if (valor !== Number(t.minimo_uvt)) {
                        actualizarCampo.mutate({ id: t.id, campo: "minimo_uvt", valor });
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">Cuenta</span>
                  <Input
                    defaultValue={t.cuenta ?? ""}
                    className="w-28 h-8 text-sm"
                    onBlur={(e) => {
                      const valor = e.target.value;
                      if (valor !== (t.cuenta ?? "")) {
                        actualizarCampo.mutate({ id: t.id, campo: "cuenta", valor });
                      }
                    }}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar la tarifa "${t.nombre}"?`)) eliminar.mutate(t.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {(q.data?.length ?? 0) === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay tarifas registradas.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ConceptosReteicaCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const [nombre, setNombre] = useState("");
  const [cuenta, setCuenta] = useState("");

  const crear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("conceptos_reteica").insert({
        nombre: nombre.trim(),
        cuenta: cuenta.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concepto creado");
      setNombre("");
      setCuenta("");
      qc.invalidateQueries({ queryKey: ["conceptos-reteica"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("conceptos_reteica").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conceptos-reteica"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarCuenta = useMutation({
    mutationFn: async ({ id, cuenta: valor }: { id: string; cuenta: string }) => {
      const { error } = await supabase
        .from("conceptos_reteica")
        .update({ cuenta: valor.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cuenta actualizada");
      qc.invalidateQueries({ queryKey: ["conceptos-reteica"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("conceptos_reteica").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concepto eliminado");
      qc.invalidateQueries({ queryKey: ["conceptos-reteica"] });
    },
    onError: (e: Error) =>
      toast.error("No se pudo eliminar (puede estar en uso en algún recibo). " + e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conceptos de ReteICA</CardTitle>
        <p className="text-sm text-muted-foreground">
          Son las opciones del campo "Concepto" al activar ReteICA en un recibo (ej. Servicios,
          Compras). Cada uno con su cuenta contable; la tarifa por mil se sigue digitando en el recibo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Nombre (ej. Servicios)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Input placeholder="Cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} />
        </div>
        <Button onClick={() => crear.mutate()} disabled={!nombre.trim() || crear.isPending}>
          <Plus className="h-4 w-4 mr-2" /> Agregar concepto
        </Button>

        <div className="rounded-md border divide-y">
          {q.data?.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Checkbox
                  checked={c.activo}
                  onCheckedChange={(v) => toggleActivo.mutate({ id: c.id, activo: v === true })}
                />
                <div className="text-sm font-medium truncate">{c.nombre}</div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Cuenta"
                  defaultValue={c.cuenta ?? ""}
                  className="w-40 h-8 text-sm"
                  onBlur={(e) => {
                    const valor = e.target.value;
                    if (valor !== (c.cuenta ?? "")) {
                      actualizarCuenta.mutate({ id: c.id, cuenta: valor });
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar el concepto "${c.nombre}"?`)) eliminar.mutate(c.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {(q.data?.length ?? 0) === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay conceptos registrados.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CodigosCiiuCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["codigos-ciiu"], queryFn: getCodigosCiiu });
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");

  const crear = useMutation({
    mutationFn: async () => {
      if (!codigo.trim() || !nombre.trim()) throw new Error("Completa el código y el nombre");
      const { error } = await supabase.from("codigos_ciiu").insert({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
      });
      if (error) {
        if (error.code === "23505") throw new Error("Ya existe ese código CIIU.");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Código agregado");
      setCodigo("");
      setNombre("");
      qc.invalidateQueries({ queryKey: ["codigos-ciiu"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("codigos_ciiu").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["codigos-ciiu"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("codigos_ciiu").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Código eliminado");
      qc.invalidateQueries({ queryKey: ["codigos-ciiu"] });
    },
    onError: (e: Error) =>
      toast.error("No se pudo eliminar (puede estar en uso en algún proveedor). " + e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Códigos CIIU (actividad económica)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Lista de actividades económicas para elegir en cada proveedor (código - nombre). Agrega
          las que necesites según los proveedores que manejes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Código (ej. 4711)" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <Input
            placeholder="Nombre de la actividad"
            className="md:col-span-2"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && codigo.trim() && nombre.trim()) crear.mutate();
            }}
          />
          <Button onClick={() => crear.mutate()} disabled={!codigo.trim() || !nombre.trim() || crear.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Agregar
          </Button>
        </div>

        <div className="rounded-md border divide-y max-h-96 overflow-y-auto">
          {q.data?.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Checkbox
                  checked={c.activo}
                  onCheckedChange={(v) => toggleActivo.mutate({ id: c.id, activo: v === true })}
                />
                <span className="text-sm font-mono text-muted-foreground shrink-0">{c.codigo}</span>
                <span className="text-sm truncate">{c.nombre}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm(`¿Eliminar el código "${c.codigo} - ${c.nombre}"?`)) eliminar.mutate(c.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {(q.data?.length ?? 0) === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay códigos CIIU configurados.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BasesReteicaAgenciaCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["bases-reteica-agencia"], queryFn: getBasesReteicaAgencia });
  const agsQ = useQuery({ queryKey: ["agencias"], queryFn: getAgencias });
  const conceptosQ = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const [agenciaId, setAgenciaId] = useState("");
  const [conceptoReteicaId, setConceptoReteicaId] = useState("");
  const [base, setBase] = useState("");

  const guardar = useMutation({
    mutationFn: async () => {
      if (!agenciaId) throw new Error("Selecciona la agencia");
      if (!conceptoReteicaId) throw new Error("Selecciona el concepto (Compras o Servicios)");
      const { error } = await supabase.from("bases_reteica_agencia").upsert(
        {
          agencia_id: agenciaId,
          concepto_reteica_id: conceptoReteicaId,
          base: Number(base) || 0,
        },
        { onConflict: "agencia_id,concepto_reteica_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Base guardada");
      setBase("");
      setConceptoReteicaId("");
      qc.invalidateQueries({ queryKey: ["bases-reteica-agencia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarBase = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: number }) => {
      const { error } = await supabase.from("bases_reteica_agencia").update({ base: valor }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Base actualizada");
      qc.invalidateQueries({ queryKey: ["bases-reteica-agencia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bases_reteica_agencia").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Base eliminada");
      qc.invalidateQueries({ queryKey: ["bases-reteica-agencia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bases de ReteICA por agencia</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cada agencia tiene una base general (mínimo para que aplique ReteICA) para Compras y
          para Servicios — una sola por combinación, sin importar la actividad económica (CIIU)
          del proveedor. Las tarifas específicas por CIIU (más abajo) usan esta misma base.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={agenciaId} onValueChange={setAgenciaId}>
            <SelectTrigger>
              <SelectValue placeholder="Agencia" />
            </SelectTrigger>
            <SelectContent>
              {agsQ.data?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.codigo != null ? `${a.codigo} - ${a.nombre}` : a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={conceptoReteicaId} onValueChange={setConceptoReteicaId}>
            <SelectTrigger>
              <SelectValue placeholder="Concepto" />
            </SelectTrigger>
            <SelectContent>
              {conceptosQ.data?.filter((c) => c.activo).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Base mínima ($)"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          />
          <Button onClick={() => guardar.mutate()} disabled={!agenciaId || !conceptoReteicaId || guardar.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Guardar base
          </Button>
        </div>

        <div className="rounded-md border divide-y">
          {q.data?.map((b) => {
            const agencia = agsQ.data?.find((a) => a.id === b.agencia_id);
            const concepto = conceptosQ.data?.find((c) => c.id === b.concepto_reteica_id);
            return (
              <div key={b.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="text-sm font-medium truncate">
                  {agencia?.codigo != null ? `${agencia.codigo} - ${agencia?.nombre}` : agencia?.nombre}
                  {" · "}
                  {concepto?.nombre ?? "—"}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    defaultValue={b.base}
                    className="w-40 h-8 text-sm"
                    onBlur={(e) => {
                      const valor = Number(e.target.value) || 0;
                      if (valor !== Number(b.base)) {
                        actualizarBase.mutate({ id: b.id, valor });
                      }
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => eliminar.mutate(b.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
          {(q.data?.length ?? 0) === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay bases configuradas.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TarifasReteicaCiudadCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["tarifas-reteica-ciudad"], queryFn: getTarifasReteicaCiudad });
  const agsQ = useQuery({ queryKey: ["agencias"], queryFn: getAgencias });
  const conceptosQ = useQuery({ queryKey: ["conceptos-reteica"], queryFn: getConceptosReteica });
  const basesQ = useQuery({ queryKey: ["bases-reteica-agencia"], queryFn: getBasesReteicaAgencia });
  const [agenciaId, setAgenciaId] = useState("");
  const [conceptoReteicaId, setConceptoReteicaId] = useState("");
  const [codigoCiiu, setCodigoCiiu] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [cuenta, setCuenta] = useState("");

  const crear = useMutation({
    mutationFn: async () => {
      if (!agenciaId) throw new Error("Selecciona la agencia");
      if (!conceptoReteicaId) throw new Error("Selecciona el concepto (Compras o Servicios)");
      const { error } = await supabase.from("tarifas_reteica_ciudad").insert({
        agencia_id: agenciaId,
        concepto_reteica_id: conceptoReteicaId,
        codigo_ciiu: codigoCiiu.trim() || null,
        tarifa: Number(tarifa) || 0,
        cuenta: cuenta.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarifa creada");
      setCodigoCiiu("");
      setTarifa("");
      setCuenta("");
      qc.invalidateQueries({ queryKey: ["tarifas-reteica-ciudad"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("tarifas_reteica_ciudad")
        .update({ activo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas-reteica-ciudad"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tarifas_reteica_ciudad").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarifa eliminada");
      qc.invalidateQueries({ queryKey: ["tarifas-reteica-ciudad"] });
    },
    onError: (e: Error) =>
      toast.error("No se pudo eliminar (puede estar en uso en algún recibo). " + e.message),
  });

  const actualizarTarifa = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: number }) => {
      const { error } = await supabase.from("tarifas_reteica_ciudad").update({ tarifa: valor }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarifa actualizada");
      qc.invalidateQueries({ queryKey: ["tarifas-reteica-ciudad"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarCuentaTarifa = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: string }) => {
      const { error } = await supabase
        .from("tarifas_reteica_ciudad")
        .update({ cuenta: valor.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cuenta actualizada");
      qc.invalidateQueries({ queryKey: ["tarifas-reteica-ciudad"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tarifas de ReteICA por agencia / concepto / actividad (CIIU)</CardTitle>
        <p className="text-sm text-muted-foreground">
          El ICA varía por ciudad y por actividad económica. Configura aquí la tarifa por mil de
          cada combinación agencia + concepto (+ CIIU opcional). Deja el CIIU en blanco para que
          sea la tarifa general de esa agencia/concepto. La base mínima se configura arriba, en
          "Bases de ReteICA por agencia".
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Select value={agenciaId} onValueChange={setAgenciaId}>
            <SelectTrigger className="md:col-span-1">
              <SelectValue placeholder="Agencia" />
            </SelectTrigger>
            <SelectContent>
              {agsQ.data?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.codigo != null ? `${a.codigo} - ${a.nombre}` : a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={conceptoReteicaId} onValueChange={setConceptoReteicaId}>
            <SelectTrigger className="md:col-span-1">
              <SelectValue placeholder="Concepto" />
            </SelectTrigger>
            <SelectContent>
              {conceptosQ.data?.filter((c) => c.activo).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="CIIU (opcional)"
            value={codigoCiiu}
            onChange={(e) => setCodigoCiiu(e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Tarifa (‰)"
            value={tarifa}
            onChange={(e) => setTarifa(e.target.value)}
          />
          <Input placeholder="Cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} />
        </div>
        <Button
          onClick={() => crear.mutate()}
          disabled={!agenciaId || !conceptoReteicaId || !tarifa || crear.isPending}
        >
          <Plus className="h-4 w-4 mr-2" /> Agregar tarifa
        </Button>

        <div className="rounded-md border divide-y">
          {q.data?.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Checkbox
                  checked={t.activo}
                  onCheckedChange={(v) => toggleActivo.mutate({ id: t.id, activo: v === true })}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {t.agencias?.codigo != null ? `${t.agencias.codigo} - ${t.agencias?.nombre}` : t.agencias?.nombre}
                    {" · "}
                    {conceptosQ.data?.find((c) => c.id === t.concepto_reteica_id)?.nombre ?? "Sin concepto"}
                    {t.codigo_ciiu ? ` · CIIU ${t.codigo_ciiu}` : " · Tarifa general"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Base{" "}
                    {fmtMoneyLocal(
                      basesQ.data?.find(
                        (b) => b.agencia_id === t.agencia_id && b.concepto_reteica_id === t.concepto_reteica_id,
                      )?.base ?? 0,
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">Tarifa ‰</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={t.tarifa}
                    className="w-20 h-8 text-sm"
                    onBlur={(e) => {
                      const valor = Number(e.target.value) || 0;
                      if (valor !== Number(t.tarifa)) {
                        actualizarTarifa.mutate({ id: t.id, valor });
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">Cuenta</span>
                  <Input
                    defaultValue={t.cuenta ?? ""}
                    className="w-28 h-8 text-sm"
                    onBlur={(e) => {
                      const valor = e.target.value;
                      if (valor !== (t.cuenta ?? "")) {
                        actualizarCuentaTarifa.mutate({ id: t.id, valor });
                      }
                    }}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("¿Eliminar esta tarifa?")) eliminar.mutate(t.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {(q.data?.length ?? 0) === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay tarifas registradas.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function fmtMoneyLocal(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0));
}

function FondosAgenciaCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["fondos-agencia"], queryFn: getFondosAgencia });
  const agsQ = useQuery({ queryKey: ["agencias"], queryFn: getAgencias });
  const [agenciaId, setAgenciaId] = useState("");
  const [nombre, setNombre] = useState("Caja menor");
  const [cuenta, setCuenta] = useState("");
  const [monto, setMonto] = useState("");
  const [montoMaximoGasto, setMontoMaximoGasto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [identificacionResponsable, setIdentificacionResponsable] = useState("");
  const [nombreAprobador, setNombreAprobador] = useState("");
  const [prefijo, setPrefijo] = useState("");

  const crear = useMutation({
    mutationFn: async () => {
      if (!agenciaId) throw new Error("Selecciona la agencia");
      const { error } = await supabase.from("fondos_agencia").insert({
        agencia_id: agenciaId,
        nombre: nombre.trim() || "Caja menor",
        cuenta_contable: cuenta.trim() || null,
        monto_asignado: Number(monto) || 0,
        monto_maximo_gasto: Number(montoMaximoGasto) || 0,
        responsable: responsable.trim() || null,
        identificacion_responsable: identificacionResponsable.trim() || null,
        nombre_aprobador: nombreAprobador.trim() || null,
        prefijo: prefijo.trim().toUpperCase() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fondo creado");
      setNombre("Caja menor");
      setCuenta("");
      setMonto("");
      setMontoMaximoGasto("");
      setResponsable("");
      setIdentificacionResponsable("");
      setNombreAprobador("");
      setPrefijo("");
      qc.invalidateQueries({ queryKey: ["fondos-agencia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarMonto = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: number }) => {
      const { error } = await supabase.from("fondos_agencia").update({ monto_asignado: valor }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Monto actualizado");
      qc.invalidateQueries({ queryKey: ["fondos-agencia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarMontoMaximo = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: number }) => {
      const { error } = await supabase.from("fondos_agencia").update({ monto_maximo_gasto: valor }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Monto máximo actualizado");
      qc.invalidateQueries({ queryKey: ["fondos-agencia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarResponsable = useMutation({
    mutationFn: async ({
      id,
      responsable: resp,
      identificacion,
    }: {
      id: string;
      responsable: string;
      identificacion: string;
    }) => {
      const { error } = await supabase
        .from("fondos_agencia")
        .update({ responsable: resp || null, identificacion_responsable: identificacion || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Responsable actualizado");
      qc.invalidateQueries({ queryKey: ["fondos-agencia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarAprobador = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: string }) => {
      const { error } = await supabase
        .from("fondos_agencia")
        .update({ nombre_aprobador: valor.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aprobador actualizado");
      qc.invalidateQueries({ queryKey: ["fondos-agencia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarPrefijo = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: string }) => {
      const { error } = await supabase
        .from("fondos_agencia")
        .update({ prefijo: valor.trim().toUpperCase() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prefijo actualizado");
      qc.invalidateQueries({ queryKey: ["fondos-agencia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("fondos_agencia").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fondos-agencia"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fondos_agencia").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fondo eliminado");
      qc.invalidateQueries({ queryKey: ["fondos-agencia"] });
    },
    onError: (e: Error) =>
      toast.error("No se pudo eliminar (puede estar en uso en algún recibo). " + e.message),
  });

  const agenciaNombre = (id: string) => {
    const a = agsQ.data?.find((x) => x.id === id);
    return a ? (a.codigo != null ? `${a.codigo} - ${a.nombre}` : a.nombre) : "—";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fondos de caja menor por agencia</CardTitle>
        <p className="text-sm text-muted-foreground">
          Una agencia puede tener más de un fondo (ej. "Secretaría de Gerencia" y "Agencia" en el
          mismo lugar). El máximo permitido por pago es el 15% del monto de cada fondo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Select value={agenciaId} onValueChange={setAgenciaId}>
            <SelectTrigger>
              <SelectValue placeholder="Agencia" />
            </SelectTrigger>
            <SelectContent>
              {agsQ.data?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.codigo != null ? `${a.codigo} - ${a.nombre}` : a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Nombre del fondo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input placeholder="Cuenta contable" value={cuenta} onChange={(e) => setCuenta(e.target.value)} />
          <Input
            type="number"
            min="0"
            placeholder="Monto asignado"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <Input
            type="number"
            min="0"
            placeholder="Monto máximo por gasto"
            value={montoMaximoGasto}
            onChange={(e) => setMontoMaximoGasto(e.target.value)}
          />
          <Button onClick={() => crear.mutate()} disabled={!agenciaId || crear.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Agregar fondo
          </Button>
          <Input
            placeholder="Responsable del fondo"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
          />
          <Input
            placeholder="C.C./NIT del responsable"
            value={identificacionResponsable}
            onChange={(e) => setIdentificacionResponsable(e.target.value)}
          />
          <Input
            placeholder="Nombre de quien autoriza"
            value={nombreAprobador}
            onChange={(e) => setNombreAprobador(e.target.value)}
          />
          <Input
            placeholder="Prefijo (ej. ARG)"
            value={prefijo}
            onChange={(e) => setPrefijo(e.target.value)}
          />
        </div>

        <div className="rounded-md border divide-y">
          {q.data?.map((f) => (
            <div key={f.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Checkbox
                    checked={f.activo}
                    onCheckedChange={(v) => toggleActivo.mutate({ id: f.id, activo: v === true })}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {f.nombre} · {agenciaNombre(f.agencia_id)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Cuenta {f.cuenta_contable || "—"} · Máx. 15%:{" "}
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 0,
                      }).format(Number(f.monto_asignado) * 0.15)}
                    </div>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground">Monto asignado</div>
                    <Input
                      type="number"
                      min="0"
                      defaultValue={f.monto_asignado}
                      className="w-32 h-8 text-sm"
                      onBlur={(e) => {
                        const valor = Number(e.target.value) || 0;
                        if (valor !== Number(f.monto_asignado)) {
                          actualizarMonto.mutate({ id: f.id, valor });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground">Máx. por gasto</div>
                    <Input
                      type="number"
                      min="0"
                      defaultValue={f.monto_maximo_gasto}
                      className="w-32 h-8 text-sm"
                      onBlur={(e) => {
                        const valor = Number(e.target.value) || 0;
                        if (valor !== Number(f.monto_maximo_gasto)) {
                          actualizarMontoMaximo.mutate({ id: f.id, valor });
                        }
                      }}
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`¿Eliminar el fondo "${f.nombre}"?`)) eliminar.mutate(f.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pl-6">
                <Input
                  placeholder="Responsable del fondo"
                  defaultValue={f.responsable ?? ""}
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    const valor = e.target.value;
                    if (valor !== (f.responsable ?? "")) {
                      actualizarResponsable.mutate({
                        id: f.id,
                        responsable: valor,
                        identificacion: f.identificacion_responsable ?? "",
                      });
                    }
                  }}
                />
                <Input
                  placeholder="C.C./NIT del responsable"
                  defaultValue={f.identificacion_responsable ?? ""}
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    const valor = e.target.value;
                    if (valor !== (f.identificacion_responsable ?? "")) {
                      actualizarResponsable.mutate({
                        id: f.id,
                        responsable: f.responsable ?? "",
                        identificacion: valor,
                      });
                    }
                  }}
                />
                <Input
                  placeholder="Nombre de quien autoriza"
                  defaultValue={f.nombre_aprobador ?? ""}
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    const valor = e.target.value;
                    if (valor !== (f.nombre_aprobador ?? "")) {
                      actualizarAprobador.mutate({ id: f.id, valor });
                    }
                  }}
                />
                <Input
                  placeholder="Prefijo"
                  defaultValue={f.prefijo ?? ""}
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    const valor = e.target.value;
                    if (valor.toUpperCase() !== (f.prefijo ?? "")) {
                      actualizarPrefijo.mutate({ id: f.id, valor });
                    }
                  }}
                />
              </div>
            </div>
          ))}
          {(q.data?.length ?? 0) === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay fondos registrados.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
