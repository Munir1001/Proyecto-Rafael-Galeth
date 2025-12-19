import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Search, Paperclip, MessageSquare,
    Clock, Layout, List,
    BarChart3, Filter, ChevronDown, ChevronUp,
    User as UserIcon, X, FileText, Calendar as CalendarIcon,
    Trash2, ArrowRight, Flag, Edit2, UploadCloud
} from 'lucide-react';
import { Spinner } from 'flowbite-react';

// --- INTERFACES ---
interface Tarea {
    id: string;
    titulo: string;
    descripcion: string;
    prioridad_id: string;
    estado_id: string;
    asignado_a: string | null;
    creador_id: string;
    fecha_inicio: string;
    fecha_fin: string;
    departamento_id: string | null;
    // Relaciones
    asignado?: { id: string, nombre_completo: string, avatar_url: string | null };
    creador?: { nombre_completo: string };
    prioridad?: { nombre: string, color: string, nivel: number };
    estado?: { nombre: string, color: string };
}

interface Catalogo {
    id: string;
    nombre: string;
    color: string;
}

interface UsuarioSelect {
    id: string;
    nombre_completo: string;
    avatar_url: string | null;
    departamento_id: string | null;
}

// --- UTILS ---
const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

// --- COMPONENTES VISUALES ---
const UserAvatar = ({ url, name, size = "sm", className = "" }: { url?: string | null, name: string, size?: "sm" | "md" | "lg", className?: string }) => {
    const sizeClasses = { sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm" };
    return (
        <div className={`relative ${className}`} title={name}>
            {url ? (
                <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm`} />
            ) : (
                <div className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-slate-800 shadow-sm`}>
                    {getInitials(name)}
                </div>
            )}
        </div>
    );
};

