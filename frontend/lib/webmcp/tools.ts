import { analysisAPI, reportsAPI, datasourcesAPI, snapshotsAPI } from '@/lib/api';

export function registerAllTools() {
  if (typeof window === 'undefined' || !navigator.modelContext) return;

  // Tool 1: run_analysis
  navigator.modelContext.registerTool({
    name: 'run_analysis',
    description:
      'Trigger a new referral operations data analysis. Reads Excel data sources, runs 7-dimensional analysis, generates reports and saves snapshot.',
    inputSchema: {
      type: 'object',
      properties: {
        input_dir: {
          type: 'string',
          description: 'Data source directory path',
          default: './input',
        },
        report_date: {
          type: 'string',
          description: 'Report date in YYYY-MM-DD format, defaults to today',
        },
        lang: {
          type: 'string',
          enum: ['zh', 'th'],
          description: 'Report language',
          default: 'zh',
        },
      },
    },
    async execute({
      input_dir,
      report_date,
      lang,
    }: {
      input_dir?: string;
      report_date?: string;
      lang?: string;
    }) {
      const result = await analysisAPI.run({ input_dir, report_date, lang });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    },
  });

  // Tool 2: get_report
  navigator.modelContext.registerTool({
    name: 'get_report',
    description:
      'Get the latest or specified date analysis report in Markdown format. Supports ops (tactical) and exec (strategic) versions.',
    inputSchema: {
      type: 'object',
      properties: {
        report_type: {
          type: 'string',
          enum: ['ops', 'exec'],
          description: 'Report type: ops=operations, exec=executive',
          default: 'ops',
        },
        date: {
          type: 'string',
          description: 'Report date YYYYMMDD, defaults to latest',
        },
      },
    },
    async execute({
      report_type = 'ops',
      date,
    }: {
      report_type?: 'ops' | 'exec';
      date?: string;
    }) {
      const latest = await reportsAPI.getLatest();
      const latestEntry = latest[report_type] as string | null | undefined;
      const reportDate = date || (typeof latestEntry === 'string' ? (latestEntry.match(/\d{8}/)?.[0] ?? '') : '');
      if (!reportDate) {
        return { content: [{ type: 'text', text: 'No report available. Run analysis first.' }] };
      }
      const content = await reportsAPI.getContent(report_type, reportDate);
      return { content: [{ type: 'text', text: JSON.stringify(content) }] };
    },
  });

  // Tool 3: get_ranking
  navigator.modelContext.registerTool({
    name: 'get_ranking',
    description:
      'Get CC/SS/LP individual performance ranking. CC ranking is based on composite score of leads, conversion rate, follow-up quality, and check-in participation.',
    inputSchema: {
      type: 'object',
      properties: {
        role_type: {
          type: 'string',
          enum: ['cc', 'ss', 'lp'],
          description: 'Role type: cc=front sales, ss=back sales(EA), lp=back service(CM)',
        },
        top_n: {
          type: 'number',
          description: 'Return top N results, default 10',
          default: 10,
        },
      },
      required: ['role_type'],
    },
    async execute(args: Record<string, unknown>) {
      const role_type = args['role_type'] as 'cc' | 'ss' | 'lp';
      const top_n = (args['top_n'] as number | undefined) ?? 10;
      let result: unknown;
      if (role_type === 'cc') {
        result = await analysisAPI.getCCRanking(top_n);
      } else if (role_type === 'ss') {
        result = await analysisAPI.getSSRanking(top_n);
      } else {
        result = await analysisAPI.getLPRanking(top_n);
      }
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    },
  });

  // Tool 4: get_alerts
  navigator.modelContext.registerTool({
    name: 'get_alerts',
    description:
      'Get current risk alerts and anomaly detection results, including severity level, quantified impact, and recommended actions.',
    inputSchema: {
      type: 'object',
      properties: {
        include_anomalies: {
          type: 'boolean',
          description: 'Include anomaly detection results',
          default: true,
        },
      },
    },
    async execute({ include_anomalies = true }: { include_anomalies?: boolean }) {
      const [alerts, anomalies] = await Promise.all([
        analysisAPI.getRiskAlerts(),
        include_anomalies ? analysisAPI.getAnomalies() : Promise.resolve([]),
      ]);
      return {
        content: [{ type: 'text', text: JSON.stringify({ risk_alerts: alerts, anomalies }) }],
      };
    },
  });

  // Tool 5: get_kpi_summary
  navigator.modelContext.registerTool({
    name: 'get_kpi_summary',
    description:
      'Get monthly key operations KPI summary including actual values, targets, progress percentage, gap, and status for registration, payment, revenue, and conversion rate.',
    inputSchema: {
      type: 'object',
      properties: {
        include_comparison: {
          type: 'boolean',
          description: 'Include period-over-period comparison data',
          default: false,
        },
      },
    },
    async execute(_args: Record<string, unknown>) {
      const summary = await analysisAPI.getSummary();
      return { content: [{ type: 'text', text: JSON.stringify(summary) }] };
    },
  });

  // Tool 6: get_datasource_status
  navigator.modelContext.registerTool({
    name: 'get_datasource_status',
    description:
      'Get loading status of all 12 data sources, including file date, T-1 validation, and priority level.',
    inputSchema: {
      type: 'object',
      properties: {
        only_missing: {
          type: 'boolean',
          description: 'Return only missing data sources',
          default: false,
        },
      },
    },
    async execute({ only_missing = false }: { only_missing?: boolean }) {
      const statuses = await datasourcesAPI.getStatus();
      const filtered = only_missing ? statuses.filter((s) => !s.is_fresh) : statuses;
      return { content: [{ type: 'text', text: JSON.stringify(filtered) }] };
    },
  });

  // Tool 7: get_snapshot_history
  navigator.modelContext.registerTool({
    name: 'get_snapshot_history',
    description:
      'Get historical snapshot data for time-series analysis. Supports daily KPI trends and snapshot statistics.',
    inputSchema: {
      type: 'object',
      properties: {
        query_type: {
          type: 'string',
          enum: ['daily_kpi', 'stats'],
          description: 'Query type',
        },
        date_from: { type: 'string', description: 'Start date YYYY-MM-DD' },
        date_to: { type: 'string', description: 'End date YYYY-MM-DD' },
        metric: { type: 'string', description: 'Metric name filter for daily_kpi' },
      },
      required: ['query_type'],
    },
    async execute(args: Record<string, unknown>) {
      const query_type = args['query_type'] as string;
      const date_from = args['date_from'] as string | undefined;
      const date_to = args['date_to'] as string | undefined;
      const metric = args['metric'] as string | undefined;
      if (query_type === 'stats') {
        const stats = await snapshotsAPI.getStats();
        return { content: [{ type: 'text', text: JSON.stringify(stats) }] };
      }
      const data = await snapshotsAPI.getDailyKPI({ date_from, date_to, metric });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  });

  // Tool 8: get_channel_comparison
  navigator.modelContext.registerTool({
    name: 'get_channel_comparison',
    description:
      'Get referral channel comparison data showing registration, payment, and revenue breakdown by channel type (narrow/wide funnel).',
    inputSchema: { type: 'object', properties: {} },
    async execute(_args: Record<string, unknown>) {
      const data = await analysisAPI.getChannelComparison();
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  });
}
