import React, { useState } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

registerPlugin(FilePondPluginImagePreview);

interface AttachmentInfo {
  path: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface SeaweedUploaderProps {
  onUploadComplete: (attachment: AttachmentInfo) => void;
  onFileRemoved?: (path: string) => void;
  folderName?: string;
  maxFiles?: number;
  existingFiles?: File[];
}

export const SeaweedUploader: React.FC<SeaweedUploaderProps> = ({ 
  onUploadComplete, 
  onFileRemoved,
  folderName = 'general', 
  maxFiles = 5,
  existingFiles = []
}) => {
  const [files, setFiles] = useState<any[]>(existingFiles);

  return (
    <div className="w-full">
      <FilePond
        files={files}
        onupdatefiles={setFiles}
        allowMultiple={maxFiles > 1}
        maxFiles={maxFiles}
        name="file"
        labelIdle='Arrastra tus archivos o <span class="filepond--label-action">Selecciona</span>'
        server={{
          process: (
            fieldName: string, 
            file: any, 
            _metadata: any, 
            load: (response: string) => void, 
            error: (error: string) => void, 
            progress: (lengthComputable: boolean, loaded: number, total: number) => void, 
            abort: () => void
          ) => {
            const formData = new FormData();
            const uniqueName = `${Date.now()}-${file.name}`;
            const path = `/seaweedfs/${folderName}/${uniqueName}`;

            formData.append(fieldName, file, uniqueName);

            const request = new XMLHttpRequest();
            request.open('POST', path);

            request.upload.onprogress = (e) => {
              progress(e.lengthComputable, e.loaded, e.total);
            };

            request.onload = function () {
              if (request.status >= 200 && request.status < 300) {
                const endpoint = import.meta.env.VITE_SEAWEDFS_ENDPOINT || 'localhost'
                const port = import.meta.env.VITE_SEAWEDFS_PORT || '8888'
                const useSSL = (import.meta.env.VITE_SEAWEDFS_USE_SSL || 'false').toLowerCase() === 'true'
                const publicUrl = `${useSSL ? 'https' : 'http'}://${endpoint}:${port}/${folderName}/${uniqueName}`;
                
                const attachmentInfo: AttachmentInfo = {
                  path: uniqueName,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  url: publicUrl
                };
                
                load(request.responseText);
                onUploadComplete(attachmentInfo);
              } else {
                error('Error al subir a SeaweedFS');
              }
            };

            request.onerror = function () {
              error('Error de conexión con SeaweedFS');
            };

            request.send(formData);

            return {
              abort: () => {
                request.abort();
                abort();
              },
            };
          },
          revert: (uniqueFileId: string, load: () => void, _error: (error: string) => void) => {
            if (onFileRemoved) {
              onFileRemoved(uniqueFileId);
            }
            load();
          }
        }}
      />
    </div>
  );
};