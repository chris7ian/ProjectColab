# Instalación de Java y Maven para macOS

## Método 1: Usando Homebrew (Más Fácil)

### 1. Instalar Homebrew (si no lo tienes)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Instalar Java
```bash
# Instalar OpenJDK 17 (recomendado)
brew install openjdk@17

# O instalar OpenJDK 11
brew install openjdk@11
```

### 3. Configurar Java en el PATH
```bash
# Para Java 17
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.zshrc

# O para Java 11
echo 'export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"' >> ~/.zshrc
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@11"' >> ~/.zshrc

# Recargar configuración
source ~/.zshrc
```

### 4. Instalar Maven
```bash
brew install maven
```

### 5. Verificar Instalación
```bash
java -version
mvn -version
```

---

## Método 2: Descargar Manualmente

### Java
1. Visita: https://adoptium.net/
2. Selecciona Java 11 o 17
3. Descarga el instalador para macOS
4. Ejecuta el instalador

### Maven
1. Visita: https://maven.apache.org/download.cgi
2. Descarga `apache-maven-X.X.X-bin.tar.gz`
3. Extrae en `/usr/local/`
4. Agrega al PATH:
```bash
echo 'export PATH="/usr/local/apache-maven-X.X.X/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

## Método 3: Usar Solo Maven Wrapper (Sin Instalar Maven)

Si solo instalas Java, puedes usar el Maven Wrapper incluido:

```bash
cd mpp-service
chmod +x mvnw
./mvnw clean install
./mvnw spring-boot:run
```

---

## Verificación Final

Después de instalar, ejecuta:

```bash
java -version
# Debería mostrar: openjdk version "11.x.x" o "17.x.x"

mvn -version
# O si usas wrapper:
cd mpp-service
./mvnw -version
```

Si todo está bien, puedes proceder a compilar el servicio Java.
