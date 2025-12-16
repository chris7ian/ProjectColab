import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../server';
import { io } from '../server';
import { parseMPPFile } from '../utils/mppParser';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB límite
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.ms-project' || file.originalname.endsWith('.mpp')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .mpp'));
    }
  },
});

const router = express.Router();

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Obtener todos los proyectos del usuario
router.get('/', async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: req.userId!,
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        members: {
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
        tasks: {
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
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(projects);
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

// Obtener un proyecto por ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        members: {
          some: {
            userId: req.userId!,
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        members: {
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
        tasks: {
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
            parent: {
              select: {
                id: true,
                name: true,
              },
            },
            children: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error al obtener proyecto:', error);
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
});

// Crear proyecto
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        creatorId: req.userId!,
        members: {
          create: {
            userId: req.userId!,
            role: 'owner',
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        members: {
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

    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al crear proyecto:', error);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
});

// Actualizar proyecto
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = createProjectSchema.partial().parse(req.body);

    // Verificar que el usuario es miembro del proyecto
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: req.params.id,
        userId: req.userId!,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'No tienes permisos para actualizar este proyecto' });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        members: {
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

    // Emitir actualización en tiempo real
    io.to(`project:${project.id}`).emit('project:updated', project);

    res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al actualizar proyecto:', error);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
});

// Eliminar proyecto
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    // Verificar que el usuario es owner del proyecto
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: req.params.id,
        userId: req.userId!,
        role: 'owner',
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Solo el propietario puede eliminar el proyecto' });
    }

    await prisma.project.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Proyecto eliminado' });
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
});

