import { useAuth } from '../context/AuthContext';
import { Card, Badge, Progress, Button, Spinner } from 'flowbite-react';
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell
} from "flowbite-react";
import { 
  Users, 
  Briefcase, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  FileText,
  Plus,
  ArrowRight
} from 'lucide-react';
import PerformanceChart from '../components/charts/PerformanceChart';

// --- COMPONENTES DE VISTA POR ROL ---

const AdminView = () => (
  <div className="space-y-6 animate-fade-in">
    {/* KPI Cards Globales */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="border-l-4 border-l-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Usuarios Totales</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">54</h3>
          </div>
          <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Users size={24} /></div>
        </div>
      </Card>
      <Card className="border-l-4 border-l-purple-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Departamentos</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">8</h3>
          </div>
          <div className="p-3 bg-purple-100 rounded-full text-purple-600"><Briefcase size={24} /></div>
        </div>
      </Card>
      <Card className="border-l-4 border-l-green-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Proyectos Activos</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">12</h3>
          </div>
          <div className="p-3 bg-green-100 rounded-full text-green-600"><FileText size={24} /></div>
        </div>
      </Card>
      <Card className="border-l-4 border-l-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Alertas Rendimiento</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">3</h3>
          </div>
          <div className="p-3 bg-red-100 rounded-full text-red-600"><AlertTriangle size={24} /></div>
        </div>
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tabla de Rendimiento Global */}
      <Card>
        <h5 className="text-lg font-bold mb-4 dark:text-white">Rendimiento por Departamento</h5>
        <div className="overflow-x-auto">
          <Table hoverable>
            <TableHead>
              <TableHeadCell>Departamento</TableHeadCell>
              <TableHeadCell>Manager</TableHeadCell>
              <TableHeadCell>Eficiencia</TableHeadCell>
              <TableHeadCell>Estado</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800">
                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">Tecnología</TableCell>
                <TableCell>Ing. Martínez</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress progress={85} color="green" size="sm" className="w-20"/> 85%
                  </div>
                </TableCell>
                <TableCell><Badge color="success">Óptimo</Badge></TableCell>
              </TableRow>
              <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800">
                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">Marketing</TableCell>
                <TableCell>Lic. Soria</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress progress={45} color="red" size="sm" className="w-20"/> 45%
                  </div>
                </TableCell>
                <TableCell><Badge color="failure">Crítico</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Gráfico Global */}
      <PerformanceChart /> 
    </div>
  </div>
);

