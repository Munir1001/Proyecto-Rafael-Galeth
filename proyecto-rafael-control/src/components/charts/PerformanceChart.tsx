import React from 'react';
import { useTheme } from 'next-themes';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Legend, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Card } from 'flowbite-react';
import {
  TrendingUp, BarChart3, LineChart as LineChartIcon,
  PieChart as PieChartIcon, Target, Activity, Zap
} from 'lucide-react';

interface ChartProps {
  data: any[];
  title: string;
  color?: string;
  type?: 'area' | 'bar' | 'line' | 'radar' | 'composed' | 'pie' | 'scatter';
  subtitle?: string;
  showLegend?: boolean;
  height?: number;
  secondaryDataKey?: string;
  secondaryColor?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  dataKeys?: string[];
  colors?: string[];
  showGrid?: boolean;
  stacked?: boolean;
  tooltipFormatter?: (value: any, name: string) => [string, string];
  tickFormatter?: (value: any) => string;
  gradient?: boolean;
  radius?: number | [number, number, number, number];
  dot?: boolean;
  strokeWidth?: number;
  enable3D?: boolean;
  animationDuration?: number;
  showDataLabels?: boolean;
}

const getChartIcon = (type: string) => {
  switch (type) {
    case 'area': return Activity;
    case 'bar': return BarChart3;
    case 'line': return LineChartIcon;
    case 'radar': return Target;
    case 'pie': return PieChartIcon;
    case 'scatter': return Zap;
    default: return TrendingUp;
  }
};

