# ProjectColab - Sistema Colaborativo de Gestión de Proyectos

Sistema web colaborativo tipo Microsoft Project para gestión de proyectos con funcionalidades en tiempo real.

## Características

- 📊 **Vista de Gantt**: Visualización de cronogramas de proyectos
- 👥 **Colaboración en tiempo real**: Múltiples usuarios trabajando simultáneamente
- 🔗 **Dependencias de tareas**: Gestión de relaciones entre tareas
- 📅 **Gestión de fechas**: Fechas de inicio, fin y duración
- 👤 **Asignación de usuarios**: Asignar miembros del equipo a tareas
- 🔐 **Autenticación**: Sistema de usuarios y permisos
- 📈 **Dashboard**: Vista general de proyectos y progreso

## Tecnologías

### Backend
- Node.js + Express
- Socket.io (colaboración en tiempo real)
- Prisma ORM
- PostgreSQL
- JWT (autenticación)

### Frontend
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- Recharts (gráficos)
- React DnD (drag and drop)

## Instalación

1. Instalar dependencias:

**Opción A - Instalación completa (puede fallar con problemas de red):**
```bash
npm run install:all
```

**Opción B - Instalación paso a paso (recomendado si hay problemas de red):**
```bash
# Instalar dependencias del workspace raíz
npm run install:root

# Instalar dependencias del backend
npm run install:backend

# Instalar dependencias del frontend
npm run install:frontend
```

**Si tienes problemas de timeout, consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

2. Configurar variables de entorno:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Configurar base de datos:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

4. Iniciar servidores:
```bash
npm run dev
```

El backend estará en `http://localhost:3001`
El frontend estará en `http://localhost:3000`

## Estructura del Proyecto

```
ProjectColab/
├── backend/          # API REST + WebSocket
├── frontend/         # Aplicación Next.js
└── README.md
```

## Desarrollo

- Backend: `npm run dev:backend`
- Frontend: `npm run dev:frontend`
- Ambos: `npm run dev`

