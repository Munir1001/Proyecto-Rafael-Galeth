// src/components/NotificationPanel.tsx
import { useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import type { Notification } from '../types/notification';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
}
export default function NotificationPanel({
  isOpen,
  onClose,
  notifications,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed z-50 
          bg-white dark:bg-slate-900 
          border border-slate-200 dark:border-slate-700 
          shadow-2xl overflow-hidden
          
          /* === MÓVIL: Bottom Sheet === */
          inset-x-0 bottom-0
          h-[85vh] max-h-[85vh]
          rounded-t-2xl rounded-b-none
          
          /* === DESKTOP: Panel flotante === */
          md:absolute
          md:top-full md:right-0 md:bottom-auto md:left-auto
          md:mt-2
          md:w-96 md:h-auto md:max-h-[70vh]
          md:rounded-xl md:rounded-b-xl
          
          /* Animación */
          transition-all duration-300 ease-in-out
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-5 py-4 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Bell size={20} />
            <div>
              <h3 className="font-semibold text-lg">Notificaciones</h3>
              <p className="text-xs opacity-90 mt-0.5">
                {unreadCount > 0 
                  ? `Tienes ${unreadCount} sin leer` 
                  : 'Estás al día'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Contenido - Se ajusta automáticamente */}
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <Bell size={64} className="mx-auto mb-6 opacity-30" strokeWidth={1.2} />
              <p className="text-xl font-medium">Sin notificaciones</p>
              <p className="text-sm mt-2">Aquí aparecerán cuando lleguen</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 pb-20 md:pb-4">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer
                    ${!notif.read ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''}
                  `}
                >
                  {/* Icono según tipo */}
                  <div className="shrink-0 mt-1">
                    {notif.type === 'success' && <CheckCircle className="text-green-500" size={20} />}
                    {notif.type === 'warning' && <AlertTriangle className="text-amber-500" size={20} />}
                    {notif.type === 'error' && <AlertTriangle className="text-red-500" size={20} />}
                    {notif.type === 'info' && <Info className="text-blue-500" size={20} />}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {notif.title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                      {notif.message}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                      <Clock size={12} />
                      {new Date(notif.created_at).toLocaleTimeString('es-EC', { 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </p>
                  </div>

                  {!notif.read && (
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Solo visible en móvil */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center">
          <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition">
            Ver todas
          </button>
          {unreadCount > 0 && (
            <button className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
              Marcar todo como leído
            </button>
          )}
        </div>

        {/* Footer para desktop */}
        <div className="hidden md:block border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 p-4 flex justify-between items-center">
          <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition">
            Ver todas
          </button>
          {unreadCount > 0 && (
            <button className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
              Marcar todo como leído
            </button>
          )}
        </div>
      </div>
    </>
  );
}