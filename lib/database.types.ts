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
      trip_bouts: {
        Row: {
          created_at: string
          east_id: string
          id: string
          outcome: Database["public"]["Enums"]["trip_bout_outcome"]
          trip_id: string
          west_id: string
        }
        Insert: {
          created_at?: string
          east_id: string
          id?: string
          outcome: Database["public"]["Enums"]["trip_bout_outcome"]
          trip_id: string
          west_id: string
        }
        Update: {
          created_at?: string
          east_id?: string
          id?: string
          outcome?: Database["public"]["Enums"]["trip_bout_outcome"]
          trip_id?: string
          west_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_bouts_east_id_fkey"
            columns: ["east_id"]
            isOneToOne: false
            referencedRelation: "trip_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_bouts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_bouts_west_id_fkey"
            columns: ["west_id"]
            isOneToOne: false
            referencedRelation: "trip_items"
            referencedColumns: ["id"]
          },
        ]
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
          trip_id: string
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
          trip_id: string
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
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_checklist_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_days: {
        Row: {
          created_at: string
          note: string | null
          on_date: string
          title: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          on_date: string
          title?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          on_date?: string
          title?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
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
          trip_id: string
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
          trip_id: string
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
          trip_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_docs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
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
          trip_id: string
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
          trip_id: string
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
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_flights_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
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
          closes_at: string | null
          cost_amount: number | null
          cost_currency: Database["public"]["Enums"]["trip_currency"]
          created_at: string
          cut_at: string | null
          duration_min: number | null
          id: string
          kind: Database["public"]["Enums"]["trip_item_kind"]
          lane: Database["public"]["Enums"]["trip_lane"]
          linked_stay_id: string | null
          linked_transit_id: string | null
          map_url: string | null
          must_do: boolean
          notes: string | null
          on_date: string | null
          opens_at: string | null
          pinned: boolean
          position: number
          start_time: string | null
          title: string
          title_ja: string | null
          trip_id: string
          updated_at: string
          url: string | null
          wander_id: string | null
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
          closes_at?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          cut_at?: string | null
          duration_min?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["trip_item_kind"]
          lane?: Database["public"]["Enums"]["trip_lane"]
          linked_stay_id?: string | null
          linked_transit_id?: string | null
          map_url?: string | null
          must_do?: boolean
          notes?: string | null
          on_date?: string | null
          opens_at?: string | null
          pinned?: boolean
          position?: number
          start_time?: string | null
          title: string
          title_ja?: string | null
          trip_id: string
          updated_at?: string
          url?: string | null
          wander_id?: string | null
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
          closes_at?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          cut_at?: string | null
          duration_min?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["trip_item_kind"]
          lane?: Database["public"]["Enums"]["trip_lane"]
          linked_stay_id?: string | null
          linked_transit_id?: string | null
          map_url?: string | null
          must_do?: boolean
          notes?: string | null
          on_date?: string | null
          opens_at?: string | null
          pinned?: boolean
          position?: number
          start_time?: string | null
          title?: string
          title_ja?: string | null
          trip_id?: string
          updated_at?: string
          url?: string | null
          wander_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_items_linked_stay_id_fkey"
            columns: ["linked_stay_id"]
            isOneToOne: false
            referencedRelation: "trip_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_items_linked_transit_fkey"
            columns: ["linked_transit_id"]
            isOneToOne: false
            referencedRelation: "trip_transit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_items_wander_id_fkey"
            columns: ["wander_id"]
            isOneToOne: false
            referencedRelation: "trip_items"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_legs: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          lane: Database["public"]["Enums"]["trip_lane"]
          name: string
          name_ja: string | null
          note: string | null
          position: number
          starts_on: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          lane?: Database["public"]["Enums"]["trip_lane"]
          name: string
          name_ja?: string | null
          note?: string | null
          position?: number
          starts_on: string
          trip_id: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          lane?: Database["public"]["Enums"]["trip_lane"]
          name?: string
          name_ja?: string | null
          note?: string | null
          position?: number
          starts_on?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_legs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_notebooks: {
        Row: {
          created_at: string
          id: string
          name: string
          owner: Database["public"]["Enums"]["trip_planner"] | null
          position: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner?: Database["public"]["Enums"]["trip_planner"] | null
          position?: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner?: Database["public"]["Enums"]["trip_planner"] | null
          position?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_notebooks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          notebook_id: string
          on_date: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          notebook_id: string
          on_date?: string | null
          title?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          notebook_id?: string
          on_date?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "trip_notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_notes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_route_proposals: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          label: string | null
          lodging_yen: number
          moves: number
          nights: number
          position: number
          price_basis: string
          source: string
          travel_km: number
          travel_yen: number
          trip_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          label?: string | null
          lodging_yen: number
          moves?: number
          nights: number
          position?: number
          price_basis?: string
          source?: string
          travel_km?: number
          travel_yen?: number
          trip_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          label?: string | null
          lodging_yen?: number
          moves?: number
          nights?: number
          position?: number
          price_basis?: string
          source?: string
          travel_km?: number
          travel_yen?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_route_proposals_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_stay_proposals: {
        Row: {
          breakfast: boolean
          check_in_on: string
          check_out_on: string
          cost_yen: number | null
          dinner: boolean
          id: string
          name: string
          name_ja: string | null
          per_night_yen: number | null
          place_id: string
          place_name: string
          position: number
          route_id: string
          source_property_id: string | null
          url: string | null
        }
        Insert: {
          breakfast?: boolean
          check_in_on: string
          check_out_on: string
          cost_yen?: number | null
          dinner?: boolean
          id?: string
          name: string
          name_ja?: string | null
          per_night_yen?: number | null
          place_id: string
          place_name: string
          position?: number
          route_id: string
          source_property_id?: string | null
          url?: string | null
        }
        Update: {
          breakfast?: boolean
          check_in_on?: string
          check_out_on?: string
          cost_yen?: number | null
          dinner?: boolean
          id?: string
          name?: string
          name_ja?: string | null
          per_night_yen?: number | null
          place_id?: string
          place_name?: string
          position?: number
          route_id?: string
          source_property_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_stay_proposals_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "trip_route_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_stays: {
        Row: {
          added_by: Database["public"]["Enums"]["trip_planner"]
          address: string | null
          address_ja: string | null
          booking_status: Database["public"]["Enums"]["trip_booking_status"]
          breakfast_time: string | null
          cancel_by: string | null
          check_in_on: string
          check_in_time: string | null
          check_out_on: string
          check_out_time: string | null
          city: string | null
          confirmation: string | null
          cost_amount: number | null
          cost_currency: Database["public"]["Enums"]["trip_currency"]
          created_at: string
          desk_cash_yen: number | null
          dinner_time: string | null
          forward_bags: boolean
          getting_there: string | null
          id: string
          lane: Database["public"]["Enums"]["trip_lane"]
          map_url: string | null
          name: string
          name_ja: string | null
          notes: string | null
          onsen_hours: string | null
          payment: Database["public"]["Enums"]["trip_stay_payment"] | null
          phone: string | null
          tattoos_ok: boolean | null
          trip_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          added_by?: Database["public"]["Enums"]["trip_planner"]
          address?: string | null
          address_ja?: string | null
          booking_status?: Database["public"]["Enums"]["trip_booking_status"]
          breakfast_time?: string | null
          cancel_by?: string | null
          check_in_on: string
          check_in_time?: string | null
          check_out_on: string
          check_out_time?: string | null
          city?: string | null
          confirmation?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          desk_cash_yen?: number | null
          dinner_time?: string | null
          forward_bags?: boolean
          getting_there?: string | null
          id?: string
          lane?: Database["public"]["Enums"]["trip_lane"]
          map_url?: string | null
          name: string
          name_ja?: string | null
          notes?: string | null
          onsen_hours?: string | null
          payment?: Database["public"]["Enums"]["trip_stay_payment"] | null
          phone?: string | null
          tattoos_ok?: boolean | null
          trip_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          added_by?: Database["public"]["Enums"]["trip_planner"]
          address?: string | null
          address_ja?: string | null
          booking_status?: Database["public"]["Enums"]["trip_booking_status"]
          breakfast_time?: string | null
          cancel_by?: string | null
          check_in_on?: string
          check_in_time?: string | null
          check_out_on?: string
          check_out_time?: string | null
          city?: string | null
          confirmation?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          created_at?: string
          desk_cash_yen?: number | null
          dinner_time?: string | null
          forward_bags?: boolean
          getting_there?: string | null
          id?: string
          lane?: Database["public"]["Enums"]["trip_lane"]
          map_url?: string | null
          name?: string
          name_ja?: string | null
          notes?: string | null
          onsen_hours?: string | null
          payment?: Database["public"]["Enums"]["trip_stay_payment"] | null
          phone?: string | null
          tattoos_ok?: boolean | null
          trip_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_stays_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_transit: {
        Row: {
          added_by: Database["public"]["Enums"]["trip_planner"]
          arrives_at: string
          arrives_platform: string | null
          booking_url: string | null
          car: string | null
          confirmation: string | null
          cost_amount: number | null
          cost_currency: Database["public"]["Enums"]["trip_currency"]
          covered_by_pass: boolean
          created_at: string
          departs_at: string
          departs_platform: string | null
          from_place: string
          from_place_ja: string | null
          id: string
          lane: Database["public"]["Enums"]["trip_lane"]
          mode: Database["public"]["Enums"]["trip_transit_mode"]
          notes: string | null
          operator: string | null
          reserved: boolean
          seat_aaron: string | null
          seat_savea: string | null
          service: string | null
          to_place: string
          to_place_ja: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          added_by?: Database["public"]["Enums"]["trip_planner"]
          arrives_at: string
          arrives_platform?: string | null
          booking_url?: string | null
          car?: string | null
          confirmation?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          covered_by_pass?: boolean
          created_at?: string
          departs_at: string
          departs_platform?: string | null
          from_place: string
          from_place_ja?: string | null
          id?: string
          lane?: Database["public"]["Enums"]["trip_lane"]
          mode?: Database["public"]["Enums"]["trip_transit_mode"]
          notes?: string | null
          operator?: string | null
          reserved?: boolean
          seat_aaron?: string | null
          seat_savea?: string | null
          service?: string | null
          to_place: string
          to_place_ja?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          added_by?: Database["public"]["Enums"]["trip_planner"]
          arrives_at?: string
          arrives_platform?: string | null
          booking_url?: string | null
          car?: string | null
          confirmation?: string | null
          cost_amount?: number | null
          cost_currency?: Database["public"]["Enums"]["trip_currency"]
          covered_by_pass?: boolean
          created_at?: string
          departs_at?: string
          departs_platform?: string | null
          from_place?: string
          from_place_ja?: string | null
          id?: string
          lane?: Database["public"]["Enums"]["trip_lane"]
          mode?: Database["public"]["Enums"]["trip_transit_mode"]
          notes?: string | null
          operator?: string | null
          reserved?: boolean
          seat_aaron?: string | null
          seat_savea?: string | null
          service?: string | null
          to_place?: string
          to_place_ja?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_transit_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          name: string
          name_ja: string | null
          note: string | null
          starts_on: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          name: string
          name_ja?: string | null
          note?: string | null
          starts_on: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          name?: string
          name_ja?: string | null
          note?: string | null
          starts_on?: string
          updated_at?: string
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
        Args: {
          p_lane: Database["public"]["Enums"]["trip_lane"]
          p_trip: string
        }
        Returns: number
      }
      adopt_trip_stay: { Args: { p_stay: string }; Returns: string }
      replace_trip_route_proposals: {
        Args: { p_routes: Json; p_source: string; p_trip: string }
        Returns: number
      }
      send_trip_route_proposal: {
        Args: {
          p_lane: Database["public"]["Enums"]["trip_lane"]
          p_planner: Database["public"]["Enums"]["trip_planner"]
          p_route: string
        }
        Returns: number
      }
      send_trip_stay_proposal: {
        Args: {
          p_lane: Database["public"]["Enums"]["trip_lane"]
          p_planner: Database["public"]["Enums"]["trip_planner"]
          p_stay: string
        }
        Returns: string
      }
      sweep_orphaned_trip_items: { Args: { p_trip: string }; Returns: number }
    }
    Enums: {
      dietary: "restriction" | "preference" | "none"
      table_shape: "round" | "rectangular" | "square"
      trip_booking_status: "idea" | "to_book" | "booked" | "in_hand"
      trip_bout_outcome: "east" | "west" | "both" | "neither" | "skip"
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
        | "unsorted"
        | "shrine"
        | "food"
        | "workshop"
        | "shop"
        | "outdoors"
        | "culture"
        | "event"
        | "play"
        | "animals"
        | "onsen"
        | "rest"
        | "wander"
        | "travel"
      trip_lane: "decided" | "savea" | "aaron"
      trip_planner: "aaron" | "savea"
      trip_stay_payment: "prepaid" | "at_desk"
      trip_transit_mode: "train" | "bus" | "ferry" | "taxi" | "car"
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
      trip_bout_outcome: ["east", "west", "both", "neither", "skip"],
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
        "unsorted",
        "shrine",
        "food",
        "workshop",
        "shop",
        "outdoors",
        "culture",
        "event",
        "play",
        "animals",
        "onsen",
        "rest",
        "wander",
        "travel",
      ],
      trip_lane: ["decided", "savea", "aaron"],
      trip_planner: ["aaron", "savea"],
      trip_stay_payment: ["prepaid", "at_desk"],
      trip_transit_mode: ["train", "bus", "ferry", "taxi", "car"],
    },
  },
} as const

