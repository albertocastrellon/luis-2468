# Caracol Club

Aplicación full stack de carreras de caracoles: registro e inicio de sesión, dashboard con gráficas simuladas y recarga de saldo mediante la pasarela mock **SnailPay**.

## Stack

| Capa | Tecnologías |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS, Recharts, SweetAlert2, Axios |
| Backend | Express 5, TypeScript, bcrypt, cookie-parser, cors, dotenv |
| Persistencia | `LocalStorage` (perfil, sesión, saldo y datos ficticios) + `backend/data/users.json` (fuente de verdad del backend) |
| Pruebas | Vitest + Testing Library (frontend), Jest + Supertest (backend) |

## Estructura del proyecto

```
luis-2468/
├── backend/
│   ├── src/
│   │   ├── config/        # variables de entorno y banderas de entorno
│   │   ├── controllers/   # auth y pagos
│   │   ├── services/      # lógica del mock SnailPay
│   │   ├── repositories/  # usuarios, sesiones y saldos
│   │   ├── middleware/    # auth por cookie, validación y manejo de errores
│   │   ├── routes/        # rutas /api/auth y /api/snailpay
│   │   ├── types/         # tipos de dominio
│   │   └── utils/         # proyección pública del usuario
│   └── tests/             # pruebas de integración
└── frontend/
    └── src/
        ├── pages/         # Login, Register, Dashboard, Recharge
        ├── components/    # layout, rutas protegidas y UI base
        ├── context/       # estado de autenticación
        ├── services/      # cliente HTTP (auth y SnailPay)
        ├── utils/         # LocalStorage, errores, datos simulados y helpers
        └── types/         # tipos compartidos
```

## Requisitos

- Node.js 20.19 o superior (verificado con Node 24 / npm 11).
- Dos terminales (una para cada proyecto).

## Cómo ejecutar la aplicación

Terminal 1 — backend (puerto 3000):

```bash
cd backend
npm install
npm run dev
```

Terminal 2 — frontend (puerto 5173):

```bash
cd frontend
npm install
npm run dev
```

Abre <http://localhost:5173>.

### Variables de entorno

| Proyecto | Variable | Valor por defecto | Descripción |
| --- | --- | --- | --- |
| backend | `PORT` | `3000` | Puerto de la API |
| backend | `FRONTEND_ORIGIN` | `http://localhost:5173` | Origen permitido por CORS (con credenciales) |
| backend | `CARACOL_DATA_FILE` | `<cwd>/data/users.json` | Archivo con usuarios y saldos |
| frontend | `VITE_API_URL` | `http://localhost:3000/api` | URL base del cliente HTTP (Vite lee `.env` por su cuenta) |

El backend carga sus variables con `dotenv` desde el punto de entrada (`backend/src/index.ts`), antes de leer la configuración. Crea el archivo con la plantilla incluida:

```bash
cd backend
cp .env.example .env 
npm run dev
```

dotenv no sobreescribe variables que ya existan en el entorno, así que los valores definidos en la terminal tienen prioridad sobre `.env`.

```powershell
# PowerShell: sobreescribir un valor solo para esta sesión
$env:PORT=3000; $env:FRONTEND_ORIGIN="http://localhost:5173"; npm run dev
```

```bash
# bash / zsh
PORT=3000 FRONTEND_ORIGIN=http://localhost:5173 npm run dev
```

Sin `.env` también funciona: se usan los valores por defecto de la tabla.

> **CORS:** el backend solo acepta el origen configurado en `FRONTEND_ORIGIN`. Si el puerto 5173 está ocupado, Vite sube a 5174 y las llamadas al API serán bloqueadas: libera el puerto 5173 o arranca el backend con `FRONTEND_ORIGIN=http://localhost:5174`.

## Endpoints del API

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| `GET` | `/` | no | health check |
| `POST` | `/api/auth/register` | no | `{ fullName, email, password }`, devuelve `201` sin crear sesión |
| `POST` | `/api/auth/login` | no | `{ email, password }`, crea la cookie `sc_session` |
| `GET` | `/api/auth/me` | cookie | usuario activo y saldo |
| `POST` | `/api/auth/logout` | cookie | `204`, invalida la sesión |
| `POST` | `/api/snailpay/pay` | cookie | procesa la recarga (ver sección SnailPay) |

## Rutas del frontend

| Ruta | Acceso | Contenido |
| --- | --- | --- |
| `/`, `/login` | pública | inicio de sesión (redirige a `/dashboard` si ya hay sesión) |
| `/register` | pública | registro con nombre, correo, contraseña y confirmación |
| `/dashboard` | protegida | saldo, gráfica donut de apuestas y gráfica de barras de caracoles |
| `/dashboard/recharge` | protegida | formulario de recarga SnailPay |
| `*` | — | redirige a `/` |

