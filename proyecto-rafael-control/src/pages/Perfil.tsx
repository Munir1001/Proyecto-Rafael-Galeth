import { useEffect, useState, useRef } from "react";
import { supabase } from '../supabaseClient';
import {
    Save,
    Camera,
    Lock,
    User,
    Mail,
    Briefcase,
    DollarSign,
    ShieldCheck,
    AlertTriangle,
    CheckCircle,
    X,
    Loader2
} from "lucide-react";
import { Spinner } from "flowbite-react";

// --- INTERFACES ---
interface UsuarioPerfil {
    id: string;
    nombre_completo: string;
    email: string;
    telefono: string;
    avatar_url: string | null;
    salario_base: number;
    rol: { nombre: string } | null; // Join con roles
    departamento: { nombre: string } | null;
}

// Interfaz para la notificación
interface Notification {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
}

export default function Perfil() {
    const [profile, setProfile] = useState<UsuarioPerfil | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Estado para cambio de contraseña
    const [passwords, setPasswords] = useState({
        newPassword: "",
        confirmPassword: ""
    });

    // Referencia para el input de archivo
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado para la Notificación Toast
    const [notification, setNotification] = useState<Notification>({ show: false, message: "", type: 'success' });

    useEffect(() => {
        fetchProfile();
    }, []);

    // --- HELPER: MOSTRAR TOAST ---
    const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, 3500);
    };

    // ===============================
    // 🟦 CARGAR PERFIL
    // ===============================
    const fetchProfile = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data, error } = await supabase
            .from("usuarios")
            .select(`
                id,
                nombre_completo,
                email,
                telefono,
                avatar_url,
                salario_base,
                rol:roles(nombre),
                departamento:departamentos!usuarios_departamento_id_fkey(nombre)
            `) // ^^^ AQUÍ ESTÁ EL CAMBIO IMPORTANTE
            .eq("id", user.id)
            .single();

        if (error) {
            console.error("Error fetching profile:", error); // Útil para depurar
            showToast("Error al cargar perfil", "error");
        } else {
            // Mapeo seguro de datos
            const safeData: UsuarioPerfil = {
                ...data,
                rol: Array.isArray(data.rol) ? data.rol[0] : data.rol,
                departamento: Array.isArray(data.departamento) ? data.departamento[0] : data.departamento
            };
            setProfile(safeData);
        }
        setLoading(false);
    };

    // ===============================
    // 📷 SUBIR FOTO
    // ===============================
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error("Debes seleccionar una imagen.");
            }

            const file = event.target.files[0];
            // Validar tamaño (ejemplo max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                throw new Error("La imagen es muy pesada (Máx 2MB).");
            }

            const fileExt = file.name.split('.').pop();
            // USAR SIEMPRE EL ID DEL USUARIO como nombre de archivo
            // Esto sobrescribe la foto anterior y ahorra espacio.
            const fileName = `${profile?.id}.${fileExt}`;
            
            // 1. Subir a SeaweedFS
            const formData = new FormData();
            formData.append('file', file, fileName);
            
            const response = await fetch('/seaweedfs/avatars/' + fileName, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error("Error al subir la imagen a SeaweedFS");
            }

            // 2. Construir URL pública
            const endpoint = import.meta.env.VITE_SEAWEDFS_ENDPOINT || 'localhost'
            const port = import.meta.env.VITE_SEAWEDFS_PORT || '8888'
            const useSSL = (import.meta.env.VITE_SEAWEDFS_USE_SSL || 'false').toLowerCase() === 'true'
            const publicUrl = `${useSSL ? 'https' : 'http'}://${endpoint}:${port}/avatars/${fileName}`;
            
            // TRUCO DE CACHÉ:
            // Agregamos un timestamp (?t=...) al final de la URL.
            // Esto no cambia la BD, pero fuerza a React a recargar la imagen nueva.
            const publicUrlWithCacheBuster = `${publicUrl}?t=${new Date().getTime()}`;

            // 3. Actualizar base de datos (guardamos la URL limpia sin el timestamp)
            const { error: updateError } = await supabase
                .from('usuarios')
                .update({ avatar_url: publicUrl })
                .eq('id', profile?.id);

            if (updateError) throw updateError;

            // 4. Actualizar estado local para ver el cambio instantáneo
            setProfile(prev => prev ? { ...prev, avatar_url: publicUrlWithCacheBuster } : null);

            showToast("Foto de perfil actualizada", "success");

        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Error al subir imagen", "error");
        } finally {
            setUploading(false);
        }
    };

    // ===============================
    // 💾 ACTUALIZAR DATOS BÁSICOS
    // ===============================
    const updateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        const { error } = await supabase
            .from('usuarios')
            .update({
                nombre_completo: profile.nombre_completo,
                telefono: profile.telefono
            })
            .eq('id', profile.id);

        if (error) {
            showToast("Error al actualizar datos", "error");
        } else {
            showToast("Perfil actualizado correctamente", "success");
        }
    };

    // ===============================
    // 🔒 ACTUALIZAR CONTRASEÑA
    // ===============================
    const updatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwords.newPassword !== passwords.confirmPassword) {
            showToast("Las contraseñas no coinciden", "warning");
            return;
        }

        if (passwords.newPassword.length < 6) {
            showToast("La contraseña debe tener al menos 6 caracteres", "warning");
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: passwords.newPassword
        });

        if (error) {
            showToast("No se pudo actualizar la contraseña. Verifica que no sea igual a la anterior.", "error");
        } else {
            showToast("Contraseña actualizada con éxito", "success");
            setPasswords({ newPassword: "", confirmPassword: "" });
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 relative overflow-hidden">

            {/* --- ESTILOS INYECTADOS --- */}
            <style>{`
                @keyframes slideInRight {
                    0% { transform: translateX(100%); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                .toast-enter {
                    animation: slideInRight 0.3s ease-out forwards;
                }
            `}</style>

            {/* --- TOAST --- */}
            {notification.show && (
                <div className="fixed top-5 right-5 z-100 toast-enter">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border-l-4 backdrop-blur-md
                        ${notification.type === 'error'
                            ? 'bg-orange-500/90 text-white border-orange-700'
                            : notification.type === 'warning'
                                ? 'bg-yellow-400/90 text-slate-900 border-yellow-600'
                                : 'bg-green-500/90 text-white border-green-700'
                        }
                    `}>
                        {notification.type === 'error' || notification.type === 'warning' ? (
                            <AlertTriangle className="h-6 w-6" />
                        ) : (
                            <CheckCircle className="h-6 w-6" />
                        )}
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-wider">
                                {notification.type === 'error' ? 'Error' : notification.type === 'warning' ? 'Aviso' : 'Éxito'}
                            </h4>
                            <p className="text-sm font-medium opacity-95">{notification.message}</p>
                        </div>
                        <button onClick={() => setNotification({ ...notification, show: false })} className="ml-4 hover:opacity-70">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">

                {/* --- HEADER --- */}
                <div className="mb-8 backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-3 sm:p-4 bg-linear-to-br from-indigo-400 to-blue-800 rounded-2xl shadow-lg shadow-indigo-500/30 shrink-0">
                            <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-linear-to-r from-indigo-600 to-blue-800 bg-clip-text text-transparent">
                                Mi Perfil
                            </h1>
                            <p className="text-slate-500 flex items-center gap-2 text-sm">
                                <ShieldCheck className="h-4 w-4" />
                                Gestiona tu información personal y seguridad
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spinner size="xl" />
                    </div>
                ) : profile ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

                        {/* 1. TARJETA DE RESUMEN Y FOTO (COLUMNA IZQUIERDA) */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group h-full flex flex-col">
                                <div className="absolute top-0 left-0 w-full h-24 bg-linear-to-r from-indigo-600 to-blue-800"></div>

                                <div className="relative mt-8 flex flex-col items-center">
                                    {/* Avatar Wrapper */}
                                    <div className="relative">
                                        <div className="h-32 w-32 rounded-full border-4 border-white dark:border-slate-800 shadow-xl bg-white flex items-center justify-center overflow-hidden selectable-none">
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-4xl font-bold text-indigo-300">
                                                    {profile.nombre_completo.charAt(0)}
                                                </span>
                                            )}

                                            {/* Loading Overlay */}
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <Loader2 className="animate-spin text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Botón Cámara */}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition active:scale-95"
                                            title="Cambiar foto"
                                        >
                                            <Camera size={18} />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                    </div>

                                    <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white text-center">
                                        {profile.nombre_completo}
                                    </h2>
                                    <span className="px-3 py-1 mt-2 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wide">
                                        {profile.rol?.nombre || "Sin Rol"}
                                    </span>
                                </div>

                                {/* Datos de solo lectura */}
                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Mail size={18} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs text-slate-400 font-medium">Correo Electrónico</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate" title={profile.email}>
                                                {profile.email}
                                            </p>
                                        </div>
                                        <Lock size={14} className="ml-auto text-slate-300" />
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                            <DollarSign size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Sueldo Base</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                ${profile.salario_base.toFixed(2)}
                                            </p>
                                        </div>
                                        <Lock size={14} className="ml-auto text-slate-300" />
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                            <Briefcase size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Departamento</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                {profile.departamento?.nombre || "No asignado"}
                                            </p>
                                        </div>
                                        <Lock size={14} className="ml-auto text-slate-300" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. FORMULARIOS DE EDICIÓN (COLUMNA DERECHA) */}
                        <div className="lg:col-span-2 grid grid-cols-1 gap-8 h-full">

                            {/* Formulario Datos Personales */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                                        <User size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Información Personal</h3>
                                </div>

                                <form onSubmit={updateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={profile.nombre_completo}
                                            onChange={(e) => setProfile({ ...profile, nombre_completo: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition outline-none"
                                            placeholder="Tu nombre"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={profile.telefono || ""}
                                            onChange={(e) => setProfile({ ...profile, telefono: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition outline-none"
                                            placeholder="+593 99 999 9999"
                                        />
                                    </div>

                                    <div className="md:col-span-2 flex justify-end mt-2">
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-indigo-600 to-blue-800 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition transform"
                                        >
                                            <Save size={18} />
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Formulario Seguridad */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">
                                        <Lock size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Seguridad</h3>
                                </div>

                                <form onSubmit={updatePassword} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nueva Contraseña</label>
                                            <input
                                                type="password"
                                                value={passwords.newPassword}
                                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition outline-none"
                                                placeholder="Mínimo 6 caracteres"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirmar Contraseña</label>
                                            <input
                                                type="password"
                                                value={passwords.confirmPassword}
                                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition outline-none"
                                                placeholder="Repite la nueva contraseña"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-orange-600 hover:border-orange-200 rounded-xl font-medium transition"
                                        >
                                            <ShieldCheck size={18} />
                                            Actualizar Contraseña
                                        </button>
                                    </div>
                                </form>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-500">
                        No se encontró información del perfil.
                    </div>
                )}
            </div>
        </div>
    );
}