import { useAuth } from '../context/AuthContext';
import { UserX, LogOut, HelpCircle } from 'lucide-react';

export default function InactiveAccount() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Fondo con ondas sutiles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-slate-200/50 dark:bg-slate-800/20 blur-[120px]" />
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-rose-500/5 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Tarjeta Glassmorphism */}
        <div className="backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700 p-8 md:p-12 text-center transform transition-all hover:scale-[1.005] duration-500">
          
          {/* Icono de Usuario Desactivado */}
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
            <div className="relative flex items-center justify-center w-24 h-24 bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-full border-4 border-white dark:border-slate-700 shadow-inner">
              <UserX size={40} className="text-slate-400 dark:text-slate-500" />
            </div>
            {/* Indicador de estado "Offline" */}
            <div className="absolute top-0 right-0 w-6 h-6 bg-red-500 border-4 border-white dark:border-slate-800 rounded-full shadow-md" />
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-3">
            Cuenta Inactiva
          </h1>
          
          <div className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />

          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            Tu usuario ha sido desactivado por un administrador. <br />
            Actualmente no tienes permisos para acceder al panel.
          </p>

          {/* Caja de Ayuda */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-8 border border-slate-100 dark:border-slate-700 text-left flex gap-3">
            <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-slate-700 dark:text-slate-200">¿Crees que es un error?</p>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Por favor, contacta con soporte técnico o con tu supervisor directo para reactivar tu acceso.
              </p>
            </div>
          </div>

          {/* Botón de Cerrar Sesión (Vital para no quedar atrapado) */}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-lg shadow-slate-500/20 transition-all duration-200 hover:-translate-y-0.5"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>

        </div>
        
        <p className="mt-6 text-center text-slate-400 text-xs uppercase tracking-widest font-semibold opacity-60">
          Acceso Revocado
        </p>
      </div>
    </div>
  );
}