La sesión se restaura al recargar la página y el dashboard queda bloqueado sin sesión activa.

## Persistencia en LocalStorage

| Clave | Contenido |
| --- | --- |
| `sc_user` | perfil público del usuario activo |
| `sc_session` | bandera de sesión local (`userId`, `active`) |
| `sc_balance` | saldo vigente |
| `sc_users` | usuarios registrados con contraseña como hash SHA-256 |
| `sc_card_data` | tarjeta enmascarada (`****1234`) y CVV ficticio `***` |

La misma cadena `sc_session` se usa como nombre de la cookie `httpOnly` del backend; son mecanismos distintos (cookie de autorización vs. copia local de sesión).

## Autenticación y contraseñas

- **Backend:** bcrypt con costo 12. La contraseña nunca se guarda ni se devuelve en texto plano; las respuestas solo incluyen datos públicos.
- **Frontend:** copia local del hash SHA-256 en `sc_users` para mantener la sesión solicitada en `LocalStorage`; esa copia nunca sale del navegador.
- El registro **no** crea sesión: obliga a iniciar sesión de forma explícita.
- La sesión del backend dura 24 horas; la sesión local persiste hasta cerrarla.
- Saldo inicial: `$0.00`.
- Para reiniciar todo: borra `backend/data/users.json` y limpia `LocalStorage` en el navegador.

> Guardar un hash de contraseña en `LocalStorage` es una limitación de esta demo, no una práctica recomendada para producción.

## SnailPay (mock)

`POST /api/snailpay/pay` — requiere la cookie `sc_session`.

```json
{
  "cardNumber": "1234123412341234",
  "expirationDate": "12/26",
  "cvv": "543",
  "fullName": "Nombre Del Titular",
  "amount": 100
}
```

Toda respuesta incluye `{ "payment": {...}, "user": {...} }`, y `payment` contiene:

| Campo | Descripción |
| --- | --- |
| `id` | identificador de la operación (`sp_<uuid>`) |
| `status` | `approved`, `rejected` o `error` |
| `status_detail` | detalle legible del resultado |
| `transaction_amount` | monto solicitado |
| `date_created` | fecha de creación (ISO 8601) |
| `authorization_code` | código cuando hay aprobación; `null` en caso contrario |
| `reference` | referencia de la operación (`REF_<timestamp>`) |
| `payer_id` / `payer_email` | identificador y correo del usuario |
| `card_number` | número enmascarado `****1234` |
| `cvv` | siempre `***` |

### Escenarios reproducibles

| Escenario | Dato disparador | HTTP | `status` | `status_detail` | Efecto en el saldo |
| --- | --- | --- | --- | --- | --- |
| Cobro exitoso | tarjeta `1234123412341234`, vencimiento `12/26`, CVV `543`, titular no vacío y monto > 0 | 200 | `approved` | `Cobro exitoso.` | aumenta |
| Tarjeta rechazada | tarjeta `4000400040004000` | 402 | `rejected` | `Tarjeta rechazada.` | sin cambios |
| Datos no aprobados | cualquier tarjeta válida de 16 dígitos distinta de los casos anteriores | 402 | `rejected` | `Datos de tarjeta no válidos.` | sin cambios |
| Error del sistema | query `?simulate_error=true`, header `X-SnailPay-Error: true` o el interruptor «Simular error del sistema» de la interfaz (solo en desarrollo/test) | 502 | `error` | `Error de conexión con SnailPay.` | sin cambios |
| Validación | tarjeta distinta de 16 dígitos, `MM/AA` inválido o vencido, CVV distinto de 3 dígitos, titular corto, monto ≤ 0 o > 100000 | 400 | — | `VALIDATION_ERROR` con detalle por campo | no se procesa |
| Sin sesión | sin cookie `sc_session` | 401 | — | `UNAUTHENTICATED` | no se procesa |

Ninguna operación no exitosa modifica el saldo ni genera un cobro aprobado.

> **Interruptor de demostración:** en `/dashboard/recharge` hay una casilla *Simular error del sistema* que agrega `?simulate_error=true` al envío. Es la forma más simple de reproducir el 502 desde la aplicación; el mismo efecto se obtiene con el header `X-SnailPay-Error: true`. Fuera de desarrollo y test el backend ignora la petición y procesa la recarga normalmente.

### Cómo reproducir cada respuesta (curl)

> Los ejemplos usan la continuación de línea `\`, propia de bash. En PowerShell ejecuta cada comando en una sola línea o abre Git Bash.

```bash
# 1) crear sesión y guardar la cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Prueba Local","email":"prueba@demo.com","password":"password123"}'

curl -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"prueba@demo.com","password":"password123"}'