// Agregar miembro al proyecto
router.post('/:id/members', async (req: AuthRequest, res) => {
  try {
    const { userId, role } = z.object({
      userId: z.string(),
      role: z.enum(['owner', 'admin', 'member']).optional(),
    }).parse(req.body);

    // Verificar permisos
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: req.params.id,
        userId: req.userId!,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'No tienes permisos para agregar miembros' });
    }

    const projectMember = await prisma.projectMember.create({
      data: {
        projectId: req.params.id,
        userId,
        role: role || 'member',
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

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
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

    io.to(`project:${req.params.id}`).emit('project:updated', project);

    res.status(201).json(projectMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al agregar miembro:', error);
    res.status(500).json({ error: 'Error al agregar miembro' });
  }
});

// Importar proyecto desde archivo .mpp
router.post('/import/mpp', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // Intentar usar el servicio Java con MPXJ primero
    let parsedProject;
    let parserUsed = 'basic'; // 'java' o 'basic'
    const mppServiceUrl = process.env.MPP_SERVICE_URL || 'http://localhost:3002';
    
    try {
      console.log(`[MPP Import] Intentando usar servicio Java (MPXJ) en ${mppServiceUrl}...`);
      
      // Enviar archivo al servicio Java
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const response = await axios.post(`${mppServiceUrl}/api/parse`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30 segundos timeout
      });

      console.log(`[MPP Import] ✅ Servicio Java (MPXJ) respondió exitosamente. Tareas encontradas: ${response.data.tasks?.length || 0}`);

      // Convertir respuesta del servicio Java al formato esperado
      parsedProject = {
        name: response.data.name || req.file.originalname.replace('.mpp', ''),
        startDate: response.data.startDate ? new Date(response.data.startDate) : undefined,
        finishDate: response.data.finishDate ? new Date(response.data.finishDate) : undefined,
        tasks: response.data.tasks.map((task: any) => ({
          name: task.name,
          notes: task.description,
          startDate: task.startDate ? new Date(task.startDate) : undefined,
          finishDate: task.finishDate ? new Date(task.finishDate) : undefined,
          duration: task.duration ? Math.ceil(task.duration) : undefined,
          progress: task.progress || 0,
          priority: task.priority || 'medium',
          status: task.status || 'todo',
          order: task.order,
          outlineLevel: task.outlineLevel || 1,
          parentTaskName: task.parentTaskName || null,
          parentOrder: task.parentOrder || null,
        })),
      };
      
      parserUsed = 'java';
    } catch (javaServiceError: any) {
      console.warn(`[MPP Import] ⚠️ Servicio Java no disponible (${javaServiceError.code || 'ERROR'}), usando parser básico...`);
      console.warn(`[MPP Import] Detalles: ${javaServiceError.message}`);
      
      // Fallback al parser básico si el servicio Java no está disponible
      parsedProject = await parseMPPFile(req.file.buffer);
      parserUsed = 'basic';
      console.log(`[MPP Import] Parser básico completado. Tareas encontradas: ${parsedProject.tasks?.length || 0}`);
    }
    
    // Crear el proyecto en la base de datos
    const project = await prisma.project.create({
      data: {
        name: parsedProject.name || req.file.originalname.replace('.mpp', ''),
        description: `Proyecto importado desde ${req.file.originalname}`,
        startDate: parsedProject.startDate || undefined,
        endDate: parsedProject.finishDate || undefined,
        creatorId: req.userId!,
        members: {
          create: {
            userId: req.userId!,
            role: 'owner',
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        members: {
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

    // Crear las tareas parseadas respetando la jerarquía
    const createdTasks: any[] = [];
    const taskMap = new Map<string, any>(); // Mapa para encontrar padres por nombre+order
    
    // Primero, crear todas las tareas sin parentId
    for (const taskData of parsedProject.tasks) {
      try {
        const taskOrder = taskData.order !== undefined ? taskData.order : createdTasks.length;
        const taskKey = `${taskData.name}_${taskOrder}`;
        
        const task = await prisma.task.create({
          data: {
            name: taskData.name,
            description: taskData.notes || undefined,
            startDate: taskData.startDate || undefined,
            endDate: taskData.finishDate || undefined,
            duration: taskData.duration ? Math.ceil(taskData.duration) : undefined,
            progress: taskData.progress || 0,
            status: (taskData.status || (taskData.progress && taskData.progress >= 100 ? 'completed' : 'todo')) as any,
            priority: (taskData.priority || 'medium') as any,
            order: taskOrder,
            projectId: project.id,
            // parentId se establecerá después
          },
        });
        
        createdTasks.push(task);
        // Guardar en el mapa usando nombre y order para referencia
        taskMap.set(taskKey, task);
        
        // También guardar por solo nombre (por si hay duplicados, usaremos el más cercano)
        if (!taskMap.has(taskData.name)) {
          taskMap.set(taskData.name, task);
        }
      } catch (taskError) {
        console.error(`Error al crear tarea "${taskData.name}":`, taskError);
        // Continuar con las siguientes tareas aunque una falle
      }
    }
    
    // Ahora actualizar las relaciones padre-hijo
    for (let i = 0; i < parsedProject.tasks.length; i++) {
      const taskData = parsedProject.tasks[i];
      const createdTask = createdTasks[i];
      
      if (!createdTask) {
        continue;
      }
      
      try {
        // Buscar el padre basándose en outlineLevel o parentTaskName
        let parentTask = null;
        const currentLevel = taskData.outlineLevel || 1;
        
        // Si hay un parentTaskName, intentar encontrarlo
        if (taskData.parentTaskName) {
          // Primero intentar por nombre + order si está disponible
          if (taskData.parentOrder !== null && taskData.parentOrder !== undefined) {
            const parentKey = `${taskData.parentTaskName}_${taskData.parentOrder}`;
            parentTask = taskMap.get(parentKey);
          }
          
          // Si no se encuentra, buscar por nombre
          if (!parentTask) {
            parentTask = taskMap.get(taskData.parentTaskName);
          }
        }
        
        // Si no hay parentTaskName pero hay outlineLevel > 1, buscar el padre por nivel
        if (!parentTask && currentLevel > 1) {
          // Buscar hacia atrás en la lista para encontrar el padre
          // El padre debe tener un outlineLevel menor
          for (let j = i - 1; j >= 0; j--) {
            const potentialParent = parsedProject.tasks[j];
            const parentLevel = potentialParent.outlineLevel || 1;
            
            if (parentLevel < currentLevel) {
              parentTask = createdTasks[j];
              break;
            }
          }
        }
        
        // Si encontramos el padre, actualizar la relación
        if (parentTask) {
          await prisma.task.update({
            where: { id: createdTask.id },
            data: { parentId: parentTask.id },
          });
          
          createdTask.parentId = parentTask.id;
          console.log(`[MPP Import] ✅ Tarea "${taskData.name}" (nivel ${currentLevel}) vinculada a padre`);
        } else if (currentLevel > 1) {
          console.warn(`[MPP Import] ⚠️ No se encontró padre para tarea "${taskData.name}" (nivel ${currentLevel})`);
        }
      } catch (updateError) {
        console.error(`Error al actualizar relación padre-hijo para "${taskData.name}":`, updateError);
      }
    }

    // Obtener el proyecto completo con las tareas creadas
    const projectWithTasks = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        members: {
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
        tasks: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    const parserName = parserUsed === 'java' ? 'MPXJ (Java)' : 'Parser Básico';
    const parserIcon = parserUsed === 'java' ? '✅' : '⚠️';
    
    console.log(`[MPP Import] ✨ Proyecto creado usando ${parserName}. ${createdTasks.length} tarea(s) creada(s).`);
    
    res.status(201).json({
      project: projectWithTasks,
      message: `${parserIcon} Proyecto importado exitosamente usando ${parserName}. ${createdTasks.length} tarea(s) creada(s).`,
      tasksCreated: createdTasks.length,
      parserUsed: parserUsed, // 'java' o 'basic'
      parserName: parserName,
    });
  } catch (error) {
    console.error('Error al importar proyecto:', error);
    res.status(500).json({ 
      error: 'Error al importar el archivo .mpp',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;

