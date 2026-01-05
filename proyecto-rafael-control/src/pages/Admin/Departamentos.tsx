import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    ShieldCheck,
    Building2,
    Users,
    X,
    AlertTriangle,
    CheckCircle,
    ChevronUp,   // Nuevo icono
    ChevronDown, // Nuevo icono
    Check,        // Nuevo icono
    ShieldAlert,
    BuildingIcon
} from "lucide-react";

// --- INTERFACES ---
interface Departamento {
    id: string;
    nombre: string;
    descripcion: string | null;
    manager_id: string | null;
    manager?: { nombre_completo: string; avatar_url?: string | null };
}

interface Usuario {
    id: string;
    nombre_completo: string;
    es_manager: boolean;
    avatar_url?: string | null; // Añadido para mostrar avatar si existiera
}

interface Notification {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
}

export default function Departamentos() {
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [usuariosManager, setUsuariosManager] = useState<Usuario[]>([]);

    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Departamento | null>(null);
    const [form, setForm] = useState({
        nombre: "",
        descripcion: "",
        manager_id: ""
    });

    // Estado específico para el Dropdown personalizado
    const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
    const [managerSearch, setManagerSearch] = useState(""); // Buscador dentro del dropdown
    const dropdownRef = useRef<HTMLDivElement>(null); // Referencia para detectar clicks fuera

    // Notificaciones
    const [notification, setNotification] = useState<Notification>({ show: false, message: "", type: 'success' });

    useEffect(() => {
        fetchData();
    }, []);

    // Cerrar dropdown si se hace click fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsManagerDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, 3500);
    };

    const fetchData = async () => {
        setLoading(true);
        const { data: depts, error: deptError } = await supabase
            .from("departamentos")
            .select(`*, manager:usuarios!fk_departamento_manager (id, nombre_completo, avatar_url)`)
            .order("created_at", { ascending: false });

        if (deptError) {
            showToast(deptError.message, "error");
            setLoading(false);
            return;
        }

        const { data: users, error: userError } = await supabase
            .from("usuarios")
            .select("id, nombre_completo, es_manager, avatar_url")
            .eq("es_manager", true)
            .eq("activo", true);

        if (userError) {
            showToast(userError.message, "error");
            setLoading(false);
            return;
        }

        setDepartamentos(depts || []);
        setUsuariosManager(users || []);
        setLoading(false);
    };

    const openModal = (dept?: Departamento) => {
        if (dept) {
            setEditingDept(dept);
            setForm({
                nombre: dept.nombre,
                descripcion: dept.descripcion || "",
                manager_id: dept.manager_id || ""
            });
        } else {
            setEditingDept(null);
            setForm({ nombre: "", descripcion: "", manager_id: "" });
        }
        setIsManagerDropdownOpen(false); // Reiniciar estado dropdown
        setManagerSearch(""); // Reiniciar búsqueda manager
        setIsModalOpen(true);
    };

    const saveDept = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            nombre: form.nombre,
            descripcion: form.descripcion || null,
            manager_id: form.manager_id || null
        };

        let error;
        if (editingDept) {
            const { error: updateError } = await supabase
                .from("departamentos")
                .update(payload)
                .eq("id", editingDept.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from("departamentos")
                .insert(payload);
            error = insertError;
        }

        if (error) {
            showToast("Error al guardar el departamento", "error");
            return;
        }

        showToast(editingDept ? "Actualizado correctamente" : "Creado con éxito", "success");
        setIsModalOpen(false);
        fetchData();
    };

    const deleteDept = async (id: string) => {
        if (!confirm("¿Eliminar este departamento?")) return;
        const { error } = await supabase.from("departamentos").delete().eq("id", id);

        if (error?.code === "23503") {
            showToast("No se puede eliminar: tiene usuarios asignados.", "error");
        } else if (error) {
            showToast("Error al eliminar", "error");
        } else {
            showToast("Eliminado correctamente", "success");
            fetchData();
        }
    };

    // Helper para obtener iniciales
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const filteredManagers = usuariosManager.filter(u =>
        u.nombre_completo.toLowerCase().includes(managerSearch.toLowerCase())
    );

    const selectedManagerObj = usuariosManager.find(u => u.id === form.manager_id);

    const filtered = departamentos.filter((d) =>
        d.nombre.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 relative overflow-hidden">
            {/* ... Estilos y Toast igual que antes ... */}
            <style>{`
                @keyframes slideDown {
                    0% { transform: translateY(-50px) scale(0.95); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                .modal-animate-enter {
                    animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slideInUp {
                    0% { transform: translateY(10px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .dropdown-animate {
                    animation: slideInUp 0.2s ease-out forwards;
                }
                .toast-enter {
                    animation: slideInRight 0.3s ease-out forwards;
                }
            `}</style>

            {/* TOAST (Igual que antes) */}
            {notification.show && (
                <div className="fixed top-5 right-5 z-100 toast-enter">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border-l-4 backdrop-blur-md ${notification.type === 'error' ? 'bg-orange-500/90 text-white border-orange-700' : notification.type === 'warning' ? 'bg-yellow-400/90 text-slate-900 border-yellow-600' : 'bg-green-500/90 text-white border-green-700'}`}>
                        {notification.type === 'error' || notification.type === 'warning' ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-wider">
                                {notification.type === 'error' ? 'Error' : notification.type === 'warning' ? 'Aviso' : 'Éxito'}
                            </h4>
                            <p className="text-sm font-medium opacity-95">{notification.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER Y TABLA PRINCIPAL (Igual que antes) */}
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-4 sm:p-6 lg:p-8 overflow-hidden">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

                        {/* Título */}
                        <div className="flex items-center gap-3">
                            <div className="p-3 sm:p-4 bg-linear-to-br from-indigo-400 to-blue-800 rounded-2xl shadow-lg shrink-0">
                                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            </div>

                            <div>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-linear-to-r from-indigo-600 to-blue-800 bg-clip-text text-transparent">
                                    Departamentos
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2 text-sm">
                                    <Users className="h-4 w-4" />
                                    Gestión de áreas
                                </p>
                            </div>
                        </div>

                        {/* Botón */}
                        <button
                            onClick={() => openModal()}
                            className="w-full lg:w-auto group relative px-6 py-3 bg-linear-to-r from-indigo-400 to-blue-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 lg:hover:scale-105 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-indigo-600 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="relative flex items-center justify-center gap-2">
                                <Plus className="h-5 w-5" />
                                Nuevo Departamento
                            </span>
                        </button>

                    </div>
                </div>


                <div className="mb-6 relative max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition" />
                    <input className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300 shadow-sm" placeholder="Buscar departamento..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div className="w-full space-y-6">

                    {/* LOADING STATE: Skeleton UI (Se ve más profesional que un spinner) */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (

                        /* EMPTY STATE: Diseño centrado y limpio */
                        <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-600">
                            <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                                <Building2 className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay departamentos</h3>
                            <p className="text-slate-500 max-w-sm text-center mt-1">
                                No se encontraron registros. Intenta ajustar tu búsqueda o crea un nuevo departamento.
                            </p>
                        </div>

                    ) : (

                        /* LISTA DE TARJETAS */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((d) => (
                                <div
                                    key={d.id}
                                    className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                >
                                    {/* Borde superior de color decorativo */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-400 to-blue-800" />

                                    {/* CARD BODY */}
                                    <div className="p-6 flex-1 flex flex-col">

                                        {/* Header: Icono + Título + Acciones */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex gap-3 items-center">
                                                <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-blue-800 dark:text-indigo-400 shrink-0">
                                                    <BuildingIcon size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
                                                        {d.nombre}
                                                    </h3>
                                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                                                        ID: {d.id.slice(0, 6)}
                                                    </span>
                                                </div>
                                            </div>


                                            {/* Botones de acción flotantes (siempre visibles o hover) */}
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => openModal(d)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="Editar departamento"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => deleteDept(d.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="Eliminar departamento"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Descripción */}
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 line-clamp-2">
                                            {d.descripcion || "Sin descripción disponible para este departamento."}
                                        </p>

                                        {/* Footer: Manager Info (Parte inferior anclada) */}
                                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                                            {d.manager ? (
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar Manager: Imagen o Iniciales */}
                                                    {d.manager.avatar_url ? (
                                                        <img
                                                            src={d.manager.avatar_url}
                                                            alt={d.manager.nombre_completo}
                                                            className="h-8 w-8 rounded-full object-cover shadow-sm bg-slate-200 ring-1 ring-white dark:ring-slate-700"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-white dark:ring-slate-700">
                                                            {d.manager.nombre_completo.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Manager</span>
                                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                            {d.manager.nombre_completo}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 py-1 px-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg w-fit">
                                                    <ShieldAlert size={14} />
                                                    <span className="text-xs font-medium">Sin asignar</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL EDITAR / CREAR */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-visible modal-animate-enter">

                        <div className="relative bg-linear-to-r from-indigo-100 to-blue-800 px-6 py-6 rounded-t-2xl">
                            <div className="flex items-center justify-between text-white">
                                <div className="flex items-center gap-3">
                                    <Building2 className="h-6 w-6 text-black" />
                                    <h2 className="text-2xl font-bold text-black">{editingDept ? "Editar" : "Nuevo"} Departamento</h2>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-1 rounded-full"><X size={20} /></button>
                            </div>
                        </div>

                        <form onSubmit={saveDept} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nombre</label>
                                <input type="text" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Descripción</label>
                                <textarea rows={3} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 resize-none" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                            </div>

                            {/* ============================================== */}
                            {/* 🔥 SELECTOR PERSONALIZADO DE MANAGER (UPWARDS) */}
                            {/* ============================================== */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Manager del Departamento</label>

                                {/* TRIGGER BUTTON */}
                                <button
                                    type="button"
                                    onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-900 text-left transition-all duration-200
                                        ${isManagerDropdownOpen
                                            ? 'border-indigo-500 ring-4 ring-indigo-500/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center h-8 w-8 rounded-full ${selectedManagerObj ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {selectedManagerObj ? (
                                                <span className="text-xs font-bold">{getInitials(selectedManagerObj.nombre_completo)}</span>
                                            ) : (
                                                <ShieldCheck size={16} />
                                            )}
                                        </div>
                                        <span className={`text-sm ${selectedManagerObj ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}`}>
                                            {selectedManagerObj ? selectedManagerObj.nombre_completo : "Sin manager asignado"}
                                        </span>
                                    </div>
                                    {isManagerDropdownOpen ? <ChevronUp size={18} className="text-indigo-500" /> : <ChevronDown size={18} className="text-slate-400" />}
                                </button>

                                {/* DROPDOWN MENU (HACIA ARRIBA) */}
                                {isManagerDropdownOpen && (
                                    <div className="absolute bottom-full mb-2 left-0 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 dropdown-animate z-50 overflow-hidden">

                                        {/* Buscador dentro del dropdown */}
                                        <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border-none bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-slate-400"
                                                    placeholder="Buscar persona..."
                                                    value={managerSearch}
                                                    onChange={(e) => setManagerSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Lista de Opciones */}
                                        <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                            {/* Opción: Sin Asignar */}
                                            <div
                                                onClick={() => {
                                                    setForm({ ...form, manager_id: "" });
                                                    setIsManagerDropdownOpen(false);
                                                }}
                                                className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <div className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-slate-200 border-dashed text-slate-400">
                                                    <X size={14} />
                                                </div>
                                                <span className="text-sm text-slate-500">Sin manager asignado</span>
                                                {form.manager_id === "" && <Check size={16} className="ml-auto text-green-500" />}
                                            </div>

                                            {/* Opciones de Managers */}
                                            {filteredManagers.length > 0 ? (
                                                filteredManagers.map((u) => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => {
                                                            setForm({ ...form, manager_id: u.id });
                                                            setIsManagerDropdownOpen(false);
                                                        }}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200
                                                            ${form.manager_id === u.id
                                                                ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                                                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {/* Avatar / Iniciales */}
                                                        <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold shadow-sm
                                                            ${form.manager_id === u.id
                                                                ? 'bg-indigo-500 text-white'
                                                                : 'bg-linear-to-br from-purple-100 to-indigo-100 text-indigo-600'
                                                            }`}>
                                                            {getInitials(u.nombre_completo)}
                                                        </div>

                                                        {/* Nombre */}
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-medium ${form.manager_id === u.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                {u.nombre_completo}
                                                            </span>
                                                        </div>

                                                        {/* Check activo */}
                                                        {form.manager_id === u.id && <Check size={16} className="ml-auto text-indigo-600" />}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-xs text-slate-400">
                                                    No se encontraron managers.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl font-semibold text-white bg-linear-to-r from-indigo-600 to-blue-800 hover:from-indigo-800 shadow-lg hover:scale-105 transition-transform">{editingDept ? "Actualizar" : "Crear"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}