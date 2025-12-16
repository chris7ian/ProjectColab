# Guía de Instalación - ProjectColab

## Requisitos Previos

- Node.js 18+ y npm
- PostgreSQL 14+
- Git

## Pasos de Instalación

### 1. Clonar e Instalar Dependencias

```bash
# Instalar dependencias del workspace
npm install

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

### 2. Configurar Base de Datos

1. Crear una base de datos PostgreSQL:
```sql
CREATE DATABASE projectcolab;
```

2. Configurar variables de entorno del backend:
```bash
cd backend
cp env.example.txt .env
```

3. Editar `.env` y configurar:
```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/projectcolab?schema=public"
JWT_SECRET="tu-clave-secreta-muy-segura"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

4. Ejecutar migraciones:
```bash
npx prisma migrate dev
npx prisma generate
```

### 3. Configurar Frontend

1. Configurar variables de entorno:
```bash
cd frontend
cp .env.local.example .env.local
```

2. Editar `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 4. Iniciar la Aplicación

Desde la raíz del proyecto:

```bash
npm run dev
```

O por separado:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Acceder a la Aplicación

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Prisma Studio (opcional): `cd backend && npx prisma studio`

## Primeros Pasos

1. Crear una cuenta en `/login`
2. Crear tu primer proyecto desde el dashboard
3. Agregar tareas y asignar miembros
4. ¡Comienza a colaborar!

## Solución de Problemas

### Error de conexión a la base de datos
- Verifica que PostgreSQL esté corriendo
- Revisa las credenciales en `.env`
- Asegúrate de que la base de datos existe

### Error de CORS
- Verifica que `FRONTEND_URL` en el backend coincida con la URL del frontend
- Revisa que ambos servidores estén corriendo

### Error de módulos no encontrados
- Ejecuta `npm install` en backend y frontend
- Verifica que Node.js sea versión 18+

