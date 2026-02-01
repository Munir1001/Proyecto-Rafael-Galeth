import { useEffect } from 'react';
import { useTaskModal } from '../context/TaskModalContext';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';
import { X, Users, Calendar, Paperclip, MessageSquare, Clock } from 'lucide-react';

// Función para formatear fechas
const formatFullDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No definida';
    return new Date(dateStr).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
};

// Crear cliente Supabase directamente en este componente
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function GlobalTaskModal() {
  const { isModalOpen, pendingTaskId, closeTaskModal, setTaskData, currentTask } = useTaskModal();
  const { profile } = useAuth();

  useEffect(() => {
    if (isModalOpen && pendingTaskId && !currentTask) {
      fetchTaskDetails();
    }
  }, [isModalOpen, pendingTaskId, currentTask]);

  const fetchTaskDetails = async () => {
    if (!pendingTaskId) return;

    try {
      const { data: task, error } = await supabase
        .from('tareas')
        .select(`
          *,
          prioridad:prioridades(id, nombre, color, nivel),
          estado:estados_tarea(id, nombre, color),
          asignado:usuarios!tareas_asignado_a_fkey(id, nombre_completo, avatar_url, email),
          creador:usuarios!tareas_creador_id_fkey(id, nombre_completo, avatar_url),
          adjuntos:adjuntos(count),
          comentarios:comentarios(count)
        `)
        .eq('id', pendingTaskId)
        .single();

      if (!error && task) {
        // Marcar notificación como leída
        if (profile?.id) {
          await supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('tarea_id', pendingTaskId)
            .eq('usuario_id', profile.id);
        }
        
        setTaskData(task);
      }
    } catch (error) {
      console.error('Error fetching task:', error);
    }
  };

  if (!isModalOpen || !currentTask) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            {currentTask.prioridad && (
              <div className={`px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider`} 
                   style={{ backgroundColor: currentTask.prioridad.color }}>
                {currentTask.prioridad.nombre}
              </div>
            )}
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              ID: {currentTask.id.slice(0, 8)}
            </span>
          </div>
          <button 
            onClick={closeTaskModal}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            {currentTask.titulo}
          </h2>

          <p className="text-slate-600 dark:text-slate-300 mb-6 whitespace-pre-wrap">
            {currentTask.descripcion || 'Sin descripción disponible.'}
          </p>

          {/* Status Badge */}
          {currentTask.estado && (
            <div className="mb-6">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white`}
                    style={{ backgroundColor: currentTask.estado.color }}>
                {currentTask.estado.nombre}
              </span>
            </div>
          )}

          {/* Assigned User */}
          {currentTask.asignado && (
            <div className="mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <Users size={16} />
                <span>Asignado a: <strong>{currentTask.asignado.nombre_completo}</strong></span>
              </div>
            </div>
          )}

          {/* Creator */}
          {currentTask.creador && (
            <div className="mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span>Creado por: <strong>{currentTask.creador.nombre_completo}</strong></span>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="mb-6">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 mb-2">
              <Calendar size={16} />
              <span>Inicio: <strong>{formatFullDate(currentTask.fecha_inicio)}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Clock size={16} />
              <span>Vencimiento: <strong>{formatFullDate(currentTask.fecha_fin)}</strong></span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
            {currentTask.comentarios && (
              <div className="flex items-center gap-2">
                <MessageSquare size={14} />
                <span>{currentTask.comentarios.count || 0} comentarios</span>
              </div>
            )}
            {currentTask.adjuntos && (
              <div className="flex items-center gap-2">
                <Paperclip size={14} />
                <span>{currentTask.adjuntos.count || 0} archivos</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => {
              window.location.href = '/tareas';
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Ver en página de Tareas
          </button>
        </div>
      </div>
    </div>
  );
}