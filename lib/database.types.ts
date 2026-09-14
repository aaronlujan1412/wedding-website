export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      faq: {
        Row: {
          aaron_take: string | null
          id: number
          question: string
          sort_order: number
          translation: string
        }
        Insert: {
          aaron_take?: string | null
          id?: number
          question: string
          sort_order: number
          translation: string
        }
        Update: {
          aaron_take?: string | null
          id?: number
          question?: string
          sort_order?: number
          translation?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          as_of: string
          fetched_at: string
          pair: string
          rate: number
        }
        Insert: {
          as_of: string
          fetched_at?: string
          pair: string
          rate: number
        }
        Update: {
          as_of?: string
          fetched_at?: string
          pair?: string
          rate?: number
        }
        Relationships: []
      }
      guest_groups: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          custom_message: string | null
          id: number
          name: string
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          custom_message?: string | null
          id?: number
          name: string
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          custom_message?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      guest_photos: {
        Row: {
          caption: string | null
          created_at: string
          group_id: number | null
          height: number
          hidden: boolean
          id: string
          original_at_home: boolean
          original_path: string | null
          storage_path: string
          width: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          group_id?: number | null
          height: number
          hidden?: boolean
          id?: string
          original_at_home?: boolean
          original_path?: string | null
          storage_path: string
          width: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          group_id?: number | null
          height?: number
          hidden?: boolean
          id?: string
          original_at_home?: boolean
          original_path?: string | null
          storage_path?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "guest_photos_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          attending: boolean | null
          contact_number: string
          dietary_details: string[] | null
          dietary_type: Database["public"]["Enums"]["dietary"] | null
          group_id: number | null
          id: number
          name: string
          notes: string | null
          plus_one_allowed: boolean
          plus_one_name: string | null
          seating_table_id: number | null
          song_request: string | null
        }
        Insert: {
          attending?: boolean | null
          contact_number: string
          dietary_details?: string[] | null
          dietary_type?: Database["public"]["Enums"]["dietary"] | null
          group_id?: number | null
          id?: number
          name: string
          notes?: string | null
          plus_one_allowed: boolean
          plus_one_name?: string | null
          seating_table_id?: number | null
          song_request?: string | null
        }
        Update: {
          attending?: boolean | null
          contact_number?: string
          dietary_details?: string[] | null
          dietary_type?: Database["public"]["Enums"]["dietary"] | null
          group_id?: number | null
          id?: number
          name?: string
          notes?: string | null
          plus_one_allowed?: boolean
          plus_one_name?: string | null
          seating_table_id?: number | null
          song_request?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_seating_table_id_fkey"
            columns: ["seating_table_id"]
            isOneToOne: false
            referencedRelation: "seating_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_tables: {
        Row: {
          capacity: number | null
          id: number
          name: string | null
          pos_x: number | null
          pos_y: number | null
          shape: Database["public"]["Enums"]["table_shape"] | null
        }
        Insert: {
          capacity?: number | null
          id?: number
          name?: string | null
          pos_x?: number | null
          pos_y?: number | null
          shape?: Database["public"]["Enums"]["table_shape"] | null
        }
        Update: {
          capacity?: number | null
          id?: number
          name?: string | null
          pos_x?: number | null
          pos_y?: number | null
          shape?: Database["public"]["Enums"]["table_shape"] | null
        }
        Relationships: []
      }
      trip_checklist_items: {
        Row: {
          created_at: string
          done: boolean
          id: string
          label: string
          list: string
          owner: Database["public"]["Enums"]["trip_planner"] | null
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          label: string
          list: string
          owner?: Database["public"]["Enums"]["trip_planner"] | null
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          label?: string
          list?: string
          owner?: Database["public"]["Enums"]["trip_planner"] | null
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      trip_days: {
        Row: {
          created_at: string
          note: string | null
          on_date: string
          title: string | null
        }
        Insert: {
          created_at?: string
          note?: string | null
          on_date: string
          title?: string | null
        }
        Update: {
          created_at?: string
          note?: string | null
          on_date?: string
          title?: string | null
        }
        Relationships: []
      }
      trip_docs: {
        Row: {
          category: Database["public"]["Enums"]["trip_doc_category"]
          confirmation: string | null
          cost_amount: number | null
          cost_currency: Database["public"]["Enums"]["trip_currency"]
          created_at: string
          detail: string | null
          ends_at: string | null
          id: string
          position: number
          starts_at: string | null
          title: string
          url: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["trip_doc_category"]
          confirmation?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          detail?: string | null
          ends_at?: string | null
          id?: string
          position?: number
          starts_at?: string | null
          title: string
          url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["trip_doc_category"]
          confirmation?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          detail?: string | null
          ends_at?: string | null
          id?: string
          position?: number
          starts_at?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      trip_flights: {
        Row: {
          aircraft: string | null
          airline: string
          arrival_terminal: string | null
          arrives_at: string
          arrives_tz: string
          baggage: string | null
          cabin: Database["public"]["Enums"]["trip_cabin"] | null
          checkin_url: string | null
          confirmation: string | null
          cost_amount: number | null
          cost_currency: Database["public"]["Enums"]["trip_currency"]
          created_at: string
          departs_at: string
          departs_tz: string
          departure_gate: string | null
          departure_terminal: string | null
          flight_number: string
          from_airport: string
          from_city: string | null
          id: string
          meal: string | null
          notes: string | null
          seat_aaron: string | null
          seat_savea: string | null
          status_url: string | null
          to_airport: string
          to_city: string | null
          updated_at: string
        }
        Insert: {
          aircraft?: string | null
          airline: string
          arrival_terminal?: string | null
          arrives_at: string
          arrives_tz: string
          baggage?: string | null
          cabin?: Database["public"]["Enums"]["trip_cabin"] | null
          checkin_url?: string | null
          confirmation?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          departs_at: string
          departs_tz: string
          departure_gate?: string | null
          departure_terminal?: string | null
          flight_number: string
          from_airport: string
          from_city?: string | null
          id?: string
          meal?: string | null
          notes?: string | null
          seat_aaron?: string | null
          seat_savea?: string | null
          status_url?: string | null
          to_airport: string
          to_city?: string | null
          updated_at?: string
        }
        Update: {
          aircraft?: string | null
          airline?: string
          arrival_terminal?: string | null
          arrives_at?: string
          arrives_tz?: string
          baggage?: string | null
          cabin?: Database["public"]["Enums"]["trip_cabin"] | null
          checkin_url?: string | null
          confirmation?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          departs_at?: string
          departs_tz?: string
          departure_gate?: string | null
          departure_terminal?: string | null
          flight_number?: string
          from_airport?: string
          from_city?: string | null
          id?: string
          meal?: string | null
          notes?: string | null
          seat_aaron?: string | null
          seat_savea?: string | null
          status_url?: string | null
          to_airport?: string
          to_city?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trip_items: {
        Row: {
          added_by: Database["public"]["Enums"]["trip_planner"]
          address: string | null
          booking_opens_on: string | null
          booking_ref: string | null
          booking_status: Database["public"]["Enums"]["trip_booking_status"]
          booking_url: string | null
          city: string | null
          closed_days: number[]
          cost_amount: number | null
          cost_currency: Database["public"]["Enums"]["trip_currency"]
          created_at: string
          duration_min: number | null
          id: string
          kind: Database["public"]["Enums"]["trip_item_kind"]
          lane: Database["public"]["Enums"]["trip_lane"]
          map_url: string | null
          must_do: boolean
          notes: string | null
          on_date: string | null
          pinned: boolean
          position: number
          start_time: string | null
          title: string
          title_ja: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          added_by?: Database["public"]["Enums"]["trip_planner"]
          address?: string | null
          booking_opens_on?: string | null
          booking_ref?: string | null
          booking_status?: Database["public"]["Enums"]["trip_booking_status"]
          booking_url?: string | null
          city?: string | null
          closed_days?: number[]
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          duration_min?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["trip_item_kind"]
          lane?: Database["public"]["Enums"]["trip_lane"]
          map_url?: string | null
          must_do?: boolean
          notes?: string | null
          on_date?: string | null
          pinned?: boolean
          position?: number
          start_time?: string | null
          title: string
          title_ja?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          added_by?: Database["public"]["Enums"]["trip_planner"]
          address?: string | null
          booking_opens_on?: string | null
          booking_ref?: string | null
          booking_status?: Database["public"]["Enums"]["trip_booking_status"]
          booking_url?: string | null
          city?: string | null
          closed_days?: number[]
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          duration_min?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["trip_item_kind"]
          lane?: Database["public"]["Enums"]["trip_lane"]
          map_url?: string | null
          must_do?: boolean
          notes?: string | null
          on_date?: string | null
          pinned?: boolean
          position?: number
          start_time?: string | null
          title?: string
          title_ja?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      trip_legs: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          lane: Database["public"]["Enums"]["trip_lane"]
          lodging_address: string | null
          lodging_check_in: string | null
          lodging_check_out: string | null
          lodging_confirmation: string | null
          lodging_name: string | null
          lodging_url: string | null
          name: string
          name_ja: string | null
          note: string | null
          position: number
          starts_on: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          lane?: Database["public"]["Enums"]["trip_lane"]
          lodging_address?: string | null
          lodging_check_in?: string | null
          lodging_check_out?: string | null
          lodging_confirmation?: string | null
          lodging_name?: string | null
          lodging_url?: string | null
          name: string
          name_ja?: string | null
          note?: string | null
          position?: number
          starts_on: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          lane?: Database["public"]["Enums"]["trip_lane"]
          lodging_address?: string | null
          lodging_check_in?: string | null
          lodging_check_out?: string | null
          lodging_confirmation?: string | null
          lodging_name?: string | null
          lodging_url?: string | null
          name?: string
          name_ja?: string | null
          note?: string | null
          position?: number
          starts_on?: string
        }
        Relationships: []
      }
      verification_attempts: {
        Row: {
          created_at: string
          fingerprint: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adopt_trip_leg: { Args: { p_leg: string }; Returns: string }
      adopt_trip_route: {
        Args: { p_lane: Database["public"]["Enums"]["trip_lane"] }
        Returns: number
      }
      sweep_orphaned_trip_items: { Args: never; Returns: number }
    }
    Enums: {
      dietary: "restriction" | "preference" | "none"
      table_shape: "round" | "rectangular" | "square"
      trip_booking_status: "idea" | "to_book" | "booked" | "in_hand"
      trip_cabin: "economy" | "premium" | "business" | "first"
      trip_currency: "JPY" | "USD"
      trip_doc_category:
        | "flight"
        | "rail"
        | "lodging"
        | "connectivity"
        | "luggage"
        | "money"
        | "other"
      trip_item_kind:
        | "sight"
        | "food"
        | "workshop"
        | "transit"
        | "lodging"
        | "shop"
        | "rest"
      trip_lane: "decided" | "savea" | "aaron"
      trip_planner: "aaron" | "savea"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      dietary: ["restriction", "preference", "none"],
      table_shape: ["round", "rectangular", "square"],
      trip_booking_status: ["idea", "to_book", "booked", "in_hand"],
      trip_cabin: ["economy", "premium", "business", "first"],
      trip_currency: ["JPY", "USD"],
      trip_doc_category: [
        "flight",
        "rail",
        "lodging",
        "connectivity",
        "luggage",
        "money",
        "other",
      ],
      trip_item_kind: [
        "sight",
        "food",
        "workshop",
        "transit",
        "lodging",
        "shop",
        "rest",
      ],
      trip_lane: ["decided", "savea", "aaron"],
      trip_planner: ["aaron", "savea"],
    },
  },
} as const

