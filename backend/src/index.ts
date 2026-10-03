// Se importa primero para que backend/.env esté disponible cuando src/config/env
// lea process.env. dotenv no sobreescribe variables ya definidas en el entorno,
// por lo que NODE_ENV=test de las pruebas sigue teniendo prioridad.
import 'dotenv/config';
import { app } from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  console.log(`Caracol API ejecutándose en http://localhost:${env.port}`);
});
