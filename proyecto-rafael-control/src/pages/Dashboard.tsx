// src/pages/Dashboard.tsx
import { Card, Avatar, Progress, Badge } from 'flowbite-react';
import { CheckCircle, Clock, AlertTriangle, TrendingUp, MoreVertical, Briefcase } from 'lucide-react';
import PerformanceChart from '../components/charts/PerformanceChart';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hola, Usuario 👋</h1>
          <p className="text-gray-500 dark:text-gray-400">Resumen de tu departamento hoy.</p>
        </div>
        <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 cursor-pointer">
          + Nueva Tarea
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Tareas Totales</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">124</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600"><Briefcase size={24} /></div>
          </div>
          <div className="mt-2 text-xs text-green-600 font-medium flex items-center">
            <TrendingUp size={14} className="mr-1" /> +12% este mes
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Completadas</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">86</h3>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600"><CheckCircle size={24} /></div>
          </div>
          <Progress progress={70} color="green" size="sm" className="mt-3" />
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">En Progreso</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">28</h3>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-full text-orange-600"><Clock size={24} /></div>
          </div>
          <div className="mt-2 text-xs text-gray-400">5 vencen hoy</div>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Vencidas</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">10</h3>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-full text-red-600"><AlertTriangle size={24} /></div>
          </div>
          <div className="mt-2 text-xs text-red-600 font-medium">Requieren atención</div>
        </Card>
      </div>

      {/* Gráfico y Lista Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>

        <Card className="shadow-sm border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex justify-between items-center mb-2">
            <h5 className="text-lg font-bold text-gray-900 dark:text-white">Actividad Reciente</h5>
            <MoreVertical className="text-gray-400 cursor-pointer" size={20} />
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="py-3 flex items-center space-x-4">
                <Avatar img={`https://i.pravatar.cc/150?img=${i + 10}`} rounded stacked />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">Revisión Proyecto {i}</p>
                  <p className="truncate text-sm text-gray-500">Hace 2 horas</p>
                </div>
                <Badge color="gray">Info</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}