import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserPlus, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre_completo: '',
        email: '',
        password: '',
        telefono: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Validación de Nombre (Min 4 palabras)
    const validateName = (name: string) => {
        const words = name.trim().split(/\s+/);
        return words.length >= 4;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        // 1. VALIDACIÓN DE NOMBRE (Estricta)
        if (!validateName(formData.nombre_completo)) {
            setErrorMsg("El nombre debe contener al menos 4 palabras (Dos nombres y dos apellidos).");
            setLoading(false);
            return;
        }

        try {
            // 2. VALIDACIÓN DE TELÉFONO EN BD
            // Nota: Esto puede fallar si tienes RLS (Row Level Security) activado y no permites lecturas públicas.
            // Si falla silenciosamente, el Trigger de la base de datos debería detener la inserción de duplicados.
            const { data: phoneExists } = await supabase
                .from('usuarios')
                .select('id')
                .eq('telefono', formData.telefono)
                .maybeSingle();

            if (phoneExists) {
                throw new Error("El número de teléfono ya está registrado en el sistema.");
            }

            // 3. INTENTO DE REGISTRO (AUTH)
            // Dejamos que Supabase Auth nos diga si el correo ya existe.
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        nombre_completo: formData.nombre_completo,
                        telefono: formData.telefono
                    }
                }
            });

            if (authError) throw authError;

            // Validación crucial: Si el usuario ya existía pero no estaba confirmado, 
            // o si Supabase detecta duplicado sin lanzar error (dependiendo config),
            // verificamos si retornó un usuario e identidad.
            if (authData?.user?.identities?.length === 0) {
                throw new Error("Este correo ya está registrado. Por favor intente iniciar sesión.");
            }

            // ÉXITO
            if (authData.user) {
                setShowSuccessModal(true);
            }

        } catch (error: any) {
            console.error("Error de registro:", error);

            // Manejo de errores específicos de Supabase
            let message = error.message;

            if (message.includes('already registered') || message.includes('unique constraint')) {
                message = "El correo electrónico o teléfono ya se encuentran registrados.";
            } else if (message.includes('Password should be')) {
                message = "La contraseña es muy débil.";
            }

            setErrorMsg(message || "Ocurrió un error al registrarse. Intente nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    // Validaciones visuales de contraseña
    const passwordRules = {
        length: (pwd: string) => pwd.length >= 8,
        uppercase: (pwd: string) => /[A-Z]/.test(pwd),
        lowercase: (pwd: string) => /[a-z]/.test(pwd),
        number: (pwd: string) => /[0-9]/.test(pwd),
        special: (pwd: string) => /[^A-Za-z0-9]/.test(pwd),
    };
    const strengthScore = Object.values(passwordRules).filter(rule => rule(formData.password)).length;
    const strengthColor = ["bg-red-500", "bg-red-400", "bg-yellow-400", "bg-emerald-500", "bg-green-600"];
    const strengthText = ["Muy débil", "Débil", "Media", "Fuerte", "Segura"];

    return (
        <div className="h-screen flex bg-slate-50 overflow-hidden font-sans">

            {/* Modal de Éxito */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative border border-slate-200">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-50 mb-5">
                                <CheckCircle className="h-8 w-8 text-indigo-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Registro Exitoso</h3>
                            <p className="text-slate-600 mb-6 leading-relaxed text-sm">
                                Tu cuenta ha sido creada correctamente. <br />
                                <span className="font-semibold text-slate-800">Nota:</span> Un administrador debe activar tu cuenta o asignarte un departamento.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2.5 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                Entendido, ir al Login
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN IZQUIERDA - Imagen Formal */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <div className="absolute inset-0 bg-gray-900/60 z-10"></div>
                <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop"
                    alt="Office Background"
                />
                <div className="absolute bottom-0 left-0 right-0 p-20 text-white z-20">
                    <h3 className="text-4xl font-bold mb-6 leading-tight">
                            Gestión Institucional <br /> Eficiente
                        </h3>
                       <p className="text-lg text-gray-200 max-w-lg">
                            Acceso seguro y centralizado para la administración de recursos.
                        </p>
                </div>
            </div>

            {/* SECCIÓN DERECHA - Formulario */}
            <div className="flex-1 flex items-center justify-center px-8 py-6 bg-white overflow-y-auto">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Crear nueva cuenta</h2>
                        <p className="text-slate-500 text-sm">Complete sus datos institucionales.</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r flex items-start gap-3 animate-pulse-once">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                            <span className="text-red-700 text-sm font-medium">{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Nombre Completo</label>
                            <input
                                id="nombre_completo"
                                type="text"
                                required
                                value={formData.nombre_completo}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder-slate-400 ${formData.nombre_completo && !validateName(formData.nombre_completo) ? 'border-red-300' : 'border-slate-200'
                                    }`}
                                placeholder="Nombres y Apellidos completos"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                {formData.nombre_completo && !validateName(formData.nombre_completo)
                                    ? <span className="text-red-500">Ingrese mínimo 4 palabras (2 Nombres, 2 Apellidos)</span>
                                    : "Debe incluir dos nombres y dos apellidos."
                                }
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Correo</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder-slate-400"
                                    placeholder="usuario@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Teléfono</label>
                                <input
                                    id="telefono"
                                    type="tel"
                                    maxLength={10}
                                    value={formData.telefono}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) {
                                            setFormData({ ...formData, telefono: e.target.value });
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder-slate-400"
                                    placeholder="099..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Contraseña</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={8}
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder-slate-400 pr-10"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>

                            {formData.password && (
                                <div className="mt-3 space-y-2">
                                    <div className="flex gap-1 h-1.5">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-full transition-colors duration-300 ${i < strengthScore ? strengthColor[strengthScore - 1] : 'bg-slate-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 text-right font-medium">
                                        Seguridad: <span className={`${strengthScore < 3 ? 'text-red-500' : 'text-emerald-600'}`}>{strengthText[strengthScore] || "Fuerte"}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || strengthScore < 3}
                            className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 hover:shadow-lg focus:ring-4 focus:ring-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><UserPlus className="mr-2 h-5 w-5" /> Registrarse</>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-8">
                        ¿Ya tienes una cuenta? <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">Iniciar sesión</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}