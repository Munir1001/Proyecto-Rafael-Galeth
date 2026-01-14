import { useState, useEffect, useMemo } from 'react';
import { Card, Spinner, Badge} from 'flowbite-react';
import {
  Users, Briefcase, AlertTriangle, TrendingUp, CheckCircle,
  Clock, FileText, Calendar, BarChart2, Target, Award,
  Layout, Activity, Zap, ArrowUp, ArrowDown,
  MessageSquare, Paperclip,
  CheckSquare, PauseCircle,
  BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import PerformanceChart from '../components/charts/PerformanceChart';
import { ThemeProvider } from "next-themes";


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
  salario_base?: number;
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

// ============= COMPONENTE DE CARGA =============
const LoadingState = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 rounded-full border-4 border-slate-300 dark:border-slate-600 border-t-transparent animate-spin"></div>
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Cargando Dashboard</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Preparando tus métricas y análisis...</p>
      </div>
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

  // DENTRO DE AdminView

  useEffect(() => {
    //1. Carga inicial
    fetchData();

    // 2. Suscripción a cambios en tiempo real (Realtime)
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tareas' },
        (payload) => {
          console.log('Cambio detectado en tareas:', payload);
          // Forzar recarga inmediata sin mostrar loading
          fetchData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios' },
        (payload) => {
          console.log('Cambio detectado en usuarios:', payload);
          fetchData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rendimiento_mensual' },
        (payload) => {
          console.log('Cambio detectado en rendimiento_mensual:', payload);
          fetchData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comentarios' },
        (payload) => {
          console.log('Cambio detectado en comentarios:', payload);
          fetchData(false);
        }
      )
      .subscribe();

    // 3. Limpieza al salir
    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange, startDate, endDate, profile]); // Mantenemos las dependencias de fecha y perfil

  const fetchData = async (showLoading = true) => {
    console.log('fetchData llamado con:', { timeRange, startDate, endDate, showLoading });

    if (showLoading) setLoading(true);
    try {
      const dateRange = getDateRange(timeRange, startDate, endDate);
      const start = dateRange.start;
      const end = dateRange.end;

      console.log('Rango de fechas calculado:', { start, end });

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
        // Filtrar tareas por rango de fechas de creación
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
          .gte('created_at', start)
          .lte('created_at', end),

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
        // Filtrar rendimiento mensual por rango de fechas
        (() => {
          let query = supabase
            .from('rendimiento_mensual')
            .select('*, usuario:usuario_id(nombre_completo)');

          // Siempre filtrar por el rango de fechas (usar las fechas específicas o el rango por defecto)
          const startDateObj = new Date(start);
          const endDateObj = new Date(end);
          const startYear = startDateObj.getFullYear();
          const startMonth = startDateObj.getMonth() + 1;
          const endYear = endDateObj.getFullYear();
          const endMonth = endDateObj.getMonth() + 1;

          console.log('Filtrando rendimiento mensual desde:', startYear, startMonth, 'hasta:', endYear, endMonth);

          // Construir filtro para rango de años y meses
          const filters = [];
          for (let year = startYear; year <= endYear; year++) {
            const monthStart = (year === startYear) ? startMonth : 1;
            const monthEnd = (year === endYear) ? endMonth : 12;

            if (year === startYear && year === endYear) {
              filters.push(`anio.eq.${year},mes.gte.${monthStart},mes.lte.${monthEnd}`);
            } else if (year === startYear) {
              filters.push(`anio.eq.${year},mes.gte.${monthStart}`);
            } else if (year === endYear) {
              filters.push(`anio.eq.${year},mes.lte.${monthEnd}`);
            } else {
              filters.push(`anio.eq.${year}`);
            }
          }

          if (filters.length > 0) {
            query = query.or(filters.join(','));
          }

          return query.order('anio', { ascending: false }).order('mes', { ascending: false }).limit(12);
        })()
      ]);

      console.log('Datos cargados:', {
        tareas: tareas?.length || 0,
        comentarios: comentarios?.length || 0,
        adjuntos: adjuntos?.length || 0,
        rendimientos: rendimientos?.length || 0,
        dateRange: { start, end }
      });

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
      if (showLoading) setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    console.log('Recalculando analytics con:', {
      tareas: data.tareas.length,
      rendimientos: data.rendimientos.length,
      startDate,
      endDate
    });

    const total = data.tareas.length;

    // 1. Obtenemos la lista de tareas completadas (para usarla en los cálculos)
    const tareasCompletadasList = data.tareas.filter(t =>
      t.estado?.nombre === 'Completada' && t.fecha_completado
    );

    const completadas = tareasCompletadasList.length;

    const vencidas = data.tareas.filter(t =>
      new Date(t.fecha_fin) < new Date() && t.estado?.nombre !== 'Completada'
    ).length;

    // 2. Calcular completadas a tiempo (Lógica Solicitada)
    const completadasATiempo = tareasCompletadasList.filter(t => {
      // Prioridad 1: Si la base de datos ya tiene el flag, úsalo
      if (t.completada_a_tiempo === true) return true;
      if (t.completada_a_tiempo === false) return false;

      // Prioridad 2: Calcular manualmente
      // Convertimos a timestamps para comparar con precisión
      const fechaFin = new Date(t.fecha_fin).getTime();
      const fechaCompletado = new Date(t.fecha_completado!).getTime();

      // Si se completó ANTES o EXACTAMENTE en el momento de vencer, cuenta como a tiempo.
      return fechaCompletado <= fechaFin;
    }).length;

    const eficiencia = total > 0 ? Math.round((completadas / total) * 100) : 0;

    // 3. Tasa de Puntualidad (La lógica del 100% que baja si hay tardías)
    // Explicación: Si tengo 10 completadas y 10 fueron a tiempo = 100%
    // Si tengo 10 completadas y 1 fue tarde = 90%
    const tasaPuntualidad = completadas > 0
      ? Math.round((completadasATiempo / completadas) * 100)
      : 0; // Si no ha completado nada, se queda en 0 (o puedes poner 100 si prefieres ser optimista)
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
        name: date.toLocaleDateString('es-EC', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()),
        creadas: tareasDia.length,
        completadas: tareasDia.filter(t => t.estado?.nombre === 'Completada').length
      };
    });

    // Usuarios más activos y SCORE DE RENDIMIENTO - MEJORADO Y CORREGIDO
    const usuariosActivos = data.usuarios.map(user => {
      // Filtrar tareas donde el usuario está asignado (incluyendo auto-asignadas para mostrar actividad completa)
      const tareasAsignadas = data.tareas.filter(t => t.asignado_a === user.id);
      const tareasCreadas = data.tareas.filter(t => t.creador_id === user.id);
      const comentariosUser = data.comentarios.filter(c => c.usuario_id === user.id);

      // Tareas completadas por el usuario (todas las que completó, sin importar quién las asignó)
      const tareasCompletadas = tareasAsignadas.filter(t =>
        t.estado?.nombre === 'Completada' && t.fecha_completado
      );

      // CÁLCULO DEL SCORE MEJORADO
      let puntajeTotal = 0;
      let puntajeMaximo = 0;

      tareasCompletadas.forEach(tarea => {
        // Usar completada_a_tiempo si está disponible, si no calcularlo
        let esATiempo = tarea.completada_a_tiempo;

        if (esATiempo === null || esATiempo === undefined) {
          // Calcular manualmente si no está establecido
          const fechaFin = new Date(tarea.fecha_fin);
          const fechaCompletado = new Date(tarea.fecha_completado!);
          esATiempo = fechaCompletado <= fechaFin;
        }

        const PUNTOS_BASE = 10;
        puntajeMaximo += PUNTOS_BASE;

        if (esATiempo) {
          // Bonus adicional si se completó antes del plazo
          const fechaFin = new Date(tarea.fecha_fin);
          const fechaCompletado = new Date(tarea.fecha_completado!);
          const diasAdelanto = Math.floor((fechaFin.getTime() - fechaCompletado.getTime()) / (1000 * 3600 * 24));

          if (diasAdelanto > 0) {
            // Terminó antes: puntos base + bonus por cada día de adelanto
            puntajeTotal += PUNTOS_BASE + (diasAdelanto * 2);
          } else {
            // Terminó justo a tiempo: solo puntos base
            puntajeTotal += PUNTOS_BASE;
          }
        } else {
          // Terminó tarde: mitad de puntos
          puntajeTotal += Math.floor(PUNTOS_BASE / 2);
        }
      });

      // Si no hay tareas completadas, dar un score base de 0
      if (tareasCompletadas.length === 0) {
        puntajeTotal = 0;
      }

      // Puntos adicionales por actividad (comentarios y creación de tareas)
      puntajeTotal += Math.min(comentariosUser.length * 2, 50); // Máximo 50 puntos por comentarios
      puntajeTotal += Math.min(tareasCreadas.length * 1, 30); // Máximo 30 puntos por tareas creadas

      return {
        id: user.id,
        nombre: user.nombre_completo || user.email || 'Usuario sin nombre',
        departamento: user.departamento?.nombre || 'Sin departamento',
        rol: user.roles?.nombre || 'Usuario',
        asignadas: tareasAsignadas.length,
        creadas: tareasCreadas.length,
        completadas: tareasCompletadas.length,
        comentarios: comentariosUser.length,
        score: puntajeTotal,
        eficiencia: tareasAsignadas.length > 0 ? Math.round((tareasCompletadas.length / tareasAsignadas.length) * 100) : 0
      };
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Métricas de colaboración
    const totalComentarios = data.comentarios.length;
    const totalAdjuntos = data.adjuntos.length;
    const comentariosPorTarea = total > 0 ? (totalComentarios / total).toFixed(1) : '0';

    const promedioRendimiento = data.rendimientos.length > 0
      ? data.rendimientos.reduce((sum, r) => sum + Number(r.porcentaje_rendimiento), 0) / data.rendimientos.length
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
      promedioRendimiento
    };
  }, [data, startDate, endDate]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con exportación */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4
                bg-white dark:bg-slate-800
                rounded-2xl p-4 md:p-6
                shadow-sm border border-slate-200 dark:border-slate-700">

        {/* TÍTULO */}
        <div className="flex items-center gap-3">
          <div className="p-3 sm:p-4 bg-linear-to-br from-indigo-400 to-blue-800
                    rounded-2xl shadow-lg shadow-indigo-500/30 shrink-0">
            <Layout className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold
                     bg-linear-to-r from-indigo-600 to-blue-800
                     bg-clip-text text-transparent">
              Panel de Control Administrativo
            </h2>
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <Layout size={14} />
              Visión completa del sistema
            </p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">

          <div className="flex items-center gap-2
                    bg-slate-50 dark:bg-slate-700
                    rounded-xl px-4 py-2
                    border border-slate-200 dark:border-slate-600
                    shadow-sm">
            <Calendar size={16} className="text-slate-400" />

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-none bg-transparent focus:ring-0 text-sm w-32 text-slate-600 dark:text-slate-200"
            />

            <span className="text-slate-400">—</span>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-none bg-transparent focus:ring-0 text-sm w-32 text-slate-600 dark:text-slate-200"
            />
          </div>

        </div>
      </div>


      {/* KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <StatCard
    title="Total Tareas"
    value={analytics.total}
    icon={FileText}
    subtext={
      analytics.total === 1
        ? "1 tarea en total"
        : `${analytics.total} tareas en total`
    }
  />

  <StatCard
    title="Eficiencia"
    value={`${analytics.eficiencia}%`}
    icon={TrendingUp}
    subtext={
      analytics.completadas === 1
        ? "1 tarea completada"
        : `${analytics.completadas} tareas completadas`
    }
  />

  <StatCard
    title="Puntualidad"
    value={`${analytics.tasaPuntualidad}%`}
    icon={Clock}
    subtext={
      analytics.completadasATiempo === 1
        ? "1 completada a tiempo"
        : `${analytics.completadasATiempo} completadas a tiempo`
    }
  />

  <StatCard
    title="Tareas Vencidas"
    value={analytics.vencidas}
    icon={AlertTriangle}
    subtext={
      analytics.vencidas === 1
        ? "1 tarea vencida – requiere atención"
        : `${analytics.vencidas} tareas vencidas – requieren atención`
    }
  />
</div>

      {/* KPIs Secundarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Usuarios Activos"
          value={data.usuarios.length}
          icon={Users}
          subtext="En el sistema"
        />
        <StatCard
          title="Promedio Rendimiento Mensual"
          value={`${analytics.promedioRendimiento.toFixed(1)}%`}
          icon={BarChart3}
          subtext="Todos los usuarios"
        />
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h6 className="font-bold text-slate-900 dark:text-white">Comentarios</h6>
              <p className="text-xs text-slate-500">Total en el sistema</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {analytics.totalComentarios}
              </p>
              <p className="text-xs text-slate-500 mt-1">{analytics.comentariosPorTarea} por tarea</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <MessageSquare size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </Card>
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h6 className="font-bold text-slate-900 dark:text-white">Adjuntos</h6>
              <p className="text-xs text-slate-500">Total subidos</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {analytics.totalAdjuntos}
              </p>
              <p className="text-xs text-slate-500 mt-1">Archivos en tareas</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <Paperclip size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos Principales */}
      {/* Tendencia Semanal */}
      <div className="lg:col-span-2">
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
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
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
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
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Briefcase size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Rendimiento por Departamento</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Análisis comparativo apilado</p>
            </div>
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

      {/* Distribución por Prioridad */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
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
          tooltipFormatter={(value, name) => [ `${value} tareas`, "Cantidad" ]}
        />
      </Card>
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

  // DENTRO DE ManagerView

  useEffect(() => {
    if (profile?.departamento_id) {
      fetchData();

      // Suscripción específica para el departamento
      const channel = supabase
        .channel('manager-dashboard-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tareas',
            filter: `departamento_id=eq.${profile.departamento_id}` // Filtra solo su depto
          },
          () => fetchData(false)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rendimiento_mensual' },
          () => fetchData(false)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.departamento_id, timeRange, startDate, endDate]);

  const fetchData = async (showLoading = true) => {
    if (!profile?.departamento_id) return;

    if (showLoading) setLoading(true);
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
        // Filtrar tareas por rango de fechas y departamento
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
          .gte('created_at', start)
          .lte('created_at', end),

        supabase.from('estados_tarea').select('*'),
        supabase.from('comentarios').select('*').gte('created_at', start).lte('created_at', end),

        // Filtrar rendimiento mensual por rango de fechas y usuarios del departamento
        (() => {
          let query = supabase
            .from('rendimiento_mensual')
            .select('*, usuario:usuario_id(nombre_completo)')
            .in('usuario_id', userIds);

          // Filtrar por año y mes del rango seleccionado
          const startDateObj = new Date(start);
          const endDateObj = new Date(end);
          const startYear = startDateObj.getFullYear();
          const startMonth = startDateObj.getMonth() + 1;
          const endYear = endDateObj.getFullYear();
          const endMonth = endDateObj.getMonth() + 1;

          // Construir filtro para rango de años y meses
          const filters = [];
          for (let year = startYear; year <= endYear; year++) {
            const monthStart = (year === startYear) ? startMonth : 1;
            const monthEnd = (year === endYear) ? endMonth : 12;

            if (year === startYear && year === endYear) {
              filters.push(`anio.eq.${year},mes.gte.${monthStart},mes.lte.${monthEnd}`);
            } else if (year === startYear) {
              filters.push(`anio.eq.${year},mes.gte.${monthStart}`);
            } else if (year === endYear) {
              filters.push(`anio.eq.${year},mes.lte.${monthEnd}`);
            } else {
              filters.push(`anio.eq.${year}`);
            }
          }

          if (filters.length > 0) {
            query = query.or(filters.join(','));
          }

          return query.order('anio', { ascending: false }).order('mes', { ascending: false }).limit(6);
        })()
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
      if (showLoading) setLoading(false);
    }
  };

  // DENTRO DE ManagerView

  const analytics = useMemo(() => {
    // Totales simples
    const pendientes = data.tareas.filter(t =>
      ['Pendiente', 'En Progreso'].includes(t.estado?.nombre || '')
    ).length;

    const completadas = data.tareas.filter(t => t.estado?.nombre === 'Completada').length;
    const bloqueadas = data.tareas.filter(t => t.estado?.nombre === 'Bloqueada').length;
    const altaPrioridad = data.tareas.filter(t =>
      ['Urgente', 'Alta'].includes(t.prioridad?.nombre || '')
    ).length;

    // --- MEJORA CRÍTICA DE PERFORMANCE MIEMBROS ---
    const performanceMiembros = data.usuarios.map(user => {
      // 1. Filtrar tareas de este usuario
      const tareasUsuario = data.tareas.filter(t => t.asignado_a === user.id);

      // 2. Calcular diferentes estados
      const tareasCompletadas = tareasUsuario.filter(t => t.estado?.nombre === 'Completada');
      const completadasCount = tareasCompletadas.length;

      const pendientesCount = tareasUsuario.filter(t =>
        ['Pendiente', 'En Progreso'].includes(t.estado?.nombre || '')
      ).length;

      const bloqueadasCount = tareasUsuario.filter(t => t.estado?.nombre === 'Bloqueada').length;

      // 3. Puntualidad mejorada
      const aTiempoCount = tareasCompletadas.filter(t => {
        if (!t.fecha_completado) return false;

        // Usar el campo si está disponible, si no calcularlo
        let esATiempo = t.completada_a_tiempo;

        if (esATiempo === null || esATiempo === undefined) {
          const fin = new Date(t.fecha_fin).getTime();
          const comp = new Date(t.fecha_completado).getTime();
          esATiempo = comp <= fin; // Sin tolerancia para ser más estrictos
        }

        return esATiempo === true;
      }).length;

      // 4. Rendimiento mejorado
      const rendimientoObj = data.rendimientos.find(r => String(r.usuario_id) === String(user.id));

      let rendimientoCalculado = rendimientoObj ? rendimientoObj.porcentaje_rendimiento : 0;

      if (!rendimientoObj && tareasUsuario.length > 0) {
        // Fórmula de rendimiento más completa
        const eficiencia = (completadasCount / tareasUsuario.length) * 100;
        const puntualidad = completadasCount > 0 ? (aTiempoCount / completadasCount) * 100 : 0;
        const penalizacionBloqueo = bloqueadasCount > 0 ? (bloqueadasCount / tareasUsuario.length) * 100 : 0;

        rendimientoCalculado = (eficiencia * 0.5) + (puntualidad * 0.4) - (penalizacionBloqueo * 0.1);
        rendimientoCalculado = Math.max(0, Math.min(100, rendimientoCalculado)); // Mantener entre 0-100
      }

      // 5. Tasa de éxito (eficiencia)
      const tasaExito = tareasUsuario.length > 0 ? Math.round((completadasCount / tareasUsuario.length) * 100) : 0;
      const tasaPuntualidad = completadasCount > 0 ? Math.round((aTiempoCount / completadasCount) * 100) : 0;

      return {
        id: user.id,
        nombre: user.nombre_completo || user.email || 'Usuario sin nombre',
        avatar: user.avatar_url,
        asignadas: tareasUsuario.length,
        completadas: completadasCount,
        pendientes: pendientesCount,
        bloqueadas: bloqueadasCount,
        tasa: tasaExito,
        puntualidad: tasaPuntualidad,
        rendimiento: Math.round(rendimientoCalculado),
        // Métricas adicionales para mejor análisis
        calidad: Math.round(tasaExito * 0.6 + tasaPuntualidad * 0.4)
      };
    })
      .sort((a, b) => b.rendimiento - a.rendimiento);

    // Distribución simple para gráficos
    const distribucionEstados = data.estados.map(estado => ({
      name: estado.nombre,
      value: data.tareas.filter(t => t.estado_id === estado.id).length,
      color: estado.color
    })).filter(d => d.value > 0);

    // Tendencia 30 días para Manager
    const tendencia30Dias = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));

      // Normalizamos al inicio y fin del día local
      date.setHours(0, 0, 0, 0);
      const startOfDay = new Date(date);

      const endOfDay = new Date(date);
      endOfDay.setDate(date.getDate() + 1);

      const completadasDia = data.tareas.filter(t => {
        // 1. Verificación robusta de estado y fecha
        if (t.estado?.nombre !== 'Completada' || !t.fecha_completado) return false;

        // 2. Parseo seguro de fecha
        const fechaCompletado = new Date(t.fecha_completado);

        // 3. Comparación
        return fechaCompletado >= startOfDay && fechaCompletado < endOfDay;
      }).length;

      return {
        name: date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }),
        // CORRECCIÓN CLAVE: Cambiamos 'completadas' por 'value'
        // La mayoría de los componentes de gráficos buscan 'value' por defecto si no se especifica dataKey
        value: completadasDia
      };
    });

    return {
      pendientes,
      completadas,
      bloqueadas,
      altaPrioridad,
      performanceMiembros, // Asegúrate de usar la variable completa que calculaste
      tendencia30Dias,
      distribucionEstados
    };
  }, [data, startDate, endDate]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4
                bg-white dark:bg-slate-800
                rounded-2xl p-4 md:p-6
                shadow-sm border border-slate-200 dark:border-slate-700">

        {/* TÍTULO */}
        <div className="flex items-center gap-3">
          <div className="p-3 sm:p-4 bg-linear-to-br from-indigo-400 to-blue-800
                    rounded-2xl shadow-lg shadow-indigo-500/30 shrink-0">
            <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold
                     bg-linear-to-r from-indigo-600 to-blue-800
                     bg-clip-text text-transparent">
              Panel de Control
            </h2>
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <Users size={14} />
              Gestión de tu departamento
            </p>
          </div>
        </div>

        {/* FILTRO FECHAS */}
        <div className="flex items-center gap-2
                  bg-slate-50 dark:bg-slate-700
                  rounded-xl px-4 py-2
                  border border-slate-200 dark:border-slate-600
                  shadow-sm w-full lg:w-auto">
          <Calendar size={16} className="text-slate-400" />

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm w-32 text-slate-600 dark:text-slate-200"
          />

          <span className="text-slate-400">—</span>

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm w-32 text-slate-600 dark:text-slate-200"
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


      {/* Tendencia 30 días */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp size={18} className="text-slate-600 dark:text-slate-400" />
          <div>
            <h5 className="text-lg font-bold text-slate-900 dark:text-white">Completadas - Últimos 30 Días</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400">Evolución diaria con progreso</p>
          </div>
        </div>
        {analytics.tendencia30Dias.length > 0 && (
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
        )}
      </Card>

      {/* Distribución de Estados */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
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

      {/* Gráfico de Rendimiento vs Tasa de Éxito */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <Target size={18} className="text-slate-600 dark:text-slate-400" />
          <div>
            <h5 className="text-lg font-bold text-slate-900 dark:text-white">Rendimiento vs Tasa de Éxito</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400">Análisis multidimensional del equipo</p>
          </div>
        </div>
        {analytics.performanceMiembros.length > 0 && (
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
        )}
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
  const [userData, setUserData] = useState<Usuario | null>(null);

  // DENTRO DE UserView

  useEffect(() => {
    if (profile?.id) {
      fetchData();

      const channel = supabase
        .channel('user-dashboard-changes')
        // Escuchar cambios en tareas donde soy asignado o creador es complejo con filtros simples de string,
        // así que escuchamos la tabla y filtramos en la llamada fetchData
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tareas' },
          () => fetchData(false)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rendimiento_mensual',
            filter: `usuario_id=eq.${profile.id}`
          },
          () => fetchData(false)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id, timeRange, startDate, endDate]);

  const fetchData = async (showLoading = true) => {
    if (!profile?.id) return;

    if (showLoading) setLoading(true);
    try {
      const dateRange = getDateRange(timeRange, startDate, endDate);
      const start = dateRange.start;
      const end = dateRange.end;

      const [
        { data: tareas },
        { data: comentarios },
        { data: rendimientos },
        { data: usuarioInfo }
      ] = await Promise.all([
        supabase
          .from('tareas')
          .select(`*, prioridad:prioridad_id(nombre, color, nivel), estado:estado_id(nombre, color), departamento:departamento_id(nombre), asignado:asignado_a(id, nombre_completo, avatar_url, email), creador:creador_id(nombre_completo, avatar_url)`)
          .eq('asignado_a', profile.id)
          .neq('creador_id', profile.id) // Excluir tareas auto-asignadas
          .gte('created_at', start) // Cambiar a created_at para obtener tareas creadas en el rango
          .lte('created_at', end),

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
          .limit(6),

        supabase.from('usuarios').select('*').eq('id', profile.id).single()
      ]);

      setData({
        tareas: tareas || [],
        comentarios: comentarios || [],
        rendimientos: rendimientos || []
      });

      if (usuarioInfo) setUserData(usuarioInfo);

    } catch (error) {
      console.error('Error cargando datos Usuario:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    // Definimos el universo de tareas para el sueldo - SOLO ASIGNADAS POR OTROS
    const tareasDelMes = data.tareas;

    const pendientes = tareasDelMes.filter(t =>
      t.estado?.nombre === 'Pendiente' || t.estado?.nombre === 'En Progreso'
    );

    const tareasCompletadas = tareasDelMes.filter(t => t.estado?.nombre === 'Completada');
    const completadas = tareasCompletadas.length;

    // Calcular tareas a tiempo de forma más robusta
    const aTiempo = tareasCompletadas.filter(t => {
      if (!t.fecha_completado) return false;

      // Usar el campo si está disponible, si no calcularlo
      if (t.completada_a_tiempo !== null && t.completada_a_tiempo !== undefined) {
        return t.completada_a_tiempo === true;
      }

      // Calcular manualmente
      const fechaCompletado = new Date(t.fecha_completado);
      const fechaFin = new Date(t.fecha_fin);
      return fechaCompletado <= fechaFin;
    }).length;

    const total = tareasDelMes.length;

    // Métricas generales
    const tasaExito = total > 0 ? Math.round((completadas / total) * 100) : 0;
    const tasaPuntualidad = completadas > 0 ? Math.round((aTiempo / completadas) * 100) : 0;

    // Progreso semanal - CORREGIDO para mostrar datos reales
    const progresoSemanal = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));

      // Normalizar inicio y fin del día
      date.setHours(0, 0, 0, 0);
      const startOfDay = new Date(date);

      const endOfDay = new Date(date);
      endOfDay.setDate(date.getDate() + 1);

      const completadasDia = tareasDelMes.filter(t => {
        if (t.estado?.nombre !== 'Completada' || !t.fecha_completado) return false;
        const completado = new Date(t.fecha_completado);
        return completado >= startOfDay && completado < endOfDay;
      }).length;

      return {
        name: date.toLocaleDateString('es-EC', { weekday: 'short' }),
        value: completadasDia // <--- CAMBIO AQUÍ: de 'completadas' a 'value'
      };
    });

    // CÁLCULO DEL SUELDO
    const salarioBase = userData?.salario_base || 0;
    // Si no hay tareas asignadas para este mes, asumimos cumplimiento del 100% (1) preventivamente,
    // o 0 si prefieres que empiece en $0 hasta que entregue algo. Aquí he puesto 1 (Inocente hasta demostrar lo contrario).
    // Si prefieres estricto pon: total > 0 ? (completadas / total) : 0;
    const porcentajeCumplimiento = total > 0 ? (completadas / total) : 1;
    const salarioCalculado = salarioBase * porcentajeCumplimiento;

    // Próximos vencimientos (Se calculan sobre las tareas traídas o podrías hacer un fetch aparte si quieres ver futuro lejano)
    // Aquí ordenamos las del rango actual
    const proximosVencimientos = tareasDelMes
      .filter(t => t.estado?.nombre !== 'Completada' && t.estado?.nombre !== 'Rechazada')
      .sort((a, b) => new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime())
      .slice(0, 5);

    // Distribución por prioridad
    const distribucionPrioridad = [
      { name: 'Urgente', value: tareasDelMes.filter(t => t.prioridad?.nombre === 'Urgente').length, color: '#DC2626' },
      { name: 'Alta', value: tareasDelMes.filter(t => t.prioridad?.nombre === 'Alta').length, color: '#F59E0B' },
      { name: 'Media', value: tareasDelMes.filter(t => t.prioridad?.nombre === 'Media').length, color: '#3B82F6' },
      { name: 'Baja', value: tareasDelMes.filter(t => t.prioridad?.nombre === 'Baja').length, color: '#10B981' }
    ];

    // Rendimiento mensual histórico
    const rendimientoMensual = data.rendimientos.map(r => ({
      name: `${r.mes}/${r.anio}`,
      rendimiento: r.porcentaje_rendimiento
    }));

    // Último rendimiento registrado
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
      totalComentarios: data.comentarios.length,
      salarioCalculado,
      salarioBase,
      porcentajeCumplimiento
    };
  }, [data, userData]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6 animate-fade-in ">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4
                bg-white dark:bg-slate-800
                rounded-2xl p-4 md:p-6
                shadow-sm border border-slate-200 dark:border-slate-700">

        {/* TÍTULO */}
        <div className="flex items-center gap-3">
          <div className="p-3 sm:p-4 bg-linear-to-br from-indigo-400 to-blue-800
                    rounded-2xl shadow-lg shadow-indigo-500/30 shrink-0">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold
                     bg-linear-to-r from-indigo-600 to-blue-800
                     bg-clip-text text-transparent">
              Mi Panel de Control
            </h2>
          </div>
        </div>

        {/* FILTRO FECHAS */}
        <div className="flex items-center gap-2
                  bg-slate-50 dark:bg-slate-700
                  rounded-xl px-4 py-2
                  border border-slate-200 dark:border-slate-600
                  shadow-sm w-full lg:w-auto">
          <Calendar size={16} className="text-slate-400" />

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm w-32 text-slate-600 dark:text-slate-200"
          />

          <span className="text-slate-400">—</span>

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm w-32 text-slate-600 dark:text-slate-200"
          />
        </div>
      </div>


      {/* KPIs Usuario - Diseño profesional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Helper para formatear dinero */}
        {(() => {
          const formatMoney = (amount: number) =>
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

          return (
            <StatCard
              title="Sueldo Proyectado"
              // Muestra el Salario Calculado. Ej: $400.00
              value={formatMoney(analytics.salarioCalculado)}
              icon={Award}
              // El subtexto explica la matemática
              subtext={
                analytics.total > 0
                  ? `${(analytics.porcentajeCumplimiento * 100).toFixed(0)}% del salario base (${formatMoney(analytics.salarioBase)})`
                  : `Sin vencimientos este mes`
              }
              // Color semántico: Rojo si < 50%, Amarillo si < 100%, Verde si 100%
              color={
                analytics.porcentajeCumplimiento < 0.5 ? "red" :
                  analytics.porcentajeCumplimiento < 1 ? "yellow" : "green"
              }
            />
          );
        })()}

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
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Tareas</p>
              <h4 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{analytics.total}</h4>
              <p className="text-xs text-slate-500 mt-1">Vencen este periodo</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <FileText size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-800">
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

        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-800">
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
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
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
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
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
            tooltipFormatter={(value, name) => [`${value} tareas`, 'Cantidad']}
          />
        </Card>
      </div>

      {/* Próximos Vencimientos */}
      <Card className="shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
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
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <BarChart2 size={18} className="text-slate-600 dark:text-slate-400" />
            <div>
              <h5 className="text-lg font-bold text-slate-900 dark:text-white">Evolución de Mi Rendimiento</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Análisis de rendimiento mensual</p>
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
            dataKeys={['rendimiento']}
            showLegend={false}
            tooltipFormatter={(value, name) => {
              if (name === 'rendimiento') return [`${value}%`, 'Rendimiento'];
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
    <ThemeProvider
      forcedTheme="light"
      attribute="class"
      disableTransitionOnChange
      enableSystem={false}
      defaultTheme="light"
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Contenido principal */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="animate-fade-in">
            {renderView()}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}