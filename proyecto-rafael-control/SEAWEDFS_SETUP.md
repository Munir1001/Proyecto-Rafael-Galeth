# Configuración de SeaweedFS para EduTask

## 🚀 Configuración Rápida

### 1. Iniciar SeaweedFS con Docker

```bash
docker-compose -f docker-compose.seaweedfs.yml up -d
```

Esto iniciará 3 servicios:
- **Master (puerto 9333)**: Gestiona metadatos
- **Volume (puerto 8080)**: Almacena archivos físicos  
- **Filer (puerto 8888)**: API REST para上传/ver archivos

### 2. Variables de Entorno

Las variables ya están configuradas en `.env.local`:

```bash
# SeaweedFS Configuration
VITE_SEAWEDFS_ENDPOINT=localhost
VITE_SEAWEDFS_PORT=8888
VITE_SEAWEDFS_USE_SSL=false
```

### 3. Proxy en Vite

Ya configurado en `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/seaweedfs': {
      target: 'http://localhost:8888',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/seaweedfs/, ''),
    },
  },
}
```

## 📂 Estructura de Directorios

Los archivos se organizan por carpetas:

```
/seaweedfs/
├── avatars/          # Fotos de perfil
├── tareas/           # Adjuntos de tareas
├── usuarios/         # Archivos de usuarios
└── general/          # Archivos generales
```

## 🔧 Uso del Componente SeaweedUploader

```typescript
import { SeaweedUploader } from './components/SeaweedUploader';

const MyComponent = () => {
  const handleFileUpload = (attachment: AttachmentInfo) => {
    console.log('Archivo subido:', attachment.url);
    // Guardar attachment.url en la base de datos
  };

  return (
    <SeaweedUploader
      folderName="tareas"
      maxFiles={3}
      onUploadComplete={handleFileUpload}
    />
  );
};
```

## 📤 Ejemplos de Uso

### Subir Foto de Perfil (implementado)
```typescript
// En Perfil.tsx - ya funciona con SeaweedFS
const response = await fetch('/seaweedfs/avatars/' + fileName, {
  method: 'POST',
  body: formData
});
```

### Subir Adjuntos de Tarea
```typescript
// Usar SeaweedUploader para tareas
<SeaweedUploader
  folderName="tareas"
  onUploadComplete={(attachment) => {
    // Guardar attachment.url en task_attachments
  }}
/>
```

## 🌐 URLs Públicas

Los archivos son accesibles públicamente via:
```bash
http://localhost:8888/{carpeta}/{nombre-archivo}
```

Ejemplos:
- Foto perfil: `http://localhost:8888/avatars/usuario123.jpg`
- Tarea adjunto: `http://localhost:8888/tareas/1698765432-documento.pdf`

## 🔍 Verificación

1. **Verificar servicios**:
```bash
docker ps
# Deberías ver 3 contenedores: seaweedfs-master, seaweedfs-volume, seaweedfs-filer
```

2. **Probar API**:
```bash
curl http://localhost:8888/
# Debería responder con la interfaz del Filer
```

3. **Ver archivos subidos**:
```bash
curl http://localhost:8888/avatars/
# Lista archivos en la carpeta avatars
```

## 🚨 Troubleshooting

### Puerto 8888 ocupado
```bash
# Matar proceso usando el puerto
netstat -ano | findstr :8888
taskkill /PID <PID> /F
```

### Permisos de Docker (Windows)
```bash
# Asegurar que Docker tenga permisos
# O ejecutar como administrador
```

### Archivos no aparecen
1. Verificar que los 3 servicios estén corriendo
2. Revisar logs: `docker-compose logs seaweedfs-filer`
3. Intentar reiniciar: `docker-compose restart`

## 🔄 Migración desde MinIO

Si venías usando MinIO:
1. Copia los archivos de los buckets MinIO a las carpetas correspondientes
2. Actualiza las URLs en la base de datos
3. Desinstala MinIO: `docker-compose down` (si usabas docker-compose)

## 📚 Documentación Adicional

- [SeaweedFS Documentation](https://seaweedfs.com/)
- [FilePond Documentation](https://pqina.nl/filepond/)