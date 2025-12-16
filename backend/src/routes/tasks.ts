import express from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../server';
import { io } from '../server';

const router = express.Router();

const createTaskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  parentId: z.string().optional(),
  order: z.number().int().optional(),
});

const updateTaskSchema = createTaskSchema.partial();

// Obtener todas las tareas de un proyecto
router.get('/project/:projectId', async (req: AuthRequest, res) => {
  try {
    // Verificar que el usuario es miembro del proyecto
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: req.params.projectId,
        userId: req.userId!,
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'No tienes acceso a este proyecto' });
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId: req.params.projectId,
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependents: {
          include: {
            task: true,
          },
        },
        parent: true,
        children: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// Obtener una tarea por ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId: req.userId!,
              },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependents: {
          include: {
            task: true,
          },
        },
        parent: true,
        children: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    // Verificar acceso
    if (task.project.members.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta tarea' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error al obtener tarea:', error);
    res.status(500).json({ error: 'Error al obtener tarea' });
  }
});

// Crear tarea
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const { projectId } = z.object({ projectId: z.string() }).parse(req.body);

    // Verificar que el usuario es miembro del proyecto
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: req.userId!,
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'No tienes acceso a este proyecto' });
    }

    // Obtener el siguiente order
    const maxOrder = await prisma.task.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        projectId,
        order: data.order ?? (maxOrder?.order ?? 0) + 1,
        progress: data.progress ?? 0,
        status: data.status ?? 'todo',
        priority: data.priority ?? 'medium',
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependents: {
          include: {
            task: true,
          },
        },
      },
    });

    // Emitir creación en tiempo real
    io.to(`project:${projectId}`).emit('task:created', task);

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al crear tarea:', error);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// Actualizar tarea
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = updateTaskSchema.parse(req.body);

    // Verificar acceso
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId: req.userId!,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    if (task.project.members.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta tarea' });
    }

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependents: {
          include: {
            task: true,
          },
        },
      },
    });

    // Emitir actualización en tiempo real
    io.to(`project:${task.projectId}`).emit('task:updated', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// Eliminar tarea
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    // Verificar acceso
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId: req.userId!,
                role: { in: ['owner', 'admin'] },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    if (task.project.members.length === 0) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta tarea' });
    }

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    // Emitir eliminación en tiempo real
    io.to(`project:${task.projectId}`).emit('task:deleted', req.params.id);

    res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

// Agregar dependencia
router.post('/:id/dependencies', async (req: AuthRequest, res) => {
  try {
    const { dependsOnId, type } = z.object({
      dependsOnId: z.string(),
      type: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).optional(),
    }).parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId: req.userId!,
              },
            },
          },
        },
      },
    });

    if (!task || task.project.members.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta tarea' });
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId: req.params.id,
        dependsOnId,
        type: type || 'finish_to_start',
      },
      include: {
        dependsOn: true,
        task: true,
      },
    });

    io.to(`project:${task.projectId}`).emit('task:updated', task);

    res.status(201).json(dependency);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al agregar dependencia:', error);
    res.status(500).json({ error: 'Error al agregar dependencia' });
  }
});

// Asignar usuario a tarea
router.post('/:id/assignments', async (req: AuthRequest, res) => {
  try {
    const { userId, role } = z.object({
      userId: z.string(),
      role: z.enum(['assignee', 'reviewer', 'watcher']).optional(),
    }).parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId: req.userId!,
              },
            },
          },
        },
      },
    });

    if (!task || task.project.members.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta tarea' });
    }

    const assignment = await prisma.taskAssignment.create({
      data: {
        taskId: req.params.id,
        userId,
        role: role || 'assignee',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    io.to(`project:${task.projectId}`).emit('task:updated', updatedTask);

    res.status(201).json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al asignar usuario:', error);
    res.status(500).json({ error: 'Error al asignar usuario' });
  }
});

export default router;