const ManagerView = ({ deptName }: { deptName?: string }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
        Departamento: <span className="text-primary">{deptName || 'Sin asignar'}</span>
      </h2>
      <Button color="blue" size="sm">
        <Plus className="mr-2 h-4 w-4" /> Crear Proyecto
      </Button>
    </div>

    {/* KPIs de Departamento */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <div className="flex flex-col">
          <span className="text-gray-500 text-sm">Eficiencia Mensual</span>
          <div className="flex items-end gap-2 mt-1">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">78%</h3>
            <span className="text-green-500 text-sm flex items-center mb-1"><TrendingUp size={16} /> +5%</span>
          </div>
          <Progress progress={78} className="mt-3" color="blue" />
        </div>
      </Card>
      <Card>
        <div className="flex flex-col">
          <span className="text-gray-500 text-sm">Tareas Pendientes Equipo</span>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">24</h3>
          <p className="text-xs text-gray-400 mt-2">4 con prioridad Alta</p>
        </div>
      </Card>
      <Card>
        <div className="flex flex-col">
          <span className="text-gray-500 text-sm">Miembros Activos</span>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">12</h3>
          <div className="flex -space-x-2 mt-2">
            {[1,2,3,4].map(i => (
              <img key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800" src={`https://i.pravatar.cc/150?img=${i+20}`} alt="" />
            ))}
            <div className="flex items-center justify-center w-8 h-8 text-xs font-medium text-white bg-gray-700 border-2 border-white rounded-full hover:bg-gray-600 dark:border-gray-800">+8</div>
          </div>
        </div>
      </Card>
    </div>

    {/* Gráfico y Tareas del Equipo */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <PerformanceChart />
      </div>
      <Card>
        <h5 className="font-bold dark:text-white mb-2">Entregas Próximas</h5>
        <ul className="space-y-3">
          {[1,2,3].map(i => (
            <li key={i} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer">
              <div className="mt-1"><Clock size={16} className="text-orange-500"/></div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Reporte Financiero Q3</p>
                <p className="text-xs text-gray-500">Asignado a: Carlos M.</p>
              </div>
            </li>
          ))}
        </ul>
        <Button color="light" size="xs" className="mt-2 w-full">Ver todas</Button>
      </Card>
    </div>
  </div>
);

const UserView = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Accesos Directos */}
    <div className="flex gap-3 overflow-x-auto pb-2">
      <Card href="#" className="min-w-[150px] hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors cursor-pointer border-0 shadow-md">
        <div className="flex flex-col items-center text-center">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mb-2"><CheckCircle size={20}/></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Mis Tareas</span>
        </div>
      </Card>
      <Card href="#" className="min-w-[150px] hover:bg-green-50 dark:hover:bg-gray-700 transition-colors cursor-pointer border-0 shadow-md">
        <div className="flex flex-col items-center text-center">
          <div className="p-2 bg-green-100 text-green-600 rounded-lg mb-2"><TrendingUp size={20}/></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Mi Rendimiento</span>
        </div>
      </Card>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Tareas para Hoy */}
      <Card className="border-t-4 border-t-primary">
        <div className="flex justify-between items-center mb-4">
          <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">Para hoy 📅</h5>
          <span className="text-sm text-blue-600 hover:underline cursor-pointer">Ver calendario</span>
        </div>
        <div className="flow-root">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            <li className="py-3 sm:py-4">
              <div className="flex items-center space-x-4">
                <div className="shrink-0"><div className="w-2 h-2 rounded-full bg-red-500"></div></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">Revisión de Tesis Cap. 2</p>
                  <p className="truncate text-sm text-gray-500">10:00 AM - Proyecto Alfa</p>
                </div>
                <Button size="xs" color="gray"><ArrowRight size={14}/></Button>
              </div>
            </li>
            <li className="py-3 sm:py-4">
              <div className="flex items-center space-x-4">
                <div className="shrink-0"><div className="w-2 h-2 rounded-full bg-yellow-400"></div></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">Actualizar Reporte Mensual</p>
                  <p className="truncate text-sm text-gray-500">2:00 PM - Administrativo</p>
                </div>
                <Button size="xs" color="gray"><ArrowRight size={14}/></Button>
              </div>
            </li>
          </ul>
        </div>
      </Card>

      {/* Mi Rendimiento Personal */}
      <Card>
        <h5 className="text-lg font-bold mb-2 dark:text-white">Mi Rendimiento este mes</h5>
        <div className="flex items-center justify-center py-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="92, 100" />
            </svg>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <span className="text-2xl font-bold text-gray-800 dark:text-white">92%</span>
              <p className="text-[10px] text-gray-500">Eficiencia</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-center text-gray-500">¡Vas excelente! Tu bono de rendimiento está asegurado.</p>
      </Card>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL (CONTROLADOR) ---

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="xl" aria-label="Cargando..." />
      </div>
    );
  }

  return (
    <div className="pb-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          Hola, <span className="text-indigo-600 dark:text-indigo-400">{profile?.nombre_completo?.split(' ')[0] || 'Usuario'}</span> 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {profile?.rol_nombre === 'Admin' && 'Panel de Control General'}
          {profile?.rol_nombre === 'Manager' && 'Gestión de Departamento y Equipo'}
          {(!profile?.rol_nombre || profile?.rol_nombre === 'Usuario') && 'Tu espacio personal de trabajo'}
        </p>
      </div>

      {/* RENDERIZADO CONDICIONAL POR ROL */}
      <div className="transition-all duration-300 ease-in-out">
        {profile?.rol_nombre === 'Admin' ? (
          <AdminView />
        ) : profile?.rol_nombre === 'Manager' ? (
          /* Usamos el departamento del perfil, o un fallback si es null */
          <ManagerView deptName={profile?.departamento_id || 'Mi Departamento'} /> 
        ) : (
          <UserView />
        )}
      </div>
    </div>
  );
}