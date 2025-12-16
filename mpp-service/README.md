# MPP Parser Service

Servicio Java que usa MPXJ para parsear archivos .mpp (Microsoft Project) de forma completa y precisa.

## Requisitos

- Java 11 o superior
- Maven 3.6+

## Instalación

1. Instalar dependencias y compilar:
```bash
cd mpp-service
mvn clean install
```

2. Ejecutar el servicio:
```bash
mvn spring-boot:run
```

O ejecutar el JAR compilado:
```bash
java -jar target/mpp-parser-service-1.0.0.jar
```

El servicio estará disponible en `http://localhost:3002`

## API

### POST /api/parse
Parsea un archivo .mpp y retorna el proyecto con todas sus tareas.

**Request:**
- Content-Type: multipart/form-data
- Body: `file` (archivo .mpp)

**Response:**
```json
{
  "name": "Nombre del Proyecto",
  "startDate": "2024-01-01T00:00:00",
  "finishDate": "2024-12-31T23:59:59",
  "tasks": [
    {
      "name": "Nombre de la Tarea",
      "description": "Descripción",
      "startDate": "2024-01-01T00:00:00",
      "finishDate": "2024-01-05T23:59:59",
      "duration": 5.0,
      "progress": 50,
      "status": "in_progress",
      "priority": "high",
      "order": 0
    }
  ]
}
```

### GET /api/health
Verifica que el servicio esté corriendo.

## Integración con Node.js

El backend de Node.js llamará a este servicio cuando se importe un archivo .mpp.

