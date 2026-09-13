export interface AdminUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  is_super_admin: boolean;
  department?: string;
  approval_status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  is_department_master?: boolean;
  roles: string[];
  permissions: string[];
  last_login_at: string | null;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  is_super_admin: boolean;
  department?: string;
  approval_status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  is_department_master?: boolean;
  roles: string[];
  role_ids?: string[];
  last_login_at: string | null;
  created_at: string;
}

export interface StaffChangeRequestItem {
  id: string;
  request_type: string;
  target_user_id?: string;
  target_user_email?: string;
  target_user_name?: string;
  requested_role_id?: string;
  requested_role_name?: string;
  previous_role_id?: string;
  previous_role_name?: string;
  requested_department?: string;
  requested_permissions?: string[];
  requested_by_admin_id: string;
  requested_by_name: string;
  requested_by_email?: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by_admin_id?: string;
  reviewed_by_name?: string;
  review_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface StaffNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  target_type?: string;
  target_id?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface TicketParticipantItem {
  id: string;
  ticket_id: string;
  admin_id: string;
  admin_name: string;
  admin_email: string;
  admin_role?: string;
  admin_department?: string;
  added_by_admin_id: string;
  added_by_name?: string;
  created_at: string;
}

export interface PermissionItem {
  id: string;
  name: string;
  module: string;
  description?: string;
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string;
  is_system?: boolean;
  permissions?: string[];
}

export interface RolesApiResponse {
  roles: RoleItem[];
  all_permissions: PermissionItem[];
}

export interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  numeric_value: number;
  change_pct?: number;
  change_direction?: 'up' | 'down' | 'neutral';
  category: string;
  status: 'available' | 'zero' | 'no_data' | 'unavailable';
  tooltip?: string;
}

export interface ChartPoint {
  date: string;
  label?: string;
  values: Record<string, number>;
}

export interface TopItem {
  name: string;
  count: number;
  percentage: number;
}

export interface DashboardResponse {
  preset: string;
  app_id: string;
  period: string;
  cards: MetricCardData[];
  timeseries: ChartPoint[];
  top_themes: TopItem[];
  aggregated_emotions: TopItem[];
  conversion_funnel: TopItem[];
}

export interface VerseItem {
  id: string;
  book_id: string;
  translation: string;
  chapter: number;
  verse_number: number;
  reference: string;
  text: string;
  language: string;
  status: 'draft' | 'published' | 'archived';
  app_id: string;
  themes: string[];
  emotions: string[];
  theme_ids?: string[];
  emotion_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface DailyVerseItem {
  id: string;
  target_date: string;
  verse_id: string;
  reference: string;
  verse_text: string;
  translation: string;
  reflection_title?: string;
  reflection_text?: string;
  prayer_text?: string;
  theme_id?: string;
  theme_name?: string;
  background_image_url?: string;
  status: 'scheduled' | 'published' | 'archived';
  app_id: string;
}

export interface ThemeItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_name: string;
  color_hex: string;
  sort_order: number;
  status: string;
  app_id: string;
  verses_count?: number;
}

export interface EmotionItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_name: string;
  color_hex: string;
  sort_order: number;
  status: string;
  app_id: string;
  verses_count?: number;
}

export interface DevotionalDayItem {
  id?: string;
  day_number: number;
  title: string;
  verse_reference: string;
  verse_text: string;
  reflection: string;
  prayer?: string;
  reading_passage?: string;
}

export interface DevotionalItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image_url?: string;
  total_days: number;
  is_premium: boolean;
  status: string;
  days_count?: number;
  days?: DevotionalDayItem[];
  created_at: string;
}

export interface UserItem {
  id: string;
  email?: string;
  name?: string;
  platform: string;
  language: string;
  app_id: string;
  is_anonymous: boolean;
  is_active: boolean;
  is_deleted?: boolean;
  deleted_at?: string;
  is_premium: boolean;
  premium_expires_at?: string;
  last_seen_at: string;
  created_at: string;
  favorites_count: number;
  history_count: number;
  tickets_count?: number;
  devotionals_count?: number;
  unread_notifications_count?: number;
  app_version?: string;
  device_name?: string;
}

export interface UserDevotionalItem {
  id: string;
  devotional_id: string;
  title: string;
  cover_image_url?: string;
  is_premium: boolean;
  current_day: number;
  total_days: number;
  completed_days_count: number;
  completed_days: number[];
  progress_percent: number;
  is_completed: boolean;
  completed_at?: string;
  updated_at: string;
}

export interface UserActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  badge_color: 'blue' | 'purple' | 'amber' | 'emerald' | 'indigo' | 'rose' | 'teal' | 'red';
}

