import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import userRoutes from './routes/users';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io para colaboración en tiempo real
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Aquí podrías validar el token JWT
  // Por ahora permitimos conexión
  next();
});

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Unirse a una sala de proyecto
  socket.on('join:project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    console.log(`Usuario ${socket.id} se unió al proyecto ${projectId}`);
  });

  // Salir de una sala de proyecto
  socket.on('leave:project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
    console.log(`Usuario ${socket.id} salió del proyecto ${projectId}`);
  });

  // Actualización de tarea en tiempo real
  socket.on('task:update', async (data: { projectId: string; task: any }) => {
    socket.to(`project:${data.projectId}`).emit('task:updated', data.task);
  });

  // Creación de tarea en tiempo real
  socket.on('task:create', async (data: { projectId: string; task: any }) => {
    socket.to(`project:${data.projectId}`).emit('task:created', data.task);
  });

  // Eliminación de tarea en tiempo real
  socket.on('task:delete', async (data: { projectId: string; taskId: string }) => {
    socket.to(`project:${data.projectId}`).emit('task:deleted', data.taskId);
  });

  // Actualización de proyecto en tiempo real
  socket.on('project:update', async (data: { projectId: string; project: any }) => {
    socket.to(`project:${data.projectId}`).emit('project:updated', data.project);
  });

  // Usuario está editando el Gantt
  socket.on('gantt:editing:start', (data: { projectId: string; userId: string; userName: string }) => {
    socket.to(`project:${data.projectId}`).emit('gantt:user:editing', {
      userId: data.userId,
      userName: data.userName,
      isEditing: true,
    });
  });

  // Usuario dejó de editar el Gantt
  socket.on('gantt:editing:stop', (data: { projectId: string; userId: string }) => {
    socket.to(`project:${data.projectId}`).emit('gantt:user:editing', {
      userId: data.userId,
      isEditing: false,
    });
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

// Iniciar servidor
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

// Manejo de errores
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { io, prisma };

