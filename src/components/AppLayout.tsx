import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  Users,
  UserCog,
  Tags,
  Settings,
  Wallet,
  Receipt,
  Calculator,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, getAgencias, type Profile } from "@/lib/db";

// Caché en memoria a nivel de módulo (no de componente): sobrevive a que
// AppLayout se vuelva a montar en cada cambio de pantalla, sin afectar la
// hidratación inicial del servidor (por eso solo se usa DESPUÉS del primer
// montaje en el navegador — "clienteListo").
let perfilEnMemoria: Profile | null = null;
let clienteListo = false;

const CLAVE_AGENCIA_SESION = "caja-menor-agencia-sesion";

const nav = [
  { to: "/", label: "Resumen", icon: LayoutDashboard, roles: undefined },
  { to: "/nuevo", label: "Nuevo recibo", icon: PlusCircle, roles: ["admin", "responsable"] },
  { to: "/movimientos", label: "Movimientos", icon: ListChecks, roles: undefined },
  { to: "/reembolsos", label: "Reembolsos", icon: Receipt, roles: undefined },
  { to: "/contabilidad", label: "Contabilidad", icon: Calculator, roles: ["admin", "contador", "auditoria", "analista_contable"] },
  { to: "/proveedores", label: "Proveedores", icon: Users, roles: undefined },
  { to: "/conceptos", label: "Conceptos", icon: Tags, roles: ["admin"] },
  { to: "/usuarios", label: "Usuarios", icon: UserCog, roles: ["admin"] },
  { to: "/configuracion", label: "Configuración", icon: Settings, roles: ["admin", "contador", "analista_contable"] },
] as const;

const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  responsable: "Responsable de agencia",
  contador: "Contador",
  auditoria: "Gerencia/Auditoría",
  analista_contable: "Analista contable",
  pendiente: "Pendiente de activación",
};

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const agsQ = useQuery({
    queryKey: ["agencias"],
    queryFn: getAgencias,
    enabled: perfilEnMemoria?.rol !== "responsable",
  });
  const [agenciaSesion, setAgenciaSesion] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(CLAVE_AGENCIA_SESION) ?? "";
  });
  const [agenciaTemp, setAgenciaTemp] = useState("");

  // Una vez que el perfil se cargó bien una vez, lo dejamos guardado y lo
  // seguimos mostrando aunque una recarga de fondo tarde o falle
  // momentáneamente — así el menú no "parpadea" ni desaparece solo. Usamos
  // el caché de memoria solo si el cliente ya terminó de hidratar, para no
  // chocar con lo que renderizó el servidor.
  const [perfilEstable, setPerfilEstable] = useState<Profile | null>(
    () => (clienteListo ? perfilEnMemoria : null),
  );

  useEffect(() => {
    clienteListo = true;
  }, []);

  useEffect(() => {
    if (profileQ.data) {
      perfilEnMemoria = profileQ.data as Profile;
      setPerfilEstable(profileQ.data as Profile);
    }
  }, [profileQ.data]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // TOKEN_REFRESHED pasa solo, en segundo plano, cada cierto tiempo —
      // no debe disparar una recarga del perfil (eso causaba que el menú
      // "parpadeara" con varias pestañas abiertas). Solo refrescamos en
      // eventos que sí implican un cambio real de sesión/usuario.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        qc.invalidateQueries({ queryKey: ["my-profile"] });
      }
      if (event === "SIGNED_OUT") {
        perfilEnMemoria = null;
        setPerfilEstable(null);
        sessionStorage.removeItem(CLAVE_AGENCIA_SESION);
        navigate({ to: "/login" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [qc, navigate]);

  useEffect(() => {
    if (!profileQ.isLoading && profileQ.data === null && !perfilEstable) {
      navigate({ to: "/login" });
    }
  }, [profileQ.isLoading, profileQ.data, perfilEstable, navigate]);

  if (profileQ.isLoading && !perfilEstable) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!perfilEstable) {
    return null; // se está redirigiendo a /login
  }

  const profile = perfilEstable;

  if (!profile.activo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">Cuenta pendiente de activación</h1>
          <p className="text-sm text-muted-foreground">
            Tu cuenta ({profile.email}) ya se creó, pero un administrador debe activarla y
            asignarte un rol antes de que puedas usar la app.
          </p>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  const navFiltrado = nav.filter((n) => !n.roles || (n.roles as readonly string[]).includes(profile.rol));

  const ROLES_SELECTOR_OPCIONAL = ["admin", "contador", "analista_contable"];
  const tieneSelectorOpcional = ROLES_SELECTOR_OPCIONAL.includes(profile.rol);
  const necesitaElegirAgencia = profile.rol === "auditoria" && !agenciaSesion;

  const confirmarAgenciaSesion = () => {
    if (!agenciaTemp) return;
    sessionStorage.setItem(CLAVE_AGENCIA_SESION, agenciaTemp);
    setAgenciaSesion(agenciaTemp);
  };

  const elegirAgenciaOpcional = (id: string) => {
    if (id === "todas") {
      sessionStorage.removeItem(CLAVE_AGENCIA_SESION);
      setAgenciaSesion("");
    } else {
      sessionStorage.setItem(CLAVE_AGENCIA_SESION, id);
      setAgenciaSesion(id);
    }
  };

  const nombreAgenciaMostrado =
    profile.rol === "responsable"
      ? profile.agencias?.nombre ?? "Sin agencia asignada"
      : agsQ.data?.find((a) => a.id === agenciaSesion)?.nombre ?? null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">Caja Menor</div>
            <div className="text-xs text-sidebar-foreground/60">Gestor contable</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navFiltrado.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-1">
            <div className="text-sm font-medium truncate">{profile.nombre || profile.email}</div>
            <div className="text-xs text-sidebar-foreground/60">
              {ROL_LABEL[profile.rol] ?? profile.rol}
              {profile.agencias?.nombre && ` · ${profile.agencias.nombre}`}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-sidebar-primary" />
            <span className="font-semibold text-sm">Caja Menor</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4 text-sidebar-foreground/70" />
          </button>
        </div>
        <nav className="flex overflow-x-auto px-2 pb-2 gap-1">
          {navFiltrado.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80"
                }`}
              >
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 md:ml-0 pt-24 md:pt-0">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
            {tieneSelectorOpcional ? (
              <Select value={agenciaSesion || "todas"} onValueChange={elegirAgenciaOpcional}>
                <SelectTrigger className="w-64 h-8 text-base font-medium border-none shadow-none px-2 -ml-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las agencias</SelectItem>
                  {agsQ.data?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.codigo != null ? `${a.codigo} - ${a.nombre}` : a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-base font-medium text-foreground">
                {nombreAgenciaMostrado ?? "—"}
              </span>
            )}
          </div>
          {children}
        </div>
      </main>

      <Dialog open={necesitaElegirAgencia} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>¿En qué agencia vas a trabajar hoy?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Es solo informativo: se mostrará en el encabezado de cada pantalla durante esta
            sesión. No limita lo que puedes ver o hacer.
          </p>
          <Select value={agenciaTemp} onValueChange={setAgenciaTemp}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una agencia" />
            </SelectTrigger>
            <SelectContent>
              {agsQ.data?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.codigo != null ? `${a.codigo} - ${a.nombre}` : a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full" disabled={!agenciaTemp} onClick={confirmarAgenciaSesion}>
            Continuar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

