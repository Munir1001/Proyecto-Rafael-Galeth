import { useState, useEffect, useMemo } from 'react';
import { Card, Spinner, Badge, Progress, Table, TableHead, TableHeadCell, TableBody, TableCell, TableRow } from 'flowbite-react';
import {
  Users, Briefcase, AlertTriangle, TrendingUp, CheckCircle,
  Clock, FileText, Calendar, BarChart2, Target, Award,
  Layout, DollarSign, Activity, Zap, ArrowUp, ArrowDown,
  MessageSquare, Paperclip,
  CheckSquare, PauseCircle, Download,
  BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import PerformanceChart from '../components/charts/PerformanceChart';
import * as XLSX from 'xlsx';

// ============= CONFIGURACIÓN =============
const COLORS = {
  primary: ['#1E40AF', '#3730A3', '#4C1D95', '#166534', '#065F46', '#1E3A8A', '#14532D', '#7C2D12'],
  status: {
    Nueva: '#64748B',
    Pendiente: '#92400E',
    'En Progreso': '#1E40AF',
    Bloqueada: '#991B1B',
    Completada: '#166534',
    Vencida: '#7F1D1D',
    Rechazada: '#6B21A8'
  }
};

// ============= TIPOS =============
interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad_id: string;
  estado_id: string;
  asignado_a: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_completado?: string | null;
  completada_a_tiempo?: boolean | null;
  motivo_rechazo?: string | null;
  motivo_bloqueo?: string | null;
  departamento_id: string | null;
  archivos_json?: string[];
  creador_id: string;
  created_at: string;
  updated_at: string;
  asignado?: { nombre_completo: string, avatar_url: string | null, email: string };
  prioridad?: { nombre: string, color: string, nivel: number };
  estado?: { nombre: string, color: string };
  creador?: { nombre_completo: string, avatar_url: string | null };
  departamento?: { nombre: string, manager?: { nombre_completo: string } };
  adjuntos_count?: number;
  comentarios_count?: number;
}

interface Usuario {
  id: string;
  nombre_completo: string;
  email: string;
  avatar_url: string | null;
  rol_id: string;
  departamento_id: string | null;
  activo: boolean;
  fecha_ingreso: string;
  roles?: { nombre: string };
  departamento?: { nombre: string };
}

interface Departamento {
  id: string;
  nombre: string;
  descripcion?: string;
  manager_id?: string;
  manager?: { nombre_completo: string, avatar_url: string | null };
}

interface Comentario {
  id: string;
  tarea_id: string;
  usuario_id: string;
  contenido: string;
  created_at: string;
  usuario?: { nombre_completo: string };
}

interface Adjunto {
  id: string;
  tarea_id: string;
  nombre_archivo: string;
  url_archivo: string;
  created_at: string;
}

interface Catalogo {
  id: string;
  nombre: string;
  color: string;
  nivel?: number;
  es_final?: boolean;
}

interface RendimientoMensual {
  id: string;
  usuario_id: string;
  anio: number;
  mes: number;
  total_tareas_asignadas: number;
  tareas_completadas_a_tiempo: number;
  tareas_completadas_tarde: number;
  tareas_vencidas: number;
  porcentaje_rendimiento: number;
  bono_rendimiento: number;
  salario_final: number;
  usuario?: { nombre_completo: string };
}

// ============= UTILIDADES =============
const getDateRange = (range: string, startDate?: string, endDate?: string) => {
  if (startDate && endDate) {
    return { start: new Date(startDate).toISOString(), end: new Date(endDate).toISOString() };
  }

  const now = new Date();
  const start = new Date();
  if (range === 'week') start.setDate(now.getDate() - 7);
  if (range === 'month') start.setMonth(now.getMonth() - 1);
  if (range === 'quarter') start.setMonth(now.getMonth() - 3);
  if (range === 'year') start.setFullYear(now.getFullYear() - 1);
  return { start: start.toISOString(), end: now.toISOString() };
};

const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) return { value: 0, isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(change).toFixed(1), isPositive: change >= 0 };
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// ============= COMPONENTES UI MEJORADOS =============
const StatCard = ({ title, value, icon: Icon, color, subtext, trend, onClick }: any) => (
  <div
    onClick={onClick}
    className={`
      group relative bg-white dark:bg-slate-800 rounded-xl p-4 md:p-5 shadow-sm hover:shadow-md 
      border border-slate-200 dark:border-slate-700 transition-all duration-300
      cursor-pointer overflow-hidden
      ${onClick ? 'hover:bg-slate-50 dark:hover:bg-slate-750' : ''}
    `}
  >
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm font-medium uppercase tracking-wider">{title}</p>
          {trend && (
            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${trend.isPositive ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
              {trend.isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {trend.value}%
            </span>
          )}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
        {subtext && (
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">{subtext}</p>
        )}
      </div>

      <div className="p-2 md:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700">
        <Icon size={18} className="text-slate-600 dark:text-slate-400 md:w-5 md:h-5" />
      </div>
    </div>
  </div>
);

// ============= COMPONENTE DE CARGA MEJORADO =============
const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Skeleton para KPIs */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-4" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
        </div>
      ))}
    </div>
    {/* Skeleton para gráficos */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-6" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  </div>
);

