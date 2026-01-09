import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserPlus, CheckCircle, AlertCircle, Eye, EyeOff, Mail, Clock, LogIn } from 'lucide-react';

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

        if (!validateName(formData.nombre_completo)) {
            setErrorMsg("El nombre debe contener al menos 4 palabras (Dos nombres y dos apellidos).");
            setLoading(false);
            return;
        }

        try {
            const { data: phoneExists } = await supabase
                .from('usuarios')
                .select('id')
                .eq('telefono', formData.telefono)
                .maybeSingle();

            if (phoneExists) {
                throw new Error("El número de teléfono ya está registrado en el sistema.");
            }

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

            if (authData?.user?.identities?.length === 0) {
                throw new Error("Este correo ya está registrado. Por favor intente iniciar sesión.");
            }

            if (authData.user) {
                setShowSuccessModal(true);
            }

        } catch (error: any) {
            console.error("Error de registro:", error);
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
        // COMPACTO: h-screen y overflow-hidden aseguran que no haya scroll en la ventana principal
        <div className="h-screen flex bg-slate-50 overflow-hidden font-sans">

            {/* Modal de Éxito (Sin cambios estructurales) */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-slate-200">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 mb-4 ring-4 ring-emerald-100/50">
                                <div className="flex flex-col items-center">
                                    <CheckCircle className="h-8 w-8 text-emerald-600 mb-1" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-2 bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                ¡Registro Completado!
                            </h3>
                            <div className="text-slate-600 mb-6 leading-relaxed">
                                <p className="font-medium text-sm mb-2">
                                    🎉 <span className="text-emerald-600 font-semibold">Bienvenido al Sistema</span>
                                </p>
                                <p className="text-xs text-slate-500 mb-2">
                                    Hemos enviado un correo de confirmación a:
                                </p>
                                <div className="bg-slate-50 dark:bg-slate-800 rounded p-2 border border-slate-200 dark:border-slate-700 mb-3">
                                    <p className="font-mono text-sm text-slate-800 dark:text-slate-200 break-all">
                                        {formData.email}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-600 mb-3">
                                    Revisa tu bandeja de entrada (y Spam). El enlace expira en 24h.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg border border-transparent shadow-md px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-sm font-semibold text-white hover:from-indigo-700 hover:to-indigo-800 focus:outline-none transition-all duration-200"
                                >
                                    <Mail className="h-4 w-4" />
                                    Ir al Login
                                </button>
                            </div>
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
                <div className="absolute bottom-0 left-0 right-0 p-12 text-white z-20">
                    <h3 className="text-3xl font-bold mb-4 leading-tight">
                        Gestión Institucional <br /> Eficiente
                    </h3>
                    <p className="text-base text-gray-200 max-w-lg">
                        Acceso seguro y centralizado para la administración de recursos.
                    </p>
                </div>
            </div>

            {/* SECCIÓN DERECHA - Formulario Compacto */}
            <div className="flex-1 flex items-center justify-center px-6 bg-white overflow-hidden">
                <div className="w-full max-w-md flex flex-col justify-center h-full max-h-screen py-4">

                    {/* Encabezado más compacto (mb-4 en lugar de mb-8) */}
                    <div className="mb-4 text-center shrink-0">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1 bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text">
                            Crear Cuenta Institucional
                        </h2>
                        <p className="text-slate-500 text-xs leading-relaxed">
                            Complete el formulario para acceder al sistema.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="mb-3 p-2 bg-red-50 border-l-4 border-red-500 rounded-r flex items-start gap-2 animate-pulse-once shrink-0">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <span className="text-red-700 text-xs font-medium">{errorMsg}</span>
                        </div>
                    )}

                    {/* Formulario con space-y-3 para reducir altura */}
                    <form onSubmit={handleRegister} noValidate className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Nombre Completo</label>
                            {/* Input más delgado (py-2) */}
                            <input
                                id="nombre_completo"
                                type="text"
                                required
                                value={formData.nombre_completo}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder-slate-400 ${formData.nombre_completo && !validateName(formData.nombre_completo) ? 'border-red-300' : 'border-slate-200'
                                    }`}
                                placeholder="Nombres y Apellidos completos"
                            />
                            {formData.nombre_completo && !validateName(formData.nombre_completo) && (
                                <p className="text-[10px] text-red-500 mt-0.5">
                                    Ingrese mínimo 4 palabras (2 Nombres, 2 Apellidos)
                                </p>
                            )}
                        </div>

                        {/* Grid más ajustado (gap-3) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Correo</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder-slate-400"
                                    placeholder="usuario@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Teléfono</label>
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
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder-slate-400"
                                    placeholder="099..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Contraseña</label>
                            <div className="relative">
                                {/* Corrección icono doble mantenida */}
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={8}
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder-slate-400 pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {formData.password && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex gap-1 h-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-full transition-colors duration-300 ${i < strengthScore ? strengthColor[strengthScore - 1] : 'bg-slate-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-500 text-right font-medium">
                                        Seguridad: <span className={`${strengthScore < 3 ? 'text-red-500' : 'text-emerald-600'}`}>{strengthText[strengthScore] || "Fuerte"}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || strengthScore < 3}
                            className="w-full flex items-center justify-center px-4 py-2.5 bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-xl focus:ring-4 focus:ring-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-4 transform hover:scale-105 disabled:hover:scale-100 text-sm"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="font-medium">Procesando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    <span className="font-semibold">Crear Cuenta</span>
                                </div>
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-8 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg shrink-0">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                            ¿Posees una cuenta institucional?
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors hover:underline text-sm"
                        >
                            <LogIn className="h-4 w-4" /> Iniciar Sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}