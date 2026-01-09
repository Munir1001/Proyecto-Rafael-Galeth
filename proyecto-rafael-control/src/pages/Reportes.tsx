import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Button,
  Select,
  Badge,
  Avatar,
  Spinner,
  Tooltip,
  Card
} from 'flowbite-react';
import {
  Download,
  Users,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Search,
  Calendar,
  Filter,
  Info,
  Building2,
  RefreshCw,
  Award
} from 'lucide-react';

// --- Interfaces ---
interface Usuario {
  id: string;
  nombre_completo: string;
  email: string;
  avatar_url: string | null;
  salario_base: number;
  departamento_id: string;
  rol_id: string;
  rol_nombre?: string;
  departamento_nombre?: string;
  es_manager?: boolean;
}

interface Departamento {
  id: string;
  nombre: string;
  descripcion?: string;
  manager_id?: string;
}

interface ReporteItem {
  usuario: Usuario;
  totalTareas: number;
  completadas: number;
  completadasATiempo: number;
  completadasTarde: number;
  pendientes: number;
  vencidas: number;
  porcentajeEficiencia: number;
  porcentajePuntualidad: number;
  porcentajeCumplimiento: number; // Para el cálculo de salario
  scoreRendimiento: number;
  nivelRendimiento: 'Sobresaliente' | 'Bueno' | 'Regular' | 'Insuficiente';
  salarioBase: number;
  salarioFinal: number;
  explicacionSalario: string;
  formulaSalarial: string;
}

// --- Utilidades ---
const calculateNivelRendimiento = (score: number): 'Sobresaliente' | 'Bueno' | 'Regular' | 'Insuficiente' => {
  if (score >= 90) return 'Sobresaliente';
  if (score >= 75) return 'Bueno';
  if (score >= 60) return 'Regular';
  return 'Insuficiente';
};

const getColorByNivel = (nivel: string): string => {
  switch (nivel) {
    case 'Sobresaliente':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';

    case 'Bueno':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400';

    case 'Regular':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';

    case 'Insuficiente':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400';

    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300';
  }
};


