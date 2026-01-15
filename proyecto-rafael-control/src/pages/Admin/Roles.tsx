import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    ShieldCheck,
    Users,
    X,
    AlertTriangle, // Para el Toast de error/advertencia
    CheckCircle    // Para el Toast de éxito
} from "lucide-react";
import { Spinner } from "flowbite-react";

// --- INTERFACES ---
interface Rol {
    id: string;
    nombre: string;
    descripcion: string | null;
    usuarios_count: number;
}

// Interfaz para la notificación
interface Notification {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
}

export default function Roles() {
    const [roles, setRoles] = useState<Rol[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRol, setEditingRol] = useState<Rol | null>(null);
    const [form, setForm] = useState({
        nombre: "",
        descripcion: ""
    });

    // Estado para la Notificación Toast
    const [notification, setNotification] = useState<Notification>({ show: false, message: "", type: 'success' });

    useEffect(() => {
        fetchRoles();
    }, []);

    // --- HELPER: MOSTRAR TOAST ---
    const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, 3500);
    };

    // ===============================
    // 🟦 CARGA ROLES + CONTADOR
    // ===============================
    const fetchRoles = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("roles")
            .select(`
        id,
        nombre,
        descripcion,
        usuarios:usuarios(count)
      `)
            .order("created_at", { ascending: false });

        if (error) console.error(error);

        const mapped =
            data?.map((r: any) => ({
                id: r.id,
                nombre: r.nombre,
                descripcion: r.descripcion,
                usuarios_count: r.usuarios?.[0]?.count || 0
            })) || [];

        setRoles(mapped);
        setLoading(false);
    };

    // ===============================
    // 🟦 MODAL
    // ===============================
    const openModal = (rol?: Rol) => {
        if (rol) {
            setEditingRol(rol);
            setForm({
                nombre: rol.nombre,
                descripcion: rol.descripcion || ""
            });
        } else {
            setEditingRol(null);
            setForm({ nombre: "", descripcion: "" });
        }
        setIsModalOpen(true);
    };

    // ===============================
    // 🟦 GUARDAR
    // ===============================
    const saveRol = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingRol) {
            // UPDATE
            const { error } = await supabase
                .from("roles")
                .update({
                    nombre: form.nombre,
                    descripcion: form.descripcion || null
                })
                .eq("id", editingRol.id);

            if (error) {
                showToast("Error al actualizar el rol", "error");
                return;
            }
            showToast("Rol actualizado correctamente", "success");
        } else {
            // INSERT
            const { error } = await supabase.from("roles").insert({
                nombre: form.nombre,
                descripcion: form.descripcion || null
            });

            if (error) {
                showToast("Error al crear el rol", "error");
                return;
            }
            showToast("Rol creado con éxito", "success");
        }

        setIsModalOpen(false);
        fetchRoles();
    };

    // ===============================
    // 🟥 ELIMINAR (PROTECCIÓN REAL)
    // ===============================
    const deleteRol = async (rol: Rol) => {
        // Validación de negocio: No borrar si hay usuarios
        if (rol.usuarios_count > 0) {
            showToast("Acción denegada: El rol tiene usuarios asignados.", "error");
            return;
        }

        if (!confirm("¿Estás seguro de eliminar este rol?")) return;

        const { error } = await supabase.from("roles").delete().eq("id", rol.id);

        if (error) {
            showToast("Error al eliminar el rol", "error");
        } else {
            showToast("Rol eliminado correctamente", "success");
            fetchRoles();
        }
    };

    const filtered = roles.filter((r) =>
        r.nombre.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 relative overflow-hidden">

            {/* --- ESTILOS INYECTADOS PARA ANIMACIONES --- */}
            <style>{`
                @keyframes slideDown {
                    0% { transform: translateY(-50px) scale(0.95); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                .modal-animate-enter {
                    animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slideInRight {
                    0% { transform: translateX(100%); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                .toast-enter {
                    animation: slideInRight 0.3s ease-out forwards;
                }
            `}</style>

            {/* --- TOAST NOTIFICATION --- */}
            {notification.show && (
                <div className="fixed top-5 right-5 z-100 toast-enter">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border-l-4 backdrop-blur-md
                        ${notification.type === 'error'
                            ? 'bg-orange-500/90 text-white border-orange-700'
                            : notification.type === 'warning'
                                ? 'bg-yellow-400/90 text-slate-900 border-yellow-600'
                                : 'bg-green-500/90 text-white border-green-700' // Success
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
                {/* HEADER */}
                <div className="mb-8 backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 overflow-hidden">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

                        {/* Título */}
                        <div className="flex items-center gap-3">
                            <div className="p-3 sm:p-4 bg-linear-to-br from-indigo-400 to-blue-800 rounded-2xl shadow-lg shadow-indigo-500/30 shrink-0">
                                <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <div>
            <h1 className="
  text-2xl sm:text-3xl lg:text-4xl font-bold
  bg-gradient-to-r from-indigo-600 to-blue-800
  bg-clip-text text-transparent
  dark:bg-gradient-to-r dark:from-indigo-300 dark:via-blue-200 dark:to-purple-300
  dark:text-transparent
">                                        Roles
                                </h1>
                                <p className="text-slate-500 flex items-center gap-2 text-sm">
                                    Control de permisos y accesos
                                </p>
                            </div>
                        </div>

                        {/* Botón */}
                        <button
                            onClick={() => openModal()}
                            className="w-full lg:w-auto px-6 py-3 bg-linear-to-r from-indigo-400 to-blue-800 text-white rounded-xl font-semibold transition shadow-lg shadow-indigo-500/20 lg:hover:scale-105 active:scale-95"
                        >
                            <Plus className="inline mr-2" />
                            Nuevo Rol
                        </button>

                    </div>
                </div>


                {/* BUSCADOR */}
                <div className="mb-6 max-w-md relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition" />
                    <input
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300 shadow-sm"
                        placeholder="Buscar rol..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* CARDS */}
{loading ? (
  <div className="flex justify-center py-20">
    <Spinner size="xl" />
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {filtered.map((rol) => {
      const count = rol.usuarios_count ?? 0;
      const textoUsuarios =
        count === 0
          ? "Ningún usuario asignado"
          : count === 1
            ? "1 usuario asignado"
            : `${count} usuarios asignados`;

      return (
        <div
          key={rol.id}
          className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {rol.nombre}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {rol.descripcion || "Sin descripción"}
              </p>
            </div>
            <ShieldCheck className="text-indigo-500" />
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg w-fit">
            <Users className="h-4 w-4" />
            {textoUsuarios}
          </div>

          <div className="mt-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => openModal(rol)}
              className="p-2 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg transition"
              title="Editar"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => deleteRol(rol)}
              className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition"
              title="Eliminar"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      );
    })}
  </div>
)}
            </div>

            {/* MODAL ANIMADO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    {/* AQUÍ SE APLICA LA ANIMACIÓN 'modal-animate-enter' */}
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden modal-animate-enter">
                        <div className="bg-linear-to-r from-indigo-100 to-blue-800 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-black flex items-center gap-2">
                                {editingRol ? <Edit2 size={20} className="text-indigo-800" /> : <Plus size={20} className="text-indigo-800" />}
                                {editingRol ? "Editar Rol" : "Nuevo Rol"}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="bg-white/20 hover:bg-white/40 text-black p-1 rounded-full transition"
                            >
                                <X size={20} className="text-indigo-900" />
                            </button>
                        </div>

                        <form onSubmit={saveRol} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="nombre-rol" className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Rol</label>
                                <input
                                    required
                                    id="nombre-rol"
                                    placeholder="Ej. Administrador, Editor"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:border-indigo-500 focus:ring-0 transition"
                                    readOnly
                                    value={form.nombre}
                                    onChange={(e) =>
                                        setForm({ ...form, nombre: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                                <textarea
                                    rows={3}
                                    placeholder="Describe las responsabilidades de este rol..."
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:border-indigo-500 focus:ring-0 transition resize-none"
                                    value={form.descripcion}
                                    onChange={(e) =>
                                        setForm({ ...form, descripcion: e.target.value })
                                    }
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-linear-to-r from-indigo-600 to-blue-800 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition transform"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}