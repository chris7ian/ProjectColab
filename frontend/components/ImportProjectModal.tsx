'use client';

import { useState } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';

interface ImportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export default function ImportProjectModal({
  isOpen,
  onClose,
  onImport,
}: ImportProjectModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.mpp')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Por favor, selecciona un archivo .mpp (Microsoft Project)');
        setFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Por favor, selecciona un archivo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onImport(file);
      setFile(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al importar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Importar Proyecto</h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo Microsoft Project (.mpp)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".mpp"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload size={32} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  Haz clic para seleccionar un archivo
                </span>
                <span className="text-xs text-gray-500">
                  Solo archivos .mpp
                </span>
              </label>
            </div>
            {file && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <FileText size={20} className="text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> La importación de archivos .mpp está en desarrollo. 
              Actualmente se procesará el archivo y se crearán proyectos y tareas básicas.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !file}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Importando...
              </>
            ) : (
              'Importar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

