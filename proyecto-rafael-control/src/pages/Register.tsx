import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre_completo: '',
        email: '',
        password: '',
        telefono: ''
    });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    const [defaultRoleId, setDefaultRoleId] = useState('');

    useEffect(() => {
        const fetchDefaultRole = async () => {
            const { data } = await supabase
                .from('roles')
                .select('id')
                .eq('nombre', 'Usuarios')
                .single();
            
            if (data) setDefaultRoleId(data.id);
        };
        fetchDefaultRole();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        if (!defaultRoleId) {
            setErrorMsg("Error de sistema: No se pudo asignar un rol automático.");
            setLoading(false);
            return;
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: { data: { full_name: formData.nombre_completo } }
            });

            if (authError) throw authError;

            if (authData.user) {
                const { error: dbError } = await supabase.from('usuarios').insert([{
                    id: authData.user.id,
                    email: formData.email,
                    nombre_completo: formData.nombre_completo,
                    telefono: formData.telefono,
                    rol_id: defaultRoleId,
                    activo: true,
                    departamento_id: null
                }]);

                if (dbError) throw dbError;
                setShowSuccessModal(true);
            }
        } catch (error: any) {
            setErrorMsg(error.message || "Ocurrió un error al registrarse");
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
        <div className="h-screen flex bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden font-sans">
            
            {/* Modal de Éxito */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 rounded-t-2xl"></div>
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-5">
                                <CheckCircle className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Cuenta Creada!</h3>
                            <p className="text-gray-500 mb-6 leading-relaxed">
                                Tu registro fue exitoso, pero <span className="font-semibold text-gray-800">aún no puedes acceder</span>. 
                                Un administrador debe asignarte un <span className="text-emerald-600 font-bold">Departamento</span> antes de que puedas iniciar sesión.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-3 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                            >
                                Entendido, ir al Login
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN IZQUIERDA */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-800 mix-blend-multiply z-10"></div>
                <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                    alt="Teamwork Background"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20"></div>
                <div className="absolute bottom-0 left-0 right-0 p-12 z-30 text-white">
                    <h3 className="text-4xl font-bold mb-5 leading-tight tracking-tight">
                        Construye el futuro <br/>con tu equipo
                    </h3>
                    <p className="text-lg text-gray-200 max-w-lg leading-relaxed font-light">
                        Únete a la plataforma de gestión académica líder. Colabora, gestiona y alcanza tus objetivos.
                    </p>
                </div>
                <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl z-20"></div>
            </div>

            {/* SECCIÓN DERECHA - Formulario */}
            <div className="flex-1 flex items-center justify-center px-8 py-6 bg-white">
                <div className="w-full max-w-md">
                    <div className="mb-7">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2 text-center">Crear Cuenta</h2>
                        <p className="text-gray-500 text-center">Ingresa tus datos para registrarte en la plataforma.</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-5 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-red-700 text-sm">{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre Completo</label>
                            <input 
                                id="nombre_completo" 
                                type="text" 
                                required 
                                value={formData.nombre_completo} 
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all outline-none text-gray-900"
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo</label>
                                <input 
                                    id="email" 
                                    type="email" 
                                    required 
                                    value={formData.email} 
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all outline-none text-gray-900"
                                    placeholder="juan@correo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                                <input 
                                    id="telefono" 
                                    type="tel" 
                                    maxLength={10} 
                                    value={formData.telefono} 
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all outline-none text-gray-900"
                                    placeholder="099..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                            <input 
                                id="password" 
                                type="password" 
                                required 
                                minLength={8} 
                                value={formData.password} 
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all outline-none text-gray-900"
                                placeholder="••••••••"
                            />
                            {formData.password && (
                                <div className="mt-2.5 space-y-2">
                                    <div className="flex gap-1 h-1.5">
                                        {[...Array(5)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={`flex-1 rounded-full transition-colors duration-300 ${
                                                    i < strengthScore ? strengthColor[strengthScore - 1] : 'bg-gray-200'
                                                }`} 
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 text-right font-medium">
                                        Seguridad: <span className={`${strengthScore < 3 ? 'text-red-500' : 'text-emerald-600'}`}>{strengthText[strengthScore] || "Fuerte"}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || strengthScore < 3}
                            className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 focus:ring-4 focus:ring-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-5"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><UserPlus className="mr-2 h-5 w-5" /> Crear Cuenta</>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        ¿Ya tienes una cuenta? <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">Inicia sesión</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}