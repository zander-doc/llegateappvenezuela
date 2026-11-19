# Arquitectura Actual \- Llégate Venezuela

## Proyecto principal

Ruta de trabajo:

C:\\Users\\alexg\\Documents\\Qoder\\llegate\-limpio

Repositorio:

[https://github.com/zander\-doc/llegateappvenezuela](https://github.com/zander-doc/llegateappvenezuela)

Despliegue:

GitHub → Pull Request → Merge → Cloudflare

---

## Estructura actual

llegate\-limpio/

- apps/
    - android/
- lllegate\-sim/
    - src/ (frontend React)
    - server/ (API Node)
    - db/ (migraciones y pruebas)
    - landing/
    - public/
- packages/
- .github/
- vibe\_images/
- docs/

---

## Estado actual

Frontend Web: operativo

Backend API: operativo

Base de datos: operativa

Android: compila y ejecuta pruebas

GitHub: conectado

Cloudflare: conectado

---

## Regla principal

Todo desarrollo se realiza únicamente dentro de:

C:\\Users\\alexg\\Documents\\Qoder\\llegate\-limpio

Cualquier otra copia tendrá carácter de respaldo hasta completar la consolidación del proyecto.

## Decisiones técnicas

### DT\-001 \- Entorno principal de desarrollo

Se establece como entorno principal de desarrollo:

C:\\Users\\alexg\\Documents\\Qoder\\llegate\-limpio

Todos los cambios de código, pruebas y validaciones se realizarán en esta carpeta.

---

### DT\-002 \- Flujo de publicación

El flujo oficial de publicación es:

llegate\-limpio → GitHub → Pull Request → Merge → Cloudflare

No se realizarán cambios manuales en producción.

---

### DT\-003 \- Arquitectura actual

El sistema está compuesto por:

- Frontend Web React \+ TypeScript
- Backend Node.js \+ Express
- Base de datos PostgreSQL
- Aplicación Android Kotlin \+ Jetpack Compose

---

### DT\-004 \- Estrategia de reorganización

Mientras el sistema permanezca estable:

- No mover carpetas masivamente.
- No renombrar módulos críticos.
- No fusionar repositorios sin validación previa.
- Mantener compatibilidad con GitHub y Cloudflare.

---

## Pendientes de Arquitectura

### Prioridad Alta

- Revisar resultado de los 25 tests Android fallidos.
- Documentar consumidores reales de packages/shared.
- Verificar si \_audit sigue siendo necesario.
- Revisar archivos sueltos en la raíz del proyecto.

### Prioridad Media

- Crear mapa completo de módulos del negocio.
- Crear documentación de API.
- Crear guía de despliegue.
- Crear guía de recuperación ante fallos.

### Prioridad Baja

- Reorganizar físicamente lllegate\-sim.
- Limpiar recursos de diseño no utilizados.
- Consolidar carpetas históricas y respaldos.

---

## Riesgos identificados

### Riesgo 1

Existencia de múltiples copias del proyecto fuera de llegate\-limpio.

Impacto: Confusión y pérdida de trazabilidad.

---

### Riesgo 2

Documentación técnica desactualizada respecto al estado real del sistema.

Impacto: Decisiones basadas en información incorrecta.

---

### Riesgo 3

Cobertura Android con pruebas fallidas pendientes de análisis.

Impacto: Posibles regresiones en funcionalidades móviles.

---

## Próxima meta

Construir un mapa de negocio y módulos de Llégate Venezuela para comprender completamente:

- Usuarios
- Conductores
- Viajes
- Billetera
- Pagos
- Verificaciones
- Negocios
- Administración

antes de iniciar una reorganización mayor del proyecto.

