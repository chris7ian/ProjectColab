# Inicio Rápido - Servicio Java MPP Parser

## Instalación de Requisitos (macOS)

### 1. Instalar Java 11+

**Opción A: Usando Homebrew (Recomendado)**
```bash
brew install openjdk@11
```

O para Java 17 (más reciente):
```bash
brew install openjdk@17
```

Luego agregar al PATH:
```bash
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Opción B: Descargar desde Oracle/OpenJDK**
- Visita: https://adoptium.net/
- Descarga Java 11 o superior
- Instala el paquete .pkg

### 2. Instalar Maven

**Opción A: Usando Homebrew**
```bash
brew install maven
```

**Opción B: Usar Maven Wrapper (Incluido)**
El proyecto incluye `mvnw` (Maven Wrapper), así que no necesitas instalar Maven si usas el wrapper.

### 3. Verificar Instalación

```bash
java -version
# Debería mostrar Java 11 o superior

mvn -version
# O si usas el wrapper:
./mvnw -version
```

## Compilar y Ejecutar

### Usando Maven Wrapper (Recomendado si no tienes Maven instalado)

```bash
cd mpp-service

# Compilar
./mvnw clean install

# Ejecutar
./mvnw spring-boot:run
```

### Usando Maven (si lo tienes instalado)

```bash
cd mpp-service

# Compilar
mvn clean install

# Ejecutar
mvn spring-boot:run
```

### Ejecutar el JAR compilado

```bash
cd mpp-service
java -jar target/mpp-parser-service-1.0.0.jar
```

## Verificar que Funciona

En otra terminal:
```bash
curl http://localhost:3002/api/health
```

Debería responder: `"MPP Parser Service is running"`

## Configurar Backend

Una vez que el servicio Java esté corriendo, agrega en `backend/.env`:

```env
MPP_SERVICE_URL=http://localhost:3002
```

## Troubleshooting

### Error: "command not found: mvnw"
Hacer el wrapper ejecutable:
```bash
chmod +x mvnw
```

### Error: "Java not found"
- Verifica que Java esté instalado: `java -version`
- Si usas Homebrew, asegúrate de que el PATH esté configurado correctamente

### Error: "Port 3002 already in use"
Cambiar el puerto en `src/main/resources/application.properties`:
```properties
server.port=3003
```
