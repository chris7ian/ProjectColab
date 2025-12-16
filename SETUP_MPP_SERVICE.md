# Configuración del Servicio Java para Parsear .mpp

## Requisitos Previos

- Java 11 o superior instalado
- Maven 3.6+ instalado (o usar el wrapper incluido)

## Instalación y Configuración

### 1. Verificar Java y Maven

```bash
java -version
mvn -version
```

### 2. Compilar el Servicio Java

```bash
cd mpp-service
mvn clean install
```

### 3. Ejecutar el Servicio

**Opción A: Usando Maven**
```bash
mvn spring-boot:run
```

**Opción B: Usando el JAR compilado**
```bash
java -jar target/mpp-parser-service-1.0.0.jar
```

El servicio estará disponible en `http://localhost:3002`

### 4. Configurar el Backend de Node.js

Agregar la URL del servicio Java en `backend/.env`:

```env
MPP_SERVICE_URL=http://localhost:3002
```

### 5. Verificar que Funciona

```bash
# Health check
curl http://localhost:3002/api/health

# Debería responder: "MPP Parser Service is running"
```

## Integración Automática

El backend de Node.js intentará usar el servicio Java automáticamente cuando se importe un archivo .mpp. Si el servicio Java no está disponible, usará el parser básico como fallback.

## Estructura del Proyecto

```
mpp-service/
├── pom.xml                    # Configuración Maven
├── src/main/java/
│   └── com/projectcolab/mppservice/
│       ├── MppParserServiceApplication.java
│       ├── controller/
│       │   └── MppParserController.java
│       ├── service/
│       │   └── MppParserService.java
│       └── dto/
│           ├── ProjectDTO.java
│           └── TaskDTO.java
└── src/main/resources/
    └── application.properties
```

## Ventajas de Usar MPXJ

✅ **Parseo completo y preciso** - Extrae toda la información del archivo .mpp
✅ **Soporta todas las características** - Tareas, dependencias, recursos, calendarios
✅ **Bien mantenido** - MPXJ es la librería estándar para parsear .mpp
✅ **Open source** - Gratis y confiable

## Troubleshooting

### Error: "Cannot find Java"
- Instala Java 11+ desde [Oracle](https://www.oracle.com/java/technologies/downloads/) o [OpenJDK](https://openjdk.org/)

### Error: "Maven not found"
- Instala Maven o usa el wrapper: `./mvnw` (Linux/Mac) o `mvnw.cmd` (Windows)

### El servicio no inicia
- Verifica que el puerto 3002 no esté en uso
- Revisa los logs en la consola

### El backend no puede conectar
- Verifica que el servicio Java esté corriendo
- Verifica la URL en `backend/.env`
- El backend usará el parser básico como fallback si no puede conectar

