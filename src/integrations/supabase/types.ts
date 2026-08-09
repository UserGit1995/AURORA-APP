export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customization_requests: {
        Row: {
          id: string
          product_type: string
          quantity: number
          print_colors: number
          logo_url: string
          notes: string | null
          customer_name: string
          customer_company: string | null
          customer_email: string
          customer_phone: string
          status: string
          admin_notes: string | null
          privacy_consent: boolean
          access_token: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_type: string
          quantity: number
          print_colors?: number
          logo_url: string
          notes?: string | null
          customer_name: string
          customer_company?: string | null
          customer_email: string
          customer_phone: string
          status?: string
          admin_notes?: string | null
          privacy_consent?: boolean
          access_token?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_type?: string
          quantity?: number
          print_colors?: number
          logo_url?: string
          notes?: string | null
          customer_name?: string
          customer_company?: string | null
          customer_email?: string
          customer_phone?: string
          status?: string
          admin_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          label: string
          price: number | null
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          label: string
          price?: number | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          label?: string
          price?: number | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          id: string
          phone: string
          name: string
          email: string | null
          company: string | null
          unread_count: number
          last_message: string | null
          last_message_at: string | null
          notes: string | null
          archived: boolean
          tags: string[]
          is_vip: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone: string
          name?: string
          email?: string | null
          company?: string | null
          unread_count?: number
          last_message?: string | null
          last_message_at?: string | null
          notes?: string | null
          archived?: boolean
          tags?: string[]
          is_vip?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string
          name?: string
          email?: string | null
          company?: string | null
          unread_count?: number
          last_message?: string | null
          last_message_at?: string | null
          notes?: string | null
          archived?: boolean
          tags?: string[]
          is_vip?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_call_logs: {
        Row: {
          id: string
          contact_id: string
          direction: string
          call_type: string
          duration_seconds: number
          notes: string | null
          ai_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          direction?: string
          call_type?: string
          duration_seconds?: number
          notes?: string | null
          ai_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          direction?: string
          call_type?: string
          duration_seconds?: number
          notes?: string | null
          ai_summary?: string | null
          created_at?: string
        }
        Relationships: []
      }
      product_extra_categories: {
        Row: { product_id: string; category_id: string }
        Insert: { product_id: string; category_id: string }
        Update: { product_id?: string; category_id?: string }
        Relationships: []
      }
      product_extra_subcategories: {
        Row: { product_id: string; subcategory_id: string }
        Insert: { product_id: string; subcategory_id: string }
        Update: { product_id?: string; subcategory_id?: string }
        Relationships: []
      }
      whatsapp_webhook_logs: {
        Row: {
          id: string
          event_type: string
          payload: any
          created_at: string
        }
        Insert: {
          id?: string
          event_type?: string
          payload?: any
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          payload?: any
          created_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          id: string
          contact_id: string
          sender: string
          content: string
          message_type: string
          status: string
          meta_message_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          sender: string
          content: string
          message_type?: string
          status?: string
          meta_message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          sender?: string
          content?: string
          message_type?: string
          status?: string
          meta_message_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          id: string
          name: string
          category: string
          language: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string
          language?: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          language?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          name: string
          image_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          name: string
          image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          name?: string
          image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      product_requests: {
        Row: {
          admin_notes: string | null
          privacy_consent: boolean
          access_token: string
          created_at: string
          customer_address: string
          customer_city: string
          customer_email: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          customer_region: string
          id: string
          order_group_id: string | null
          product_id: string | null
          product_name: string | null
          product_price: number | null
          quantity: number | null
          shipping_cost: number
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          privacy_consent?: boolean
          access_token?: string
          created_at?: string
          customer_address: string
          customer_city: string
          customer_email: string
          customer_name: string
          customer_notes?: string | null
          customer_phone?: string | null
          customer_region: string
          id?: string
          order_group_id?: string | null
          product_id?: string | null
          product_name?: string | null
          product_price?: number | null
          quantity?: number | null
          shipping_cost?: number
          status?: string
          subtotal: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          privacy_consent?: boolean
          access_token?: string
          created_at?: string
          customer_address?: string
          customer_city?: string
          customer_email?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string | null
          customer_region?: string
          id?: string
          order_group_id?: string | null
          product_id?: string | null
          product_name?: string | null
          product_price?: number | null
          quantity?: number | null
          shipping_cost?: number
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          subcategory_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          product_code: string | null
          price: number
          sort_order: number | null
          updated_at: string | null
          is_offer: boolean | null
          offer_price: number | null
          min_order_qty: number | null
          unit_label: string | null
        }
        Insert: {
          category_id?: string | null
          subcategory_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          product_code?: string | null
          price: number
          sort_order?: number | null
          updated_at?: string | null
          is_offer?: boolean | null
          offer_price?: number | null
          min_order_qty?: number | null
          unit_label?: string | null
        }
        Update: {
          category_id?: string | null
          subcategory_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          product_code?: string | null
          price?: number
          sort_order?: number | null
          updated_at?: string | null
          is_offer?: boolean | null
          offer_price?: number | null
          min_order_qty?: number | null
          unit_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
