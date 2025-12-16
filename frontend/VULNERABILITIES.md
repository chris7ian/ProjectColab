# Vulnerabilidades - Estado Actual

## Situación

Después de ejecutar `npm audit fix --force`, se actualizó `eslint-config-next` a la versión 16.0.10, lo cual es incompatible con Next.js 14.

## Solución Aplicada

Se ha revertido `eslint-config-next` a la versión `^14.2.35` que es compatible con Next.js 14.2.0+.

## Sobre las Vulnerabilidades

Las vulnerabilidades reportadas estaban en `glob`, una dependencia transitiva de `eslint-config-next`. Estas vulnerabilidades:

1. **Solo afectan herramientas de desarrollo** (ESLint), no código de producción
2. **Requieren acceso al sistema** para ser explotadas
3. **Se resuelven en versiones más nuevas** de `eslint-config-next` (v16+), pero requieren Next.js 16

## Opciones

### Opción 1: Mantener Next.js 14 (Recomendado)
- ✅ Estable y probado
- ✅ Compatible con todas las dependencias actuales
- ⚠️ Vulnerabilidades menores en herramientas de desarrollo

### Opción 2: Actualizar a Next.js 16
- ✅ Resuelve las vulnerabilidades completamente
- ⚠️ Puede requerir cambios en el código
- ⚠️ Posibles breaking changes

**Recomendación:** Mantener Next.js 14 por ahora. Las vulnerabilidades son de bajo riesgo ya que solo afectan herramientas de desarrollo y no el código que se ejecuta en producción.

## Comandos Útiles

```bash
# Verificar vulnerabilidades
npm audit

# Verificar solo vulnerabilidades críticas
npm audit --audit-level=moderate

# Instalar versión compatible
cd frontend
npm install eslint-config-next@^14.2.35 --save-dev
```

