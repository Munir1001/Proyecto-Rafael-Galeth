import { useNavigate } from 'react-router-dom';
import { ShieldBan, ArrowLeft, LockKeyhole } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Fondo decorativo animado */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-red-500/10 blur-[100px] animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-orange-500/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Tarjeta Glassmorphism */}
        <div className="backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 md:p-12 text-center transform transition-all hover:scale-[1.01] duration-500">
          
          {/* Icono Principal con efecto de brillo */}
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
            <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded-full animate-ping opacity-20 duration-1000" />
            <div className="relative flex items-center justify-center w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full border-2 border-red-100 dark:border-red-800">
              <ShieldBan size={48} className="text-red-500 dark:text-red-400 drop-shadow-sm" />
            </div>
            {/* Pequeño icono flotante */}
            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-700">
              <LockKeyhole size={20} className="text-slate-400" />
            </div>
          </div>

          {/* Textos */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white mb-4 tracking-tight">
            Acceso Restringido
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg leading-relaxed">
            Lo sentimos, pero no tienes los permisos necesarios (Rol) para visualizar esta sección.
          </p>

          {/* Sección de "Qué hacer" */}
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 mb-8 border border-red-100 dark:border-red-900/20 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">
                Si crees que esto es un error, por favor contacta a tu administrador para revisar tu nivel de acceso.
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(-1)} // Vuelve atrás en el historial
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-lg"
            >
              <ArrowLeft size={20} />
              Volver Atrás
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3.5 rounded-xl font-semibold text-white bg-linear-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 shadow-lg shadow-orange-500/20 transition-all duration-300 transform hover:-translate-y-1"
            >
              Ir al Dashboard
            </button>
          </div>

        </div>
        
        {/* Footer sutil */}
        <p className="mt-8 text-center text-slate-400 dark:text-slate-600 text-sm font-mono">
          ERROR CODE: 403_FORBIDDEN
        </p>
      </div>
    </div>
  );
}