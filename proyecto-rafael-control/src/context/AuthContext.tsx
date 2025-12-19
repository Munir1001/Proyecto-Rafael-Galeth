import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

type UserProfile = {
  id: string;
  email: string;
  nombre_completo: string;
  rol_id: string;
  rol_nombre?: string;
  avatar_url?: string;
  departamento_id?: string | null;
  activo: boolean;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // CAMBIO IMPORTANTE: .maybeSingle() no lanza error si no encuentra datos
      // Esto evita el pantallazo rojo si el perfil tarda un poco en crearse
      const { data, error } = await supabase
        .from('usuarios')
        .select(`*, roles ( nombre )`)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error al cargar perfil:', error.message);
      }

      if (data) {
        setProfile({
          ...data,
          rol_nombre: data.roles?.nombre
        });
      } else {
        // Si entra aquí, el usuario está logueado en Auth pero no tiene fila en 'usuarios'
        // Esto puede pasar justo en el instante del registro. No es crítico.
        setProfile(null);
      }
    } catch (error) {
      console.error('Excepción en AuthContext:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};