const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// --- Componente Principal ---
const Reportes: React.FC = () => {
  const { profile } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Estados principales
  const [loadingInit, setLoadingInit] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Datos
  const [usuariosDb, setUsuariosDb] = useState<Usuario[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);

  // Filtros
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Reporte
  const [reportData, setReportData] = useState<ReporteItem[]>([]);
  const [reportGenerated, setReportGenerated] = useState(false);

  // --- 1. Carga Inicial de Datos Maestros ---
  // --- 1. Carga Inicial de Datos Maestros (CORREGIDA) ---
  const fetchMasterData = useCallback(async () => {
    if (!profile) return;

    try {
      setLoadingInit(true);

      // A. LÓGICA DE DEPARTAMENTOS
      let deptsQuery = supabase.from('departamentos').select('*').order('nombre');

      // Si es Manager, solo traemos los departamentos que él administra
      if (profile.rol_nombre === 'Manager') {
        deptsQuery = deptsQuery.eq('manager_id', profile.id);
      }

      const { data: deptsData, error: deptsError } = await deptsQuery;
      if (deptsError) throw deptsError;

      const departamentosDisponibles = deptsData || [];
      setDepartamentos(departamentosDisponibles);

      // Lógica de autoselección para Manager
      if (profile.rol_nombre === 'Manager') {
        if (departamentosDisponibles.length === 1) {
          // Si solo tiene 1, lo seleccionamos y el input quedará disabled luego
          setSelectedDept(departamentosDisponibles[0].id);
        } else {
          // Si tiene más de 1, 'all' o el primero
          setSelectedDept('all');
        }
      }

      // B. LÓGICA DE USUARIOS
      // Obtenemos los IDs de los departamentos visibles para filtrar usuarios
      const deptIdsVisible = departamentosDisponibles.map(d => d.id);

      let usersQuery = supabase
        .from('usuarios')
        .select(`
          id, nombre_completo, email, avatar_url, salario_base, departamento_id, rol_id,
          departamentos!usuarios_departamento_id_fkey(id, nombre),
          roles(id, nombre)
        `)
        .eq('activo', true);

      // Filtramos usuarios:
      // 1. Si es Admin, ve todos.
      // 2. Si es Manager, ve solo usuarios de SUS departamentos.
      if (profile.rol_nombre === 'Manager') {
        if (deptIdsVisible.length > 0) {
          usersQuery = usersQuery.in('departamento_id', deptIdsVisible);
        } else {
          // Si es manager pero no tiene depts asignados, no ve a nadie (caso borde)
          usersQuery = usersQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const { data: users, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      const formattedUsers: Usuario[] = (users || []).map((u: any) => ({
        id: u.id,
        nombre_completo: u.nombre_completo,
        email: u.email,
        avatar_url: u.avatar_url,
        salario_base: parseFloat(u.salario_base?.toString() || '0'),
        departamento_id: u.departamento_id,
        rol_id: u.rol_id,
        rol_nombre: u.roles?.nombre,
        departamento_nombre: u.departamentos?.nombre
      }));

      setUsuariosDb(formattedUsers);

    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoadingInit(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // --- 2. Generación del Reporte (CORREGIDA FECHAS Y FILTROS) ---
  const handleGenerateReport = async () => {
    setGenerating(true);
    setReportGenerated(false);

    try {
      // 1. Filtrar usuarios estrictamente por lo seleccionado en pantalla
      let targetUsers = [...usuariosDb];

      // Filtro Departamento: Aplica si no es 'all'
      if (selectedDept !== 'all') {
        targetUsers = targetUsers.filter(u => u.departamento_id === selectedDept);
      }

      // Filtro Usuario: Aplica si no es 'all'
      if (selectedUser !== 'all') {
        targetUsers = targetUsers.filter(u => u.id === selectedUser);
      }

      // Filtro Texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        targetUsers = targetUsers.filter(u =>
          u.nombre_completo.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
        );
      }

      if (targetUsers.length === 0) {
        setReportData([]);
        setReportGenerated(true);
        setGenerating(false);
        return;
      }

      const userIds = targetUsers.map(u => u.id);

      // 2. CORRECCIÓN DE FECHAS (Evitar problemas de zona horaria usando strings directos)
      // startDate viene como "YYYY-MM-DD"
      const [sYear, sMonth] = startDate.split('-').map(Number);
      const [eYear, eMonth] = endDate.split('-').map(Number);

      const filters = [];

      // Lógica para construir el query OR de Supabase
      // Recorremos año por año
      for (let year = sYear; year <= eYear; year++) {
        // Definir mes de inicio y fin para este año específico en el bucle
        let startM = 1;
        let endM = 12;

        if (year === sYear) startM = sMonth;
        if (year === eYear) endM = eMonth;

        // Construir el filtro para este año
        // Sintaxis: anio.eq.2024,mes.gte.1,mes.lte.3
        filters.push(`and(anio.eq.${year},mes.gte.${startM},mes.lte.${endM})`);
      }

      let rendimientoQuery = supabase
        .from('rendimiento_mensual')
        .select('*')
        .in('usuario_id', userIds);

      // Usamos el filtro OR corregido
      if (filters.length > 0) {
        rendimientoQuery = rendimientoQuery.or(filters.join(','));
      }

      const { data: rendimientoData, error: rendimientoError } = await rendimientoQuery;

      if (rendimientoError) throw rendimientoError;

      // 3. Procesar datos (Sin cambios en la lógica de cálculo)
      const processedReport: ReporteItem[] = targetUsers.map(user => {
        // Filtrar solo los rendimientos que pertenecen a este usuario
        const userRendimiento = (rendimientoData || []).filter(r => r.usuario_id === user.id);

        const total = userRendimiento.reduce((sum, r) => sum + r.total_tareas_asignadas, 0);
        const completadasATiempo = userRendimiento.reduce((sum, r) => sum + r.tareas_completadas_a_tiempo, 0);
        const completadasTarde = userRendimiento.reduce((sum, r) => sum + r.tareas_completadas_tarde, 0);
        const vencidas = userRendimiento.reduce((sum, r) => sum + r.tareas_vencidas, 0);

        const completadas = completadasATiempo + completadasTarde;
        // Pendientes es lo que falta (total - completadas)
        const pendientes = Math.max(0, total - completadas);

        const porcentajeEficiencia = total > 0 ? (completadas / total) * 100 : 0;
        const porcentajePuntualidad = completadas > 0 ? (completadasATiempo / completadas) * 100 : 100;

        const scoreRendimiento = total === 0 ? 100 : (porcentajeEficiencia * 0.6) + (porcentajePuntualidad * 0.4);
        const nivelRendimiento = calculateNivelRendimiento(scoreRendimiento);

        const salarioBase = parseFloat(user.salario_base?.toString() || '0');
        const porcentajeCumplimiento = total > 0 ? (completadas / total) : 1;
        const salarioCalculado = salarioBase * porcentajeCumplimiento;

        let explicacion = '';
        if (total === 0) {
          explicacion = 'Sin tareas asignadas. Se asume cumplimiento total.';
        } else {
          explicacion = `Cumplimiento: ${(porcentajeCumplimiento * 100).toFixed(1)}% (${completadas} de ${total} completadas).`;
        }

        const formula = `Salario Base ($${salarioBase}) × Cumplimiento (${(porcentajeCumplimiento * 100).toFixed(0)}%)`;

        return {
          usuario: user,
          totalTareas: total,
          completadas,
          completadasATiempo,
          completadasTarde,
          pendientes,
          vencidas,
          porcentajeEficiencia,
          porcentajePuntualidad,
          porcentajeCumplimiento,
          scoreRendimiento,
          nivelRendimiento,
          salarioBase,
          salarioFinal: salarioCalculado,
          explicacionSalario: explicacion,
          formulaSalarial: formula
        };
      });

      processedReport.sort((a, b) => b.salarioFinal - a.salarioFinal);
      setReportData(processedReport);
      setReportGenerated(true);

    } catch (err) {
      console.error('Error generando reporte:', err);
      alert('Error al generar el reporte.');
    } finally {
      setGenerating(false);
    }
  };

  // --- 3. Exportar a PDF ---
  const handleExportPDF = async () => {
    if (reportData.length === 0) return;

    setExporting(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = margin;

      // --- Encabezado ---
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE PAGO', margin, 20);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const periodoTexto = `Período: ${new Date(startDate).toLocaleDateString('es-ES')} - ${new Date(endDate).toLocaleDateString('es-ES')}`;
      doc.text(periodoTexto, margin, 28);

      doc.setFontSize(9);
      doc.text(`Generado por: ${profile?.nombre_completo || 'Sistema'} | ${new Date().toLocaleString()}`, margin, 33);

      yPos = 45;

      // --- Resumen General ---
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN EJECUTIVO', margin, yPos);
      yPos += 10;

      const totalEmpleados = reportData.length;
      const totalTareas = reportData.reduce((acc, r) => acc + r.totalTareas, 0);
      const totalCompletadas = reportData.reduce((acc, r) => acc + r.completadas, 0);
      const totalNomina = reportData.reduce((acc, r) => acc + r.salarioFinal, 0);

      const resumenData = [
        ['Total Empleados', totalEmpleados.toString()],
        ['Total Tareas Asignadas', totalTareas.toString()],
        ['Tareas Completadas', totalCompletadas.toString()],
        ['Total a Pagar', formatMoney(totalNomina)]
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: resumenData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { halign: 'right', cellWidth: 40 }
        },
        margin: { left: margin }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // --- Tabla de Empleados ---
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE NÓMINA', margin, yPos);
      yPos += 8;

      const tableBody = reportData.map(item => [
        item.usuario.nombre_completo,
        item.usuario.departamento_nombre || 'N/A',
        `${item.totalTareas}`,
        `${item.completadas}`,
        `${(item.porcentajeCumplimiento * 100).toFixed(0)}%`,
        formatMoney(item.salarioBase),
        formatMoney(item.salarioFinal)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Empleado', 'Depto.', 'Total', 'Comp.', 'Cumplimiento', 'Base', 'A Pagar']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 30 },
          2: { halign: 'center', cellWidth: 15 },
          3: { halign: 'center', cellWidth: 15 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'right', cellWidth: 25 },
          6: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // --- Explicación ---
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('NOTA SOBRE EL CÁLCULO:', margin, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('El salario final se calcula proporcionalmente al cumplimiento de las tareas asignadas.', margin, yPos);
      yPos += 5;
      doc.text('Fórmula: Salario Final = Salario Base * (Tareas Completadas / Total Tareas Asignadas)', margin, yPos);

      // Guardar PDF
      const filename = `Nomina_Rendimiento_${startDate}_${endDate}.pdf`;
      doc.save(filename);

    } catch (err) {
      console.error('Error exportando PDF:', err);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  // --- Utilidades de UI ---
  const filteredReportData = reportData.filter(item =>
    searchTerm.trim() === '' ||
    item.usuario.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 relative overflow-hidden">

      <div className="max-w-7xl mx-auto">

        {/* --- HEADER MODERNO --- */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icono */}
                    <div className="p-3 sm:p-4 bg-linear-to-br from-indigo-400 to-blue-800 rounded-2xl shadow-lg shadow-indigo-500/30 shrink-0">
                      <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>

                    {/* Texto */}
                    <div>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-linear-to-r from-indigo-600 to-blue-800 bg-clip-text text-transparent">
                        Reportes de Gestión
                      </h1>

                      <p className="text-slate-500 flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        {profile?.rol_nombre === 'Admin'
                          ? 'Cálculo de nómina basado en rendimiento y cumplimiento'
                          : 'Análisis detallado de tu departamento'}
                      </p>
                    </div>
                  </div>
                </div>


                <div className="flex gap-3">
                  {reportGenerated && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        color="success"
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="
  bg-indigo-600 hover:bg-indigo-700
  dark:bg-indigo-500 dark:hover:bg-indigo-600
  text-white
  border-0
  px-4 py-2
  rounded-xl
  shadow-sm hover:shadow-md
  transition-all duration-200
"
                      >
                        {exporting ? (
                          <Spinner aria-label="Exportando" size="sm" className="mr-2" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Exportar Nómina PDF
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- FILTROS --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Parámetros del Reporte
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Fecha Inicio */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Desde
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all duration-200"
                />
              </div>

              {/* Fecha Fin */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Hasta
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all duration-200"
                />
              </div>

              {/* Departamento */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Departamento
                </label>
                <Select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  // Deshabilitado si NO es Admin Y (es Manager con solo 1 depto disponible)
                  disabled={profile?.rol_nombre !== 'Admin' && departamentos.length <= 1}
                  className="rounded-xl"
                >
                  {/* Opción "Todos" solo visible si tienes acceso a más de 1 depto */}
                  {(profile?.rol_nombre === 'Admin' || departamentos.length > 1) && (
                    <option value="all">Todos</option>
                  )}

                  {departamentos.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Usuario */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Users className="h-4 w-4 text-slate-400" />
                  Usuario
                </label>
                <Select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="rounded-xl"
                >
                  <option value="all">Todos</option>
                  {usuariosDb
                    .filter(u => selectedDept === 'all' || u.departamento_id === selectedDept)
                    .map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre_completo}
                      </option>
                    ))}
                </Select>
              </div>

              {/* Búsqueda */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Search className="h-4 w-4 text-slate-400" />
                  Buscar
                </label>
                <input
                  type="text"
                  placeholder="Nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all duration-200"
                />
              </div>

              {/* Botón Generar */}
              <div className="flex items-end">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full"
                >
                  <Button
                    color="dark"
                    onClick={handleGenerateReport}
                    disabled={generating}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 border-0 px-6 py-2.5 h-10.5"
                  >
                    {generating ? (
                      <Spinner aria-label="Generando" size="sm" className="mr-2" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Generar
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- ÁREA DEL REPORTE --- */}
        <AnimatePresence>
          {reportGenerated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Resumen Global */}
              {filteredReportData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                        <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Resumen Ejecutivo de Nómina
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" ref={reportRef}>
                      <StatCard
                        title="Total Nómina"
                        value={formatMoney(filteredReportData.reduce((acc, r) => acc + r.salarioFinal, 0))}
                        icon={DollarSign}
                        subtext="A pagar este periodo"
                        color="green"
                      />
                      <StatCard
                        title="Total Empleados"
                        value={filteredReportData.length}
                        icon={Users}
                        subtext="En reporte"
                      />
                      <StatCard
                        title="Tareas Completadas"
                        value={filteredReportData.reduce((acc, r) => acc + r.completadas, 0)}
                        icon={CheckCircle}
                        subtext="Productividad total"
                      />
                      <StatCard
                        title="Promedio Cumplimiento"
                        value={`${(filteredReportData.reduce((acc, r) => acc + r.porcentajeCumplimiento, 0) / filteredReportData.length * 100).toFixed(0)}%`}
                        icon={Award}
                        subtext="Eficiencia global"
                        color="blue"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Lista de Empleados */}
              {filteredReportData.length > 0 ? (
                <div className="space-y-6" ref={contentRef}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                        <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Detalle Individual
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredReportData.map((item, index) => (
                      <motion.div
                        key={item.usuario.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="group relative"
                      >
                        <div className="relative bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/50 overflow-hidden hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/5 transition-all duration-300">

                          {/* Header de la Tarjeta */}
                          <div className="relative p-6 border-b border-slate-100 dark:border-slate-800/50 bg-linear-to-r from-transparent to-indigo-500/5 dark:from-transparent dark:to-indigo-500/10">
                            <div className="flex items-start gap-4">
                              <Avatar
                                img={item.usuario.avatar_url || undefined}
                                size="lg"
                                placeholderInitials={item.usuario.nombre_completo
                                  .substring(0, 2)
                                  .toUpperCase()}
                                className="rounded-full overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800 ring-offset-2 dark:ring-offset-slate-950"
                              />


                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                      {item.usuario.nombre_completo}
                                    </h4>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                      {item.usuario.departamento_nombre && (
                                        <Badge
                                          className="
    rounded-full px-3 py-1
    bg-slate-100 text-slate-700
    dark:bg-slate-800/60 dark:text-slate-300
    border border-slate-200 dark:border-slate-700
  "
                                        >

                                          {item.usuario.departamento_nombre}
                                        </Badge>
                                      )}
                                    </div>

                                  </div>
                                  <Badge className={`rounded-full px-3 py-1 ${getColorByNivel(item.nivelRendimiento)}`}>
                                    {item.nivelRendimiento}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-6">
                            {/* Grid de Métricas */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                              <div className="text-center p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-900/90 transition-colors">
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-1">Asignadas</div>
                                <div className="text-xl font-bold text-slate-900 dark:text-white">{item.totalTareas}</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 dark:bg-green-950/50 rounded-xl border border-green-200 dark:border-green-800/30 hover:bg-green-100 dark:hover:bg-green-950/70 transition-colors">
                                <div className="text-green-600 dark:text-green-400 text-xs font-medium uppercase mb-1">Completadas</div>
                                <div className="text-xl font-bold text-green-700 dark:text-green-300">{item.completadas}</div>
                              </div>
                              <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-800/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors">
                                <div className="text-indigo-600 dark:text-indigo-400 text-xs font-medium uppercase mb-1">Cumplimiento</div>
                                <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{(item.porcentajeCumplimiento * 100).toFixed(0)}%</div>
                              </div>
                            </div>

                            {/* Sección Salarial (NUEVA LÓGICA) */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-5 border border-slate-100 dark:border-slate-800/40 shadow-inner">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                                  <DollarSign className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  Cálculo de Pago
                                </h4>
                              </div>

                              <div className="space-y-3">
                                {/* Salario Base */}
                                <div className="flex justify-between items-center text-sm py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                                  <span className="text-slate-600 dark:text-slate-300 font-medium">Salario Base</span>
                                  <span className="font-bold text-slate-900 dark:text-white text-lg">
                                    {formatMoney(item.salarioBase)}
                                  </span>
                                </div>

                                {/* Multiplicador de Cumplimiento */}
                                <div className="flex justify-between items-center text-sm py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                                  <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                                    Factor de Cumplimiento
                                    <Tooltip content="Tareas completadas / Total tareas asignadas">
                                      <Info size={12} className="text-slate-400 dark:text-slate-500" />
                                    </Tooltip>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                      <div
                                        className={`h-full transition-all duration-500 ${item.porcentajeCumplimiento >= 1 ? 'bg-green-500 shadow-green-500/30' : item.porcentajeCumplimiento >= 0.5 ? 'bg-yellow-500 shadow-yellow-500/30' : 'bg-red-500 shadow-red-500/30'}`}
                                        style={{ width: `${Math.min(item.porcentajeCumplimiento * 100, 100)}%` }}
                                      />
                                    </div>
                                    <span className={`font-bold text-base ${item.porcentajeCumplimiento >= 1 ? 'text-green-600 dark:text-green-400' : item.porcentajeCumplimiento < 0.5 ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                      x {(item.porcentajeCumplimiento).toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                <div className="border-t border-slate-200 dark:border-slate-700/50 my-3"></div>

                                {/* Salario Final */}
                                <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-linear-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-800/30">
                                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">A Pagar</span>
                                  <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 drop-shadow-sm">
                                    {formatMoney(item.salarioFinal)}
                                  </span>
                                </div>

                                <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/40 rounded-lg border-l-4 border-indigo-400 dark:border-indigo-500">
                                  <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                                    {item.explicacionSalario}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">
                    No se encontraron empleados con los filtros seleccionados.
                  </p>
                </div>
              )}

              {/* Footer */}
              {filteredReportData.length > 0 && (
                <div className="text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-100 dark:border-slate-800 pt-4">
                  Reporte generado automáticamente • {new Date().toLocaleString()}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estado inicial */}
        {!reportGenerated && !generating && !loadingInit && (
          <div className="text-center py-20">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Genera tu reporte de nómina
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Selecciona el rango de fechas y los filtros necesarios para calcular el pago basado en el rendimiento.
            </p>
          </div>
        )}

        {/* Loading */}
        {loadingInit && (
          <div className="text-center py-20">
            <Spinner size="xl" className="mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Cargando datos del sistema...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Componentes Auxiliares (StatCard Style) ---

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtext?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, subtext, color = 'blue' }) => {
  // Mapa de colores sutiles para fondo y texto
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400',
    yellow: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    purple: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
  };

  const selectedColor = colors[color as keyof typeof colors] || colors.blue;

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800/50 hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/5 transition-all duration-300 dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h4>
          {subtext && <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 font-medium">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${selectedColor} shadow-lg`}>
          <Icon size={20} className="drop-shadow-sm" />
        </div>
      </div>
    </Card>
  );
};

export default Reportes;