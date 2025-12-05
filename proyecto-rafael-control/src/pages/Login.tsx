import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Autenticación con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error("Credenciales incorrectas o usuario no registrado.");

      if (authData.user) {
        // 2. Obtener perfil para verificar Rol y Departamento
        const { data: profile, error: profileError } = await supabase
          .from('usuarios')
          .select('*, roles(nombre)')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw new Error("Error al obtener los datos del usuario.");

        // --- LÓGICA DE NEGOCIO ---
        const roleName = profile.roles?.nombre;
        const hasDepartment = !!profile.departamento_id; // true si tiene, false si es null

        // REGLA: Si NO es Admin Y NO tiene departamento => BLOQUEO
        if (roleName !== 'Admin' && !hasDepartment) {
          // Bloqueamos el acceso cerrando la sesión inmediatamente
          await supabase.auth.signOut();
          setShowBlockModal(true);
          return;
        }

        // --- REDIRECCIÓN ---
        // Aquí puedes personalizar si quieres que el Admin vaya a otro lado
        // Por ahora todos van al Dashboard ('/') que se adapta dinámicamente
        navigate('/');
      }

    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 to-gray-100 overflow-hidden font-sans">
      
      {/* Modal de Bloqueo */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-400"></div>
            <button 
                onClick={() => setShowBlockModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={20} />
            </button>
            
            <div className="text-center mt-2">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-50 mb-5">
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Acceso Restringido
                </h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed px-4">
                    Tus credenciales son correctas, pero <strong>aún no tienes un Área/Departamento asignado</strong>.
                    <br /><br />
                    El sistema requiere esta asignación para cargar tus tareas. Por favor contacta a un Administrador.
                </p>
                <button
                    onClick={() => setShowBlockModal(false)}
                    className="w-full inline-flex justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-all"
                >
                    Entendido, cerrar
                </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN IZQUIERDA: Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-16 bg-white shadow-xl lg:shadow-none z-10">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 mb-2 text-center">Bienvenido</h2>
            <p className="text-gray-500 text-center">Ingresa a tu espacio de trabajo digital.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <span className="text-red-700 text-sm font-medium">{errorMsg}</span>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all outline-none text-gray-900"
                placeholder="nombre@empresa.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">¿Olvidaste tu contraseña?</a>
              </div>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)} 
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all outline-none text-gray-900"
                placeholder="••••••••"
              />
            </div>

            <button 
                onClick={handleLogin} 
                disabled={loading} 
                className="w-full flex items-center justify-center px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 focus:ring-4 focus:ring-blue-200 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 mt-2"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn className="mr-2 h-5 w-5" /> Iniciar Sesión</>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            ¿Aún no tienes cuenta? <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">Regístrate gratis</Link>
          </p>
        </div>
      </div>

      {/* SECCIÓN DERECHA: Ilustración */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-800 mix-blend-multiply z-10"></div>
        <img 
            className="absolute inset-0 h-full w-full object-cover" 
            src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop" 
            alt="Office Background" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-20"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-20 z-30 text-white">
            <div className="w-16 h-1 bg-blue-400 mb-6 rounded-full"></div>
            <h3 className="text-5xl font-bold mb-6 leading-tight tracking-tight">
                Gestión Inteligente <br/> para equipos modernos
            </h3>
            <p className="text-xl text-gray-200 max-w-lg font-light leading-relaxed">
                Centraliza tareas, optimiza tiempos y mejora el rendimiento de tu organización en una sola plataforma.
            </p>
        </div>
        
        {/* Decoración Abstracta */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl z-20 animate-pulse"></div>
        <div className="absolute bottom-40 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl z-20"></div>
      </div>
    </div>
  );
}