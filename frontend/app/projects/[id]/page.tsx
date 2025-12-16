'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ArrowLeft, Plus, Calendar, Users, GanttChart } from 'lucide-react';
import Link from 'next/link';
import GanttView from '@/components/GanttView';

interface Task {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  progress: number;
  status: string;
  priority: string;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
  children?: Task[];
  assignments: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  }>;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  startDate?: string;
  endDate?: string;
  tasks: Task[];
  members: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  }>;
}

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'gantt'>('gantt');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    duration: '',
    priority: 'medium',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchProject();
    setupSocket();
  }, [params.id, user, router]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${params.id}`);
      setProject(response.data);
    } catch (error) {
      console.error('Error al cargar proyecto:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    const socket = getSocket();
    
    socket.emit('join:project', params.id);

    socket.on('task:created', (task: Task) => {
      setProject((prev) => {
        if (!prev) return prev;
        return { ...prev, tasks: [...(prev.tasks || []), task] };
      });
    });

    socket.on('task:updated', (task: Task) => {
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: (prev.tasks || []).map((t) => (t.id === task.id ? task : t)),
        };
      });
    });

    socket.on('task:deleted', (taskId: string) => {
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: (prev.tasks || []).filter((t) => t.id !== taskId),
        };
      });
    });

    socket.on('project:updated', (updatedProject: Project) => {
      setProject(updatedProject);
    });

    return () => {
      socket.emit('leave:project', params.id);
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.off('project:updated');
    };
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError('');
    setCreatingTask(true);
    
    try {
      const taskData: any = {
        name: newTask.name,
        projectId: params.id,
        priority: newTask.priority,
      };
      
      if (newTask.description) taskData.description = newTask.description;
      if (newTask.startDate) taskData.startDate = newTask.startDate;
      if (newTask.endDate) taskData.endDate = newTask.endDate;
      if (newTask.duration) taskData.duration = parseInt(newTask.duration);
      
      await api.post('/tasks', taskData);
      
      setShowTaskModal(false);
      setNewTask({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        duration: '',
        priority: 'medium',
      });
      await fetchProject();
    } catch (error: any) {
      console.error('Error al crear tarea:', error);
      setTaskError(error.response?.data?.error || 'Error al crear la tarea. Intenta nuevamente.');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      const socket = getSocket();
      socket.emit('task:update', { projectId: params.id, taskId });
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div
              className="w-1 h-8 rounded"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 text-sm">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('gantt')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                view === 'gantt'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <GanttChart size={18} />
              Gantt
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'list'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Tareas ({project.tasks?.length ?? 0})
          </h2>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Nueva Tarea
          </button>
        </div>

        {/* Gantt View */}
        {view === 'gantt' && project && (
          <GanttView
            tasks={project.tasks || []}
            onTaskUpdate={async (taskId, updates) => {
              try {
                const updateData: any = { ...updates };
                
                // Convertir fechas de formato YYYY-MM-DD a ISO datetime
                if (updates.startDate) {
                  const startDate = new Date(updates.startDate);
                  startDate.setHours(0, 0, 0, 0);
                  updateData.startDate = startDate.toISOString();
                }
                if (updates.endDate) {
                  const endDate = new Date(updates.endDate);
                  endDate.setHours(23, 59, 59, 999);
                  updateData.endDate = endDate.toISOString();
                }
                
                await api.put(`/tasks/${taskId}`, updateData);
                const socket = getSocket();
                socket.emit('task:update', { projectId: params.id, taskId });
                await fetchProject();
              } catch (error: any) {
                console.error('Error al actualizar tarea:', error);
                if (error.response?.data) {
                  console.error('Detalles del error:', error.response.data);
                }
                throw error;
              }
            }}
            onTaskCreate={async (task) => {
              try {
                // Establecer fechas por defecto si no están definidas
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                const taskData: any = {
                  name: task.name || '',
                  projectId: params.id,
                  priority: task.priority || 'medium',
                };
                
                // Convertir fechas de formato YYYY-MM-DD a ISO datetime
                // Si no hay fecha, usar hoy como default
                const startDate = task.startDate 
                  ? new Date(task.startDate) 
                  : today;
                startDate.setHours(0, 0, 0, 0);
                taskData.startDate = startDate.toISOString();
                
                // Si no hay fecha fin, usar mañana como default
                const endDate = task.endDate 
                  ? new Date(task.endDate) 
                  : tomorrow;
                endDate.setHours(23, 59, 59, 999);
                taskData.endDate = endDate.toISOString();
                if (task.duration) {
                  taskData.duration = typeof task.duration === 'number' ? task.duration : parseInt(task.duration.toString());
                }
                if (task.progress !== undefined) {
                  taskData.progress = typeof task.progress === 'number' ? task.progress : parseInt(task.progress.toString());
                }
                if (task.status) {
                  taskData.status = task.status;
                }
                
                await api.post('/tasks', taskData);
                await fetchProject();
              } catch (error: any) {
                console.error('Error al crear tarea:', error);
                if (error.response?.data) {
                  console.error('Detalles del error:', error.response.data);
                }
                throw error;
              }
            }}
            onTaskDelete={async (taskId) => {
              try {
                await api.delete(`/tasks/${taskId}`);
                const socket = getSocket();
                socket.emit('task:delete', { projectId: params.id, taskId });
                await fetchProject();
              } catch (error) {
                console.error('Error al eliminar tarea:', error);
                throw error;
              }
            }}
            projectId={params.id as string}
          />
        )}

        {/* Tasks List */}
        {view === 'list' && (
          <div className="space-y-3">
            {!project.tasks || project.tasks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500 mb-4">No hay tareas aún</p>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Crea tu primera tarea
                </button>
              </div>
            ) : (
              (project.tasks || []).map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {task.name}
                      </h3>
                      {task.description && (
                        <p className="text-gray-600 text-sm mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {task.startDate && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>
                              {new Date(task.startDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {task.duration && (
                          <span>{task.duration} días</span>
                        )}
                        {task.assignments.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users size={14} />
                            <span>{task.assignments.length} asignado(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progreso</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          handleUpdateTaskStatus(task.id, e.target.value)
                        }
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="todo">Por hacer</option>
                        <option value="in_progress">En progreso</option>
                        <option value="completed">Completada</option>
                        <option value="blocked">Bloqueada</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Nueva Tarea</h3>
            {taskError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {taskError}
              </div>
            )}
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.name}
                    onChange={(e) =>
                      setNewTask({ ...newTask, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      value={newTask.startDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, startDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      value={newTask.endDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, endDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duración (días)
                    </label>
                    <input
                      type="number"
                      value={newTask.duration}
                      onChange={(e) =>
                        setNewTask({ ...newTask, duration: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridad
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) =>
                        setNewTask({ ...newTask, priority: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setTaskError('');
                    setNewTask({
                      name: '',
                      description: '',
                      startDate: '',
                      endDate: '',
                      duration: '',
                      priority: 'medium',
                    });
                  }}
                  disabled={creatingTask}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingTask || !newTask.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingTask ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

