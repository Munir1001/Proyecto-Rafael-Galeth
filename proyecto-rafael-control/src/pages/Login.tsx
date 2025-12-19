import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertTriangle, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error("Credenciales incorrectas o usuario no registrado.");

      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('usuarios')
          .select('*, roles(nombre)')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw new Error("No se pudo cargar el perfil del usuario.");

        const roleName = profile.roles?.nombre;
        const hasDepartment = !!profile.departamento_id;

        if (roleName !== 'Admin' && !hasDepartment) {
          await supabase.auth.signOut();
          setShowBlockModal(true);
          return;
        }

        navigate('/');
      }

    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden font-sans">
      
      {/* Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowBlockModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X size={20} />
            </button>
            <div className="text-center mt-2">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-50 mb-5">
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Acceso Restringido</h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed px-4">
                    Tus credenciales son correctas, pero <strong>aún no tienes un Área/Departamento asignado</strong>.
                    <br /><br />
                    Comunícate con un administrador del sistema.
                </p>
                <button onClick={() => setShowBlockModal(false)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    Entendido
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white shadow-lg">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Bienvenido</h2>
            <p className="text-gray-500">Accede a tu panel de trabajo.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <span className="text-red-700 text-sm font-medium">{errorMsg}</span>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-600 outline-none transition"
                placeholder="nombre@empresa.com"
              />
            </div>

            {/* Campo contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-600 outline-none transition pr-12"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl shadow-md transition disabled:opacity-70"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" /> Iniciar Sesión
                </>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            ¿Aún no tienes cuenta?{" "}
            <Link
              to="/register"
              className="font-semibold text-blue-700 hover:underline"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>

      {/* Lado derecho imagen */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gray-900/80 z-10"></div>
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
          alt="Office Background"
        />
        <div className="absolute bottom-0 left-0 right-0 p-20 text-white z-20">
          <h3 className="text-4xl font-bold mb-6 leading-tight">
            Gestión profesional para equipos modernos
          </h3>
          <p className="text-lg text-gray-200 max-w-lg">
            Organización, rendimiento y productividad de manera centralizada.
          </p>
        </div>
      </div>
    </div>
  );
}
