# Caracol Club — Backend

API Express + TypeScript para autenticar solicitudes, autorizar recargas y simular SnailPay.

## Ejecutar

```bash
npm install
npm run dev
```

La API queda disponible en `http://localhost:3000`. Copia `.env.example` a `.env` para cambiar el puerto u origen permitido: `src/index.ts` carga el archivo con `dotenv` antes de leer la configuración (las variables ya definidas en la terminal tienen prioridad). En desarrollo, los usuarios y saldos se conservan en `data/users.json`; puedes cambiar esa ruta con `CARACOL_DATA_FILE`.

## Scripts

- `npm run dev`: desarrollo con reinicio automático.
- `npm run build`: compilación estricta a `dist/`.
- `npm start`: ejecutar la compilación.
- `npm test`: pruebas de integración con Jest y Supertest.

## Endpoints

- `GET /`: health check.
- `POST /api/auth/register`: `{ fullName, email, password }`.
- `POST /api/auth/login`: `{ email, password }`.
- `GET /api/auth/me`: usuario autenticado y saldo.
- `POST /api/auth/logout`: invalida la sesión backend.
- `POST /api/snailpay/pay`: `{ cardNumber, expirationDate, cvv, fullName, amount }`.

El backend valida nuevamente todos los límites: nombre, tarjeta de 16 dígitos, vencimiento `MM/AA`, CVV de exactamente 3 dígitos y monto positivo con máximo de `$100,000`.

## SnailPay mock

- Aprobado: `1234123412341234`, `12/26`, `543`, titular no vacío y monto mayor que cero.
- Error de transacción: `4000400040004000` produce `status: rejected` y HTTP `402`.
- Error de sistema: `/api/snailpay/pay?simulate_error=true` o header `X-SnailPay-Error: true` en desarrollo/test produce `status: error` y HTTP `502`.

Todas las respuestas contienen `id`, `status`, `status_detail`, `transaction_amount`, `date_created`, `authorization_code`, `reference`, `payer_id`, `payer_email`, `card_number` enmascarado y `cvv: "***"`. Una operación no aprobada nunca modifica el saldo.
