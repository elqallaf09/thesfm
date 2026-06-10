export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          email: string | null
          avatar_url: string | null
          country: string | null
          city: string | null
          default_currency: string | null
          age: number | null
          gender: string | null
          profession: string | null
          profession_other: string | null
          security_question: string | null
          security_answer_hash: string | null
          security_answer: string | null
          security_question_2: string | null
          security_answer_2: string | null
          security_question_3: string | null
          security_answer_3: string | null
          phone_country_code: string | null
          phone_number: string | null
          preferred_lang: string | null
          preferred_currency: string | null
          preferred_theme: string | null
          email_2fa_enabled: boolean
          email_2fa_enabled_at: string | null
          view_mode: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
          country?: string | null
          city?: string | null
          default_currency?: string | null
          age?: number | null
          gender?: string | null
          profession?: string | null
          profession_other?: string | null
          security_question?: string | null
          security_answer_hash?: string | null
          security_answer?: string | null
          security_question_2?: string | null
          security_answer_2?: string | null
          security_question_3?: string | null
          security_answer_3?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_lang?: string | null
          preferred_currency?: string | null
          preferred_theme?: string | null
          email_2fa_enabled?: boolean
          email_2fa_enabled_at?: string | null
          view_mode?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
          country?: string | null
          city?: string | null
          default_currency?: string | null
          age?: number | null
          gender?: string | null
          profession?: string | null
          profession_other?: string | null
          security_question?: string | null
          security_answer_hash?: string | null
          security_answer?: string | null
          security_question_2?: string | null
          security_answer_2?: string | null
          security_question_3?: string | null
          security_answer_3?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_lang?: string | null
          preferred_currency?: string | null
          preferred_theme?: string | null
          email_2fa_enabled?: boolean
          email_2fa_enabled_at?: string | null
          view_mode?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_2fa_codes: {
        Row: {
          id: string
          user_id: string
          code_hash: string
          purpose: string
          expires_at: string
          used_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          code_hash: string
          purpose?: string
          expires_at: string
          used_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          code_hash?: string
          purpose?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_decisions: {
        Row: {
          id: string
          user_id: string
          title: string
          decision_type: string | null
          amount: number | null
          currency: string | null
          expected_benefit: number | null
          monthly_impact: number | null
          risk_level: string | null
          target_date: string | null
          notes: string | null
          analysis: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          decision_type?: string | null
          amount?: number | null
          currency?: string | null
          expected_benefit?: number | null
          monthly_impact?: number | null
          risk_level?: string | null
          target_date?: string | null
          notes?: string | null
          analysis?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          decision_type?: string | null
          amount?: number | null
          currency?: string | null
          expected_benefit?: number | null
          monthly_impact?: number | null
          risk_level?: string | null
          target_date?: string | null
          notes?: string | null
          analysis?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      monthly_income_sources: {
        Row: {
          id: string
          user_id: string
          category: string
          label: string | null
          amount: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          label?: string | null
          amount?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          label?: string | null
          amount?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          currency: string | null
          saving_type: string | null
          saving_method: string | null
          saved_at: string | null
          note: string | null
          goal_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount?: number
          currency?: string | null
          saving_type?: string | null
          saving_method?: string | null
          saved_at?: string | null
          note?: string | null
          goal_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          currency?: string | null
          saving_type?: string | null
          saving_method?: string | null
          saved_at?: string | null
          note?: string | null
          goal_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      savings_items: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          currency: string | null
          saving_type: string | null
          method: string | null
          saving_method: string | null
          saved_at: string | null
          notes: string | null
          note: string | null
          goal_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount?: number
          currency?: string | null
          saving_type?: string | null
          method?: string | null
          saving_method?: string | null
          saved_at?: string | null
          notes?: string | null
          note?: string | null
          goal_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          currency?: string | null
          saving_type?: string | null
          method?: string | null
          saving_method?: string | null
          saved_at?: string | null
          notes?: string | null
          note?: string | null
          goal_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      investment_items: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          created_at: string | null
          updated_at: string | null
          ai_analysis: string | null
          type: string | null
          current_value: number | null
          monthly_contribution: number | null
          start_date: string | null
          risk_level: string | null
          expected_annual_return: number | null
          notes: string | null
          current_price: number | null
          current_market_value: number | null
          price_currency: string | null
          symbol: string | null
          provider_symbol: string | null
          market: string | null
          asset_type: string | null
          asset_name: string | null
          currency: string | null
          quantity: number | null
          shares: number | null
          last_price: number | null
          last_price_updated_at: string | null
          price_updated_at: string | null
          data_source: string | null
          price_source: string | null
          invested_amount: number | null
          purchase_price: number | null
          average_buy_price: number | null
          purchase_total: number | null
          total_invested: number | null
          purchase_date: string | null
          entry_date: string | null
          maturity_date: string | null
          exchange: string | null
          unit: string | null
          location: string | null
          property_type: string | null
          project_id: string | null
          metal_type: string | null
          metal_product_type: string | null
          metal_karat: number | null
          metal_purity: number | null
          grams: number | null
          pure_metal_grams: number | null
          native_currency: string | null
          native_unit_price: number | null
          native_market_value: number | null
          user_currency: string | null
          fx_rate_to_user_currency: number | null
          converted_market_value: number | null
          fx_source: string | null
          fx_last_updated_at: string | null
          valuation_source: string | null
          valuation_last_updated_at: string | null
          default_currency_value: number | null
          profit_loss: number | null
          profit_loss_percent: number | null
          expected_monthly_income: number | null
          expected_monthly_expense: number | null
          investment_snapshot: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount?: number
          created_at?: string | null
          updated_at?: string | null
          ai_analysis?: string | null
          type?: string | null
          current_value?: number | null
          monthly_contribution?: number | null
          start_date?: string | null
          risk_level?: string | null
          expected_annual_return?: number | null
          notes?: string | null
          current_price?: number | null
          current_market_value?: number | null
          price_currency?: string | null
          symbol?: string | null
          provider_symbol?: string | null
          market?: string | null
          asset_type?: string | null
          asset_name?: string | null
          currency?: string | null
          quantity?: number | null
          shares?: number | null
          last_price?: number | null
          last_price_updated_at?: string | null
          price_updated_at?: string | null
          data_source?: string | null
          price_source?: string | null
          invested_amount?: number | null
          purchase_price?: number | null
          average_buy_price?: number | null
          purchase_total?: number | null
          total_invested?: number | null
          purchase_date?: string | null
          entry_date?: string | null
          maturity_date?: string | null
          exchange?: string | null
          unit?: string | null
          location?: string | null
          property_type?: string | null
          project_id?: string | null
          metal_type?: string | null
          metal_product_type?: string | null
          metal_karat?: number | null
          metal_purity?: number | null
          grams?: number | null
          pure_metal_grams?: number | null
          native_currency?: string | null
          native_unit_price?: number | null
          native_market_value?: number | null
          user_currency?: string | null
          fx_rate_to_user_currency?: number | null
          converted_market_value?: number | null
          fx_source?: string | null
          fx_last_updated_at?: string | null
          valuation_source?: string | null
          valuation_last_updated_at?: string | null
          default_currency_value?: number | null
          profit_loss?: number | null
          profit_loss_percent?: number | null
          expected_monthly_income?: number | null
          expected_monthly_expense?: number | null
          investment_snapshot?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          created_at?: string | null
          updated_at?: string | null
          ai_analysis?: string | null
          type?: string | null
          current_value?: number | null
          monthly_contribution?: number | null
          start_date?: string | null
          risk_level?: string | null
          expected_annual_return?: number | null
          notes?: string | null
          current_price?: number | null
          current_market_value?: number | null
          price_currency?: string | null
          symbol?: string | null
          provider_symbol?: string | null
          market?: string | null
          asset_type?: string | null
          asset_name?: string | null
          currency?: string | null
          quantity?: number | null
          shares?: number | null
          last_price?: number | null
          last_price_updated_at?: string | null
          price_updated_at?: string | null
          data_source?: string | null
          price_source?: string | null
          invested_amount?: number | null
          purchase_price?: number | null
          average_buy_price?: number | null
          purchase_total?: number | null
          total_invested?: number | null
          purchase_date?: string | null
          entry_date?: string | null
          maturity_date?: string | null
          exchange?: string | null
          unit?: string | null
          location?: string | null
          property_type?: string | null
          project_id?: string | null
          metal_type?: string | null
          metal_product_type?: string | null
          metal_karat?: number | null
          metal_purity?: number | null
          grams?: number | null
          pure_metal_grams?: number | null
          native_currency?: string | null
          native_unit_price?: number | null
          native_market_value?: number | null
          user_currency?: string | null
          fx_rate_to_user_currency?: number | null
          converted_market_value?: number | null
          fx_source?: string | null
          fx_last_updated_at?: string | null
          valuation_source?: string | null
          valuation_last_updated_at?: string | null
          default_currency_value?: number | null
          profit_loss?: number | null
          profit_loss_percent?: number | null
          expected_monthly_income?: number | null
          expected_monthly_expense?: number | null
          investment_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      debts: {
        Row: {
          id: string
          user_id: string
          name: string
          creditor_name: string
          original_amount: number
          remaining_amount: number
          calculated_remaining_amount: number | null
          total_paid_amount: number | null
          total_interest_paid: number | null
          total_principal_paid: number | null
          last_calculated_at: string | null
          currency: string
          start_date: string
          first_payment_date: string | null
          monthly_payment: number
          interest_rate: number
          interest_type: string
          payment_day: number
          notes: string | null
          auto_add_to_expenses: boolean
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          creditor_name: string
          original_amount: number
          remaining_amount: number
          calculated_remaining_amount?: number | null
          total_paid_amount?: number | null
          total_interest_paid?: number | null
          total_principal_paid?: number | null
          last_calculated_at?: string | null
          currency?: string
          start_date: string
          first_payment_date?: string | null
          monthly_payment: number
          interest_rate?: number
          interest_type?: string
          payment_day?: number
          notes?: string | null
          auto_add_to_expenses?: boolean
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          creditor_name?: string
          original_amount?: number
          remaining_amount?: number
          calculated_remaining_amount?: number | null
          total_paid_amount?: number | null
          total_interest_paid?: number | null
          total_principal_paid?: number | null
          last_calculated_at?: string | null
          currency?: string
          start_date?: string
          first_payment_date?: string | null
          monthly_payment?: number
          interest_rate?: number
          interest_type?: string
          payment_day?: number
          notes?: string | null
          auto_add_to_expenses?: boolean
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          id: string
          user_id: string
          debt_id: string
          payment_date: string
          amount: number
          interest_amount: number
          principal_amount: number
          currency: string
          expense_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          debt_id: string
          payment_date: string
          amount: number
          interest_amount?: number
          principal_amount?: number
          currency?: string
          expense_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          debt_id?: string
          payment_date?: string
          amount?: number
          interest_amount?: number
          principal_amount?: number
          currency?: string
          expense_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          }
        ]
      }

      financial_goals: {
        Row: {
          id: string
          user_id: string
          goal: string
          amount: number
          current_amount: number | null
          duration: string | null
          duration_unit: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          goal: string
          amount?: number
          current_amount?: number | null
          duration?: string | null
          duration_unit?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          goal?: string
          amount?: number
          current_amount?: number | null
          duration?: string | null
          duration_unit?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          emoji: string | null
          budget: number | string | null
          timeline: string | null
          duration_unit: string | null
          steps: Json | null
          notes: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          emoji?: string | null
          budget?: number | string | null
          timeline?: string | null
          duration_unit?: string | null
          steps?: Json | null
          notes?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          emoji?: string | null
          budget?: number | string | null
          timeline?: string | null
          duration_unit?: string | null
          steps?: Json | null
          notes?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      make_unique_username: {
        Args: { base_username: string }
        Returns: string
      }
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
