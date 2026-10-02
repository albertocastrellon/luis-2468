# Caracol Club

Aplicación full stack de demostración para un dashboard de carreras de caracoles y recargas con un mock de SnailPay.

## Cumplimiento de instrucciones

- Frontend: React, TypeScript, Vite, Tailwind CSS y Recharts.
- Backend: Express, TypeScript y bcrypt.
- Persistencia solicitada: `LocalStorage` para perfil, sesión simulada, saldo y datos ficticios de tarjeta.
- SnailPay: servicio Express simulado; no conecta con servicios reales ni procesa información financiera real.
- Apuestas y carreras: datos simulados; no existe una sección para apostar ni lógica de carreras.

## Claves de LocalStorage

- `sc_user`: perfil público del usuario activo.
- `sc_session`: sesión simulada activa.
- `sc_balance`: saldo actual.
- `sc_card_data`: tarjeta enmascarada y CVV ficticio `***` devueltos por SnailPay.
- `sc_users`: usuarios registrados localmente con contraseña almacenada como hash SHA-256.

## Ejecutar ambos proyectos

En una terminal:

```bash
cd backend
npm install
npm run dev
```

En otra:

```bash
cd frontend
npm install
npm run dev
```

Consulta `backend/README.md` y `frontend/README.md` para pruebas, endpoints y escenarios reproducibles.

## Escenarios reproducibles de SnailPay

- **Aprobado:** tarjeta `1234123412341234`, vencimiento `12/26`, CVV `543` y monto mayor que cero. Aumenta el saldo.
- **Tarjeta rechazada:** tarjeta `4000400040004000`. Devuelve `402` y no modifica el saldo.
- **Datos no aprobados:** cualquier tarjeta válida de 16 dígitos que no coincida con los casos anteriores. Devuelve `402` y no modifica el saldo.
- **Error de sistema:** agrega `X-SnailPay-Error: true` o `?simulate_error=true` en desarrollo/test. Devuelve `502` y no modifica el saldo.
- **Validación:** montos inválidos, tarjetas incompletas, CVV incorrecto, nombre vacío o vencimiento inválido devuelven `400` sin procesar la operación.
- **Sesión:** las recargas requieren la cookie backend `sc_session`; sin ella devuelven `401`.

El flujo de recarga bloquea envíos concurrentes para evitar dobles clics y muestra SweetAlert diferenciado para aprobación, rechazo y error de sistema. “Saldo insuficiente” no forma parte de una recarga, porque corresponde a retiros o apuestas y está fuera del alcance solicitado.

El ejercicio exige conservar datos ficticios/enmascarados de tarjeta y CVV en LocalStorage. Esta decisión es intencional y limitada a la evaluación; guardar datos de pago en LocalStorage no es apropiado para producción.

## Pruebas

```bash
cd backend && npm test
cd frontend && npm test
cd frontend && npm run test:coverage
cd frontend && npm run lint
cd frontend && npm run build
```

La cobertura actual prioriza lógica funcional: errores, almacenamiento, autenticación HTTP y pagos. Los servicios y utilidades principales tienen cobertura completa; los componentes visuales, gráficos y SVG no se fuerzan artificialmente porque requieren pruebas de integración/renderizado y no contienen reglas de negocio críticas. El reporte HTML queda en `frontend/coverage/index.html`.

## Diseño y herramientas

La interfaz fue construida personalmente con Tailwind CSS, componentes React reutilizables y Recharts. Se utilizó asistencia de IA para analizar requisitos, diseñar la arquitectura, generar una primera estructura de código, revisar errores y preparar pruebas/documentación; cada flujo fue validado con build, lint y tests locales.

## Seguridad y alcance

Todos los datos de pago son ficticios. El número se almacena enmascarado y el CVV real nunca se guarda ni se devuelve. El backend mantiene sesiones temporales para autorizar pagos, mientras el frontend conserva el estado solicitado en LocalStorage. Esta solución es una demo y no debe utilizarse para pagos reales.
