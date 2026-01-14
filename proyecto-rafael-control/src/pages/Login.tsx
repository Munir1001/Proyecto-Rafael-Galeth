import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertTriangle, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ThemeProvider } from 'next-themes';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.remove('dark');
    html.classList.add('light');
    body.classList.remove('dark');
    body.classList.add('light');

    html.setAttribute('data-theme', 'light');

    html.style.colorScheme = 'light only';
    body.style.colorScheme = 'light only';

    if (!html.classList.contains('forced-light')) {
      html.classList.add('forced-light');
    }

    return () => {
      html.style.colorScheme = '';
      body.style.colorScheme = '';
    };
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const html = document.documentElement;
      if (html.classList.contains('dark') || html.getAttribute('data-theme') === 'dark') {
        html.classList.remove('dark');
        html.classList.add('light');
        html.setAttribute('data-theme', 'light');
        html.style.colorScheme = 'light only';
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

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
    <ThemeProvider
      forcedTheme="light"
      attribute="class"
      disableTransitionOnChange
      enableSystem={false}
      defaultTheme="light"
    >
      <div className="h-screen flex bg-slate-50 overflow-hidden font-sans">

        {showBlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
              <button
                onClick={() => setShowBlockModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="text-center mt-2">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-50 mb-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed px-2">
                  Tus credenciales son correctas, pero <strong>aún no tienes un Área/Departamento asignado</strong>.
                  <br /><br />
                  Comunícate con un administrador del sistema.
                </p>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center px-6 bg-white overflow-hidden shadow-lg z-10">
          <div className="w-full max-w-md flex flex-col justify-center h-full max-h-screen py-4">
            
            <div className="mb-8 text-center shrink-0">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Bienvenido</h2>
              <p className="text-gray-500 text-sm">Accede a tu panel de trabajo.</p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3 shrink-0 animate-pulse-once">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                <span className="text-red-700 text-sm font-medium">{errorMsg}</span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 text-gray-900 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600 outline-none transition pr-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden autofill:bg-gray-50 autofill:shadow-[inset_0_0_0_1000px_rgb(249,250,251)]   autofill:text-gray-900"
                  placeholder="nombre@empresa.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Contraseña
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 text-gray-900 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600 outline-none transition pr-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden autofill:bg-gray-50 autofill:shadow-[inset_0_0_0px_1000px_#f9fafb] autofill:text-gray-900 autofill:caret-gray-900"
                    placeholder="••••••••"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-md transition-all duration-200 transform hover:scale-105 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed mt-4"
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

            <div className="text-center mt-8 p-3 bg-slate-100 rounded-lg shrink-0">
              <p className="text-xs text-slate-600 mb-1">
                ¿No posees una cuenta institucional?
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-800 transition-colors hover:underline text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" className="h-4 w-4" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M4 20a7 7 0 0 1 14 0m1-12v6m3-3h-6"/>
                </svg>
                Registrarse
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:w-1/2 relative">
          <div className="absolute inset-0 bg-gray-900/80 z-10"></div>
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
            alt="Office Background"
          />
          <div className="absolute bottom-0 left-0 right-0 p-12 text-white z-20">
            <h3 className="text-3xl font-bold mb-4 leading-tight">
              Gestión profesional para <br/> equipos modernos
            </h3>
            <p className="text-base text-gray-200 max-w-lg">
              Organización, rendimiento y productividad de manera centralizada.
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}