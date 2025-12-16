# Solución de Problemas - ProjectColab

## Problema: Timeout de Red al Instalar Paquetes

Si encuentras errores de timeout (`ETIMEDOUT`) al ejecutar `npm install`, prueba las siguientes soluciones:

### Solución 1: Instalar por Separado (Recomendado)

En lugar de `npm run install:all`, instala cada parte por separado:

```bash
# 1. Instalar dependencias del workspace raíz
npm run install:root

# 2. Instalar dependencias del backend
npm run install:backend

# 3. Instalar dependencias del frontend
npm run install:frontend
```

### Solución 2: Configurar Timeout de npm

Ejecuta estos comandos para aumentar el timeout de npm:

```bash
npm config set fetch-timeout 60000
npm config set fetch-retries 3
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
```

**Nota:** El archivo `.npmrc` en la raíz del proyecto ya tiene estas configuraciones, pero puedes aplicarlas globalmente con los comandos anteriores.

### Solución 3: Usar Registro Alternativo

Si tienes problemas con el registro de npm, prueba usar un mirror:

```bash
# Usar registro de Taobao (China)
npm config set registry https://registry.npmmirror.com

# O usar registro de Cloudflare
npm config set registry https://registry.npmjs.org/

# Verificar registro actual
npm config get registry
```

### Solución 4: Limpiar Cache y Reinstalar

```bash
# Limpiar cache de npm
npm cache clean --force

# Eliminar node_modules y package-lock.json
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json

# Reinstalar
npm run install:all
```

### Solución 5: Usar Yarn (Alternativa)

Si npm sigue dando problemas, puedes usar Yarn:

```bash
# Instalar Yarn globalmente
npm install -g yarn

# Instalar dependencias
yarn install
cd backend && yarn install
cd ../frontend && yarn install
```

### Solución 6: Verificar Proxy/Firewall

Si estás detrás de un proxy corporativo:

```bash
# Configurar proxy (reemplaza con tus valores)
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# O deshabilitar proxy si no lo necesitas
npm config delete proxy
npm config delete https-proxy
```

### Solución 7: Instalación Manual Paso a Paso

Si nada funciona, instala manualmente:

```bash
# 1. Raíz
cd /Users/christiantuohy/Documents/Projects/ProjectColab
npm install concurrently --save-dev

# 2. Backend
cd backend
npm install @prisma/client express socket.io cors dotenv bcryptjs jsonwebtoken zod
npm install --save-dev @types/express @types/node @types/cors @types/bcryptjs @types/jsonwebtoken prisma tsx typescript

# 3. Frontend
cd ../frontend
npm install next react react-dom socket.io-client axios zustand date-fns recharts react-dnd react-dnd-html5-backend lucide-react
npm install --save-dev @types/node @types/react @types/react-dom typescript tailwindcss postcss autoprefixer eslint eslint-config-next
```

## Otros Problemas Comunes

### Error: "Cannot find module"
- Ejecuta `npm install` en el directorio correspondiente
- Verifica que todas las dependencias estén instaladas

### Error: "Prisma Client not generated"
```bash
cd backend
npx prisma generate
```

### Error: "Database connection failed"
- Verifica que PostgreSQL esté corriendo
- Revisa las credenciales en `backend/.env`
- Asegúrate de que la base de datos existe

### Error: "Port already in use"
- Cambia el puerto en `backend/.env` (PORT=3002)
- O mata el proceso que está usando el puerto:
```bash
# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

