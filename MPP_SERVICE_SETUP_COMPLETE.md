# ✅ Servicio Java MPP Parser - Configuración Completa

## Estado Actual

✅ **Servicio Java compilado y ejecutándose**
- Puerto: `http://localhost:3002`
- Health check: ✅ Funcionando
- Build: ✅ Exitoso

## Configuración del Backend

### 1. Agregar Variable de Entorno

Agrega en `backend/.env`:

```env
MPP_SERVICE_URL=http://localhost:3002
```

### 2. Instalar Dependencias del Backend

```bash
cd backend
npm install
```

Esto instalará:
- `axios` - Para hacer peticiones HTTP al servicio Java
- `form-data` - Para enviar archivos multipart/form-data

## Cómo Funciona

1. **Usuario sube archivo .mpp** desde el dashboard
2. **Backend Node.js** recibe el archivo
3. **Backend intenta usar servicio Java** primero:
   - Envía el archivo a `http://localhost:3002/api/parse`
   - Recibe JSON con proyecto y tareas parseadas
4. **Si el servicio Java no está disponible**, usa el parser básico como fallback
5. **Crea proyecto y tareas** en la base de datos

## Comandos Útiles

### Ejecutar Servicio Java
```bash
cd mpp-service
mvn spring-boot:run
```

### Ejecutar Backend Node.js
```bash
cd backend
npm run dev
```

### Verificar Servicio Java
```bash
curl http://localhost:3002/api/health
```

## Estructura del Proyecto

```
ProjectColab/
├── backend/                    # Backend Node.js
│   ├── src/routes/projects.ts  # Endpoint de importación
│   └── .env                    # Configurar MPP_SERVICE_URL aquí
│
└── mpp-service/                # Servicio Java con MPXJ
    ├── src/main/java/...       # Código Java
    └── target/                 # JAR compilado
```

## Ventajas de Usar MPXJ

✅ **Parseo completo y preciso** - Extrae toda la información del archivo .mpp
✅ **Soporta todas las características** - Tareas, fechas, duraciones, progreso, prioridades
✅ **Bien mantenido** - MPXJ es la librería estándar para parsear .mpp
✅ **Open source** - Gratis y confiable

## Próximos Pasos

1. ✅ Servicio Java corriendo
2. ⏳ Configurar `MPP_SERVICE_URL` en `backend/.env`
3. ⏳ Instalar dependencias del backend (`npm install`)
4. ⏳ Probar importación de archivo .mpp desde el dashboard

¡Todo listo para importar archivos .mpp con parseo completo usando MPXJ! 🎉