# 2) cobro aprobado (200)
curl -b cookies.txt -X POST http://localhost:3000/api/snailpay/pay \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"1234123412341234","expirationDate":"12/26","cvv":"543","fullName":"Prueba Local","amount":100}'

# 3) tarjeta rechazada (402)
curl -b cookies.txt -X POST http://localhost:3000/api/snailpay/pay \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"4000400040004000","expirationDate":"12/26","cvv":"543","fullName":"Prueba Local","amount":100}'

# 4) datos no aprobados (402)
curl -b cookies.txt -X POST http://localhost:3000/api/snailpay/pay \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"1111222233334444","expirationDate":"12/26","cvv":"543","fullName":"Prueba Local","amount":100}'

# 5) error del sistema (502)
curl -b cookies.txt -X POST "http://localhost:3000/api/snailpay/pay?simulate_error=true" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"1234123412341234","expirationDate":"12/26","cvv":"543","fullName":"Prueba Local","amount":100}'

# 6) validación (400)
curl -b cookies.txt -X POST http://localhost:3000/api/snailpay/pay \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"123","expirationDate":"13/20","cvv":"1","fullName":"","amount":0}'

# 7) sin sesión (401)
curl -X POST http://localhost:3000/api/snailpay/pay \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"1234123412341234","expirationDate":"12/26","cvv":"543","fullName":"Prueba Local","amount":100}'
```

## Dashboard

- Saludo con el **nombre completo registrado** (tarjeta de bienvenida) y saldo actual en la tarjeta principal y en la franja fija superior.
- Gráfica **donut** de apuestas ganadas/perdidas (datos simulados).
- Gráfica de **barras** con las victorias de los 6 caracoles del día: Shellby, Caracolín, Turbo, Flash, Babosa y Slimy.
- Etiqueta `6 carreras · Datos simulados`: la jornada tiene 6 carreras y 6 victorias repartidas entre los participantes, de modo que la suma de la gráfica coincide con las carreras disputadas.
- Botón para recargar saldo con SnailPay y opción de cerrar sesión (con confirmación).

No existe sección para apostar ni lógica que ejecute carreras: los datos de apuestas y carreras son simulados y viven en `frontend/src/utils/simulation.ts`, con una prueba que valida la congruencia (6 caracoles, 6 victorias, valores enteros no negativos).

## Validaciones

Se validan en el formulario, de nuevo antes del envío y una tercera vez en el backend:

- **Registro:** nombre solo con letras y espacios (2 a 80 caracteres), correo con formato válido, contraseña de 8 a 72 caracteres y confirmación coincidente.
- **Recarga:** titular de 2 a 80 caracteres (letras, espacios, apóstrofes, puntos y guiones), tarjeta de exactamente 16 dígitos, vencimiento `MM/AA` no vencido, CVV de 3 dígitos y monto mayor que `$0`, hasta `$100,000` y con máximo 2 decimales.

Además, el formulario bloquea envíos concurrentes para evitar dobles cobros y muestra un resultado diferenciado (aprobado / rechazado / error de sistema) mediante SweetAlert. Cuando la validación falla, se muestra un **toast** con el primer mensaje y el foco salta al primer campo inválido; es la única indicación visual (no hay mensaje debajo del input) y SweetAlert lo anuncia con `aria-live`.

## Pruebas

Frontend (Vitest, 84 pruebas en 9 archivos):

```bash
cd frontend
npm test              # ejecución normal
npm run test:coverage # con reporte de cobertura
```

Qué se cubre y por qué:

- **Flujos de autenticación** (`useAuth.test.tsx`): registro, login, cierre de sesión y restauración de la sesión al recargar, porque son el mínimo indispensable de la aplicación.
- **Formularios** (`Register.test.tsx`, `Login.test.tsx`): validaciones, normalización de correo, mostrar/ocultar contraseña y mensajes de error seguros, porque son la puerta de entrada del usuario.
- **LocalStorage** (`storage.test.ts`): claves, persistencia de saldo y limpieza de sesión, porque la persistencia local es un requisito explícito.
- **Servicios HTTP** (`services.test.ts`): payloads enviados, incluida la bandera de simulación de error de SnailPay.
- **Datos simulados** (`simulation.test.ts`): invariantes de la jornada (6 caracoles, 6 victorias, enteros no negativos) para que un cambio de datos no rompa la congruencia de la gráfica.
- **Dashboard y recarga** (`Dashboard.test.tsx`, `Recharge.test.tsx`): nombre y saldo del usuario, saludo sin nombre, enlaces, envío del cobro con y sin simulación de error y bloqueo de dobles envíos.
- **Errores de API** (`errors.test.ts`): traducción de códigos del backend a mensajes públicos, para no filtrar detalles internos.

Siguen sin cubrirse los componentes de layout (`AppLayout`, `ProtectedRoute`, `HeroHeading`) y la mayor parte de los iconos de `ui.tsx`, que son visuales y no tienen lógica de negocio.

Backend (Jest + Supertest, 11 pruebas de integración):

```bash
cd backend
npm test
```

Cubre health check, registro (incluido correo duplicado y que no crea sesión), inicio de sesión, aprobación de cobro con actualización de saldo, tarjeta vencida, rechazo, datos no aprobados, error de sistema, validación de datos y protección del endpoint de pago.

Son pruebas de integración porque el comportamiento relevante vive en la suma de middleware, controlador y repositorio. El riesgo principal del mock es que una respuesta no exitosa mueva dinero, así que cada escenario verifica también el saldo resultante y que no se filtren contraseñas ni CVV en las respuestas.

> El script `npm test` del backend usa sintaxis de Windows (`set NODE_ENV=test&&`). En macOS/Linux: `NODE_ENV=test npx jest --runInBand`.

## Calidad de código

```bash
cd frontend && npm run lint   # ESLint
cd frontend && npm run build  # typecheck (tsc -b) + build de producción
cd backend  && npm run build  # compilación estricta a dist/
```

Ambos proyectos compilan sin errores y las reglas de ESLint pasan sin incidencias.

## Diseño y herramientas

- No se utilizó una plantilla ni un generador de interfaces: la UI se construyó directamente con Tailwind CSS sobre una paleta propia (tinta oscura + menta), con componentes reutilizables en `frontend/src/components/ui.tsx` (Card, Button, Input, PasswordInput, Spinner e iconos SVG propios).
- **Adaptado/construido a mano:** layout de login/registro, dashboard, tarjeta visual de crédito, formulario de recarga y gráficas.
- **Librerías de terceros:** Recharts para las gráficas, SweetAlert2 para confirmaciones y resultados, React Router para el enrutamiento y Axios para el HTTP.
- Iconografía en SVG inline y `frontend/public/icons.svg`.

## Uso de inteligencia artificial

- **Herramienta:** asistente de código basado en LLM (opencode).
- **Para qué:** utilizar la IA como herramienta de apoyo para acelerar el desarrollo y aplicar buenas prácticas, principalmente en el análisis de requisitos, propuesta de alternativas de arquitectura, redacción de validaciones y manejo de errores, generación de pruebas y documentación. Las decisiones de implementación y el rumbo del desarrollo fueron definidos por mí, utilizando la IA mediante solicitudes puntuales para resolver dudas específicas, revisar alternativas y complementar el trabajo.
- **Qué partes quedaron apoyadas por IA:** middleware de validación/errores, pruebas (backend, formularios, dashboard y recarga) y parte de este documento.
- **Proceso:** la IA propuso → se revisó y ajustó el código → se verificó con `build`, `lint` y la ejecución completa de las pruebas → se validó cada escenario de SnailPay contra el servidor corriendo. Ninguna respuesta se dio por buena sin ejecutarla.

## Decisiones principales

1. **Backend como autoridad del saldo:** `LocalStorage` conserva la copia solicitada, pero el importe que se muestra siempre proviene del API para evitar manipulación directa desde el navegador.
2. **SnailPay aislado en un servicio** (`snailPayService.ts`) para que los escenarios de respuesta sean fáciles de cambiar y de probar.
3. **Respuestas no exitosas sin efectos secundarios:** el saldo solo se actualiza cuando `status` es `approved`.
4. **Datos de tarjeta ficticios:** solo se persisten la máscara y el CVV `***`.
5. **Validación en tres capas** (al escribir, antes del envío y en el backend) para que el API nunca dependa del cliente.

## Pendientes y problemas conocidos

- Los datos de apuestas y carreras son constantes fijos en `simulation.ts`: no se regeneran por fecha ni por usuario (el alcance solo pide datos simulados).
- Si se elimina `backend/data/users.json`, los usuarios locales del navegador dejan de coincidir con el backend y el inicio de sesión fallará hasta volver a registrar la cuenta.
- Sin pruebas automatizadas para los componentes de layout (`AppLayout`, `ProtectedRoute`, `HeroHeading`).
- El interruptor «Simular error del sistema» solo tiene efecto en desarrollo y test; en producción el backend lo ignora y procesa la recarga normalmente.
- Recuperación de contraseña y verificación de correo no están implementadas (fuera de alcance).

## Consideraciones de seguridad

Todos los datos de pago son ficticios: no hay integración con ninguna pasarela real ni procesamiento de información financiera. El backend no expone hashes ni datos sensibles en sus respuestas, las cookies de sesión son `httpOnly` y las contraseñas viajan siempre cifradas por hash.
