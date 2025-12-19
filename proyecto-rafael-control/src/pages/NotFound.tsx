import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, Search, ChevronRight } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Fondo Grilla Decorativa */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
           style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
      />
      
      {/* Manchas de luz de fondo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-indigo-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative w-full max-w-2xl text-center">
        
        {/* Número 404 Grande con Estilo */}
        <div className="relative mb-2">
          <h1 className="text-[150px] md:text-[200px] font-black leading-none text-transparent bg-clip-text bg-linear-to-b from-slate-200 to-transparent dark:from-slate-800 dark:to-transparent select-none opacity-50">
            404
          </h1>
          
          {/* Tarjeta Flotante superpuesta al número */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-full max-w-md">
            <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700 p-8 md:p-10">
              
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl rotate-3">
                  <FileQuestion size={48} className="text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-3">
                Página no encontrada
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                La ruta que intentas buscar no existe, ha sido movida o simplemente se ha desvanecido en el ciberespacio.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-white bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Home size={20} />
                  Volver al Inicio
                </button>
                
                {/* Botón secundario tipo enlace */}
                <button
                  onClick={() => navigate(-1)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Regresar a la página anterior
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Sugerencia de búsqueda decorativa (solo visual) */}
        <div className="mt-32 md:mt-24 opacity-0 animate-[fadeIn_1s_ease-out_0.5s_forwards]">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 backdrop-blur-sm">
            <Search size={14} />
            <span>¿Buscabas algo específico en el sistema?</span>
            <ChevronRight size={14} />
          </div>
        </div>

      </div>
    </div>
  );
}