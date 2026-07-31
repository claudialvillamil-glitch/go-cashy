export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agencias: {
        Row: {
          codigo: number | null
          created_at: string
          id: string
          monto_asignado: number
          nombre: string
          prefijo: string | null
        }
        Insert: {
          codigo?: number | null
          created_at?: string
          id?: string
          monto_asignado?: number
          nombre: string
          prefijo?: string | null
        }
        Update: {
          codigo?: number | null
          created_at?: string
          id?: string
          monto_asignado?: number
          nombre?: string
          prefijo?: string | null
        }
        Relationships: []
      }
      conceptos: {
        Row: {
          activo: boolean
          created_at: string
          cuenta_contrapartida: string
          cuenta_gasto: string
          cuenta_impoconsumo: string | null
          cuenta_iva: string | null
          cuenta_reteica: string | null
          cuenta_reteiva: string | null
          concepto_reteica_id: string | null
          concepto_retencion_renta_id: string | null
          cuenta_retencion: string | null
          id: string
          nombre: string
          porcentaje_impoconsumo: number
          porcentaje_iva: number
          porcentaje_reteica: number
          porcentaje_reteiva: number
          porcentaje_retencion: number | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cuenta_contrapartida?: string
          cuenta_gasto: string
          cuenta_impoconsumo?: string | null
          cuenta_iva?: string | null
          cuenta_reteica?: string | null
          cuenta_reteiva?: string | null
          concepto_reteica_id?: string | null
          concepto_retencion_renta_id?: string | null
          cuenta_retencion?: string | null
          id?: string
          nombre: string
          porcentaje_impoconsumo?: number
          porcentaje_iva?: number
          porcentaje_reteica?: number
          porcentaje_reteiva?: number
          porcentaje_retencion?: number | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          cuenta_contrapartida?: string
          cuenta_gasto?: string
          cuenta_impoconsumo?: string | null
          cuenta_iva?: string | null
          cuenta_reteica?: string | null
          cuenta_reteiva?: string | null
          concepto_reteica_id?: string | null
          concepto_retencion_renta_id?: string | null
          cuenta_retencion?: string | null
          id?: string
          nombre?: string
          porcentaje_impoconsumo?: number
          porcentaje_iva?: number
          porcentaje_reteica?: number
          porcentaje_reteiva?: number
          porcentaje_retencion?: number | null
        }
        Relationships: []
      }
      conceptos_retencion_renta: {
        Row: {
          activo: boolean
          created_at: string
          cuenta: string | null
          id: string
          minimo_uvt: number
          nombre: string
          tarifa_declarante: number
          tarifa_no_declarante: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cuenta?: string | null
          id?: string
          minimo_uvt?: number
          nombre: string
          tarifa_declarante?: number
          tarifa_no_declarante?: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          cuenta?: string | null
          id?: string
          minimo_uvt?: number
          nombre?: string
          tarifa_declarante?: number
          tarifa_no_declarante?: number
        }
        Relationships: []
      }
      conceptos_reteica: {
        Row: {
          activo: boolean
          created_at: string
          cuenta: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cuenta?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          cuenta?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      fondo_config: {
        Row: {
          codigo_recibo: string
          created_at: string
          cuenta_banco: string
          cuenta_reteica_compras: string
          cuenta_reteica_servicios: string
          cuenta_retencion_fletes: string
          cuenta_retencion_hotel: string
          cuenta_retencion_servicios_declarante: string
          cuenta_retencion_servicios_no_declarante: string
          empresa: string
          id: string
          identificacion_responsable: string
          limite_alerta_reembolso_pct: number
          monto_asignado: number
          monto_maximo_gasto: number
          nit_empresa: string
          nombre_aprobador: string
          responsable: string
          updated_at: string
          valor_uvt: number
          version_recibo: string
          vigencia_recibo: string
        }
        Insert: {
          codigo_recibo?: string
          created_at?: string
          cuenta_banco?: string
          cuenta_reteica_compras?: string
          cuenta_reteica_servicios?: string
          cuenta_retencion_fletes?: string
          cuenta_retencion_hotel?: string
          cuenta_retencion_servicios_declarante?: string
          cuenta_retencion_servicios_no_declarante?: string
          empresa?: string
          id?: string
          identificacion_responsable?: string
          limite_alerta_reembolso_pct?: number
          monto_asignado?: number
          monto_maximo_gasto?: number
          nit_empresa?: string
          nombre_aprobador?: string
          responsable?: string
          updated_at?: string
          valor_uvt?: number
          version_recibo?: string
          vigencia_recibo?: string
        }
        Update: {
          codigo_recibo?: string
          created_at?: string
          cuenta_banco?: string
          cuenta_reteica_compras?: string
          cuenta_reteica_servicios?: string
          cuenta_retencion_fletes?: string
          cuenta_retencion_hotel?: string
          cuenta_retencion_servicios_declarante?: string
          cuenta_retencion_servicios_no_declarante?: string
          empresa?: string
          id?: string
          identificacion_responsable?: string
          limite_alerta_reembolso_pct?: number
          monto_asignado?: number
          monto_maximo_gasto?: number
          nit_empresa?: string
          nombre_aprobador?: string
          responsable?: string
          updated_at?: string
          valor_uvt?: number
          version_recibo?: string
          vigencia_recibo?: string
        }
        Relationships: []
      }
      fondos_agencia: {
        Row: {
          activo: boolean
          agencia_id: string
          created_at: string
          cuenta_contable: string | null
          id: string
          identificacion_responsable: string | null
          monto_asignado: number
          nombre: string
          prefijo: string | null
          responsable: string | null
        }
        Insert: {
          activo?: boolean
          agencia_id: string
          created_at?: string
          cuenta_contable?: string | null
          id?: string
          identificacion_responsable?: string | null
          monto_asignado?: number
          nombre?: string
          prefijo?: string | null
          responsable?: string | null
        }
        Update: {
          activo?: boolean
          agencia_id?: string
          created_at?: string
          cuenta_contable?: string | null
          id?: string
          identificacion_responsable?: string | null
          monto_asignado?: number
          prefijo?: string | null
          responsable?: string | null
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "fondos_agencia_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      movimiento_items: {
        Row: {
          concepto_id: string
          concepto_retencion_renta_id: string | null
          created_at: string
          detalle: string | null
          factura_electronica: boolean
          id: string
          impoconsumo: number
          iva: number
          movimiento_id: string
          numero_factura: string | null
          orden: number
          proveedor_id: string
          retefuente_aplica: boolean
          retefuente_concepto: string | null
          retefuente_tarifa: number
          reteica: number
          reteica_actividad: string | null
          reteica_aplica: boolean
          reteica_tarifa: number
          reteica_valor: number
          reteiva: number
          reteiva_aplica: boolean
          reteiva_valor: number
          retencion: number
          subtotal: number
          total: number
        }
        Insert: {
          concepto_id: string
          concepto_retencion_renta_id?: string | null
          created_at?: string
          detalle?: string | null
          factura_electronica?: boolean
          id?: string
          impoconsumo?: number
          iva?: number
          movimiento_id: string
          numero_factura?: string | null
          orden?: number
          proveedor_id: string
          retefuente_aplica?: boolean
          retefuente_concepto?: string | null
          retefuente_tarifa?: number
          reteica?: number
          reteica_actividad?: string | null
          reteica_aplica?: boolean
          reteica_tarifa?: number
          reteica_valor?: number
          reteiva?: number
          reteiva_aplica?: boolean
          reteiva_valor?: number
          retencion?: number
          subtotal?: number
          total?: number
        }
        Update: {
          concepto_id?: string
          concepto_retencion_renta_id?: string | null
          created_at?: string
          detalle?: string | null
          factura_electronica?: boolean
          id?: string
          impoconsumo?: number
          iva?: number
          movimiento_id?: string
          numero_factura?: string | null
          orden?: number
          proveedor_id?: string
          retefuente_aplica?: boolean
          retefuente_concepto?: string | null
          retefuente_tarifa?: number
          reteica?: number
          reteica_actividad?: string | null
          reteica_aplica?: boolean
          reteica_tarifa?: number
          reteica_valor?: number
          reteiva?: number
          reteiva_aplica?: boolean
          reteiva_valor?: number
          retencion?: number
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_items_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "conceptos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_items_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_items_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      movimiento_soportes: {
        Row: {
          created_at: string
          factura_path: string
          id: string
          movimiento_id: string
          orden: number
        }
        Insert: {
          created_at?: string
          factura_path: string
          id?: string
          movimiento_id: string
          orden?: number
        }
        Update: {
          created_at?: string
          factura_path?: string
          id?: string
          movimiento_id?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_soportes_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos: {
        Row: {
          agencia_id: string | null
          concepto_id: string
          concepto_reteica_id: string | null
          concepto_reteica_usado: string | null
          concepto_retencion_renta_id: string | null
          consecutivo: number
          created_at: string
          detalle: string | null
          doc_soporte_generado: boolean
          estado: string
          factura_electronica: boolean
          factura_path: string | null
          factura_url: string | null
          fecha: string
          fondo_agencia_id: string | null
          numero_fondo: number | null
          id: string
          impoconsumo: number
          iva: number
          multi_soporte: boolean
          numero_factura: string | null
          observaciones: string | null
          prioridad: string
          proveedor_id: string
          reembolso_id: string | null
          retefuente_aplica: boolean
          retefuente_concepto: string | null
          retefuente_tarifa: number
          reteica: number
          reteica_actividad: string | null
          reteica_aplica: boolean
          reteica_tarifa: number
          reteica_valor: number
          reteiva: number
          reteiva_aplica: boolean
          reteiva_valor: number
          retencion: number
          subtotal: number
          tarifa_reteica_ciudad_id: string | null
          tarifa_retencion_id: string | null
          tipo_retencion_renta: string | null
          total: number
          updated_at: string
        }
        Insert: {
          agencia_id?: string | null
          concepto_id: string
          concepto_reteica_id?: string | null
          concepto_reteica_usado?: string | null
          concepto_retencion_renta_id?: string | null
          consecutivo?: number
          created_at?: string
          detalle?: string | null
          doc_soporte_generado?: boolean
          estado?: string
          factura_electronica?: boolean
          factura_path?: string | null
          factura_url?: string | null
          fecha?: string
          fondo_agencia_id?: string | null
          numero_fondo?: number | null
          id?: string
          impoconsumo?: number
          iva?: number
          multi_soporte?: boolean
          numero_factura?: string | null
          observaciones?: string | null
          prioridad?: string
          proveedor_id: string
          reembolso_id?: string | null
          retefuente_aplica?: boolean
          retefuente_concepto?: string | null
          retefuente_tarifa?: number
          reteica?: number
          reteica_actividad?: string | null
          reteica_aplica?: boolean
          reteica_tarifa?: number
          reteica_valor?: number
          reteiva?: number
          reteiva_aplica?: boolean
          reteiva_valor?: number
          retencion?: number
          subtotal?: number
          tarifa_reteica_ciudad_id?: string | null
          tarifa_retencion_id?: string | null
          tipo_retencion_renta?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          agencia_id?: string | null
          concepto_id?: string
          concepto_reteica_id?: string | null
          concepto_reteica_usado?: string | null
          concepto_retencion_renta_id?: string | null
          consecutivo?: number
          created_at?: string
          detalle?: string | null
          doc_soporte_generado?: boolean
          estado?: string
          factura_electronica?: boolean
          factura_path?: string | null
          factura_url?: string | null
          fecha?: string
          fondo_agencia_id?: string | null
          numero_fondo?: number | null
          id?: string
          impoconsumo?: number
          iva?: number
          multi_soporte?: boolean
          numero_factura?: string | null
          observaciones?: string | null
          prioridad?: string
          proveedor_id?: string
          reembolso_id?: string | null
          retefuente_aplica?: boolean
          retefuente_concepto?: string | null
          retefuente_tarifa?: number
          reteica?: number
          reteica_actividad?: string | null
          reteica_aplica?: boolean
          reteica_tarifa?: number
          reteica_valor?: number
          reteiva?: number
          reteiva_aplica?: boolean
          reteiva_valor?: number
          retencion?: number
          subtotal?: number
          tarifa_reteica_ciudad_id?: string | null
          tarifa_retencion_id?: string | null
          tipo_retencion_renta?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "conceptos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_concepto_reteica_id_fkey"
            columns: ["concepto_reteica_id"]
            isOneToOne: false
            referencedRelation: "conceptos_reteica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_fondo_agencia_id_fkey"
            columns: ["fondo_agencia_id"]
            isOneToOne: false
            referencedRelation: "fondos_agencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_reembolso_id_fkey"
            columns: ["reembolso_id"]
            isOneToOne: false
            referencedRelation: "reembolsos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_tarifa_reteica_ciudad_id_fkey"
            columns: ["tarifa_reteica_ciudad_id"]
            isOneToOne: false
            referencedRelation: "tarifas_reteica_ciudad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_tarifa_retencion_id_fkey"
            columns: ["tarifa_retencion_id"]
            isOneToOne: false
            referencedRelation: "tarifas_retencion_renta"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          agencia_id: string | null
          created_at: string
          email: string
          fondo_agencia_id: string | null
          id: string
          nombre: string
          rol: string
        }
        Insert: {
          activo?: boolean
          agencia_id?: string | null
          created_at?: string
          email: string
          fondo_agencia_id?: string | null
          id: string
          nombre?: string
          rol?: string
        }
        Update: {
          activo?: boolean
          agencia_id?: string | null
          created_at?: string
          email?: string
          fondo_agencia_id?: string | null
          id?: string
          nombre?: string
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          aplica_reteica: boolean
          aplica_reteiva: boolean
          aplica_retencion: boolean
          ciudad: string | null
          codigo_ciiu: string | null
          concepto_reteica: string
          concepto_reteica_id: string | null
          created_at: string
          departamento: string | null
          digito_verificacion: string | null
          direccion: string | null
          email: string | null
          es_declarante_renta: boolean
          autorretenedor_ica: boolean
          autorretenedor_renta: boolean
          es_facturador_electronico: boolean
          estado_validacion: string
          pertenece_regimen_simple: boolean
          id: string
          nit: string
          nombre: string
          pais: string
          regimen_tributario: string
          responsable_iva: boolean
          tarifa_reteica: number
          tarifa_retencion_id: string | null
          telefono: string | null
          tipo_declarante_renta: string
          tipo_identificacion: string
          tipo_impuesto: string
          tipo_proveedor: string
          tipo_retencion_renta: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          aplica_reteica?: boolean
          aplica_reteiva?: boolean
          aplica_retencion?: boolean
          ciudad?: string | null
          codigo_ciiu?: string | null
          concepto_reteica?: string
          concepto_reteica_id?: string | null
          created_at?: string
          departamento?: string | null
          digito_verificacion?: string | null
          direccion?: string | null
          email?: string | null
          es_declarante_renta?: boolean
          autorretenedor_ica?: boolean
          autorretenedor_renta?: boolean
          es_facturador_electronico?: boolean
          estado_validacion?: string
          pertenece_regimen_simple?: boolean
          id?: string
          nit: string
          nombre: string
          pais?: string
          regimen_tributario?: string
          responsable_iva?: boolean
          tarifa_reteica?: number
          tarifa_retencion_id?: string | null
          telefono?: string | null
          tipo_declarante_renta?: string
          tipo_identificacion?: string
          tipo_impuesto?: string
          tipo_proveedor?: string
          tipo_retencion_renta?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          aplica_reteica?: boolean
          aplica_reteiva?: boolean
          aplica_retencion?: boolean
          ciudad?: string | null
          codigo_ciiu?: string | null
          concepto_reteica?: string
          concepto_reteica_id?: string | null
          created_at?: string
          departamento?: string | null
          digito_verificacion?: string | null
          direccion?: string | null
          email?: string | null
          es_declarante_renta?: boolean
          autorretenedor_ica?: boolean
          autorretenedor_renta?: boolean
          es_facturador_electronico?: boolean
          estado_validacion?: string
          pertenece_regimen_simple?: boolean
          id?: string
          nit?: string
          nombre?: string
          pais?: string
          regimen_tributario?: string
          responsable_iva?: boolean
          tarifa_reteica?: number
          tarifa_retencion_id?: string | null
          telefono?: string | null
          tipo_declarante_renta?: string
          tipo_identificacion?: string
          tipo_impuesto?: string
          tipo_proveedor?: string
          tipo_retencion_renta?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_concepto_reteica_id_fkey"
            columns: ["concepto_reteica_id"]
            isOneToOne: false
            referencedRelation: "conceptos_reteica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_tarifa_retencion_id_fkey"
            columns: ["tarifa_retencion_id"]
            isOneToOne: false
            referencedRelation: "tarifas_retencion_renta"
            referencedColumns: ["id"]
          },
        ]
      }
      reembolsos: {
        Row: {
          aprobado_por: string | null
          arqueo: Json | null
          consecutivo: number
          created_at: string
          estado: string
          fecha: string
          fecha_aprobacion: string | null
          id: string
          monto_fondo_momento: number | null
          observaciones: string | null
          periodo_fin: string
          periodo_inicio: string
          total: number
          total_gastos_momento: number | null
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          arqueo?: Json | null
          consecutivo?: number
          created_at?: string
          estado?: string
          fecha?: string
          fecha_aprobacion?: string | null
          id?: string
          monto_fondo_momento?: number | null
          observaciones?: string | null
          periodo_fin: string
          periodo_inicio: string
          total?: number
          total_gastos_momento?: number | null
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          arqueo?: Json | null
          consecutivo?: number
          created_at?: string
          estado?: string
          fecha?: string
          fecha_aprobacion?: string | null
          id?: string
          monto_fondo_momento?: number | null
          observaciones?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          total?: number
          total_gastos_momento?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tarifas_reteica_ciudad: {
        Row: {
          activo: boolean
          agencia_id: string
          codigo_ciiu: string | null
          concepto_reteica_id: string | null
          created_at: string
          cuenta: string | null
          id: string
          tarifa: number
          tope: number
        }
        Insert: {
          activo?: boolean
          agencia_id: string
          codigo_ciiu?: string | null
          concepto_reteica_id?: string | null
          created_at?: string
          cuenta?: string | null
          id?: string
          tarifa?: number
          tope?: number
        }
        Update: {
          activo?: boolean
          agencia_id?: string
          codigo_ciiu?: string | null
          concepto_reteica_id?: string | null
          created_at?: string
          cuenta?: string | null
          id?: string
          tarifa?: number
          tope?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_reteica_ciudad_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_retencion_renta: {
        Row: {
          activo: boolean
          created_at: string
          cuenta: string | null
          id: string
          minimo_uvt: number
          nombre: string
          porcentaje: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cuenta?: string | null
          id?: string
          minimo_uvt?: number
          nombre: string
          porcentaje?: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          cuenta?: string | null
          id?: string
          minimo_uvt?: number
          nombre?: string
          porcentaje?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_factura: { Args: { _name: string }; Returns: boolean }
      can_write_factura: { Args: { _name: string }; Returns: boolean }
      get_my_agencia: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      is_active_user: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