export interface UserFavoriteItem {
  id: string;
  verse_id: string;
  reference: string;
  text: string;
  translation: string;
  created_at: string;
}

export interface UserReadingItem {
  id: string;
  verse_id: string;
  reference: string;
  text: string;
  translation: string;
  read_at: string;
}

export interface UserPushDeviceItem {
  id: string;
  platform: string;
  device_name: string;
  app_version: string;
  active: boolean;
  token_masked: string;
  last_seen_at: string;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  failure_count: number;
  last_error?: string | null;
}

export interface UserAdminGrantItem {
  id: string;
  entitlement_id: string;
  is_active: boolean;
  reason?: string;
  granted_by_admin_name?: string;
  starts_at: string;
  expires_at?: string | null;
}

export interface UserEntitlementsData {
  grants: UserAdminGrantItem[];
  subscriptions: SubscriptionItem[];
}

export interface MonetizationOverview {
  premium_users_count: number;
  free_users_count: number;
  total_users_count: number;
  active_subscriptions_count: number;
  total_products_count: number;
  active_products_count: number;
  total_placements_count: number;
  active_placements_count: number;
  real_revenue_cents: number;
  real_revenue_formatted: string;
  timestamp: string;
  providers_status: {
    google_play: 'configured' | 'not_configured';
    admob: 'configured' | 'not_configured';
    ump: 'configured' | 'not_configured';
    adsense: 'configured' | 'not_configured';
  };
}

export interface ProviderTestResult {
  provider: string;
  display_name: string;
  status: 'healthy' | 'degraded' | 'not_configured' | 'error';
  response_time_ms?: number | null;
  message: string;
  tested_at: string;
  last_success_at?: string | null;
  error_summary?: string | null;
}

export interface AppItem {
  id: string;
  name: string;
  package_id: string;
  platform: string;
  status: string;
  default_language: string;
  description?: string;
  created_at: string;
}

export interface AppConfigData {
  app_id: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  minimum_supported_version: number;
  latest_version: number;
  force_update: boolean;
  store_url?: string;
  custom_settings: Record<string, any>;
  updated_at: string;
}

export interface FeatureFlagItem {
  id: string;
  app_id: string;
  key: string;
  enabled: boolean;
  platform: string;
  description?: string;
  rules?: Record<string, any>;
  updated_at: string;
}

export interface PremiumProductItem {
  id: string;
  app_id: string;
  product_id: string;
  base_plan_id?: string;
  offer_id?: string;
  product_type: 'subs' | 'inapp';
  title: string;
  description?: string;
  reference_price?: string;
  status: 'active' | 'inactive' | 'archived';
  entitlements: string[];
}

export interface AdPlacementItem {
  id: string;
  app_id: string;
  name: string;
  provider: 'admob' | 'adsense';
  platform: 'android' | 'web' | 'all';
  ad_unit_id_masked?: string;
  format: 'banner' | 'interstitial' | 'rewarded' | 'native';
  enabled: boolean;
  min_interval_seconds: number;
  max_per_session: number;
  free_only: boolean;
}

export interface SubscriptionItem {
  id: string;
  user_id: string;
  user_email?: string;
  product_id: string;
  product_title?: string;
  provider: string;
  status: string;
  order_id?: string;
  purchase_token_masked: string;
  starts_at: string;
  renews_at?: string;
  expires_at?: string;
  is_auto_renewing: boolean;
}

export interface SimulatorProjectionMonth {
  month: number;
  projected_mau: number;
  projected_ads_revenue: number;
  projected_premium_revenue: number;
  projected_total_revenue: number;
  projected_mrr: number;
  projected_costs?: number;
  projected_net_profit?: number;
  projected_cumulative_profit?: number;
  is_breakeven_reached?: boolean;
}

export interface SimulatorResult {
  is_simulation: boolean;
  label: string;
  estimated_monthly_ad_impressions: number;
  estimated_monthly_ads_revenue: number;
  estimated_paying_users: number;
  estimated_mrr: number;
  estimated_arr: number;
  estimated_monthly_premium_revenue: number;
  estimated_monthly_total_revenue: number;
  estimated_arpu: number;
  estimated_arppu: number;
  // Métricas de LTV (Lifetime Value)
  subscriber_lifespan_months?: number;
  estimated_ltv_subscriber?: number;
  estimated_ltv_blended?: number;
  ltv_to_cac_ratio?: number;
  cac_payback_months?: number;
  // Métricas de Break-even & Custos
  monthly_fixed_costs?: number;
  monthly_estimated_costs?: number;
  break_even_subscribers_needed?: number;
  break_even_revenue_needed?: number;
  estimated_monthly_net_profit?: number;
  break_even_month?: number | null;
  is_currently_profitable?: boolean;
  twelve_months_projection: SimulatorProjectionMonth[];
}

