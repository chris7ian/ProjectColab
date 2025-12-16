'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Plus, LogOut, Calendar, Users, CheckCircle2, Upload } from 'lucide-react';
import ImportProjectModal from '@/components/ImportProjectModal';

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  status: string;
  startDate?: string;
  endDate?: string;
  _count: {
    tasks: number;
    members: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchProjects();
  }, [user, router]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/projects', newProject);
      // Asegurar que el proyecto tenga _count
      const newProjectData = {
        ...response.data,
        _count: response.data._count || { tasks: 0, members: response.data.members?.length || 1 }
      };
      setProjects([...projects, newProjectData]);
      setShowCreateModal(false);
      setNewProject({ name: '', description: '', color: '#3b82f6' });
      // Recargar proyectos para obtener datos completos
      fetchProjects();
    } catch (error) {
      console.error('Error al crear proyecto:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ProjectColab</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Mis Proyectos</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload size={20} />
              Importar .mpp
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nuevo Proyecto
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tienes proyectos aún</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              Crea tu primer proyecto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4"
                style={{ borderLeftColor: project.color }}
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={16} />
                    <span>{project._count?.tasks ?? 0} tareas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{project._count?.members ?? 0} miembros</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      project.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : project.status === 'archived'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {project.status === 'completed'
                      ? 'Completado'
                      : project.status === 'archived'
                      ? 'Archivado'
                      : 'Activo'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Nuevo Proyecto</h3>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    required
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Mi nuevo proyecto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({ ...newProject, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descripción del proyecto..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newProject.color}
                    onChange={(e) =>
                      setNewProject({ ...newProject, color: e.target.value })
                    }
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Project Modal */}
      <ImportProjectModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (file) => {
          // Crear FormData para enviar el archivo
          const formData = new FormData();
          formData.append('file', file);

          // Enviar al backend para procesar
          const response = await api.post('/projects/import/mpp', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          // Mostrar información sobre qué parser se usó
          if (response.data.parserUsed) {
            const parserInfo = response.data.parserUsed === 'java' 
              ? '✅ Usando MPXJ (Java) - Parseo completo'
              : '⚠️ Usando Parser Básico - Parseo limitado';
            console.log(`[Import] ${parserInfo}`);
            // También podrías mostrar un toast/notificación aquí
          }

          // Recargar proyectos después de importar
          await fetchProjects();
        }}
      />
    </div>
  );
}

