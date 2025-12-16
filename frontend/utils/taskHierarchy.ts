/**
 * Utilidades para manejar la jerarquía de tareas
 */

export interface Task {
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
  assignments?: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  }>;
}

/**
 * Organiza las tareas planas en una estructura jerárquica
 */
export function organizeTasksHierarchy(tasks: Task[]): Task[] {
  // Crear un mapa de tareas por ID
  const taskMap = new Map<string, Task>();
  const rootTasks: Task[] = [];

  // Primera pasada: crear mapa y agregar children vacío
  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  // Segunda pasada: construir jerarquía
  tasks.forEach((task) => {
    const taskWithChildren = taskMap.get(task.id)!;
    
    if (task.parentId) {
      const parent = taskMap.get(task.parentId);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(taskWithChildren);
      } else {
        // Si no se encuentra el padre, es una tarea raíz
        rootTasks.push(taskWithChildren);
      }
    } else {
      // Tarea sin padre = tarea raíz
      rootTasks.push(taskWithChildren);
    }
  });

  return rootTasks;
}

/**
 * Aplana la estructura jerárquica de tareas en una lista plana
 * Útil para renderizar con indentación
 */
export function flattenTasksHierarchy(tasks: Task[], level: number = 0): Array<Task & { level: number }> {
  const result: Array<Task & { level: number }> = [];

  tasks.forEach((task) => {
    result.push({ ...task, level });
    
    if (task.children && task.children.length > 0) {
      result.push(...flattenTasksHierarchy(task.children, level + 1));
    }
  });

  return result;
}

