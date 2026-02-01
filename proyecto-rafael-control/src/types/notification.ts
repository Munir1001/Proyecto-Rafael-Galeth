// src/types/notification.ts

export interface Notification {
  id: string;
  usuario_id: string;
  tipo: 'tarea_asignada' | 'tarea_vencida' | 'tarea_completada' | 'cambio_estado' | 'comentario' | 'info' | 'success' | 'warning' | 'error';
  titulo: string;      // En DB es 'titulo', no 'title'
  mensaje: string;     // En DB es 'mensaje', no 'message'
  tarea_id?: string;
  leida: boolean;      // <--- IMPORTANTE: En DB es 'leida', no 'read'
  enviada_email?: boolean;
  enviada_push?: boolean;
  created_at: string;
}