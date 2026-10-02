import { app } from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  console.log(`Caracol API ejecutándose en http://localhost:${env.port}`);
});