export default function Tareas() {
    const { profile } = useAuth();
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'timeline'>('kanban');
    const [loading, setLoading] = useState(true);

    // Data State
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [estados, setEstados] = useState<Catalogo[]>([]);
    const [prioridades, setPrioridades] = useState<Catalogo[]>([]);
    const [usuariosPosibles, setUsuariosPosibles] = useState<UsuarioSelect[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('all');

    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Tarea | null>(null); // Estado para edición
    
    // Custom Dropdown States
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState("");
    const dropdownAssigneeRef = useRef<HTMLDivElement>(null);

    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const dropdownPriorityRef = useRef<HTMLDivElement>(null);

    // Attachments State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form Initial State
    const initialTaskState = {
        titulo: '',
        descripcion: '',
        prioridad_id: '',
        asignado_a: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    };
    const [newTask, setNewTask] = useState(initialTaskState);

    // Click Outside Handling
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownAssigneeRef.current && !dropdownAssigneeRef.current.contains(event.target as Node)) {
                setIsAssigneeDropdownOpen(false);
            }
            if (dropdownPriorityRef.current && !dropdownPriorityRef.current.contains(event.target as Node)) {
                setIsPriorityDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (profile) fetchData();
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resEstados, resPrioridades] = await Promise.all([
                supabase.from('estados_tarea').select('*').order('id'),
                supabase.from('prioridades').select('*').order('nivel', { ascending: false })
            ]);

            if (resEstados.data) setEstados(resEstados.data);
            if (resPrioridades.data) setPrioridades(resPrioridades.data);

            let query = supabase
                .from('tareas')
                .select(`
                    *,
                    asignado:asignado_a(id, nombre_completo, avatar_url),
                    creador:creador_id(nombre_completo),
                    prioridad:prioridad_id(nombre, color, nivel),
                    estado:estado_id(nombre, color)
                `)
                .order('created_at', { ascending: false });

            if (profile?.rol_nombre === 'Usuario') {
                query = query.eq('asignado_a', profile.id);
            } else if (profile?.rol_nombre === 'Manager' && profile.departamento_id) {
                query = query.eq('departamento_id', profile.departamento_id);
            }

            const { data: tareasData, error } = await query;
            if (error) throw error;
            setTareas(tareasData || []);

            if (['Admin', 'Manager'].includes(profile?.rol_nombre || '')) {
                let userQuery = supabase
                    .from('usuarios')
                    .select('id, nombre_completo, avatar_url, departamento_id')
                    .eq('activo', true);

                if (profile?.rol_nombre === 'Manager' && profile.departamento_id) {
                    userQuery = userQuery.eq('departamento_id', profile.departamento_id);
                }

                const { data: usersData } = await userQuery;
                setUsuariosPosibles(usersData || []);
            }

        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS ---

    const openModal = (task?: Tarea) => {
        if (task) {
            // Modo Edición
            setEditingTask(task);
            setNewTask({
                titulo: task.titulo,
                descripcion: task.descripcion || '',
                prioridad_id: task.prioridad_id,
                asignado_a: task.asignado_a || '',
                fecha_inicio: task.fecha_inicio,
                fecha_fin: task.fecha_fin,
            });
        } else {
            // Modo Creación
            setEditingTask(null);
            setNewTask(initialTaskState);
        }
        setSelectedFiles([]); // Limpiar archivos al abrir
        setIsModalOpen(true);
    };

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let taskId = editingTask?.id;

            // 1. GUARDAR O ACTUALIZAR TAREA
            if (editingTask) {
                // UPDATE
                const { error } = await supabase.from('tareas').update({
                    titulo: newTask.titulo,
                    descripcion: newTask.descripcion,
                    prioridad_id: newTask.prioridad_id,
                    asignado_a: newTask.asignado_a || null,
                    fecha_inicio: newTask.fecha_inicio,
                    fecha_fin: newTask.fecha_fin,
                }).eq('id', editingTask.id);
                
                if (error) throw error;
            } else {
                // INSERT
                const defaultState = estados.find(e => e.nombre === 'Nueva')?.id || estados[0]?.id;
                let targetDept = profile?.departamento_id;
                
                // Si asignamos a alguien, la tarea va al depto de esa persona
                if (newTask.asignado_a) {
                    const assignedUser = usuariosPosibles.find(u => u.id === newTask.asignado_a);
                    if (assignedUser?.departamento_id) targetDept = assignedUser.departamento_id;
                }

                const { data, error } = await supabase.from('tareas').insert({
                    ...newTask,
                    creador_id: profile?.id,
                    estado_id: defaultState,
                    departamento_id: targetDept
                }).select().single();

                if (error) throw error;
                taskId = data.id;
            }

            // 2. SUBIR ARCHIVOS ADJUNTOS (Si hay y tenemos ID de tarea)
            if (taskId && selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${taskId}/${Math.random()}.${fileExt}`;
                    const filePath = `${fileName}`;

                    // Subir al Storage
                    const { error: uploadError } = await supabase.storage
                        .from('adjuntos')
                        .upload(filePath, file);

                    if (uploadError) {
                        console.error("Error subiendo archivo:", uploadError);
                        continue; 
                    }

                    // Obtener URL pública
                    const { data: { publicUrl } } = supabase.storage
                        .from('adjuntos')
                        .getPublicUrl(filePath);

                    // Guardar referencia en tabla adjuntos
                    await supabase.from('adjuntos').insert({
                        tarea_id: taskId,
                        subido_por: profile?.id,
                        nombre_archivo: file.name,
                        url_archivo: publicUrl,
                        tipo_mime: file.type,
                        tamano_bytes: file.size
                    });
                }
            }

            setIsModalOpen(false);
            fetchData(); 

        } catch (error) {
            console.error("Error saving task:", error);
            alert("Hubo un error al guardar la tarea. Asegúrate de tener el bucket 'adjuntos' creado en Supabase.");
        }
    };

    const handleDeleteTask = async (id: string) => {
        if(!confirm("¿Estás seguro de eliminar esta tarea?")) return;
        try {
            await supabase.from('tareas').delete().eq('id', id);
            setTareas(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error("Error deleting:", error);
        }
    };


    // --- FILTRADO ---
    const filteredTareas = useMemo(() => {
        return tareas.filter(t => {
            const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  t.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesState = filterEstado === 'all' || t.estado_id === filterEstado;
            return matchesSearch && matchesState;
        });
    }, [tareas, searchTerm, filterEstado]);


    // --- RENDERIZADO ---
    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50/20 to-blue-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-4 md:p-8 relative overflow-hidden">
            
            {/* ESTILOS Y ANIMACIONES */}
            <style>{`
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .kanban-scroll::-webkit-scrollbar { height: 8px; }
                .kanban-scroll::-webkit-scrollbar-track { background: transparent; }
                .kanban-scroll::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.3); border-radius: 4px; }
                .kanban-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.5); }
            `}</style>

            <div className="max-w-[1600px] mx-auto">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 animate-slide-up">
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent tracking-tight">
                            Gestión de Tareas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2 font-medium">
                            <Layout className="w-4 h-4 text-indigo-500" />
                            {profile?.rol_nombre === 'Admin' ? 'Visión Global del Sistema' : profile?.rol_nombre === 'Manager' ? 'Gestión de Departamento' : 'Mis Asignaciones'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-1">
                            {[{ id: 'kanban', icon: Layout, label: 'Kanban' }, { id: 'list', icon: List, label: 'Lista' }, { id: 'timeline', icon: BarChart3, label: 'Gantt' }].map((view) => (
                                <button key={view.id} onClick={() => setViewMode(view.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${viewMode === view.id ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400'}`}>
                                    <view.icon size={18} />
                                    <span className="hidden sm:inline">{view.label}</span>
                                </button>
                            ))}
                        </div>

                        {['Admin', 'Manager'].includes(profile?.rol_nombre || '') && (
                            <button onClick={() => openModal()} className="group relative px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                                <span className="relative flex items-center gap-2"><Plus size={20} /> Crear Tarea</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* FILTROS */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="text" placeholder="Buscar..." className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700 dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="relative w-full md:w-72">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                        <select className="w-full pl-12 pr-10 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer text-slate-700 dark:text-white font-medium" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                            <option value="all">Todos los Estados</option>
                            {estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* CONTENIDO */}
                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center"><Spinner size="xl" color="indigo" /></div>
                ) : (
                    <div className="animate-fade-in">
                        {/* KANBAN */}
                        {viewMode === 'kanban' && (
                            <div className="flex gap-6 overflow-x-auto pb-8 kanban-scroll h-[calc(100vh-280px)] items-start">
                                {estados.map(estado => {
                                    const tareasColumna = filteredTareas.filter(t => t.estado_id === estado.id);
                                    return (
                                        <div key={estado.id} className="min-w-[320px] w-[320px] flex flex-col gap-4">
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 shadow-sm sticky top-0 z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-700 shadow-sm" style={{ backgroundColor: estado.color }} />
                                                    <span className="font-bold text-slate-800 dark:text-slate-100">{estado.nombre}</span>
                                                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">{tareasColumna.length}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                {tareasColumna.map(tarea => (
                                                    <div key={tarea.id} className="group relative bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer">
                                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                                                            {/* BOTÓN EDITAR */}
                                                            {['Admin', 'Manager'].includes(profile?.rol_nombre || '') && (
                                                                <>
                                                                    <button onClick={(e) => { e.stopPropagation(); openModal(tarea); }} className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-500 rounded-lg transition-colors" title="Editar">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(tarea.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-lg transition-colors" title="Eliminar">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="mb-3 flex items-center justify-between">
                                                            {tarea.prioridad && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wide border" style={{ backgroundColor: `${tarea.prioridad.color}10`, color: tarea.prioridad.color, borderColor: `${tarea.prioridad.color}20` }}>
                                                                    <Flag size={10} /> {tarea.prioridad.nombre}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white mb-1.5 leading-snug">{tarea.titulo}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium">
                                                            <Clock size={12} /> {new Date(tarea.fecha_fin).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                                            <div className="flex items-center gap-3 text-slate-400 text-xs">
                                                                <div className="flex items-center gap-1"><Paperclip size={14} /> 2</div>
                                                                <div className="flex items-center gap-1"><MessageSquare size={14} /> 0</div>
                                                            </div>
                                                            {tarea.asignado ? <UserAvatar url={tarea.asignado.avatar_url} name={tarea.asignado.nombre_completo} size="sm" /> : <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center"><span className="text-[10px] text-slate-400">?</span></div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* LISTA */}
                        {viewMode === 'list' && (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase">Tarea</th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase">Prioridad</th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase">Estado</th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase">Responsable</th>
                                                <th className="px-6 py-5 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {filteredTareas.map(t => (
                                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <span className="font-bold text-slate-800 dark:text-white block">{t.titulo}</span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {t.prioridad && <span className="text-xs font-bold" style={{ color: t.prioridad.color }}>{t.prioridad.nombre}</span>}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.estado?.color }} />
                                                            {t.estado?.nombre}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {t.asignado ? <div className="flex items-center gap-2"><UserAvatar url={t.asignado.avatar_url} name={t.asignado.nombre_completo} size="sm" /><span>{t.asignado.nombre_completo}</span></div> : '-'}
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <button onClick={() => openModal(t)} className="text-indigo-600 hover:text-indigo-800 mr-3"><Edit2 size={18} /></button>
                                                        <button onClick={() => handleDeleteTask(t.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* GANTT */}
                        {viewMode === 'timeline' && (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 overflow-hidden">
                                <div className="flex flex-col gap-6">
                                    {filteredTareas.map((t) => (
                                        <div key={t.id} className="flex items-center gap-6 group cursor-pointer" onClick={() => openModal(t)}>
                                            <div className="w-64 shrink-0">
                                                <div className="font-bold text-sm text-slate-800 dark:text-white truncate">{t.titulo}</div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">{t.asignado?.nombre_completo || 'Sin asignar'}</div>
                                            </div>
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 h-10 rounded-lg relative overflow-hidden">
                                                <div className="absolute inset-0 flex">{[...Array(12)].map((_, i) => <div key={i} className="flex-1 border-r border-slate-200/50 dark:border-slate-700/30" />)}</div>
                                                <div className="absolute top-2 bottom-2 rounded-md shadow-md flex items-center px-4" style={{ left: `${Math.floor(Math.random() * 30)}%`, width: `${Math.floor(Math.random() * 40) + 20}%`, backgroundColor: t.estado?.color || '#6366f1' }}>
                                                    <span className="text-xs font-bold text-white truncate">{t.estado?.nombre}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- MODAL (CREAR / EDITAR) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                                        {editingTask ? <Edit2 size={24} /> : <FileText size={24} />}
                                    </div>
                                    {editingTask ? "Editar Tarea" : "Nueva Tarea"}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-14">Define los detalles y responsables</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X size={20} /></button>
                        </div>
                        
                        {/* Body con Scroll */}
                        <form onSubmit={handleSaveTask} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Título</label>
                                <input type="text" required className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-white" value={newTask.titulo} onChange={e => setNewTask({...newTask, titulo: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    {/* Prioridad Dropdown */}
                                    <div className="relative" ref={dropdownPriorityRef}>
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2 block">Prioridad</label>
                                        <button type="button" onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 bg-white dark:bg-slate-800 transition-all ${isPriorityDropdownOpen ? 'border-indigo-500 ring-4' : 'border-slate-200 dark:border-slate-700'}`}>
                                            <div className="flex items-center gap-3">
                                                {prioridades.find(p => p.id === newTask.prioridad_id) ? (
                                                    <>
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prioridades.find(p => p.id === newTask.prioridad_id)?.color }} />
                                                        <span className="font-bold text-slate-700 dark:text-white">{prioridades.find(p => p.id === newTask.prioridad_id)?.nombre}</span>
                                                    </>
                                                ) : <span className="text-slate-400">Seleccionar...</span>}
                                            </div>
                                            {isPriorityDropdownOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                        {isPriorityDropdownOpen && (
                                            <div className="absolute bottom-full mb-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border p-2 z-50">
                                                {prioridades.map(p => (
                                                    <div key={p.id} onClick={() => { setNewTask({...newTask, prioridad_id: p.id}); setIsPriorityDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.nombre}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Fechas */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Vencimiento</label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="date" className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-indigo-500 text-slate-700 dark:text-white" value={newTask.fecha_fin} onChange={e => setNewTask({...newTask, fecha_fin: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Asignado Dropdown */}
                                    <div className="relative" ref={dropdownAssigneeRef}>
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2 block">Asignar a</label>
                                        <button type="button" onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 bg-white dark:bg-slate-800 transition-all ${isAssigneeDropdownOpen ? 'border-indigo-500 ring-4' : 'border-slate-200 dark:border-slate-700'}`}>
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {usuariosPosibles.find(u => u.id === newTask.asignado_a) ? (
                                                    <>
                                                        <UserAvatar url={usuariosPosibles.find(u => u.id === newTask.asignado_a)?.avatar_url} name={usuariosPosibles.find(u => u.id === newTask.asignado_a)?.nombre_completo || ''} size="sm" />
                                                        <span className="font-bold text-slate-700 dark:text-white truncate">{usuariosPosibles.find(u => u.id === newTask.asignado_a)?.nombre_completo}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center"><UserIcon size={12} className="text-slate-400" /></div>
                                                        <span className="text-slate-400">Sin asignar</span>
                                                    </>
                                                )}
                                            </div>
                                            {isAssigneeDropdownOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                        {isAssigneeDropdownOpen && (
                                            <div className="absolute bottom-full mb-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border z-50 flex flex-col max-h-72">
                                                <div className="p-3 border-b bg-slate-50 dark:bg-slate-900/50"><input type="text" autoFocus className="w-full text-sm rounded-lg border-none bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500" placeholder="Buscar..." value={assigneeSearch} onChange={(e) => setAssigneeSearch(e.target.value)} /></div>
                                                <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                                    <div onClick={() => { setNewTask({...newTask, asignado_a: ''}); setIsAssigneeDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X size={14} /><span className="text-sm">Sin asignar</span></div>
                                                    {usuariosPosibles.filter(u => u.nombre_completo.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => (
                                                        <div key={u.id} onClick={() => { setNewTask({...newTask, asignado_a: u.id}); setIsAssigneeDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 cursor-pointer"><UserAvatar url={u.avatar_url} name={u.nombre_completo} size="md" /><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{u.nombre_completo}</span></div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Adjuntos */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Adjuntos</label>
                                        <div 
                                            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group bg-slate-50/50"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <input 
                                                type="file" 
                                                multiple 
                                                className="hidden" 
                                                ref={fileInputRef} 
                                                onChange={(e) => e.target.files && setSelectedFiles(Array.from(e.target.files))}
                                            />
                                            <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-500">
                                                <UploadCloud size={24} />
                                                <span className="text-sm font-medium">
                                                    {selectedFiles.length > 0 
                                                        ? `${selectedFiles.length} archivos seleccionados` 
                                                        : "Click para subir archivos"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Descripción</label>
                                <textarea rows={4} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-indigo-500 resize-none text-slate-700 dark:text-white" value={newTask.descripcion} onChange={e => setNewTask({...newTask, descripcion: e.target.value})} placeholder="Detalles..." />
                            </div>

                            {/* Footer */}
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                                <button type="submit" className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 shadow-xl flex items-center gap-2">{editingTask ? "Guardar Cambios" : "Crear Tarea"} <ArrowRight size={18} /></button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}