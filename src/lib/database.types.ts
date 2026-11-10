
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "child_checklist_tasks": {
                  Row: {
                    "child_id": string,"completed_at": string | null,"completed_by": string | null,"completed_by_name": string | null,"id": string,"notes": string | null,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "child_id": string,"completed_at"?: string | null,"completed_by"?: string | null,"completed_by_name"?: string | null,"id"?: string,"notes"?: string | null,"sort_order"?: number,"title": string
                  }
                  Update: {
                    "child_id"?: string,"completed_at"?: string | null,"completed_by"?: string | null,"completed_by_name"?: string | null,"id"?: string,"notes"?: string | null,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "child_checklist_tasks_child_id_fkey"
      columns: ["child_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "child_checklist_tasks_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"child_checklist_templates": {
                  Row: {
                    "active": boolean,"id": string,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: string,"sort_order"?: number,"title": string
                  }
                  Update: {
                    "active"?: boolean,"id"?: string,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"children": {
                  Row: {
                    "created_at": string,"first_name": string,"id": string,"last_name": string,"provisional_start_date": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"first_name": string,"id"?: string,"last_name": string,"provisional_start_date"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"first_name"?: string,"id"?: string,"last_name"?: string,"provisional_start_date"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"contracts": {
                  Row: {
                    "employee_id": string,"id": string,"storage_path": string,"title": string,"uploaded_at": string,"uploaded_by_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "employee_id": string,"id"?: string,"storage_path": string,"title": string,"uploaded_at"?: string,"uploaded_by_name"?: string | null
                  }
                  Update: {
                    "employee_id"?: string,"id"?: string,"storage_path"?: string,"title"?: string,"uploaded_at"?: string,"uploaded_by_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contracts_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"employee_bank_details": {
                  Row: {
                    "employee_id": string,"encrypted": string,"updated_at": string,"updated_by_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "employee_id": string,"encrypted": string,"updated_at"?: string,"updated_by_name"?: string | null
                  }
                  Update: {
                    "employee_id"?: string,"encrypted"?: string,"updated_at"?: string,"updated_by_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "employee_bank_details_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: true
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"employee_training": {
                  Row: {
                    "completed_on": string | null,"created_at": string,"employee_id": string,"expires_on": string | null,"id": string,"recorded_by_name": string | null,"training_type_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_on"?: string | null,"created_at"?: string,"employee_id": string,"expires_on"?: string | null,"id"?: string,"recorded_by_name"?: string | null,"training_type_id": string
                  }
                  Update: {
                    "completed_on"?: string | null,"created_at"?: string,"employee_id"?: string,"expires_on"?: string | null,"id"?: string,"recorded_by_name"?: string | null,"training_type_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "employee_training_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employee_training_training_type_id_fkey"
      columns: ["training_type_id"]
isOneToOne: false
      referencedRelation: "training_types"
      referencedColumns: ["id"]
    }
                  ]
                },"employees": {
                  Row: {
                    "address_line1": string | null,"address_line2": string | null,"bank_details_received_at": string | null,"contract_end_date": string | null,"contract_type": string | null,"contracted_hours": number | null,"created_at": string,"date_of_birth": string | null,"email": string,"emergency_contact_name": string | null,"emergency_contact_phone": string | null,"emergency_contact_relationship": string | null,"famly_group_id": string | null,"famly_id": string | null,"famly_synced_at": string | null,"first_name": string,"id": string,"info_form_submitted_at": string | null,"job_title": string | null,"last_name": string,"leave_date": string | null,"leave_reason": string | null,"mobile_phone": string | null,"ni_number": string | null,"notice_period": string | null,"pay_rate": number | null,"pay_rate_basis": string | null,"payroll_id": string | null,"postcode": string | null,"probation_end_date": string | null,"qualification_date": string | null,"qualification_level": string | null,"start_date": string | null,"town": string | null,"updated_at": string,"working_pattern": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"bank_details_received_at"?: string | null,"contract_end_date"?: string | null,"contract_type"?: string | null,"contracted_hours"?: number | null,"created_at"?: string,"date_of_birth"?: string | null,"email": string,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"emergency_contact_relationship"?: string | null,"famly_group_id"?: string | null,"famly_id"?: string | null,"famly_synced_at"?: string | null,"first_name": string,"id"?: string,"info_form_submitted_at"?: string | null,"job_title"?: string | null,"last_name": string,"leave_date"?: string | null,"leave_reason"?: string | null,"mobile_phone"?: string | null,"ni_number"?: string | null,"notice_period"?: string | null,"pay_rate"?: number | null,"pay_rate_basis"?: string | null,"payroll_id"?: string | null,"postcode"?: string | null,"probation_end_date"?: string | null,"qualification_date"?: string | null,"qualification_level"?: string | null,"start_date"?: string | null,"town"?: string | null,"updated_at"?: string,"working_pattern"?: string | null
                  }
                  Update: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"bank_details_received_at"?: string | null,"contract_end_date"?: string | null,"contract_type"?: string | null,"contracted_hours"?: number | null,"created_at"?: string,"date_of_birth"?: string | null,"email"?: string,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"emergency_contact_relationship"?: string | null,"famly_group_id"?: string | null,"famly_id"?: string | null,"famly_synced_at"?: string | null,"first_name"?: string,"id"?: string,"info_form_submitted_at"?: string | null,"job_title"?: string | null,"last_name"?: string,"leave_date"?: string | null,"leave_reason"?: string | null,"mobile_phone"?: string | null,"ni_number"?: string | null,"notice_period"?: string | null,"pay_rate"?: number | null,"pay_rate_basis"?: string | null,"payroll_id"?: string | null,"postcode"?: string | null,"probation_end_date"?: string | null,"qualification_date"?: string | null,"qualification_level"?: string | null,"start_date"?: string | null,"town"?: string | null,"updated_at"?: string,"working_pattern"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"onboarding_task_templates": {
                  Row: {
                    "active": boolean,"automation": string | null,"id": string,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"automation"?: string | null,"id"?: string,"sort_order"?: number,"title": string
                  }
                  Update: {
                    "active"?: boolean,"automation"?: string | null,"id"?: string,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"onboarding_tasks": {
                  Row: {
                    "automation": string | null,"completed_at": string | null,"completed_by": string | null,"completed_by_name": string | null,"employee_id": string,"id": string,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "automation"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"completed_by_name"?: string | null,"employee_id": string,"id"?: string,"sort_order"?: number,"title": string
                  }
                  Update: {
                    "automation"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"completed_by_name"?: string | null,"employee_id"?: string,"id"?: string,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "onboarding_tasks_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "onboarding_tasks_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string,"full_name": string,"id": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email": string,"full_name"?: string,"id": string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    
                  ]
                },"starter_form_links": {
                  Row: {
                    "employee_id": string,"expires_at": string,"id": string,"revoked_at": string | null,"sent_at": string,"sent_by_name": string | null,"sent_to": string,"token_hash": string,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "employee_id": string,"expires_at": string,"id"?: string,"revoked_at"?: string | null,"sent_at"?: string,"sent_by_name"?: string | null,"sent_to": string,"token_hash": string,"used_at"?: string | null
                  }
                  Update: {
                    "employee_id"?: string,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"sent_at"?: string,"sent_by_name"?: string | null,"sent_to"?: string,"token_hash"?: string,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "starter_form_links_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"training_types": {
                  Row: {
                    "active": boolean,"id": string,"name": string,"validity_months": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: string,"name": string,"validity_months"?: number | null
                  }
                  Update: {
                    "active"?: boolean,"id"?: string,"name"?: string,"validity_months"?: number | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"has_mfa":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_manager_or_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "admin"|"manager"|"staff"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["admin", "manager", "staff"]
          }
        }
} as const
