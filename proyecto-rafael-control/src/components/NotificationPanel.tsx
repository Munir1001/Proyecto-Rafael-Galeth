import { X, Check, CheckCheck } from 'lucide-react';
import type { Notification } from '../types/notification';


interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void; // <--- Agregamos esto
  onNotificationClick?: (tareaId: string) => void; // <--- Nuevo prop para clic en notificación
  onMarkAllAsRead?: () => void; // <--- Nuevo prop para marcar todas como leídas
}


export default function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead, // <--- Lo desestructuramos aquí
  onNotificationClick, // <--- Nuevo prop
  onMarkAllAsRead // <--- Nuevo prop para marcar todas como leídas
}: NotificationPanelProps) {

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-20 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 z-[9999] overflow-hidden transform transition-all animate-slide-in-right">

      {/* Cabecera */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-800 dark:text-white">Notificaciones</h3>
          {notifications.filter(n => !n.leida).length > 0 && (

            <button
              onClick={onMarkAllAsRead}
              title="Marcar todas como leídas"
              aria-label="Marcar todas como leídas"
              className="p-2 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50
             dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/40
             transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={18} />
        </button>
      </div>

      {/* Lista */}
      <div className="max-h-[400px] overflow-y-auto"> {/* Ajusté max-h-100 a max-h-[400px] para Tailwind estándar */}
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No tienes notificaciones nuevas
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 ${!notif.leida ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''} ${notif.tarea_id ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (notif.tarea_id && onNotificationClick) {
                  onNotificationClick(notif.tarea_id);
                  onMarkAsRead(notif.id);
                  onClose();
                }
              }}
            >
              <div className="mt-1">
                {!notif.leida ? (
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                ) : (
                  <div className="w-2 h-2" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {notif.titulo}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {notif.mensaje}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-slate-400">
                    {new Date(notif.created_at).toLocaleString('es-ES', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  {notif.tarea_id && (
                    <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                      Tarea #{notif.tarea_id.slice(-6)}
                    </span>
                  )}
                </div>
              </div>

              {!notif.leida && !notif.tarea_id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notif.id);
                  }}
                  className="self-start text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  title="Marcar como leída"
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}