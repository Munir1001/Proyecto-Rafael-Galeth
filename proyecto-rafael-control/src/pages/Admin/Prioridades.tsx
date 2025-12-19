import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    AlertTriangle,
    Layers,
    X,
    CheckCircle} from "lucide-react";
import { Spinner } from "flowbite-react";

// --- INTERFACES ---
interface Prioridad {
    id: string;
    nombre: string;
    nivel: number;
    color: string;
    tareas_count: number;
}

// Tipo para nuestra notificación personalizada
interface Notification {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
}

export default function Prioridades() {
    const [prioridades, setPrioridades] = useState<Prioridad[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrioridad, setEditingPrioridad] = useState<Prioridad | null>(null);

    // Estado para la notificación animada
    const [notification, setNotification] = useState<Notification>({ show: false, message: "", type: 'success' });

    const [form, setForm] = useState({
        nombre: "",
        nivel: 1,
        color: "#ef4444"
    });

    useEffect(() => {
        fetchPrioridades();
    }, []);

    // --- FUNCIÓN PARA MOSTRAR NOTIFICACIÓN ---
    const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
        setNotification({ show: true, message, type });
        // Ocultar automáticamente después de 3 segundos
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, 3500);
    };

    // ===============================
    // 🟦 CARGA PRIORIDADES + CONTADOR
    // ===============================
    const fetchPrioridades = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("prioridades")
            .select(`
                id, nombre, nivel, color,
                tareas:tareas(count)
            `)
            .order("nivel", { ascending: true });

        if (error) console.error(error);

        const mapped = data?.map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            nivel: p.nivel,
            color: p.color,
            tareas_count: p.tareas?.[0]?.count || 0
        })) || [];

        setPrioridades(mapped);
        setLoading(false);
    };

    // ===============================
    // 🟦 MODAL
    // ===============================
    const openModal = (prioridad?: Prioridad) => {
        if (prioridad) {
            setEditingPrioridad(prioridad);
            setForm({
                nombre: prioridad.nombre,
                nivel: prioridad.nivel,
                color: prioridad.color
            });
        } else {
            setEditingPrioridad(null);
            setForm({
                nombre: "",
                nivel: 1,
                color: "#ef4444"
            });
        }
        setIsModalOpen(true);
    };

    // ===============================
    // 🟦 GUARDAR
    // ===============================
    const savePrioridad = async (e: React.FormEvent) => {
        e.preventDefault();

        const nivelExiste = await validarNivelUnico(
            form.nivel,
            editingPrioridad?.id
        );

        if (nivelExiste) {
            showToast("Ya existe una prioridad con ese nivel.", "warning");
            return;
        }

        if (editingPrioridad) {
            const { error } = await supabase
                .from("prioridades")
                .update({
                    nombre: form.nombre,
                    nivel: form.nivel,
                    color: form.color
                })
                .eq("id", editingPrioridad.id);

            if (error) {
                showToast("Error actualizando prioridad", "error");
                return;
            }
            showToast("Prioridad actualizada correctamente", "success");
        } else {
            const { error } = await supabase
                .from("prioridades")
                .insert({
                    nombre: form.nombre,
                    nivel: form.nivel,
                    color: form.color
                });

            if (error) {
                showToast("Error creando prioridad", "error");
                return;
            }
            showToast("Prioridad creada con éxito", "success");
        }

        setIsModalOpen(false);
        fetchPrioridades();
    };

    // ===============================
    // 🟥 ELIMINAR (PROTECCIÓN FK)
    // ===============================
    const deletePrioridad = async (prioridad: Prioridad) => {
        if (prioridad.tareas_count > 0) {
            showToast("Acción no permitida: Tiene tareas asociadas.", "error");
            return;
        }

        if (!confirm("¿Eliminar esta prioridad?")) return;

        const { error } = await supabase
            .from("prioridades")
            .delete()
            .eq("id", prioridad.id);

        if (error) {
            showToast("Error eliminando prioridad", "error");
        } else {
            showToast("Prioridad eliminada", "success");
            fetchPrioridades();
        }
    };

    const filtered = prioridades.filter((p) =>
        p.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const validarNivelUnico = async (nivel: number, id?: string) => {
        let query = supabase
            .from("prioridades")
            .select("id")
            .eq("nivel", nivel);

        if (id) query = query.neq("id", id);
        const { data } = await query;
        return data && data.length > 0;
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-red-50 to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 relative overflow-hidden">
            
            {/* ESTILOS CSS INYECTADOS PARA ANIMACIONES */}
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

            {/* --- NOTIFICACIÓN TOAST FLOTANTE --- */}
            {notification.show && (
                <div className="fixed top-5 right-5 z-100 toast-enter">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border-l-4 backdrop-blur-md
                        ${notification.type === 'error' 
                            ? 'bg-orange-500/90 text-white border-orange-700' // Estilo similar a tu imagen
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
                                {notification.type === 'error' ? 'Acción no permitida' : notification.type === 'warning' ? 'Precaución' : 'Éxito'}
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
                <div className="mb-8 backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 rounded-2xl shadow-xl p-8">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-linear-to-br from-red-500 to-rose-700 rounded-2xl shadow-lg shadow-red-500/30">
                                <AlertTriangle className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold bg-linear-to-r from-red-600 to-rose-700 bg-clip-text text-transparent">
                                    Prioridades
                                </h1>
                                <p className="text-slate-500 flex items-center gap-2">
                                    <Layers className="h-4 w-4" />
                                    Nivel de urgencia de tareas
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => openModal()}
                            className="px-6 py-3 bg-linear-to-r from-red-500 to-rose-700 text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition shadow-lg shadow-red-500/20"
                        >
                            <Plus className="inline mr-2" />
                            Nueva Prioridad
                        </button>
                    </div>
                </div>

                {/* BUSCADOR */}
                <div className="mb-6 max-w-md relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                    <input
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition shadow-sm"
                        placeholder="Buscar prioridad..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* CARDS */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spinner size="xl" color="failure" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {filtered.map((prioridad) => (
                            <div
                                key={prioridad.id}
                                className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-3 w-3 rounded-full ring-2 ring-slate-100 dark:ring-slate-700"
                                                style={{ backgroundColor: prioridad.color }}
                                            />
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                {prioridad.nombre}
                                            </h3>
                                        </div>
                                        <p className="text-slate-500 text-sm mt-1 ml-5">
                                            Nivel <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{prioridad.nivel}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg w-fit">
                                    <Layers className="h-4 w-4" />
                                    {prioridad.tareas_count} tareas asociadas
                                </div>

                                <div className="mt-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={() => openModal(prioridad)}
                                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                        title="Editar"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => deletePrioridad(prioridad)}
                                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                        title="Eliminar"
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
                    {/* AQUÍ ESTÁ LA MAGIA DE LA ANIMACIÓN: 
                       "modal-animate-enter" (definida en el <style> arriba)
                    */}
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden modal-animate-enter">
                        <div className="bg-linear-to-r from-red-500 to-rose-700 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingPrioridad ? <Edit2 size={20}/> : <Plus size={20}/>}
                                {editingPrioridad ? "Editar Prioridad" : "Nueva Prioridad"}
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="bg-white/20 hover:bg-white/30 text-white p-1 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={savePrioridad} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                                <input
                                    required
                                    placeholder="Ej. Alta, Media, Baja"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 focus:ring-0 transition"
                                    value={form.nombre}
                                    onChange={(e) =>
                                        setForm({ ...form, nombre: e.target.value })
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nivel (Prioridad)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        required
                                        placeholder="1"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 focus:ring-0 transition"
                                        value={form.nivel}
                                        onChange={(e) =>
                                            setForm({ ...form, nivel: Number(e.target.value) })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Color Distintivo</label>
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
                                    className="px-6 py-2.5 bg-linear-to-r from-red-500 to-rose-700 text-white rounded-xl font-medium shadow-lg shadow-red-500/30 hover:shadow-xl hover:scale-105 transition transform"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}