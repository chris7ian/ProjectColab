#!/bin/bash

# Script para iniciar PostgreSQL y luego los servidores de desarrollo

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para encontrar pg_isready en rutas comunes
find_pg_isready() {
    # Buscar en rutas comunes de Homebrew (macOS)
    local paths=(
        "/opt/homebrew/opt/postgresql@16/bin/pg_isready"
        "/opt/homebrew/opt/postgresql@15/bin/pg_isready"
        "/opt/homebrew/opt/postgresql@14/bin/pg_isready"
        "/usr/local/opt/postgresql@16/bin/pg_isready"
        "/usr/local/opt/postgresql@15/bin/pg_isready"
        "/usr/local/opt/postgresql@14/bin/pg_isready"
    )
    
    # Si está en PATH, usarlo
    if command -v pg_isready > /dev/null 2>&1; then
        echo "pg_isready"
        return 0
    fi
    
    # Buscar en rutas comunes
    for path in "${paths[@]}"; do
        if [ -f "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    
    return 1
}

# Función para verificar si PostgreSQL está corriendo
check_postgres() {
    local pg_isready_cmd
    pg_isready_cmd=$(find_pg_isready)
    if [ $? -eq 0 ] && [ -n "$pg_isready_cmd" ]; then
        $pg_isready_cmd -h localhost -p 5432 > /dev/null 2>&1
        return $?
    fi
    return 1
}

echo -e "${YELLOW}Verificando PostgreSQL...${NC}"

# Verificar si PostgreSQL está corriendo
if check_postgres; then
    echo -e "${GREEN}✓ PostgreSQL ya está corriendo${NC}"
else
    echo -e "${YELLOW}Iniciando PostgreSQL...${NC}"
    
    # Intentar iniciar con brew services (macOS)
    if command -v brew > /dev/null 2>&1; then
        # Detectar la versión de PostgreSQL instalada
        PG_SERVICE=$(brew services list | grep -E 'postgresql@[0-9]+' | grep -v 'started' | head -1 | awk '{print $1}')
        
        if [ -z "$PG_SERVICE" ]; then
            # Intentar con versiones comunes
            for version in 16 15 14 13 12; do
                if brew services list | grep -q "postgresql@$version"; then
                    PG_SERVICE="postgresql@$version"
                    break
                fi
            done
        fi
        
        if [ -z "$PG_SERVICE" ]; then
            echo -e "${RED}✗ No se pudo detectar la versión de PostgreSQL instalada${NC}"
            echo -e "${YELLOW}Por favor, inicia PostgreSQL manualmente:${NC}"
            echo "  brew services start postgresql@<version>"
            echo ""
            echo "O ejecuta: npm run dev:raw"
            exit 1
        fi
        
        echo -e "${YELLOW}Iniciando $PG_SERVICE...${NC}"
        brew services start $PG_SERVICE
        
        # Esperar a que PostgreSQL esté listo
        echo -e "${YELLOW}Esperando a que PostgreSQL esté listo...${NC}"
        for i in {1..30}; do
            if check_postgres; then
                echo -e "${GREEN}✓ PostgreSQL iniciado correctamente${NC}"
                break
            fi
            sleep 1
        done
        
        if ! check_postgres; then
            echo -e "${RED}✗ No se pudo iniciar PostgreSQL después de 30 segundos${NC}"
            echo -e "${YELLOW}Por favor, verifica que PostgreSQL esté instalado correctamente${NC}"
            echo ""
            echo "O ejecuta: npm run dev:raw (para omitir el inicio automático de PostgreSQL)"
            exit 1
        fi
    else
        echo -e "${RED}✗ Homebrew no está instalado. Por favor, inicia PostgreSQL manualmente${NC}"
        echo ""
        echo "O ejecuta: npm run dev:raw"
        exit 1
    fi
fi

echo -e "${GREEN}Iniciando servidores de desarrollo...${NC}"

# Ejecutar los comandos de desarrollo usando npm run dev:raw
# que ya tiene acceso a los node_modules locales a través de npm
exec npm run dev:raw

