import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Search,
    Building2,
    Users,
    Mail,
    Phone,
    Briefcase,
    Calendar,
    UserCircle,
    BuildingIcon,
    ChevronDown,
    Filter
} from "lucide-react";

// --- INTERFACES ---
interface Departamento {
    id: string;
    nombre: string;
    descripcion: string | null;
    created_at: string;
}

interface Usuario {
    id: string;
    nombre_completo: string;
    email: string;
    telefono?: string;
    avatar_url?: string;
    departamento_id: string;
    departamento?: { nombre: string };
}

export default function ManagerDashboard() {
    // Estado de datos
    const [myDepartments, setMyDepartments] = useState<Departamento[]>([]);
    const [myTeam, setMyTeam] = useState<Usuario[]>([]);

    // Estado de UI
    const [loading, setLoading] = useState(true);
    const [searchTeam, setSearchTeam] = useState("");
    const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");
    const [, setCurrentManagerId] = useState<string | null>(null);

    useEffect(() => {
        fetchManagerData();
    }, []);

    const fetchManagerData = async () => {
        setLoading(true);

        try {
            // 1. Obtener el usuario autenticado (El Manager)
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }
            setCurrentManagerId(user.id);

            // 2. Obtener SOLO los departamentos que este usuario gestiona
            const { data: depts, error: deptError } = await supabase
                .from("departamentos")
                .select("*")
                .eq("manager_id", user.id)
                .order("nombre", { ascending: true });

            if (deptError) throw deptError;

            setMyDepartments(depts || []);

            // 3. Si tiene departamentos, buscar a los usuarios
            if (depts && depts.length > 0) {
                const deptIds = depts.map(d => d.id);

                const { data: team, error: teamError } = await supabase
                    .from("usuarios")
                    .select(`
                        id, 
                        nombre_completo, 
                        email, 
                        telefono, 
                        avatar_url, 
                        departamento_id,
                        departamento:departamentos!usuarios_departamento_id_fkey(nombre)
                    `)
                    .in("departamento_id", deptIds)
                    .eq("activo", true)
                    .neq("id", user.id) // <--- ESTO TE EXCLUYE A TI (EL MANAGER LOGUEADO) DE LA LISTA
                    .order("nombre_completo");

                if (teamError) throw teamError;

                const formattedTeam: Usuario[] = (team || []).map((u: any) => ({
                    ...u,
                    departamento: Array.isArray(u.departamento) ? u.departamento[0] : u.departamento
                }));

                setMyTeam(formattedTeam);
            }

        } catch (error) {
            console.error("Error fetching manager data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const filteredTeam = myTeam.filter(u => {
        const matchesSearch = u.nombre_completo.toLowerCase().includes(searchTeam.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTeam.toLowerCase());
        const matchesDept = selectedDeptFilter === "all" || u.departamento_id === selectedDeptFilter;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 relative overflow-hidden">

            {/* --- HEADER --- */}
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-4 sm:p-6 lg:p-8 overflow-hidden">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

                        {/* Título */}
                        <div className="flex items-center gap-3">
                            <div className="p-3 sm:p-4 bg-linear-to-br from-indigo-400 to-blue-800 rounded-2xl shadow-lg shrink-0">
                                <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            </div>

                            <div>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-linear-to-r from-indigo-600 to-blue-800 bg-clip-text text-transparent">
                                    Mi Gestión
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2 text-sm">
                                    <UserCircle className="h-4 w-4" />
                                    Panel de Manager
                                </p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-3 w-full lg:w-auto">
                            <div className="flex-1 lg:flex-none px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                                <span className="block text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {myDepartments.length}
                                </span>
                                <span className="text-xs uppercase font-semibold text-slate-400">
                                    Departamentos
                                </span>
                            </div>

                            <div className="flex-1 lg:flex-none px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                                <span className="block text-xl font-bold text-blue-600 dark:text-blue-400">
                                    {myTeam.length}
                                </span>
                                <span className="text-xs uppercase font-semibold text-slate-400">
                                    Colaboradores
                                </span>
                            </div>
                        </div>

                    </div>
                </div>


                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* --- SECCIÓN 1: MIS DEPARTAMENTOS --- */}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Building2 className="text-indigo-500" /> Mis Departamentos Asignados
                            </h2>

                            {myDepartments.length === 0 ? (
                                <div className="p-8 text-center bg-white/50 border border-dashed border-slate-300 rounded-2xl text-slate-500">
                                    No tienes departamentos asignados actualmente.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {myDepartments.map((d) => (
                                        <div key={d.id} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-indigo-600" />
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                                        <BuildingIcon size={24} />
                                                    </div>
                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                                                        {myTeam.filter(u => u.departamento_id === d.id).length} miembros
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">
                                                    {d.nombre}
                                                </h3>
                                                <p className="text-sm text-slate-500 line-clamp-2 min-h-10">
                                                    {d.descripcion || "Sin descripción establecida."}
                                                </p>
                                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                                                    <Calendar size={12} />
                                                    <span>Registrado el {new Date(d.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* --- SECCIÓN 2: MI EQUIPO --- */}
                        <div className="pt-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-slide-up">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Users className="text-indigo-500 h-6 w-6" />
                                    Mi Equipo de Trabajo
                                </h2>

                                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                    {/* Filtro por Departamento */}
                                    {myDepartments.length > 1 && (
                                        <div className="relative w-full md:w-72">
                                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                                            <select
                                                value={selectedDeptFilter}
                                                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                                                className="w-full pl-12 pr-10 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer text-slate-700 dark:text-white font-medium"
                                            >
                                                <option value="all">Todos los Departamentos</option>
                                                {myDepartments.map(d => (
                                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    )}

                                    {/* Buscador */}
                                    <div className="relative flex-1 md:w-80 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Buscar empleado..."
                                            value={searchTeam}
                                            onChange={(e) => setSearchTeam(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>


                            {filteredTeam.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 bg-white/40 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full mb-3">
                                        <Users className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-medium">No se encontraron miembros en el equipo (excluyéndote).</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredTeam.map((user) => (
                                        <div key={user.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
                                            {/* Avatar */}
                                            <div className="relative shrink-0">
                                                <div className="h-14 w-14 rounded-full bg-linear-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-lg font-bold border-2 border-white dark:border-slate-800 shadow-sm">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt="avatar" className="h-full w-full rounded-full object-cover" />
                                                    ) : (
                                                        getInitials(user.nombre_completo)
                                                    )}
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" title="Activo"></div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 dark:text-white truncate">
                                                    {user.nombre_completo}
                                                </h4>

                                                {/* YA NO MOSTRAMOS EL ROL NI EL CARGO AQUÍ */}

                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                    <span className="flex items-center gap-1 truncate" title={user.departamento?.nombre}>
                                                        <Building2 size={10} />
                                                        {user.departamento?.nombre}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Contact Actions */}
                                            <div className="flex flex-col gap-1">
                                                <a href={`mailto:${user.email}`} className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Enviar Correo">
                                                    <Mail size={16} />
                                                </a>
                                                {user.telefono && (
                                                    <a href={`tel:${user.telefono}`} className="p-2 rounded-lg bg-slate-50 hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors" title="Llamar">
                                                        <Phone size={16} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}