// ============= VISTA ADMIN MEJORADA =============
const AdminView = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    tareas: [] as Tarea[],
    usuarios: [] as Usuario[],
    departamentos: [] as Departamento[],
    estados: [] as Catalogo[],
    prioridades: [] as Catalogo[],
    comentarios: [] as Comentario[],
    adjuntos: [] as Adjunto[],
    rendimientos: [] as RendimientoMensual[]
  });
  const [timeRange, setTimeRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [timeRange, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange(timeRange, startDate, endDate);
      const start = dateRange.start;
      const end = dateRange.end;

      // Obtener datos en paralelo
      const [
        { data: tareas },
        { data: usuarios },
        { data: departamentos },
        { data: estados },
        { data: prioridades },
        { data: comentarios },
        { data: adjuntos },
        { data: rendimientos }
      ] = await Promise.all([
        supabase
          .from('tareas')
          .select(`
            *,
            asignado:asignado_a(id, nombre_completo, avatar_url, email),
            prioridad:prioridad_id(nombre, color, nivel),
            estado:estado_id(nombre, color),
            creador:creador_id(nombre_completo, avatar_url),
            departamento:departamento_id(nombre)
          `)
          .gte('created_at', start).lte('created_at', end),

        supabase
          .from('usuarios')
          .select(`
            *,
            roles(nombre),
            departamento:departamento_id(nombre)
          `)
          .eq('activo', true),

        supabase.from('departamentos').select('*, manager:manager_id(nombre_completo, avatar_url)'),
        supabase.from('estados_tarea').select('*'),
        supabase.from('prioridades').select('*'),
        supabase.from('comentarios').select('*').gte('created_at', start).lte('created_at', end),
        supabase.from('adjuntos').select('*').gte('created_at', start).lte('created_at', end),
        supabase
          .from('rendimiento_mensual')
          .select('*, usuario:usuario_id(nombre_completo)')
          .order('anio', { ascending: false })
          .order('mes', { ascending: false })
          .limit(12)
      ]);

      setData({
        tareas: tareas || [],
        usuarios: usuarios || [],
        departamentos: departamentos || [],
        estados: estados || [],
        prioridades: prioridades || [],
        comentarios: comentarios || [],
        adjuntos: adjuntos || [],
        rendimientos: rendimientos || []
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    const total = data.tareas.length;
    const completadas = data.tareas.filter(t => t.estado?.nombre === 'Completada').length;
    const vencidas = data.tareas.filter(t =>
      new Date(t.fecha_fin) < new Date() && t.estado?.nombre !== 'Completada'
    ).length;
    const completadasATiempo = data.tareas.filter(t => t.completada_a_tiempo === true).length;
    const eficiencia = total > 0 ? Math.round((completadas / total) * 100) : 0;
    const tasaPuntualidad = completadas > 0 ? Math.round((completadasATiempo / completadas) * 100) : 0;

    // Distribución por estado
    const distribucionEstados = data.estados.map(estado => ({
      name: estado.nombre,
      value: data.tareas.filter(t => t.estado_id === estado.id).length,
      color: estado.color
    })).filter(d => d.value > 0);

    // Tareas por departamento
    const rendimientoDepartamentos = data.departamentos.map(dept => {
      const tareasDept = data.tareas.filter(t => t.departamento_id === dept.id);
      const completadasDept = tareasDept.filter(t => t.estado?.nombre === 'Completada').length;
      const vencidasDept = tareasDept.filter(t =>
        new Date(t.fecha_fin) < new Date() && t.estado?.nombre !== 'Completada'
      ).length;

      return {
        name: dept.nombre,
        total: tareasDept.length,
        completadas: completadasDept,
        vencidas: vencidasDept,
        tasa: tareasDept.length > 0 ? Math.round((completadasDept / tareasDept.length) * 100) : 0
      };
    }).sort((a, b) => b.tasa - a.tasa);

    // Distribución por prioridad
    const distribucionPrioridades = data.prioridades.map(p => ({
      name: p.nombre,
      value: data.tareas.filter(t => t.prioridad_id === p.id).length,
      color: p.color
    }));

    // Tendencia semanal
    const tendenciaSemanal = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const tareasDia = data.tareas.filter(t => {
        const created = new Date(t.created_at);
        return created.toDateString() === date.toDateString();
      });
      return {
        name: date.toLocaleDateString('es-EC', { weekday: 'short' }),
        creadas: tareasDia.length,
        completadas: tareasDia.filter(t => t.estado?.nombre === 'Completada').length
      };
    });

    // Usuarios más activos
    const usuariosActivos = data.usuarios.map(user => {
      const tareasAsignadas = data.tareas.filter(t => t.asignado_a === user.id);
      const tareasCreadas = data.tareas.filter(t => t.creador_id === user.id);
      const comentariosUser = data.comentarios.filter(c => c.usuario_id === user.id);

      return {
        id: user.id,
        nombre: user.nombre_completo,
        departamento: user.departamento?.nombre || 'Sin departamento',
        rol: user.roles?.nombre || 'Usuario',
        asignadas: tareasAsignadas.length,
        creadas: tareasCreadas.length,
        completadas: tareasAsignadas.filter(t => t.estado?.nombre === 'Completada').length,
        comentarios: comentariosUser.length,
        score: (tareasAsignadas.length * 2) + tareasCreadas.length + comentariosUser.length
      };
    }).sort((a, b) => b.score - a.score).slice(0, 10);

    // Métricas de colaboración
    const totalComentarios = data.comentarios.length;
    const totalAdjuntos = data.adjuntos.length;
    const comentariosPorTarea = total > 0 ? (totalComentarios / total).toFixed(1) : '0';

    // Rendimiento económico
    const totalBonos = data.rendimientos.reduce((sum, r) => sum + (r.bono_rendimiento || 0), 0);
    const promedioRendimiento = data.rendimientos.length > 0
      ? data.rendimientos.reduce((sum, r) => sum + r.porcentaje_rendimiento, 0) / data.rendimientos.length
      : 0;

    return {
      total,
      completadas,
      vencidas,
      completadasATiempo,
      eficiencia,
      tasaPuntualidad,
      distribucionEstados,
      rendimientoDepartamentos,
      distribucionPrioridades,
      tendenciaSemanal,
      usuariosActivos,
      totalComentarios,
      totalAdjuntos,
      comentariosPorTarea,
      totalBonos,
      promedioRendimiento
    };
  }, [data]);

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Hoja de resumen
      const summaryData = [
        ['Métrica', 'Valor'],
        ['Total Tareas', analytics.total],
        ['Tareas Completadas', analytics.completadas],
        ['Tareas Vencidas', analytics.vencidas],
        ['Eficiencia', `${analytics.eficiencia}%`],
        ['Tasa Puntualidad', `${analytics.tasaPuntualidad}%`],
        ['Total Comentarios', analytics.totalComentarios],
        ['Total Adjuntos', analytics.totalAdjuntos],
        ['Bonos Totales', formatCurrency(analytics.totalBonos)]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

      // Hoja de usuarios activos
      const usersData = analytics.usuariosActivos.map((u, i) => ({
        'Rank': i + 1,
        'Usuario': u.nombre,
        'Departamento': u.departamento,
        'Rol': u.rol,
        'Tareas Asignadas': u.asignadas,
        'Tareas Completadas': u.completadas,
        'Tareas Creadas': u.creadas,
        'Comentarios': u.comentarios,
        'Score': u.score
      }));
      const wsUsers = XLSX.utils.json_to_sheet(usersData);
      XLSX.utils.book_append_sheet(wb, wsUsers, 'Usuarios Activos');

      // Hoja de rendimiento por departamento
      const deptData = analytics.rendimientoDepartamentos.map(d => ({
        'Departamento': d.name,
        'Total Tareas': d.total,
        'Completadas': d.completadas,
        'Vencidas': d.vencidas,
        'Tasa Éxito': `${d.tasa}%`
      }));
      const wsDept = XLSX.utils.json_to_sheet(deptData);
      XLSX.utils.book_append_sheet(wb, wsDept, 'Rendimiento por Departamento');

      XLSX.writeFile(wb, `dashboard_admin_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exportando a Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con exportación - Responsive */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 md:gap-3">
            <Layout size={20} className="text-slate-600 dark:text-slate-400 md:w-6 md:h-6" />
            Panel de Control Administrativo
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Visión completa del sistema</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          {/* Filtro de fechas */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2 w-full sm:w-auto">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-none bg-transparent focus:ring-0 text-sm w-32"
              placeholder="Inicio"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-none bg-transparent focus:ring-0 text-sm w-32"
              placeholder="Fin"
            />
          </div>

          {/* Botón de exportación */}
          <button
            onClick={exportToExcel}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm w-full sm:w-auto"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-sm font-medium">Exportando...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span className="text-sm font-medium">Exportar Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Tareas"
          value={analytics.total}
          icon={FileText}
          subtext={`${analytics.completadas} completadas`}
        />
        <StatCard
          title="Eficiencia"
          value={`${analytics.eficiencia}%`}
          icon={TrendingUp}
          subtext="Tareas completadas"
        />
        <StatCard
          title="Puntualidad"
          value={`${analytics.tasaPuntualidad}%`}
          icon={Clock}
          subtext="Completadas a tiempo"
        />
        <StatCard
          title="Tareas Vencidas"
          value={analytics.vencidas}
          icon={AlertTriangle}
          subtext="Requieren atención"
        />
      </div>

      {/* KPIs Secundarios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard
          title="Usuarios Activos"
          value={data.usuarios.length}
          icon={Users}
          subtext="En el sistema"
        />
        <StatCard
          title="Bonos Totales"
          value={formatCurrency(analytics.totalBonos)}
          icon={DollarSign}
          subtext="Este período"
        />
        <StatCard
          title="Promedio Rendimiento"
          value={`${analytics.promedioRendimiento.toFixed(1)}%`}
          icon={BarChart3}
          subtext="Todos los usuarios"
        />
      </div>

      {/* Gráficos Principales */}

      {/* Tendencia Semanal */}
      <div className="lg:col-span-2">
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <Activity size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Actividad Semanal</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tendencias duales de creación y finalización</p>
            </div>
          </div>
          <PerformanceChart
            data={analytics.tendenciaSemanal}
            title=""
            type="line"
            height={280}
            colors={['#1E40AF', '#166534']}
            enable3D
            animationDuration={2000}
            dataKeys={['creadas', 'completadas']}
            showLegend
            tooltipFormatter={(value, name) => {
              return [value.toString(), name === 'creadas' ? 'Tareas Creadas' : 'Tareas Completadas'];
            }}
            subtitle=""
          />
        </Card>
      </div>

      {/* Distribución por Estado */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-6">
          <PieChartIcon size={18} className="text-slate-600 dark:text-slate-400" />
          <div>
            <h5 className="text-lg font-bold text-slate-900 dark:text-white">Distribución por Estado</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400">Análisis detallado por estado</p>
          </div>
        </div>
        <PerformanceChart
          data={analytics.distribucionEstados}
          title=""
          type="pie"
          height={280}
          colors={analytics.distribucionEstados.map(d => d.color)}
          enable3D
          animationDuration={1800}
          showLegend
          subtitle=""
          tooltipFormatter={(value, name) => [`${value} tareas`, name]}
        />
      </Card>


      {/* Rendimiento por Departamento */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Briefcase size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Rendimiento por Departamento</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Análisis comparativo apilado</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded">
              <span className="w-3 h-3 rounded bg-slate-400" /> Total
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded">
              <span className="w-3 h-3 rounded bg-slate-600" /> Completadas
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded">
              <span className="w-3 h-3 rounded bg-slate-800" /> Vencidas
            </span>
          </div>
        </div>
        <PerformanceChart
          data={analytics.rendimientoDepartamentos}
          title=""
          type="bar"
          height={300}
          colors={['#64748B', '#166534', '#991B1B']}
          enable3D
          animationDuration={1900}
          dataKeys={['total', 'completadas', 'vencidas']}
          xAxisKey="name"
          showLegend={false}
          stacked
          tooltipFormatter={(value, name) => {
            const labels = {
              'total': 'Total Tareas',
              'completadas': 'Completadas',
              'vencidas': 'Vencidas'
            };
            return [value.toString(), labels[name as keyof typeof labels]];
          }}
          subtitle=""
        />
      </Card>

      {/* Usuarios Más Activos */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Award size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Top 10 Usuarios Más Activos</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Colaboradores destacados del período</p>
            </div>
          </div>
          <Badge color="gray">{analytics.usuariosActivos.length} usuarios</Badge>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[640px] sm:min-w-full">
            <Table hoverable className="min-w-full">
              <TableHead>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Rank</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Usuario</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50 hidden md:table-cell">Departamento</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50 hidden lg:table-cell">Rol</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Asignadas</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Completadas</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Score</TableHeadCell>
              </TableHead>
              <TableBody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {analytics.usuariosActivos.map((user, idx) => (
                  <TableRow key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <TableCell className="font-bold whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${idx === 0 ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                        idx === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                          idx === 2 ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                            'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                        {idx + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs font-bold">
                          {user.nombre.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{user.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-600 dark:text-slate-400">{user.departamento}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge color="gray" className="font-medium">
                        {user.rol}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{user.asignadas}</TableCell>
                    <TableCell>
                      <Badge color="gray" className="font-semibold">{user.completadas}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                        {user.score}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Distribución por Prioridad */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-6">
          <Target size={18} className="text-slate-600 dark:text-slate-400" />
          <div>
            <h5 className="text-lg font-bold text-slate-900 dark:text-white">Tareas por Prioridad</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400">Análisis por nivel de urgencia</p>
          </div>
        </div>
        <PerformanceChart
          data={analytics.distribucionPrioridades}
          title=""
          type="bar"
          height={200}
          colors={analytics.distribucionPrioridades.map(p => p.color)}
          enable3D
          animationDuration={1700}
          showDataLabels
          xAxisKey="name"
          yAxisKey="value"
          subtitle=""
          tooltipFormatter={(value, name) => [`${value} tareas`, name]}
        />
      </Card>

      {/* Métricas de Colaboración */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h6 className="font-bold text-slate-900 dark:text-white">Comentarios</h6>
              <p className="text-xs text-slate-500">Total en el sistema</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {analytics.totalComentarios}
              </p>
              <p className="text-xs text-slate-500 mt-1">{analytics.comentariosPorTarea} comentarios por tarea en promedio</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <MessageSquare size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h6 className="font-bold text-slate-900 dark:text-white">Archivos Adjuntos</h6>
              <p className="text-xs text-slate-500">Total subidos</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {analytics.totalAdjuntos}
              </p>
              <p className="text-xs text-slate-500 mt-1">Adjuntos en tareas</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <Paperclip size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h6 className="font-bold text-slate-900 dark:text-white">Bonos de Rendimiento</h6>
              <p className="text-xs text-slate-500">Total distribuido</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {formatCurrency(analytics.totalBonos)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Este período</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <DollarSign size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============= VISTA MANAGER MEJORADA =============
const ManagerView = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    tareas: [] as Tarea[],
    usuarios: [] as Usuario[],
    estados: [] as Catalogo[],
    comentarios: [] as Comentario[],
    rendimientos: [] as RendimientoMensual[]
  });
  const [timeRange, setTimeRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (profile?.departamento_id) {
      fetchData();
    }
  }, [profile?.departamento_id, timeRange, startDate, endDate]);

  const fetchData = async () => {
    if (!profile?.departamento_id) return;

    setLoading(true);
    try {
      const dateRange = getDateRange(timeRange, startDate, endDate);
      const start = dateRange.start;
      const end = dateRange.end;

      // 1. PRIMERO: Obtener usuarios para poder usar sus IDs en la siguiente consulta
      const { data: usuariosData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('departamento_id', profile.departamento_id)
        .eq('activo', true);

      if (userError) throw userError;

      // Preparamos los IDs para el filtro
      const userIds = usuariosData?.map(u => u.id) || [];

      // 2. SEGUNDO: Obtener el resto de datos en paralelo usando los IDs obtenidos
      const [
        { data: tareas },
        { data: estados },
        { data: comentarios },
        { data: rendimientos }
      ] = await Promise.all([
        supabase
          .from('tareas')
          .select(`
            *,
            asignado:asignado_a(id, nombre_completo, avatar_url, email),
            prioridad:prioridad_id(nombre, color, nivel),
            estado:estado_id(nombre, color),
            creador:creador_id(nombre_completo, avatar_url)
          `)
          .eq('departamento_id', profile.departamento_id)
          .gte('created_at', start).lte('created_at', end),

        supabase.from('estados_tarea').select('*'),
        supabase.from('comentarios').select('*').gte('created_at', start).lte('created_at', end),

        supabase
          .from('rendimiento_mensual')
          .select('*, usuario:usuario_id(nombre_completo)')
          .in('usuario_id', userIds)
          .order('anio', { ascending: false })
          .order('mes', { ascending: false })
          .limit(6)
      ]);

      setData({
        tareas: tareas || [],
        usuarios: usuariosData || [],
        estados: estados || [],
        comentarios: comentarios || [],
        rendimientos: rendimientos || []
      });
    } catch (error) {
      console.error('Error cargando datos Manager:', error);
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    const pendientes = data.tareas.filter(t =>
      t.estado?.nombre !== 'Completada' && t.estado?.nombre !== 'Rechazada'
    ).length;

    const completadas = data.tareas.filter(t => t.estado?.nombre === 'Completada').length;
    const bloqueadas = data.tareas.filter(t => t.estado?.nombre === 'Bloqueada').length;
    const altaPrioridad = data.tareas.filter(t =>
      t.prioridad?.nombre === 'Urgente' || t.prioridad?.nombre === 'Alta'
    ).length;

    // Performance por miembro
    const performanceMiembros = data.usuarios.map(user => {
      const tareasUsuario = data.tareas.filter(t => t.asignado_a === user.id);
      const completadasUsuario = tareasUsuario.filter(t => t.estado?.nombre === 'Completada').length;
      const aTiempoUsuario = tareasUsuario.filter(t => t.completada_a_tiempo === true).length;

      const rendimientoUser = data.rendimientos.find(r => r.usuario_id === user.id);

      return {
        id: user.id,
        nombre: user.nombre_completo,
        avatar: user.avatar_url,
        asignadas: tareasUsuario.length,
        completadas: completadasUsuario,
        pendientes: tareasUsuario.filter(t =>
          t.estado?.nombre === 'Pendiente' || t.estado?.nombre === 'En Progreso'
        ).length,
        tasa: tareasUsuario.length > 0 ? Math.round((completadasUsuario / tareasUsuario.length) * 100) : 0,
        puntualidad: completadasUsuario > 0 ? Math.round((aTiempoUsuario / completadasUsuario) * 100) : 0,
        rendimiento: rendimientoUser?.porcentaje_rendimiento || 0,
        bono: rendimientoUser?.bono_rendimiento || 0
      };
    }).sort((a, b) => b.tasa - a.tasa);

    // Tendencia últimos 30 días
    const tendencia30Dias = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        name: date.getDate(),
        completadas: data.tareas.filter(t => {
          if (!t.fecha_completado) return false;
          const completado = new Date(t.fecha_completado);
          return completado.toDateString() === date.toDateString();
        }).length
      };
    });

    // Distribución de estados
    const distribucionEstados = data.estados.map(estado => ({
      name: estado.nombre,
      value: data.tareas.filter(t => t.estado_id === estado.id).length,
      color: estado.color
    })).filter(d => d.value > 0);

    return {
      pendientes,
      completadas,
      bloqueadas,
      altaPrioridad,
      performanceMiembros,
      tendencia30Dias,
      distribucionEstados
    };
  }, [data]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 md:gap-3">
            <Briefcase size={20} className="text-slate-600 dark:text-slate-400 md:w-6 md:h-6" />
            Panel de Control del Manager
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestión de tu departamento</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2 w-full lg:w-auto">
          <Calendar size={16} className="text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm w-32"
            placeholder="Inicio"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm w-32"
            placeholder="Fin"
          />
        </div>
      </div>

      {/* KPIs Manager */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Mi Equipo"
          value={data.usuarios.length}
          icon={Users}
          subtext="Colaboradores activos"
        />
        <StatCard
          title="En Progreso"
          value={analytics.pendientes}
          icon={BarChart2}
          subtext="Tareas activas"
        />
        <StatCard
          title="Bloqueadas"
          value={analytics.bloqueadas}
          icon={PauseCircle}
          subtext="Requieren atención"
        />
        <StatCard
          title="Alta Prioridad"
          value={analytics.altaPrioridad}
          icon={Zap}
          subtext="Urgentes y altas"
        />
      </div>

      {/* Gráficos Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Tendencia 30 días */}
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Completadas - Últimos 30 Días</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Evolución diaria con progreso</p>
            </div>
          </div>
          <PerformanceChart
            data={analytics.tendencia30Dias}
            title=""
            type="area"
            height={280}
            color="#3730A3"
            gradient
            enable3D
            animationDuration={2000}
            subtitle=""
            tooltipFormatter={(value) => [`${value} tareas`, 'Completadas']}
            showDataLabels
          />
        </Card>

        {/* Distribución de Estados */}
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <PieChartIcon size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Estado de las Tareas</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribución actual con detalles</p>
            </div>
          </div>
          <PerformanceChart
            data={analytics.distribucionEstados}
            title=""
            type="pie"
            height={280}
            colors={analytics.distribucionEstados.map(d => d.color)}
            enable3D
            animationDuration={1800}
            showLegend
            subtitle=""
            tooltipFormatter={(value, name) => [`${value} tareas`, name]}
          />
        </Card>
      </div>

      {/* Performance del Equipo */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Award size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Performance del Equipo</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Rendimiento individual</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[700px] sm:min-w-full">
            <Table hoverable className="min-w-full">
              <TableHead>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Miembro</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Asignadas</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Completadas</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Pendientes</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50">Tasa Éxito</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50 hidden md:table-cell">Rendimiento</TableHeadCell>
                <TableHeadCell className="bg-slate-50 dark:bg-slate-700/50 hidden lg:table-cell">Bono</TableHeadCell>
              </TableHead>
              <TableBody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {analytics.performanceMiembros.map(member => (
                  <TableRow key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.nombre} className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm">
                            {member.nombre.charAt(0)}
                          </div>
                        )}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{member.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 font-medium">{member.asignadas}</TableCell>
                    <TableCell>
                      <Badge color="gray" className="font-semibold">{member.completadas}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color="gray" className="font-semibold">{member.pendientes}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          progress={member.tasa}
                          size="sm"
                          color="gray"
                          className="w-20 md:w-24"
                        />
                        <span className="text-xs font-bold whitespace-nowrap">{member.tasa}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`font-bold px-2 py-1 rounded-lg text-sm ${member.rendimiento >= 80 ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                        member.rendimiento >= 60 ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                        {member.rendimiento.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-sm">
                        {formatCurrency(member.bono)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Gráfico de Rendimiento vs Tasa de Éxito */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-6">
          <Target size={18} className="text-slate-600 dark:text-slate-400" />
          <div>
            <h5 className="text-lg font-bold text-slate-900 dark:text-white">Rendimiento vs Tasa de Éxito</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400">Análisis multidimensional del equipo</p>
          </div>
        </div>
        <PerformanceChart
          data={analytics.performanceMiembros.map(m => ({
            name: m.nombre,
            tasa: m.tasa,
            rendimiento: m.rendimiento,
            asignadas: m.asignadas
          }))}
          title=""
          type="scatter"
          height={300}
          color="#3730A3"
          enable3D
          animationDuration={2200}
          xAxisKey="tasa"
          yAxisKey="rendimiento"
          secondaryDataKey="asignadas"
          tooltipFormatter={(value: any, name: string) => {
            if (name === 'tasa') return [`${value}%`, 'Tasa de Éxito'];
            if (name === 'rendimiento') return [`${value}%`, 'Rendimiento'];
            if (name === 'asignadas') return [`${value}`, 'Tareas Asignadas'];
            return [`${value}`, String(name)];
          }}
          subtitle=""
        />
      </Card>
    </div>
  );
};

// ============= VISTA USUARIO MEJORADA =============
const UserView = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    tareas: [] as Tarea[],
    comentarios: [] as Comentario[],
    rendimientos: [] as RendimientoMensual[]
  });
  const [timeRange, setTimeRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id, timeRange, startDate, endDate]);

  const fetchData = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const dateRange = getDateRange(timeRange, startDate, endDate);
      const start = dateRange.start;
      const end = dateRange.end;

      const [
        { data: tareas },
        { data: comentarios },
        { data: rendimientos }
      ] = await Promise.all([
        supabase
          .from('tareas')
          .select(`
            *,
            prioridad:prioridad_id(nombre, color, nivel),
            estado:estado_id(nombre, color),
            departamento:departamento_id(nombre)
          `)
          .or(`asignado_a.eq.${profile.id},creador_id.eq.${profile.id}`)
          .gte('created_at', start).lte('created_at', end),

        supabase
          .from('comentarios')
          .select('*')
          .eq('usuario_id', profile.id)
          .gte('created_at', start).lte('created_at', end),

        supabase
          .from('rendimiento_mensual')
          .select('*')
          .eq('usuario_id', profile.id)
          .order('anio', { ascending: false })
          .order('mes', { ascending: false })
          .limit(6)
      ]);

      setData({
        tareas: tareas || [],
        comentarios: comentarios || [],
        rendimientos: rendimientos || []
      });
    } catch (error) {
      console.error('Error cargando datos Usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    const pendientes = data.tareas.filter(t =>
      t.estado?.nombre === 'Pendiente' || t.estado?.nombre === 'En Progreso'
    );

    const completadas = data.tareas.filter(t => t.estado?.nombre === 'Completada').length;
    const aTiempo = data.tareas.filter(t => t.completada_a_tiempo === true).length;
    const total = data.tareas.length;
    const tasaExito = total > 0 ? Math.round((completadas / total) * 100) : 0;
    const tasaPuntualidad = completadas > 0 ? Math.round((aTiempo / completadas) * 100) : 0;

    // Próximos vencimientos
    const proximosVencimientos = data.tareas
      .filter(t => t.estado?.nombre !== 'Completada' && t.estado?.nombre !== 'Rechazada')
      .sort((a, b) => new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime())
      .slice(0, 5);

    // Progreso semanal
    const progresoSemanal = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        name: date.toLocaleDateString('es-EC', { weekday: 'short' }),
        completadas: data.tareas.filter(t => {
          if (!t.fecha_completado) return false;
          const completado = new Date(t.fecha_completado);
          return completado.toDateString() === date.toDateString();
        }).length
      };
    });

    // Distribución por prioridad
    const distribucionPrioridad = [
      { name: 'Urgente', value: data.tareas.filter(t => t.prioridad?.nombre === 'Urgente').length, color: '#DC2626' },
      { name: 'Alta', value: data.tareas.filter(t => t.prioridad?.nombre === 'Alta').length, color: '#F59E0B' },
      { name: 'Media', value: data.tareas.filter(t => t.prioridad?.nombre === 'Media').length, color: '#3B82F6' },
      { name: 'Baja', value: data.tareas.filter(t => t.prioridad?.nombre === 'Baja').length, color: '#10B981' }
    ];

    // Rendimiento mensual
    const rendimientoMensual = data.rendimientos.map(r => ({
      name: `${r.mes}/${r.anio}`,
      rendimiento: r.porcentaje_rendimiento,
      bono: r.bono_rendimiento || 0
    }));

    // Último rendimiento
    const ultimoRendimiento = data.rendimientos[0];

    return {
      pendientes,
      completadas,
      aTiempo,
      total,
      tasaExito,
      tasaPuntualidad,
      proximosVencimientos,
      progresoSemanal,
      distribucionPrioridad,
      rendimientoMensual,
      ultimoRendimiento,
      totalComentarios: data.comentarios.length
    };
  }, [data]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 md:gap-3">
            <Activity size={20} className="text-slate-600 dark:text-slate-400 md:w-6 md:h-6" />
            Mi Panel de Control
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Bienvenido, <span className="font-semibold text-slate-700 dark:text-slate-300">{profile?.nombre_completo}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2 w-full lg:w-auto">
          <Calendar size={16} className="text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm w-32"
            placeholder="Inicio"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm w-32"
            placeholder="Fin"
          />
        </div>
      </div>

      {/* KPIs Usuario - Diseño profesional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Mi Rendimiento"
          value={analytics.ultimoRendimiento ? `${analytics.ultimoRendimiento.porcentaje_rendimiento.toFixed(1)}%` : 'N/A'}
          icon={Award}
          subtext={analytics.ultimoRendimiento ? `Bono: ${formatCurrency(analytics.ultimoRendimiento.bono_rendimiento || 0)}` : 'Sin datos aún'}
        />

        <StatCard
          title="Tareas Activas"
          value={analytics.pendientes.length}
          icon={FileText}
          subtext="En tu lista"
        />

        <StatCard
          title="Completadas"
          value={analytics.completadas}
          icon={CheckCircle}
          subtext="Total logradas"
        />

        <StatCard
          title="Puntualidad"
          value={`${analytics.tasaPuntualidad}%`}
          icon={Clock}
          subtext="A tiempo"
        />
      </div>

      {/* Estadísticas Adicionales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Tareas</p>
              <h4 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{analytics.total}</h4>
              <p className="text-xs text-slate-500 mt-1">Asignadas y creadas</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <FileText size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Mis Comentarios</p>
              <h4 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{analytics.totalComentarios}</h4>
              <p className="text-xs text-slate-500 mt-1">Realizados</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <MessageSquare size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">A Tiempo</p>
              <h4 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{analytics.aTiempo}</h4>
              <p className="text-xs text-slate-500 mt-1">Tareas completadas a tiempo</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <CheckSquare size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos Usuario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Progreso Semanal */}
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Mi Progreso Semanal</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tareas completadas por día con métricas</p>
            </div>
          </div>
          <PerformanceChart
            data={analytics.progresoSemanal}
            title=""
            type="bar"
            height={280}
            color="#065F46"
            radius={[8, 8, 0, 0]}
            enable3D
            animationDuration={1900}
            showDataLabels
            subtitle=""
            tooltipFormatter={(value) => [`${value} tareas`, 'Completadas']}
          />
        </Card>

        {/* Distribución por Prioridad */}
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <Target size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Tareas por Prioridad</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribución con análisis detallado</p>
            </div>
          </div>
          <PerformanceChart
            data={analytics.distribucionPrioridad}
            title=""
            type="pie"
            height={280}
            colors={analytics.distribucionPrioridad.map(p => p.color)}
            enable3D
            animationDuration={1700}
            showLegend
            subtitle=""
            tooltipFormatter={(value, name) => [`${value} tareas`, name]}
          />
        </Card>
      </div>

      {/* Próximos Vencimientos */}
      <Card className="shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Clock size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Próximos Vencimientos</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tareas pendientes próximas</p>
            </div>
          </div>
          <Badge color="info">{analytics.proximosVencimientos.length} pendientes</Badge>
        </div>

        <div className="space-y-3">
          {analytics.proximosVencimientos.length > 0 ? (
            analytics.proximosVencimientos.map(tarea => {
              const diasRestantes = Math.ceil((new Date(tarea.fecha_fin).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const esUrgente = diasRestantes <= 2;

              return (
                <div
                  key={tarea.id}
                  className={`
                    p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-md
                    ${esUrgente
                      ? 'border-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-slate-800'
                      : 'border-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800'
                    }
                  `}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <h6 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">{tarea.titulo}</h6>
                    <Badge
                      color={tarea.prioridad?.nombre === 'Urgente' ? 'failure' : tarea.prioridad?.nombre === 'Alta' ? 'warning' : 'info'}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {tarea.prioridad?.nombre}
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
                    <span className="text-slate-600 dark:text-slate-400">
                      Vence: <span className="font-medium">{formatDate(tarea.fecha_fin)}</span>
                    </span>
                    <span className={`font-bold px-3 py-1 rounded-full text-xs ${diasRestantes <= 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : diasRestantes <= 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                      {diasRestantes > 0 ? `${diasRestantes} días` : diasRestantes === 0 ? 'Hoy' : `Vencida`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge color="gray" size="sm">{tarea.estado?.nombre}</Badge>
                    {tarea.departamento && (
                      <Badge color="info" size="sm">{tarea.departamento.nombre}</Badge>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle size={32} className="text-green-500 dark:text-green-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">¡Excelente!</p>
              <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">No tienes tareas pendientes próximas.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Evolución del Rendimiento */}
      {analytics.rendimientoMensual.length > 0 && (
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <BarChart2 size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Evolución de Mi Rendimiento</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Análisis compuesto de rendimiento y bonos</p>
            </div>
          </div>
          <PerformanceChart
            data={analytics.rendimientoMensual}
            title=""
            type="composed"
            height={300}
            colors={['#3730A3', '#065F46']}
            enable3D
            animationDuration={2100}
            dataKeys={['rendimiento', 'bono']}
            showLegend
            tooltipFormatter={(value, name) => {
              if (name === 'rendimiento') return [`${value}%`, 'Rendimiento'];
              if (name === 'bono') return [formatCurrency(value), 'Bono'];
              return [value, name];
            }}
            tickFormatter={(value) => {
              if (typeof value === 'number' && value > 1000) return `${(value / 1000).toFixed(0)}k`;
              return value;
            }}
            subtitle=""
          />
        </Card>
      )}
    </div>
  );
};

// ============= COMPONENTE PRINCIPAL MEJORADO =============
export default function Dashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
            <Spinner size="xl" className="text-slate-600 dark:text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (profile.rol_nombre) {
      case 'Admin':
        return <AdminView />;
      case 'Manager':
        return <ManagerView />;
      case 'Usuario':
        return <UserView />;
      default:
        return <UserView />;
    }
  };

  // Configuración de colores según el rol
  const getRoleConfig = () => {
    switch (profile.rol_nombre) {
      case 'Admin':
        return {
          icon: Layout,
          gradient: 'from-blue-600 to-indigo-700',
          bgGradient: 'bg-gradient-to-r from-blue-600 to-indigo-700',
          badgeColor: 'blue',
          accentColor: 'blue'
        };
      case 'Manager':
        return {
          icon: Briefcase,
          gradient: 'from-purple-600 to-violet-700',
          bgGradient: 'bg-gradient-to-r from-purple-600 to-violet-700',
          badgeColor: 'purple',
          accentColor: 'purple'
        };
      default:
        return {
          icon: Activity,
          gradient: 'from-emerald-600 to-teal-700',
          bgGradient: 'bg-gradient-to-r from-emerald-600 to-teal-700',
          badgeColor: 'green',
          accentColor: 'emerald'
        };
    }
  };

  const roleConfig = getRoleConfig();
  const RoleIcon = roleConfig.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="animate-fade-in">
          {renderView()}
        </div>
      </div>
    </div>
  );
}