export interface DiagnosticItem {
  category: string;
  provider: string;
  status: 'configured' | 'external_config_required' | 'disabled';
  details: string;
  recommendation: string;
}

export interface ComponentHealth {
  name: string;
  display_name: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'not_configured';
  criticality?: 'CRÍTICO' | 'IMPORTANTE' | 'OPCIONAL';
  response_time_ms?: number;
  message: string;
  last_check_at: string;
  recommendation?: string;
  details?: Record<string, any>;
}

export interface AllProvidersTestResponse {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  tested_at: string;
  average_response_time_ms: number;
  total_providers_tested: number;
  results: Record<string, ProviderTestResult>;
}

export interface SystemHealthData {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  checked_at: string;
  components: ComponentHealth[];
}

export interface AuditLogItem {
  id: string;
  admin_id?: string;
  admin_email?: string;
  admin_name?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  meta_data?: Record<string, any>;
  created_at: string;
}

export interface ExperimentItem {
  id: string;
  app_id: string;
  name: string;
  key?: string;
  description?: string;
  target_event: string;
  status: string;
  variants: any[];
  winner_variant_id?: string;
  created_at?: string;
  updated_at?: string;
}


export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TicketCategory =
  | 'TECHNICAL'
  | 'ACCOUNT'
  | 'PREMIUM_PAYMENT'
  | 'ADS'
  | 'CONTENT'
  | 'SUGGESTION'
  | 'OTHER';

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  message_id?: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  storage_reference: string;
  uploaded_by: string;
  created_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'USER' | 'ADMIN' | 'SYSTEM';
  sender_user_id?: string;
  sender_admin_id?: string;
  sender_name?: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
  updated_at?: string;
  attachments?: TicketAttachment[];
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  action: string;
  previous_value?: string;
  new_value?: string;
  admin_id?: string;
  user_id?: string;
  created_at: string;
}

export interface TicketItem {
  id: string;
  ticket_number: string;
  app_id: string;
  user_id?: string;
  is_guest?: boolean;
  user_name?: string;
  user_email?: string;
  user_is_premium?: boolean;
  user_is_active?: boolean;
  user_platform?: string;
  user_created_at?: string;
  guest_name?: string;
  guest_email?: string;
  subject: string;
  category: TicketCategory | string;
  priority: TicketPriority | string;
  status: TicketStatus | string;
  assigned_admin_id?: string;
  assigned_admin_name?: string;
  messages_count?: number;
  created_at: string;
  updated_at: string;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface TicketDetail extends TicketItem {
  description: string;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  history: TicketHistory[];
}

export interface TicketMetrics {
  open_tickets: number;
  urgent_tickets: number;
  in_progress_tickets: number;
  waiting_user_tickets: number;
  resolved_today: number;
  closed_total: number;
  avg_first_response_minutes?: number;
  avg_resolution_hours?: number;
}

export interface StaffPushDeviceItem {
  id: string;
  token_masked: string;
  provider: string;
  platform: string;
  browser?: string;
  device_name?: string;
  active: boolean;
  last_seen_at: string;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  failure_count: number;
  created_at: string;
}

export interface PushDiagnosticsData {
  provider: string;
  is_configured: boolean;
  service_worker_ready: boolean;
  registered_devices_count: number;
  active_devices_count: number;
  devices: StaffPushDeviceItem[];
  last_push_type?: string | null;
  last_push_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  fcm_configured: boolean;
}

export interface HealthCheckResponse {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  environment?: string;
  version?: string;
  timestamp: string;
  services?: Array<{
    name: string;
    status: string;
    latency_ms?: number;
    details?: string;
  }>;
  components?: ComponentHealth[];
}

export interface RealtimeActivePoint {
  timestamp: string;
  active_users: number;
  reading_verse: number;
  in_devotional: number;
  sharing: number;
}

export interface TrendingVerseShareItem {
  verse_id: string;
  reference: string;
  text: string;
  book?: string;
  shares_count: number;
  shares_growth_pct: number;
  channels: {
    whatsapp: number;
    instagram: number;
    image_card: number;
    text_copy: number;
  };
}

export interface ShareChannelBreakdown {
  channel: string;
  label: string;
  shares: number;
  percentage: number;
  color: string;
}

export interface UserEngagementData {
  app_id: string;
  current_active_users: number;
  active_change_pct: number;
  peak_active_today: number;
  peak_time: string;
  avg_session_duration_seconds: number;
  total_shares_today: number;
  shares_growth_pct: number;
  realtime_timeline: RealtimeActivePoint[];
  trending_verses: TrendingVerseShareItem[];
  channel_breakdown: ShareChannelBreakdown[];
  hourly_shares_trend: Array<{ hour: string; shares: number; readers: number }>;
}



