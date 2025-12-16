'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Save, X, ChevronRight, ChevronDown, Maximize2, User } from 'lucide-react';
import { flattenTasksHierarchy, organizeTasksHierarchy } from '@/utils/taskHierarchy';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

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
  children?: Task[];
}

interface GanttViewProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (task: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  projectId: string;
}

export default function GanttView({
  tasks,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  projectId,
}: GanttViewProps) {
  // Estado para controlar qué tareas están expandidas/colapsadas
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Estado para el nivel de zoom
  type ZoomLevel = 'days' | 'weeks' | 'months' | 'quarters' | 'semesters' | 'year';
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('days');

  // Estado para rastrear quién está editando
  const [editingUsers, setEditingUsers] = useState<Map<string, { userId: string; userName: string }>>(new Map());
  const { user: currentUser } = useAuthStore();
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inicializar todas las tareas con hijos como expandidas por defecto
  useEffect(() => {
    const hierarchicalTasks = organizeTasksHierarchy(tasks);
    const allTasksWithChildren = flattenTasksHierarchy(hierarchicalTasks);
    const newExpandedSet = new Set<string>();
    allTasksWithChildren.forEach((task) => {
      if (task.children && task.children.length > 0) {
        newExpandedSet.add(task.id);
      }
    });
    setExpandedTasks(newExpandedSet);
  }, [tasks]);

  // Configurar socket para detectar quién está editando
  useEffect(() => {
    if (!currentUser) return;

    const socket = getSocket();
    
    // Unirse al proyecto
    socket.emit('join:project', projectId);

    // Escuchar cuando otros usuarios están editando
    const handleUserEditing = (data: { userId: string; userName: string; isEditing: boolean }) => {
      // No mostrar al usuario actual
      if (data.userId === currentUser.id) return;

      setEditingUsers((prev) => {
        const newMap = new Map(prev);
        if (data.isEditing) {
          newMap.set(data.userId, { userId: data.userId, userName: data.userName });
        } else {
          newMap.delete(data.userId);
        }
        return newMap;
      });
    };

    socket.on('gantt:user:editing', handleUserEditing);

    return () => {
      socket.off('gantt:user:editing', handleUserEditing);
      socket.emit('leave:project', projectId);
    };
  }, [projectId, currentUser]);

  // Función para notificar que el usuario está editando
  const notifyEditing = (isEditing: boolean) => {
    if (!currentUser) return;

    const socket = getSocket();
    if (isEditing) {
      socket.emit('gantt:editing:start', {
        projectId,
        userId: currentUser.id,
        userName: currentUser.name,
      });
    } else {
      socket.emit('gantt:editing:stop', {
        projectId,
        userId: currentUser.id,
      });
    }
  };

  // Función para manejar el inicio de edición
  const handleEditingStart = () => {
    notifyEditing(true);
    // Limpiar timeout anterior si existe
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current);
    }
  };

  // Función para manejar el fin de edición (con delay)
  const handleEditingStop = () => {
    // Esperar un poco antes de notificar que dejó de editar
    // para evitar notificaciones constantes
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current);
    }
    editingTimeoutRef.current = setTimeout(() => {
      notifyEditing(false);
    }, 2000); // 2 segundos de delay
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
      // Notificar que dejó de editar al desmontar
      if (currentUser) {
        const socket = getSocket();
        socket.emit('gantt:editing:stop', {
          projectId,
          userId: currentUser.id,
        });
      }
    };
  }, [currentUser, projectId]);
  
  // Función para alternar expansión de una tarea
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };
  
  // Función para verificar si una tarea debe mostrarse (todos sus ancestros deben estar expandidos)
  const shouldShowTask = (task: Task & { level?: number }, taskMap: Map<string, Task & { level?: number }>): boolean => {
    if (!task.parentId) {
      return true; // Tareas raíz siempre se muestran
    }
    
    // Verificar si el padre está expandido
    const parent = taskMap.get(task.parentId);
    if (!parent) {
      return true; // Si no encontramos el padre, mostrar la tarea
    }
    
    if (!expandedTasks.has(task.parentId)) {
      return false; // Si el padre está colapsado, no mostrar
    }
    
    // Verificar recursivamente todos los ancestros
    if (parent.parentId) {
      return shouldShowTask(parent, taskMap);
    }
    
    return true;
  };
  
  // Función para filtrar tareas colapsadas
  const filterCollapsedTasks = (taskList: Array<Task & { level?: number }>): Array<Task & { level?: number }> => {
    // Crear mapa de tareas por ID para búsqueda rápida
    const taskMap = new Map<string, Task & { level?: number }>();
    taskList.forEach((task) => {
      taskMap.set(task.id, task);
    });
    
    return taskList.filter((task) => shouldShowTask(task, taskMap));
  };
  
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    name: '',
    startDate: '',
    endDate: '',
    duration: 1,
    progress: 0,
    status: 'todo',
    priority: 'medium',
  });

  // Calcular el rango de fechas para el Gantt
  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);
      return { start: today, end: endDate };
    }

    const dates = tasks
      .filter((t) => t.startDate || t.endDate)
      .flatMap((t) => {
        const dates: Date[] = [];
        if (t.startDate) dates.push(new Date(t.startDate));
        if (t.endDate) dates.push(new Date(t.endDate));
        return dates;
      });

    if (dates.length === 0) {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);
      return { start: today, end: endDate };
    }

    const start = new Date(Math.min(...dates.map((d) => d.getTime())));
    const end = new Date(Math.max(...dates.map((d) => d.getTime())));
    
    // Agregar margen de 7 días antes y después
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);
    
    return { start, end };
  }, [tasks]);

  // Calcular días entre fechas
  const daysBetween = (start: Date, end: Date) => {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calcular duración de una tarea basada en fechas o duración almacenada
  const calculateTaskDuration = (task: Task): number => {
    // Priorizar cálculo basado en fechas si ambas están disponibles
    if (task.startDate && task.endDate) {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      // Asegurar que las fechas estén en el mismo día (sin hora)
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      const days = daysBetween(startDate, endDate);
      return Math.max(0, days); // Asegurar que no sea negativo
    }
    
    // Si solo tiene fecha de inicio, duración es 0
    if (task.startDate && !task.endDate) {
      return 0;
    }
    
    // Si no tiene fechas, usar la duración almacenada o 0
    if (task.duration !== undefined && task.duration !== null) {
      return task.duration;
    }
    
    // Si no tiene fechas ni duración, retornar 0
    return 0;
  };

  const totalDays = daysBetween(dateRange.start, dateRange.end);
  
  // Configuración de zoom
  const getZoomConfig = (level: ZoomLevel) => {
    switch (level) {
      case 'days':
        return { cellWidth: 30, label: 'Días' };
      case 'weeks':
        return { cellWidth: 50, label: 'Semanas' };
      case 'months':
        return { cellWidth: 80, label: 'Meses' };
      case 'quarters':
        return { cellWidth: 120, label: 'Trimestres' };
      case 'semesters':
        return { cellWidth: 180, label: 'Semestres' };
      case 'year':
        return { cellWidth: 250, label: 'Año' };
      default:
        return { cellWidth: 30, label: 'Días' };
    }
  };

  const zoomConfig = getZoomConfig(zoomLevel);
  const cellWidth = zoomConfig.cellWidth;

  // Función para formatear fechas
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Generar array de fechas/periodos para las columnas según el zoom
  const dateColumns = useMemo(() => {
    const columns: Array<{ date: Date; label: string; width: number }> = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    switch (zoomLevel) {
      case 'days': {
        const current = new Date(start);
        while (current <= end) {
          columns.push({
            date: new Date(current),
            label: formatDate(current),
            width: cellWidth,
          });
          current.setDate(current.getDate() + 1);
        }
        break;
      }
      case 'weeks': {
        const current = new Date(start);
        // Ir al inicio de la semana (lunes)
        const dayOfWeek = current.getDay();
        const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        current.setDate(diff);
        current.setHours(0, 0, 0, 0);
        
        while (current <= end) {
          const weekEnd = new Date(current);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const startDay = String(current.getDate()).padStart(2, '0');
          const startMonth = String(current.getMonth() + 1).padStart(2, '0');
          const endDay = String(weekEnd.getDate()).padStart(2, '0');
          const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
          
          // Formato: DD/MM - DD/MM o DD/MM-YY - DD/MM-YY si cruza años
          let label: string;
          if (current.getFullYear() === weekEnd.getFullYear()) {
            if (startMonth === endMonth) {
              label = `${startDay}-${endDay}/${startMonth}`;
            } else {
              label = `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
            }
          } else {
            label = `${startDay}/${startMonth}/${String(current.getFullYear()).slice(-2)} - ${endDay}/${endMonth}/${String(weekEnd.getFullYear()).slice(-2)}`;
          }
          
          columns.push({
            date: new Date(current),
            label: label,
            width: cellWidth,
          });
          current.setDate(current.getDate() + 7);
        }
        break;
      }
      case 'months': {
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
          columns.push({
            date: new Date(current),
            label: `${String(current.getMonth() + 1).padStart(2, '0')}/${current.getFullYear()}`,
            width: cellWidth,
          });
          current.setMonth(current.getMonth() + 1);
        }
        break;
      }
      case 'quarters': {
        const current = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
        while (current <= end) {
          const quarter = Math.floor(current.getMonth() / 3) + 1;
          columns.push({
            date: new Date(current),
            label: `Q${quarter} ${current.getFullYear()}`,
            width: cellWidth,
          });
          current.setMonth(current.getMonth() + 3);
        }
        break;
      }
      case 'semesters': {
        const current = new Date(start.getFullYear(), start.getMonth() < 6 ? 0 : 6, 1);
        while (current <= end) {
          const semester = current.getMonth() < 6 ? 1 : 2;
          columns.push({
            date: new Date(current),
            label: `S${semester} ${current.getFullYear()}`,
            width: cellWidth,
          });
          current.setMonth(current.getMonth() < 6 ? 6 : 12);
          if (current.getMonth() === 12) {
            current.setFullYear(current.getFullYear() + 1);
            current.setMonth(0);
          }
        }
        break;
      }
      case 'year': {
        const current = new Date(start.getFullYear(), 0, 1);
        while (current <= end) {
          columns.push({
            date: new Date(current),
            label: String(current.getFullYear()),
            width: cellWidth,
          });
          current.setFullYear(current.getFullYear() + 1);
        }
        break;
      }
    }
    
    return columns;
  }, [dateRange, zoomLevel, cellWidth]);

  // Ref para el contenedor del diagrama de Gantt
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  // Función para calcular el zoom automático
  const calculateAutoZoom = (): ZoomLevel => {
    if (!ganttContainerRef.current || dateColumns.length === 0) {
      return 'days';
    }

    const containerWidth = ganttContainerRef.current.clientWidth - 400; // Restar ancho de la tabla izquierda
    const totalWidth = dateColumns.length * cellWidth;
    
    // Si el contenido cabe en el contenedor, usar el zoom actual
    if (totalWidth <= containerWidth) {
      return zoomLevel;
    }

    // Calcular qué nivel de zoom permite ver todo el contenido
    const totalDays = daysBetween(dateRange.start, dateRange.end);
    
    // Probar cada nivel de zoom de menor a mayor granularidad
    const zoomLevels: ZoomLevel[] = ['year', 'semesters', 'quarters', 'months', 'weeks', 'days'];
    
    for (const level of zoomLevels) {
      const config = getZoomConfig(level);
      let columnsCount = 0;
      
      switch (level) {
        case 'days':
          columnsCount = totalDays;
          break;
        case 'weeks':
          columnsCount = Math.ceil(totalDays / 7);
          break;
        case 'months': {
          const monthsDiff = (dateRange.end.getFullYear() - dateRange.start.getFullYear()) * 12 +
                            (dateRange.end.getMonth() - dateRange.start.getMonth()) + 1;
          columnsCount = monthsDiff;
          break;
        }
        case 'quarters': {
          const startQuarter = Math.floor(dateRange.start.getMonth() / 3);
          const endQuarter = Math.floor(dateRange.end.getMonth() / 3);
          const yearDiff = (dateRange.end.getFullYear() - dateRange.start.getFullYear()) * 4;
          columnsCount = yearDiff + endQuarter - startQuarter + 1;
          break;
        }
        case 'semesters': {
          const startSemester = dateRange.start.getMonth() < 6 ? 0 : 1;
          const endSemester = dateRange.end.getMonth() < 6 ? 0 : 1;
          const yearDiff = (dateRange.end.getFullYear() - dateRange.start.getFullYear()) * 2;
          columnsCount = yearDiff + endSemester - startSemester + 1;
          break;
        }
        case 'year': {
          columnsCount = dateRange.end.getFullYear() - dateRange.start.getFullYear() + 1;
          break;
        }
      }
      
      const estimatedWidth = columnsCount * config.cellWidth;
      
      // Si este nivel de zoom permite ver todo el contenido, usarlo
      if (estimatedWidth <= containerWidth) {
        return level;
      }
    }
    
    // Si ningún nivel permite ver todo, usar el más granular (días)
    return 'days';
  };

  // Función para aplicar zoom automático
  const handleAutoZoom = () => {
    const autoZoomLevel = calculateAutoZoom();
    setZoomLevel(autoZoomLevel);
  };

  // Calcular posición y ancho de la barra de Gantt según el nivel de zoom
  const getTaskBarStyle = (task: Task) => {
    if (!task.startDate) return { display: 'none' };

    const startDate = new Date(task.startDate);
    const endDate = task.endDate ? new Date(task.endDate) : new Date(startDate.getTime() + (task.duration || 1) * 24 * 60 * 60 * 1000);

    let left = 0;
    let width = 0;

    switch (zoomLevel) {
      case 'days': {
        const daysFromStart = daysBetween(dateRange.start, startDate);
        const taskDuration = daysBetween(startDate, endDate);
        left = daysFromStart * cellWidth;
        width = Math.max(taskDuration * cellWidth, 20);
        break;
      }
      case 'weeks': {
        // Calcular en qué semana empieza y termina la tarea
        const startWeek = Math.floor(daysBetween(dateRange.start, startDate) / 7);
        const endWeek = Math.ceil(daysBetween(dateRange.start, endDate) / 7);
        left = startWeek * cellWidth;
        width = Math.max((endWeek - startWeek) * cellWidth, 20);
        break;
      }
      case 'months': {
        // Calcular en qué mes empieza y termina la tarea
        const startMonth = (startDate.getFullYear() - dateRange.start.getFullYear()) * 12 + 
                          (startDate.getMonth() - dateRange.start.getMonth());
        const endMonth = (endDate.getFullYear() - dateRange.start.getFullYear()) * 12 + 
                        (endDate.getMonth() - dateRange.start.getMonth());
        left = startMonth * cellWidth;
        // Asegurar que la barra tenga al menos el ancho de un mes
        width = Math.max((endMonth - startMonth + 1) * cellWidth, cellWidth);
        break;
      }
      case 'quarters': {
        // Calcular en qué trimestre empieza y termina la tarea
        const startQuarter = Math.floor(startDate.getMonth() / 3);
        const endQuarter = Math.floor(endDate.getMonth() / 3);
        const startYearDiff = (startDate.getFullYear() - dateRange.start.getFullYear()) * 4;
        const endYearDiff = (endDate.getFullYear() - dateRange.start.getFullYear()) * 4;
        const startQuarterIndex = startYearDiff + startQuarter;
        const endQuarterIndex = endYearDiff + endQuarter;
        left = startQuarterIndex * cellWidth;
        width = Math.max((endQuarterIndex - startQuarterIndex + 1) * cellWidth, cellWidth);
        break;
      }
      case 'semesters': {
        // Calcular en qué semestre empieza y termina la tarea
        const startSemester = startDate.getMonth() < 6 ? 0 : 1;
        const endSemester = endDate.getMonth() < 6 ? 0 : 1;
        const startYearDiff = (startDate.getFullYear() - dateRange.start.getFullYear()) * 2;
        const endYearDiff = (endDate.getFullYear() - dateRange.start.getFullYear()) * 2;
        const startSemesterIndex = startYearDiff + startSemester;
        const endSemesterIndex = endYearDiff + endSemester;
        left = startSemesterIndex * cellWidth;
        width = Math.max((endSemesterIndex - startSemesterIndex + 1) * cellWidth, cellWidth);
        break;
      }
      case 'year': {
        // Calcular en qué año empieza y termina la tarea
        const startYear = startDate.getFullYear() - dateRange.start.getFullYear();
        const endYear = endDate.getFullYear() - dateRange.start.getFullYear();
        left = startYear * cellWidth;
        width = Math.max((endYear - startYear + 1) * cellWidth, cellWidth);
        break;
      }
    }

    return {
      left: `${left}px`,
      width: `${width}px`,
    };
  };

  // Verificar si una tarea es un hito (duración 0)
  const isMilestone = (task: Task) => {
    return task.duration === 0 || (!task.duration && task.startDate && task.endDate && 
      new Date(task.startDate).getTime() === new Date(task.endDate).getTime());
  };

  // Calcular posición del hito (rombo) según el nivel de zoom
  const getMilestonePosition = (task: Task) => {
    if (!task.startDate) return null;
    
    const milestoneDate = task.startDate ? new Date(task.startDate) : (task.endDate ? new Date(task.endDate) : null);
    if (!milestoneDate) return null;

    let left = 0;

    switch (zoomLevel) {
      case 'days': {
        const daysFromStart = daysBetween(dateRange.start, milestoneDate);
        left = daysFromStart * cellWidth + (cellWidth / 2);
        break;
      }
      case 'weeks': {
        const weekFromStart = Math.floor(daysBetween(dateRange.start, milestoneDate) / 7);
        left = weekFromStart * cellWidth + (cellWidth / 2);
        break;
      }
      case 'months': {
        const monthFromStart = (milestoneDate.getFullYear() - dateRange.start.getFullYear()) * 12 + 
                               (milestoneDate.getMonth() - dateRange.start.getMonth());
        left = monthFromStart * cellWidth + (cellWidth / 2);
        break;
      }
      case 'quarters': {
        const quarter = Math.floor(milestoneDate.getMonth() / 3);
        const yearDiff = (milestoneDate.getFullYear() - dateRange.start.getFullYear()) * 4;
        left = (yearDiff + quarter) * cellWidth + (cellWidth / 2);
        break;
      }
      case 'semesters': {
        const semester = milestoneDate.getMonth() < 6 ? 0 : 1;
        const yearDiff = (milestoneDate.getFullYear() - dateRange.start.getFullYear()) * 2;
        left = (yearDiff + semester) * cellWidth + (cellWidth / 2);
        break;
      }
      case 'year': {
        const yearFromStart = milestoneDate.getFullYear() - dateRange.start.getFullYear();
        left = yearFromStart * cellWidth + (cellWidth / 2);
        break;
      }
    }

    return {
      left: `${left}px`,
    };
  };

  const handleSaveTask = async (taskId: string, updates: Partial<Task>) => {
    await onTaskUpdate(taskId, updates);
    setEditingTask(null);
  };

  const handleCreateTask = async () => {
    if (!newTask.name?.trim()) return;
    
    // Establecer fechas por defecto si no están definidas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const taskToCreate = {
      ...newTask,
      startDate: newTask.startDate || today.toISOString().split('T')[0],
      endDate: newTask.endDate || tomorrow.toISOString().split('T')[0],
    };
    
    await onTaskCreate(taskToCreate);
    setNewTask({
      name: '',
      startDate: '',
      endDate: '',
      duration: 1,
      progress: 0,
      status: 'todo',
      priority: 'medium',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'blocked':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex">
        {/* Tabla de Tareas (Lado Izquierdo) */}
        <div className="flex-shrink-0 border-r" style={{ width: '400px' }}>
          <div className="bg-gray-50 border-b p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Tareas</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {}}
                className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title="Ocultar tareas"
              >Hide</button>
            </div>
          </div>
          <div className="overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr style={{ height: '48px' }}>
                  <th className="px-4 text-left text-xs font-medium text-gray-500 uppercase border-b" style={{ width: '200px', minWidth: '200px', paddingTop: '8px', paddingBottom: '8px', verticalAlign: 'middle' }}>
                    Tarea
                  </th>
                  <th className="px-4 text-left text-xs font-medium text-gray-500 uppercase border-b" style={{ paddingTop: '8px', paddingBottom: '8px', verticalAlign: 'middle' }}>
                    Inicio
                  </th>
                  <th className="px-4 text-left text-xs font-medium text-gray-500 uppercase border-b" style={{ paddingTop: '8px', paddingBottom: '8px', verticalAlign: 'middle' }}>
                    Fin
                  </th>
                  <th className="px-4 text-left text-xs font-medium text-gray-500 uppercase border-b" style={{ paddingTop: '8px', paddingBottom: '8px', verticalAlign: 'middle' }}>
                    Duración
                  </th>
                  <th className="px-4 text-left text-xs font-medium text-gray-500 uppercase border-b" style={{ paddingTop: '8px', paddingBottom: '8px', verticalAlign: 'middle' }}>
                    Progreso
                  </th>
                  <th className="px-4 text-left text-xs font-medium text-gray-500 uppercase border-b" style={{ paddingTop: '8px', paddingBottom: '8px', verticalAlign: 'middle' }}>
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Tareas existentes */}
                {(() => {
                  // Organizar tareas en jerarquía y luego aplanar para renderizar con indentación
                  const hierarchicalTasks = organizeTasksHierarchy(tasks);
                  const flatTasks = flattenTasksHierarchy(hierarchicalTasks);
                  
                  // Filtrar tareas colapsadas
                  const visibleTasks = filterCollapsedTasks(flatTasks);
                  
                  return visibleTasks.map((task) => {
                    const hasChildren = task.children && task.children.length > 0;
                    const isExpanded = expandedTasks.has(task.id);
                    
                    return (
                      <tr key={task.id} className="border-b hover:bg-gray-50" style={{ height: '40px' }}>
                      {editingTask === task.id ? (
                        <>
                          <td className="px-4 py-2" style={{ paddingLeft: `${(task.level || 0) * 24 + 16}px` }}>
                            <div className="flex items-center gap-2 min-w-0">
                              {(task.level ?? 0) > 0 && (
                                <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 -ml-4 flex-shrink-0"></div>
                              )}
                              {hasChildren && (
                              <button
                                onClick={() => toggleTaskExpansion(task.id)}
                                className="p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                type="button"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={14} className="text-gray-600" />
                                ) : (
                                  <ChevronRight size={14} className="text-gray-600" />
                                )}
                              </button>
                            )}
                            {!hasChildren && (task.level ?? 0) > 0 && (
                              <div className="w-4 flex-shrink-0" /> // Espaciador para alinear
                            )}
                            <input
                              type="text"
                              defaultValue={task.name}
                              onFocus={handleEditingStart}
                              onBlur={(e) => {
                                handleEditingStop();
                                if (e.target.value !== task.name) {
                                  handleSaveTask(task.id, { name: e.target.value });
                                }
                              }}
                              className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white text-sm"
                              autoFocus
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            defaultValue={task.startDate || ''}
                            onFocus={handleEditingStart}
                            onBlur={(e) => {
                              handleEditingStop();
                              if (e.target.value !== (task.startDate || '')) {
                                const updates: Partial<Task> = { startDate: e.target.value };
                                // Recalcular duración si hay fecha de fin
                                if (task.endDate && e.target.value) {
                                  const startDate = new Date(e.target.value);
                                  const endDate = new Date(task.endDate);
                                  startDate.setHours(0, 0, 0, 0);
                                  endDate.setHours(0, 0, 0, 0);
                                  const calculatedDuration = Math.max(0, daysBetween(startDate, endDate));
                                  updates.duration = calculatedDuration;
                                }
                                handleSaveTask(task.id, updates);
                              }
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            defaultValue={task.endDate || ''}
                            onFocus={handleEditingStart}
                            onBlur={(e) => {
                              handleEditingStop();
                              if (e.target.value !== (task.endDate || '')) {
                                const updates: Partial<Task> = { endDate: e.target.value };
                                // Recalcular duración si hay fecha de inicio
                                if (task.startDate && e.target.value) {
                                  const startDate = new Date(task.startDate);
                                  const endDate = new Date(e.target.value);
                                  startDate.setHours(0, 0, 0, 0);
                                  endDate.setHours(0, 0, 0, 0);
                                  const calculatedDuration = Math.max(0, daysBetween(startDate, endDate));
                                  updates.duration = calculatedDuration;
                                }
                                handleSaveTask(task.id, updates);
                              }
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            defaultValue={calculateTaskDuration(task)}
                            onFocus={handleEditingStart}
                            onBlur={(e) => {
                              handleEditingStop();
                              const duration = parseInt(e.target.value) || 0;
                              if (duration !== calculateTaskDuration(task)) {
                                handleSaveTask(task.id, { duration });
                              }
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white text-xs"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            defaultValue={task.progress}
                            onFocus={handleEditingStart}
                            onBlur={(e) => {
                              handleEditingStop();
                              const progress = parseInt(e.target.value) || 0;
                              if (progress !== task.progress) {
                                handleSaveTask(task.id, { progress });
                              }
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white text-xs"
                            min="0"
                            max="100"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => setEditingTask(null)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 text-gray-900" style={{ paddingLeft: `${(task.level || 0) * 24 + 16}px` }}>
                          <div className="flex items-center gap-2 min-w-0">
                            {(task.level ?? 0) > 0 && (
                              <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 -ml-4 flex-shrink-0"></div>
                            )}
                            {hasChildren && (
                              <button
                                onClick={() => toggleTaskExpansion(task.id)}
                                className="p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                type="button"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={14} className="text-gray-600" />
                                ) : (
                                  <ChevronRight size={14} className="text-gray-600" />
                                )}
                              </button>
                            )}
                            {!hasChildren && (task.level ?? 0) > 0 && (
                              <div className="w-4 flex-shrink-0" /> // Espaciador para alinear
                            )}
                            <span className="truncate min-w-0" title={task.name}>{task.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-600 text-xs">
                          {task.startDate ? formatDate(new Date(task.startDate)) : '-'}
                        </td>
                        <td className="px-4 py-2 text-gray-600 text-xs">
                          {task.endDate ? formatDate(new Date(task.endDate)) : '-'}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{calculateTaskDuration(task)} días</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{task.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingTask(task.id)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => onTaskDelete(task.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Diagrama de Gantt (Lado Derecho) */}
        <div className="flex-1 overflow-x-auto" ref={ganttContainerRef}>
          <div className="bg-gray-50 border-b p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Diagrama de Gantt</h3>
              {editingUsers.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Editando:</span>
                  {Array.from(editingUsers.values()).map((user) => {
                    // Generar un color único basado en el userId
                    const colors = [
                      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
                      'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-orange-500'
                    ];
                    const colorIndex = parseInt(user.userId.slice(-1), 16) % colors.length;
                    const bgColor = colors[colorIndex];
                    
                    return (
                      <div
                        key={user.userId}
                        className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-gray-200 shadow-sm"
                        title={user.userName}
                      >
                        <div className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center text-white text-xs font-medium`}>
                          <User size={12} />
                        </div>
                        <span className="text-xs text-gray-700 max-w-[100px] truncate">
                          {user.userName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoZoom}
                className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title="Ajustar zoom para ver todas las tareas"
              >
                <Maximize2 size={16} />
                Auto
              </button>
              <label className="text-sm text-gray-700">Zoom:</label>
              <select
                value={zoomLevel}
                onChange={(e) => setZoomLevel(e.target.value as ZoomLevel)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="days">Días</option>
                <option value="weeks">Semanas</option>
                <option value="months">Meses</option>
                <option value="quarters">Trimestres</option>
                <option value="semesters">Semestres</option>
                <option value="year">Año</option>
              </select>
            </div>
          </div>
          <div className="relative" style={{ minHeight: '600px' }}>
            {/* Encabezado de fechas */}
            <div className="sticky top-0 bg-white border-b z-10">
              <div className="flex" style={{ width: `${dateColumns.length * cellWidth}px` }}>
                {dateColumns.map((column, index) => {
                  const isWeekend = zoomLevel === 'days' && (column.date.getDay() === 0 || column.date.getDay() === 6);
                  const isFirstOfMonth = zoomLevel === 'days' && column.date.getDate() === 1;
                  return (
                    <div
                      key={index}
                      className={`border-r text-xs text-center ${
                        isWeekend ? 'bg-gray-100' : 'bg-white'
                      }`}
                      style={{ width: `${column.width}px`, minWidth: `${column.width}px`, paddingTop: '8px', paddingBottom: '8px', minHeight: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                    >
                      {zoomLevel === 'days' ? (
                        isFirstOfMonth || index === 0 ? (
                          <div>
                            <div className="font-medium">{formatDate(column.date)}</div>
                            <div className="text-gray-500">{column.date.getDate()}</div>
                          </div>
                        ) : (
                          <div className="text-gray-500">{column.date.getDate()}</div>
                        )
                      ) : (
                        <div className="font-medium text-gray-900">{column.label}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Barras de Gantt */}
            <div className="relative mt-4" style={{ width: `${dateColumns.length * cellWidth}px` }}>
              {(() => {
                // Organizar tareas en jerarquía y luego aplanar para renderizar con indentación
                const hierarchicalTasks = organizeTasksHierarchy(tasks);
                const flatTasks = flattenTasksHierarchy(hierarchicalTasks);
                
                // Filtrar tareas colapsadas
                const visibleTasks = filterCollapsedTasks(flatTasks);
                
                // Crear un mapa de posiciones basado en el orden de las tareas visibles en la tabla
                const positionMap = new Map<string, number>();
                visibleTasks.forEach((task, idx) => {
                  positionMap.set(task.id, idx);
                });
                
                return visibleTasks.map((task, index) => {
                  if (!task.startDate) return null;
                  
                  const isHito = isMilestone(task);
                  const barStyle = getTaskBarStyle(task);
                  const milestonePos = isHito ? getMilestonePosition(task) : null;
                  
                  // Calcular la posición vertical basada en el índice de la fila en la tabla
                  // Cada fila tiene aproximadamente 40px de altura (incluyendo padding y border)
                  // El contenedor del gráfico ya está posicionado para alinearse con las filas de la tabla
                  // La primera tarea (index 0) debe empezar en topPosition = 0
                  const rowHeight = 40; // Altura aproximada de cada fila de tarea
                  // Para index 0: topPosition = 0 * 40 = 0px
                  // Para index 1: topPosition = 1 * 40 = 40px
                  const topPosition = index * rowHeight;
                  
                  // Si es un hito, renderizar un rombo
                  if (isHito && milestonePos) {
                    return (
                      <div
                        key={task.id}
                        className="absolute"
                        style={{ 
                          top: `${topPosition}px`,
                          left: `${(task.level ?? 0) * 20}px`,
                          height: '24px',
                        }}
                      >
                        <div
                          className={`absolute ${getStatusColor(task.status)} opacity-80 hover:opacity-100 transition-opacity`}
                          style={{
                            left: `calc(${milestonePos.left} - 8px)`, // Centrar el rombo de 16px (8px a cada lado)
                            top: '4px',
                            width: '16px',
                            height: '16px',
                            transform: 'rotate(45deg)',
                            transformOrigin: 'center',
                          }}
                          title={`${task.name} (Hito)`}
                        />
                      </div>
                    );
                  }
                  
                  // Si no es un hito, renderizar la barra normal
                  return (
                    <div
                      key={task.id}
                      className="absolute"
                      style={{ 
                        top: `${topPosition}px`,
                        left: `${(task.level ?? 0) * 20}px`,
                        height: '24px',
                        width: barStyle.width || '20px'
                      }}
                    >
                    <div
                      className={`absolute rounded ${getStatusColor(task.status)} opacity-80 hover:opacity-100 transition-opacity`}
                      style={{
                        ...barStyle,
                        top: '8px',
                        height: '24px',
                      }}
                      title={`${task.name} (${task.progress}%)`}
                    >
                      <div className="flex items-center h-full px-2 text-white text-xs font-medium">
                        {task.name}
                      </div>
                      {/* Indicador de progreso */}
                      {task.progress > 0 && (
                        <div
                          className="absolute top-0 left-0 h-full bg-green-400 rounded-l opacity-60"
                          style={{ width: `${task.progress}%` }}
                        />
                      )}
                    </div>
                  </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

