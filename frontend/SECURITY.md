# Seguridad - Vulnerabilidad en glob

## Vulnerabilidad Detectada

**Severidad:** High  
**Paquete:** glob@10.2.0 - 10.4.5  
**Tipo:** Command injection via -c/--cmd  
**Referencia:** https://github.com/advisories/GHSA-5j98-mcp5-4vw2

## Contexto

La vulnerabilidad está en `glob`, una dependencia transitiva de `eslint-config-next@14.x`. Esta herramienta se usa solo durante el desarrollo para linting, no en producción.

## Análisis de Riesgo

### Riesgo Real: **BAJO** para producción

1. **Solo afecta herramientas de desarrollo**: `glob` se usa solo por ESLint durante el desarrollo
2. **Requiere acceso al sistema**: El atacante necesitaría acceso a ejecutar comandos en tu máquina de desarrollo
3. **No afecta código de producción**: El código compilado y desplegado no incluye estas herramientas

### Cuándo sería un problema:

- Si ejecutas ESLint con entrada no confiable desde fuentes externas
- Si compartes tu máquina de desarrollo con usuarios no confiables
- Si ejecutas ESLint en CI/CD con código no verificado

## Soluciones

### Opción 1: Override de glob (Implementada) ✅

Se ha agregado un `override` en `package.json` para forzar una versión segura de glob:

```json
"overrides": {
  "glob": "^10.3.10"
}
```

**Estado:** Esta solución puede no funcionar completamente porque `glob` está anidado dentro de `@next/eslint-plugin-next`.

### Opción 2: Actualizar a Next.js 16 (Recomendada para producción)

```bash
npm install next@^16.0.0 react@^19.0.0 react-dom@^19.0.0
npm install eslint-config-next@^16.0.0 --save-dev
```

**Ventajas:**
- ✅ Resuelve completamente la vulnerabilidad
- ✅ Versión más reciente y segura
- ✅ Mejoras de rendimiento

**Desventajas:**
- ⚠️ Puede requerir cambios en el código
- ⚠️ React 19 puede tener cambios breaking
- ⚠️ Necesita testing exhaustivo

### Opción 3: Aceptar el riesgo (Aceptable para desarrollo)

Para proyectos en desarrollo, el riesgo es aceptable porque:
- Solo afecta herramientas de desarrollo
- No se ejecuta en producción
- Requiere acceso físico o remoto a tu máquina

## Recomendación

### Para Desarrollo Local:
**Opción 3** - Aceptar el riesgo es razonable. La vulnerabilidad solo afecta herramientas de desarrollo y requiere acceso a tu sistema.

### Para Producción:
**Opción 2** - Actualizar a Next.js 16 es la mejor solución a largo plazo. Sin embargo, requiere:
1. Testing completo de la aplicación
2. Verificar compatibilidad de todas las dependencias
3. Actualizar código si hay breaking changes

### Mitigación Temporal:
- No ejecutar ESLint con código de fuentes no confiables
- Mantener tu sistema operativo actualizado
- Usar entornos de desarrollo aislados

## Verificación

Para verificar si la vulnerabilidad persiste:

```bash
cd frontend
npm audit
```

Para verificar la versión de glob instalada:

```bash
npm list glob
```

## Referencias

- [GitHub Advisory GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2)
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19)

