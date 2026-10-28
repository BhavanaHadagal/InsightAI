import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  PieChart as PieIcon,
  Calendar,
  Layers,
  Filter,
  RotateCcw,
} from 'lucide-react';

const COLORS = ['#2563eb', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

const MainChart = ({ dataset }) => {
  const columns = dataset?.columns || [];
  const records = dataset?.records || [];
  const kpis = dataset?.analysisSummary?.kpis || {};

  const numericCols = useMemo(() => columns.filter((c) => c.type === 'numeric'), [columns]);
  const dateCols = useMemo(() => columns.filter((c) => c.type === 'date'), [columns]);
  const categoricalCols = useMemo(() => columns.filter((c) => c.type === 'categorical'), [columns]);

  // Find meaningful categorical columns (prioritize product, category, branch, city over IDs)
  const meaningfulCatCols = useMemo(() => {
    return categoricalCols.filter((c) => {
      const name = c.name.toLowerCase();
      const isId = /(?:_id|id$|invoice|code|sku|uuid|serial)/i.test(name);
      const isHighCardinality = dataset?.rowCount > 15 && c.uniqueCount / dataset?.rowCount > 0.7;
      return !isId && !isHighCardinality;
    });
  }, [categoricalCols, dataset?.rowCount]);

  // Intelligent initial state
  const hasValidDate = dateCols.length > 0;
  const isSales = Boolean(kpis.isSalesDataset);

  const [chartType, setChartType] = useState(hasValidDate ? 'line' : 'bar');
  const [selectedDimension, setSelectedDimension] = useState(
    hasValidDate ? '__date_month__' : (meaningfulCatCols[0]?.key || categoricalCols[0]?.key || '')
  );
  const [selectedMetric, setSelectedMetric] = useState(
    kpis.primaryMetricKey || numericCols[0]?.key || ''
  );
  const [aggregation, setAggregation] = useState('sum'); // 'sum' | 'avg' | 'count' | 'min' | 'max'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Update defaults when dataset changes
  useEffect(() => {
    if (dataset) {
      const dateAvailable = (dataset.columns || []).some((c) => c.type === 'date');
      const numCols = (dataset.columns || []).filter((c) => c.type === 'numeric');
      const primaryKey = dataset.analysisSummary?.kpis?.primaryMetricKey || numCols[0]?.key || '';
      
      setSelectedMetric(primaryKey);
      if (dateAvailable) {
        setChartType('line');
        setSelectedDimension('__date_month__');
      } else {
        setChartType('bar');
        const meaningful = (dataset.columns || []).filter(
          (c) => c.type === 'categorical' && !/(?:_id|id$|invoice|code|sku)/i.test(c.name)
        );
        setSelectedDimension(meaningful[0]?.key || dataset.columns?.find((c) => c.type === 'categorical')?.key || '');
      }
      setStartDate('');
      setEndDate('');
    }
  }, [dataset?._id, dataset?.sheetName]);

  // Metric metadata
  const currentMetricCol = numericCols.find((c) => c.key === selectedMetric) || numericCols[0];
  const metricLabel = currentMetricCol?.name || 'Value';
  const isCurrency = Boolean(
    isSales && /(total|sales|revenue|amount|price|income|cogs)/i.test(metricLabel)
  );

  // Compute aggregated chart dataset
  const chartData = useMemo(() => {
    if (!records.length || !selectedMetric) {
      return dataset?.analysisSummary?.monthlyTrends || [];
    }

    // Optional Date filtering
    let filteredRecords = records;
    if (hasValidDate && (startDate || endDate)) {
      const primaryDateKey = dateCols[0]?.key;
      filteredRecords = records.filter((r) => {
        const d = r[primaryDateKey];
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }

    const groups = {};
    const isMonthlyTimeDimension = selectedDimension === '__date_month__';
    const isDailyTimeDimension = selectedDimension === '__date_day__';
    const primaryDateKey = dateCols[0]?.key;

    filteredRecords.forEach((r) => {
      let dimKey = 'Unknown';

      if (isMonthlyTimeDimension) {
        const rawDate = r[primaryDateKey];
        if (rawDate) {
          dimKey = String(rawDate).slice(0, 7); // YYYY-MM
        } else {
          dimKey = '(Blank Date)';
        }
      } else if (isDailyTimeDimension) {
        const rawDate = r[primaryDateKey];
        dimKey = rawDate ? String(rawDate).split('T')[0] : '(Blank Date)';
      } else {
        const rawVal = r[selectedDimension];
        dimKey = rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== ''
          ? String(rawVal).trim()
          : '(Blank)';
      }

      const val = typeof r[selectedMetric] === 'number' ? r[selectedMetric] : 0;

      if (!groups[dimKey]) {
        groups[dimKey] = {
          key: dimKey,
          values: [],
          sum: 0,
          count: 0,
        };
      }
      groups[dimKey].values.push(val);
      groups[dimKey].sum += val;
      groups[dimKey].count += 1;
    });

    const items = Object.values(groups).map((g) => {
      let calculatedVal = 0;
      if (aggregation === 'sum') {
        calculatedVal = Math.round(g.sum * 100) / 100;
      } else if (aggregation === 'avg') {
        calculatedVal = g.count > 0 ? Math.round((g.sum / g.count) * 100) / 100 : 0;
      } else if (aggregation === 'count') {
        calculatedVal = g.count;
      } else if (aggregation === 'min') {
        calculatedVal = g.values.length > 0 ? Math.min(...g.values) : 0;
      } else if (aggregation === 'max') {
        calculatedVal = g.values.length > 0 ? Math.max(...g.values) : 0;
      }

      // Display label
      let label = g.key;
      if (isMonthlyTimeDimension && /^\d{4}-\d{2}$/.test(g.key)) {
        const [yr, mo] = g.key.split('-');
        const monthDate = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
        if (!isNaN(monthDate.getTime())) {
          label = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        }
      }

      return {
        key: g.key,
        name: label,
        fullName: label,
        value: calculatedVal,
        count: g.count,
      };
    });

    // Chronological sorting for time dimensions
    if (isMonthlyTimeDimension || isDailyTimeDimension) {
      return items.sort((a, b) => a.key.localeCompare(b.key));
    }

    // Rank sorting for categorical dimensions (limit to top 15 for readability)
    return items.sort((a, b) => b.value - a.value).slice(0, 15);
  }, [
    records,
    selectedDimension,
    selectedMetric,
    aggregation,
    startDate,
    endDate,
    hasValidDate,
    dateCols,
    dataset?.analysisSummary?.monthlyTrends,
  ]);

  const formatTooltipValue = (val) => {
    if (aggregation === 'count') {
      return [`${val.toLocaleString()} records`, 'Total Count'];
    }
    const formatted = isCurrency
      ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : val.toLocaleString();
    return [formatted, `${aggregation.toUpperCase()} ${metricLabel}`];
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-800">
              {hasValidDate && selectedDimension.startsWith('__date')
                ? 'Sales & Activity Trend Analysis'
                : 'Performance & Segment Breakdown'}
            </h2>
            <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200">
              {aggregation.toUpperCase()}: {metricLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {hasValidDate && selectedDimension.startsWith('__date')
              ? 'Chronological time-series aggregation across months and transaction periods'
              : 'Categorical distribution ranked by total transaction volume'}
          </p>
        </div>

        {/* Configuration Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dimension Selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Group:</span>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
            >
              {hasValidDate && (
                <optgroup label="Time Dimensions">
                  <option value="__date_month__">Date (Monthly Trend)</option>
                  <option value="__date_day__">Date (Daily Trend)</option>
                </optgroup>
              )}
              <optgroup label="Categories & Segments">
                {meaningfulCatCols.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
                {/* Fallback to other categorical columns if needed */}
                {categoricalCols
                  .filter((c) => !meaningfulCatCols.some((m) => m.key === c.key))
                  .map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Metric:</span>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
            >
              {numericCols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Aggregation Selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Agg:</span>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-brand-700 outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="sum">SUM</option>
              <option value="avg">AVERAGE</option>
              <option value="count">COUNT</option>
              <option value="min">MINIMUM</option>
              <option value="max">MAXIMUM</option>
            </select>
          </div>

          {/* Chart Type Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setChartType('line')}
              title="Line Chart"
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'line' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LineIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              title="Bar Chart"
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'bar' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('area')}
              title="Area Chart"
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'area' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AreaIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('pie')}
              title="Pie Chart"
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'pie' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Filter (if date column exists) */}
      {hasValidDate && (
        <div className="flex flex-wrap items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 gap-2">
          <div className="flex items-center space-x-2 text-slate-500 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Date Range Filter:</span>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                title="Reset Date Filter"
                className="flex items-center text-[11px] text-rose-600 hover:underline px-1.5"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Visualizer Container */}
      <div className="h-80 w-full pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <p>No records match your selected dimensions or filter.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' && (
              <LineChart data={chartData} margin={{ top: 10, right: 25, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => (isCurrency ? `$${val.toLocaleString()}` : val.toLocaleString())}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={formatTooltipValue}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={metricLabel}
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#2563eb' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}

            {chartType === 'bar' && (
              <BarChart data={chartData} margin={{ top: 10, right: 25, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => (isCurrency ? `$${val.toLocaleString()}` : val.toLocaleString())}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={formatTooltipValue}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="value" name={metricLabel} fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}

            {chartType === 'area' && (
              <AreaChart data={chartData} margin={{ top: 10, right: 25, left: 10, bottom: 25 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => (isCurrency ? `$${val.toLocaleString()}` : val.toLocaleString())}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={formatTooltipValue}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name={metricLabel}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            )}

            {chartType === 'pie' && (
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={formatTooltipValue}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Pie
                  data={chartData.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.slice(0, 8).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default MainChart;
