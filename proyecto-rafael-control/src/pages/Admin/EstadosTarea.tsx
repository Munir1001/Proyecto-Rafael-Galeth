import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle2,
    Layers,
    X,
    AlertTriangle, // Importado para el Toast de error
    CheckCircle    // Importado para el Toast de éxito
} from "lucide-react";
import { Spinner } from "flowbite-react";

// --- INTERFACES ---
interface EstadoTarea {
    id: string;
    nombre: string;
    color: string;
    es_final: boolean;
    tareas_count: number;
}

// Interfaz para la notificación
interface Notification {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
}

export default function EstadosTarea() {
    const [estados, setEstados] = useState<EstadoTarea[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Estado para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEstado, setEditingEstado] = useState<EstadoTarea | null>(null);

    // Estado para la Notificación Toast
    const [notification, setNotification] = useState<Notification>({ show: false, message: "", type: 'success' });

    const [form, setForm] = useState({
        nombre: "",
        color: "#6366f1",
        es_final: false
    });

    useEffect(() => {
        fetchEstados();
    }, []);

    // --- HELPER: MOSTRAR TOAST ---
    const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, 3500);
    };

    // ===============================
    // 🟦 CARGA ESTADOS + CONTADOR
    // ===============================
    const fetchEstados = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("estados_tarea")
            .select(`
                id,
                nombre,
                color,
                es_final,
                tareas:tareas(count)
            `)
            .order("created_at", { ascending: false });

        if (error) console.error(error);

        const mapped =
            data?.map((e: any) => ({
                id: e.id,
                nombre: e.nombre,
                color: e.color,
                es_final: e.es_final,
                tareas_count: e.tareas?.[0]?.count || 0
            })) || [];

        setEstados(mapped);
        setLoading(false);
    };

    // ===============================
    // 🟦 MODAL
    // ===============================
    const openModal = (estado?: EstadoTarea) => {
        if (estado) {
            setEditingEstado(estado);
            setForm({
                nombre: estado.nombre,
                color: estado.color,
                es_final: estado.es_final
            });
        } else {
            setEditingEstado(null);
            setForm({
                nombre: "",
                color: "#6366f1",
                es_final: false
            });
        }
        setIsModalOpen(true);
    };

    // ===============================
    // 🟦 GUARDAR
    // ===============================
    const saveEstado = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingEstado) {
            const { error } = await supabase
                .from("estados_tarea")
                .update({
                    nombre: form.nombre,
                    color: form.color,
                    es_final: form.es_final
                })
                .eq("id", editingEstado.id);

            if (error) {
                showToast("Error actualizando el estado", "error");
                return;
            }
            showToast("Estado actualizado correctamente", "success");
        } else {
            const { error } = await supabase.from("estados_tarea").insert({
                nombre: form.nombre,
                color: form.color,
                es_final: form.es_final
            });

            if (error) {
                showToast("Error creando el estado", "error");
                return;
            }
            showToast("Estado creado con éxito", "success");
        }

        setIsModalOpen(false);
        fetchEstados();
    };

    // ===============================
    // 🟥 ELIMINAR (PROTECCIÓN FK)
    // ===============================
    const deleteEstado = async (estado: EstadoTarea) => {
        if (estado.tareas_count > 0) {
            showToast("Acción denegada: El estado tiene tareas asociadas.", "error");
            return;
        }

        if (!confirm("¿Eliminar este estado de tarea?")) return;

        const { error } = await supabase
            .from("estados_tarea")
            .delete()
            .eq("id", estado.id);

        if (error) {
            showToast("Error al eliminar el estado", "error");
        } else {
            showToast("Estado eliminado correctamente", "success");
            fetchEstados();
        }
    };

    const filtered = estados.filter((e) =>
        e.nombre.toLowerCase().includes(search.toLowerCase())
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
                            <div className="p-4 bg-linear-to-br from-indigo-400 to-blue-800 rounded-2xl shadow-lg shadow-indigo-500/30">
                                <Layers className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-linear-to-r from-indigo-600 to-blue-800 bg-clip-text text-transparent">
                                    Estados de Tarea
                                </h1>
                                <p className="text-slate-500 flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Flujo y control del ciclo de vida
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => openModal()}
                             className="w-full lg:w-auto px-6 py-3 bg-linear-to-r from-indigo-400 to-blue-800 text-white rounded-xl font-semibold transition shadow-lg shadow-indigo-500/20 lg:hover:scale-105 active:scale-95"
                        >
                            <Plus className="inline mr-2" />
                            Nuevo Estado
                        </button>
                    </div>
                </div>

                {/* BUSCADOR */}
                <div className="mb-6 max-w-md relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition" />
                    <input
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300 shadow-sm"
                        placeholder="Buscar estado..."
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
                        {filtered.map((estado) => (
                            <div
                                key={estado.id}
                                className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-3 w-3 rounded-full ring-2 ring-slate-100 dark:ring-slate-700"
                                                style={{ backgroundColor: estado.color }}
                                            />
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                {estado.nombre}
                                            </h3>
                                        </div>
                                        <p className="text-slate-500 text-sm mt-1 ml-5">
                                            {estado.es_final ? "Estado final" : "Estado intermedio"}
                                        </p>
                                    </div>
                                    {estado.es_final && (
                                        <CheckCircle2 className="text-emerald-500" />
                                    )}
                                </div>

                                <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg w-fit">
                                    <Layers className="h-4 w-4" />
                                    {estado.tareas_count} tareas en este estado
                                </div>

                                <div className="mt-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={() => openModal(estado)}
                                        className="p-2 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg transition"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => deleteEstado(estado)}
                                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL ANIMADO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden modal-animate-enter">
                        <div className="bg-linear-to-r from-indigo-400 to-blue-800 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingEstado ? <Edit2 size={20}/> : <Plus size={20}/>}
                                {editingEstado ? "Editar Estado" : "Nuevo Estado"}
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="bg-white/20 hover:bg-white/30 text-white p-1 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={saveEstado} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Estado</label>
                                <input
                                    required
                                    placeholder="Ej. En Progreso, Completado"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:border-indigo-500 focus:ring-0 transition"
                                    value={form.nombre}
                                    onChange={(e) =>
                                        setForm({ ...form, nombre: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Etiqueta de Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        className="w-full h-12 rounded-xl border-2 border-slate-200 cursor-pointer p-1"
                                        value={form.color}
                                        onChange={(e) =>
                                            setForm({ ...form, color: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={form.es_final}
                                        onChange={(e) =>
                                            setForm({ ...form, es_final: e.target.checked })
                                        }
                                    />
                                    <div>
                                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            Marcar como estado final
                                        </span>
                                        <span className="block text-xs text-slate-500">
                                            Las tareas en este estado se considerarán completadas.
                                        </span>
                                    </div>
                                </label>
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