export interface DataFreshness {
  source: string;
  file: string;
  modified: string;
  age_days: number;
  status: 'fresh' | 'stale' | 'expired';
}

export interface FieldCheck {
  path: string;
  type: string; // 'string' | 'number' | 'boolean' | 'null' | 'array' | 'sampled'
  value_preview: string;
  status: 'ok' | 'warn';
  root_cause?: string;
  suppressed?: boolean;
}

export interface EndpointResult {
  path: string;
  method: string;
  status_code: number;
  response_ms: number;
  total_fields: number;
  null_fields: number;
  fields: FieldCheck[];
  error?: string;
}

export interface ModuleResult {
  name: string;
  endpoints: EndpointResult[];
  total_fields: number;
  null_fields: number;
  all_ok: boolean;
}

export interface RootCause {
  cause: string;
  affected_fields: number;
  sample_paths?: string[];
  remediation?: {
    action: string;
    link?: string;
    manual?: string;
  };
}

export interface CrossCheck {
  name: string;
  passed: boolean;
  note?: string;
}

export interface PipelineLayer {
  layer: string;
  status: 'ok' | 'warning' | 'critical' | 'error';
  detail: string;
}

export interface FrontendErrors {
  last_24h: number;
  top_errors: Array<{
    fingerprint: string;
    count: number;
    message: string;
    page: string;
  }>;
}

export interface DiffFromLast {
  last_checked_at: string | null;
  new_issues: number;
  resolved_issues: number;
  trend: 'improving' | 'degrading' | 'stable' | 'first_run';
}

export interface DataHealthReport {
  checked_at: string;
  overall_status: 'healthy' | 'warning' | 'critical';
  overall_health_pct: number;
  total_endpoints: number;
  total_fields: number;
  null_fields: number;
  check_duration_ms: number;

  vs_last_check: DiffFromLast;
  data_freshness: DataFreshness[];
  root_causes: RootCause[];
  cross_checks: CrossCheck[];
  pipeline_status: PipelineLayer[];
  frontend_errors: FrontendErrors;
  modules: ModuleResult[];
}
