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
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      conceptos: {
        Row: {
          activo: boolean
          created_at: string
          cuenta_contrapartida: string
          cuenta_gasto: string
          cuenta_iva: string | null
          cuenta_retencion: string | null
          id: string
          nombre: string
          porcentaje_retencion: number | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cuenta_contrapartida?: string
          cuenta_gasto: string
          cuenta_iva?: string | null
          cuenta_retencion?: string | null
          id?: string
          nombre: string
          porcentaje_retencion?: number | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          cuenta_contrapartida?: string
          cuenta_gasto?: string
          cuenta_iva?: string | null
          cuenta_retencion?: string | null
          id?: string
          nombre?: string
          porcentaje_retencion?: number | null
        }
        Relationships: []
      }
      fondo_config: {
        Row: {
          created_at: string
          empresa: string
          id: string
          monto_asignado: number
          monto_maximo_gasto: number
          responsable: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa?: string
          id?: string
          monto_asignado?: number
          monto_maximo_gasto?: number
          responsable?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa?: string
          id?: string
          monto_asignado?: number
          monto_maximo_gasto?: number
          responsable?: string
          updated_at?: string
        }
        Relationships: []
      }
      movimiento_items: {
        Row: {
          concepto_id: string
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
          retencion: number
          subtotal: number
          total: number
        }
        Insert: {
          concepto_id: string
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
          retencion?: number
          subtotal?: number
          total?: number
        }
        Update: {
          concepto_id?: string
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
      movimientos: {
        Row: {
          agencia_id: string | null
          concepto_id: string
          consecutivo: number
          created_at: string
          detalle: string | null
          estado: string
          factura_electronica: boolean
          factura_path: string | null
          factura_url: string | null
          fecha: string
          id: string
          impoconsumo: number
          iva: number
          multi_soporte: boolean
          numero_factura: string | null
          observaciones: string | null
          prioridad: string
          proveedor_id: string
          reembolso_id: string | null
          retencion: number
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          agencia_id?: string | null
          concepto_id: string
          consecutivo?: number
          created_at?: string
          detalle?: string | null
          estado?: string
          factura_electronica?: boolean
          factura_path?: string | null
          factura_url?: string | null
          fecha?: string
          id?: string
          impoconsumo?: number
          iva?: number
          multi_soporte?: boolean
          numero_factura?: string | null
          observaciones?: string | null
          prioridad?: string
          proveedor_id: string
          reembolso_id?: string | null
          retencion?: number
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          agencia_id?: string | null
          concepto_id?: string
          consecutivo?: number
          created_at?: string
          detalle?: string | null
          estado?: string
          factura_electronica?: boolean
          factura_path?: string | null
          factura_url?: string | null
          fecha?: string
          id?: string
          impoconsumo?: number
          iva?: number
          multi_soporte?: boolean
          numero_factura?: string | null
          observaciones?: string | null
          prioridad?: string
          proveedor_id?: string
          reembolso_id?: string | null
          retencion?: number
          subtotal?: number
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
        ]
      }
      proveedores: {
        Row: {
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nit: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nit: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nit?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reembolsos: {
        Row: {
          consecutivo: number
          created_at: string
          estado: string
          fecha: string
          id: string
          observaciones: string | null
          periodo_fin: string
          periodo_inicio: string
          total: number
          updated_at: string
        }
        Insert: {
          consecutivo?: number
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          periodo_fin: string
          periodo_inicio: string
          total?: number
          updated_at?: string
        }
        Update: {
          consecutivo?: number
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