const PerformanceChart: React.FC<ChartProps> = ({
  data,
  title,
  color = '#1E40AF',
  type = 'area',
  subtitle,
  showLegend = false,
  height = 300,
  secondaryDataKey,
  secondaryColor = '#3730A3',
  xAxisKey = 'name',

  yAxisKey = 'value',
  dataKeys = ['value'],
  colors = ['#1E40AF', '#3730A3', '#166534', '#92400E', '#991B1B'],
  showGrid = true,
  stacked = false,
  tooltipFormatter,
  tickFormatter,
  gradient = true,
  radius = [8, 8, 0, 0],
  dot = true,
  strokeWidth = 3,
  enable3D = false,
  animationDuration = 1500,
  showDataLabels = false
}) => {

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const ChartIcon = getChartIcon(type);

  const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Función auxiliar para capitalizar la primera letra
    const capitalize = (str: string) => {
      if (!str) return "Valor";
      // Reemplazos específicos primero
      if (str.toLowerCase() === "value") return "Cantidad";
      // Luego capitalizamos la primera letra
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 min-w-48 backdrop-blur-sm">
        <p className="text-sm font-bold text-slate-900 dark:text-white mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-2 last:mb-0">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {capitalize(entry.name)}:
              </span>
            </div>
            <span className="text-sm font-bold" style={{ color: entry.color }}>
              {tooltipFormatter 
                ? tooltipFormatter(entry.value, entry.name)[0] 
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    if ((percent || 0) * 100 < 3) return null;

    return (
      <g>
        <rect
          x={x - 25}
          y={y - 10}
          width="50"
          height="20"
          rx="4"
          className="fill-slate-900 dark:fill-white fill-opacity-80 dark:fill-opacity-90"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />
        <text
          x={x}
          y={y}
          className="fill-white dark:fill-slate-900 text-xs font-bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {`${((percent || 0) * 100).toFixed(0)}%`}
        </text>
      </g>
    );
  };

  const renderBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (!showDataLabels || height < 20) return null;

    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        className="fill-white dark:fill-slate-900 text-xs font-bold"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {value}
      </text>
    );
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 10, bottom: 20 }
    };

    const axisProps = {
      axisLine: { stroke: isDark ? '#475569' : '#E2E8F0', strokeWidth: 1 },
      tickLine: { stroke: isDark ? '#475569' : '#E2E8F0', strokeWidth: 1 },
      tick: { fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 },
      className: 'dark:stroke-slate-600'
    };

    const gridProps = showGrid ? {
      strokeDasharray: "3 3",
      vertical: false,
      stroke: isDark ? '#334155' : '#F1F5F9', // slate-700 : slate-100
      strokeWidth: 1,
      className: 'dark:stroke-slate-700'
    } : {};

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gradient && (
              <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
            )}
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xAxisKey} {...axisProps} dy={5} />
            <YAxis {...axisProps} width={40} tickFormatter={tickFormatter} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey={yAxisKey}
              stroke={color}
              strokeWidth={strokeWidth}
              fillOpacity={1}
              fill={gradient ? `url(#gradient-${color})` : `${color}20`}
              name={title}
              dot={dot ? { fill: color, strokeWidth: 2, r: 4 } : false}
              animationDuration={animationDuration}
              animationBegin={0}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <defs>
              {colors.map((color, index) => (
                <linearGradient key={`bar-gradient-${index}`} id={`bar-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xAxisKey} {...axisProps} />
            <YAxis {...axisProps} width={40} tickFormatter={tickFormatter} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`url(#bar-gradient-${index})`}
                radius={radius}
                maxBarSize={50}
                name={key === "value" ? "Cantidad" : key}   // ← ¡AQUÍ está la clave!
                stackId={stacked ? 'stack' : undefined}
                label={showDataLabels ? renderBarLabel : undefined}
                animationDuration={animationDuration}
                animationBegin={index * 100}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" className="dark:stroke-slate-700" />
            <XAxis dataKey={xAxisKey} {...axisProps} />
            <YAxis {...axisProps} width={40} tickFormatter={tickFormatter} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={strokeWidth}
                dot={dot ? { fill: colors[index % colors.length], strokeWidth: 2, r: 4 } : false}
                activeDot={{ r: 6, fill: colors[index % colors.length], stroke: 'white', strokeWidth: 2 }}
                name={key}
                animationDuration={animationDuration}
                animationBegin={index * 100}
              />
            ))}
          </LineChart>
        );

      case 'radar':
        return (
          <RadarChart {...commonProps} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#E5E7EB" className="dark:stroke-slate-600" />
            <PolarAngleAxis
              dataKey={xAxisKey}
              tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
              className="dark:fill-slate-400"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 'auto']}
              tick={{ fill: '#9CA3AF', fontSize: 9 }}
              tickFormatter={tickFormatter}
              className="dark:fill-slate-400"
            />
            {dataKeys.map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
              />
            ))}
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
          </RadarChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={`pie-gradient-${index}`} id={`pie-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={entry.color || colors[index % colors.length]} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={entry.color || colors[index % colors.length]} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius="85%"
              innerRadius="0%"
              fill="#8884d8"
              dataKey={yAxisKey}
              nameKey={xAxisKey}
              animationDuration={animationDuration}
              animationBegin={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#pie-gradient-${index})`}
                  stroke={entry.color || colors[index % colors.length]}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value, name) => {
                if (tooltipFormatter) return tooltipFormatter(value, String(name));
                return [value, name];
              }}
            />
            {showLegend && <Legend />}
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <defs>
              <linearGradient id="scatter-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                <stop offset="100%" stopColor={color} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" className="dark:stroke-slate-700" />
            <XAxis
              type="number"
              dataKey={xAxisKey}
              name={xAxisKey}
              {...axisProps}
              tickFormatter={tickFormatter}
            />
            <YAxis
              type="number"
              dataKey={yAxisKey}
              name={yAxisKey}
              {...axisProps}
              tickFormatter={tickFormatter}
            />
            {secondaryDataKey && (
              <ZAxis type="number" dataKey={secondaryDataKey} range={[60, 400]} />
            )}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Legend />
            <Scatter
              name={title}
              data={data}
              fill={`url(#scatter-gradient)`}
              shape="circle"
              animationDuration={animationDuration}
            />
          </ScatterChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <defs>
              <linearGradient id="composed-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[0]} stopOpacity={0.8} />
                <stop offset="100%" stopColor={colors[0]} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xAxisKey} {...axisProps} />
            <YAxis {...axisProps} width={40} tickFormatter={tickFormatter} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {dataKeys.map((key, index) => {
              if (index === 0) {
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={`url(#composed-bar-gradient)`}
                    radius={radius}
                    maxBarSize={45}
                    name={key}
                    animationDuration={animationDuration}
                    animationBegin={0}
                  />
                );
              } else {
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    strokeWidth={strokeWidth}
                    dot={dot ? { fill: colors[index % colors.length], strokeWidth: 2, r: 4 } : false}
                    activeDot={{ r: 6, fill: colors[index % colors.length], stroke: 'white', strokeWidth: 2 }}
                    name={key}
                    animationDuration={animationDuration}
                    animationBegin={index * 100}
                  />
                );
              }
            })}
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="shadow-sm border border-slate-200 dark:border-slate-700 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 rounded-xl bg-white dark:bg-slate-800">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700">
              <ChartIcon size={18} className="text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </h5>
              {subtitle && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          {type !== 'pie' && type !== 'radar' && (
            <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-lg">
              {data.length} datos
            </div>
          )}
        </div>
      </div>

      <div style={{ height: `${height}px`, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* SECCIÓN ELIMINADA: Aquí estaba el bloque que generaba NaN */}
    </Card>
  );
};

export default PerformanceChart;