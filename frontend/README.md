# Caracol Club — Frontend

Aplicación React + TypeScript + Vite con Tailwind CSS, rutas protegidas, persistencia en LocalStorage y gráficas simuladas.

## Ejecutar

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev`: servidor Vite.
- `npm run build`: typecheck y build de producción.
- `npm run lint`: ESLint.
- `npm run test`: Vitest.

## Flujo

1. Registra un usuario en `/register`.
2. Inicia sesión en `/login`.
3. Consulta el dashboard en `/dashboard`.
4. Recarga en `/dashboard/recharge`.
5. Cierra sesión desde el header.

## Persistencia

El frontend conserva en LocalStorage las claves `sc_user`, `sc_session`, `sc_balance`, `sc_card_data` y `sc_users`. La sesión local se restaura al recargar la página y el dashboard permanece protegido cuando no existe una sesión activa.

`sc_card_data` solo contiene la tarjeta enmascarada y el CVV ficticio `***` devueltos por SnailPay; nunca contiene el CVV real.

## Validaciones de recarga

- Titular: letras, espacios, apóstrofes, puntos y guiones; de 2 a 80 caracteres.
- Tarjeta: solo números, exactamente 16 dígitos.
- Vencimiento: solo números con formato automático `MM/AA`.
- CVV: solo números, exactamente 3 dígitos.
- Monto: mayor que cero, máximo `$100,000` y hasta 2 decimales.

La validación se ejecuta mientras se escribe, antes del envío y nuevamente en backend.
