
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
            "contracts": {
                  Row: {
                    "created_at": string,"employee_id": string,"id": string,"sent_at": string | null,"sent_by": string | null,"sha256": string,"signed_at": string | null,"signed_ip": string | null,"signed_name": string | null,"signed_user_agent": string | null,"status": Database["public"]['Enums']["contract_status"],"storage_path": string,"title": string,"uploaded_signed": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"employee_id": string,"id"?: string,"sent_at"?: string | null,"sent_by"?: string | null,"sha256": string,"signed_at"?: string | null,"signed_ip"?: string | null,"signed_name"?: string | null,"signed_user_agent"?: string | null,"status": Database["public"]['Enums']["contract_status"],"storage_path": string,"title": string,"uploaded_signed"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"employee_id"?: string,"id"?: string,"sent_at"?: string | null,"sent_by"?: string | null,"sha256"?: string,"signed_at"?: string | null,"signed_ip"?: string | null,"signed_name"?: string | null,"signed_user_agent"?: string | null,"status"?: Database["public"]['Enums']["contract_status"],"storage_path"?: string,"title"?: string,"uploaded_signed"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "contracts_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contracts_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"employee_qualifications": {
                  Row: {
                    "achieved_on": string | null,"employee_id": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achieved_on"?: string | null,"employee_id": string,"id"?: string,"name": string
                  }
                  Update: {
                    "achieved_on"?: string | null,"employee_id"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "employee_qualifications_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"employees": {
                  Row: {
                    "address_line1": string | null,"address_line2": string | null,"created_at": string,"date_of_birth": string | null,"email": string | null,"employee_number": string | null,"first_name": string,"home_phone": string | null,"id": string,"job_title": string | null,"last_name": string,"leave_date": string | null,"leave_reason": string | null,"mobile_phone": string | null,"payroll_id": string | null,"postcode": string | null,"profile_id": string | null,"qualification_level": string | null,"start_date": string | null,"starter_form_completed_at": string | null,"town": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"email"?: string | null,"employee_number"?: string | null,"first_name": string,"home_phone"?: string | null,"id"?: string,"job_title"?: string | null,"last_name": string,"leave_date"?: string | null,"leave_reason"?: string | null,"mobile_phone"?: string | null,"payroll_id"?: string | null,"postcode"?: string | null,"profile_id"?: string | null,"qualification_level"?: string | null,"start_date"?: string | null,"starter_form_completed_at"?: string | null,"town"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"email"?: string | null,"employee_number"?: string | null,"first_name"?: string,"home_phone"?: string | null,"id"?: string,"job_title"?: string | null,"last_name"?: string,"leave_date"?: string | null,"leave_reason"?: string | null,"mobile_phone"?: string | null,"payroll_id"?: string | null,"postcode"?: string | null,"profile_id"?: string | null,"qualification_level"?: string | null,"start_date"?: string | null,"starter_form_completed_at"?: string | null,"town"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "employees_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_log": {
                  Row: {
                    "key": string,"sent_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"sent_at"?: string
                  }
                  Update: {
                    "key"?: string,"sent_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notification_settings": {
                  Row: {
                    "anniversaries_enabled": boolean,"birthdays_enabled": boolean,"id": number,"recipients": (string)[],"weekly_digest_day": number,"weekly_digest_enabled": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "anniversaries_enabled"?: boolean,"birthdays_enabled"?: boolean,"id"?: number,"recipients"?: (string)[],"weekly_digest_day"?: number,"weekly_digest_enabled"?: boolean
                  }
                  Update: {
                    "anniversaries_enabled"?: boolean,"birthdays_enabled"?: boolean,"id"?: number,"recipients"?: (string)[],"weekly_digest_day"?: number,"weekly_digest_enabled"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"onboarding_task_templates": {
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
                },"onboarding_tasks": {
                  Row: {
                    "completed_at": string | null,"completed_by": string | null,"employee_id": string,"id": string,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"employee_id": string,"id"?: string,"sort_order"?: number,"title": string
                  }
                  Update: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"employee_id"?: string,"id"?: string,"sort_order"?: number,"title"?: string
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
                },"payslips": {
                  Row: {
                    "employee_id": string,"file_name": string,"id": string,"pay_date": string,"storage_path": string,"uploaded_at": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "employee_id": string,"file_name": string,"id"?: string,"pay_date": string,"storage_path": string,"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "employee_id"?: string,"file_name"?: string,"id"?: string,"pay_date"?: string,"storage_path"?: string,"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payslips_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payslips_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"policies": {
                  Row: {
                    "archived": boolean,"created_at": string,"description": string | null,"id": string,"requires_acknowledgement": boolean,"storage_path": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"requires_acknowledgement"?: boolean,"storage_path": string,"title": string
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"requires_acknowledgement"?: boolean,"storage_path"?: string,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"policy_acknowledgements": {
                  Row: {
                    "acknowledged_at": string,"employee_id": string,"policy_id": string,"recorded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string,"employee_id": string,"policy_id": string,"recorded_by"?: string | null
                  }
                  Update: {
                    "acknowledged_at"?: string,"employee_id"?: string,"policy_id"?: string,"recorded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "policy_acknowledgements_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "policy_acknowledgements_policy_id_fkey"
      columns: ["policy_id"]
isOneToOne: false
      referencedRelation: "policies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "policy_acknowledgements_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"current_employee_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"has_mfa":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_manager_or_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"sign_contract":
{ Args: { "p_contract_id": string,"p_ip": string,"p_signed_name": string,"p_user_agent": string }; Returns: undefined
                           },
"submit_starter_form":
{ Args: { "p_address_line1": string,"p_address_line2": string,"p_date_of_birth": string,"p_email": string,"p_home_phone": string,"p_mobile_phone": string,"p_other_qualifications": Json,"p_postcode": string,"p_qualification_level": string,"p_town": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "admin"|"manager"|"staff","contract_status": "sent"|"signed"|"void"
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
            "app_role": ["admin", "manager", "staff"],"contract_status": ["sent", "signed", "void"]
          }
        }
} as const
