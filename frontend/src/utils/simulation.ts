/**
 * Datos simulados que alimentan las gráficas del dashboard.
 *
 * El dashboard no ejecuta carreras ni procesa apuestas: aquí se centraliza la
 * información ficticia para mantenerla separada de la UI y poder validarla con
 * pruebas. La jornada simulada tiene 6 caracoles y 6 carreras, y cada carrera
 * tiene un único ganador, por lo que la suma de victorias debe ser exactamente
 * `SIMULATED_RACES`.
 */

/** Carreras disputadas durante el día simulado. */
export const SIMULATED_RACES = 6;

/** Formato mínimo de una sección de la gráfica de apuestas. */
export interface BetSummary {
  name: string;
  value: number;
}

/** Formato mínimo de una fila de la gráfica de victorias por caracol. */
export interface SnailResult {
  name: string;
  wins: number;
}

/** Apuestas ganadas y perdidas del día (ficticias). */
export const bets: BetSummary[] = [
  { name: "Ganadas", value: 18 },
  { name: "Perdidas", value: 7 },
];

/**
 * Victorias de cada caracol durante el día simulado.
 * Participan exactamente 6 caracoles y hay 6 victorias en total.
 */
export const snails: SnailResult[] = [
  { name: "Shellby", wins: 2 },
  { name: "Caracolín", wins: 1 },
  { name: "Turbo", wins: 1 },
  { name: "Flash", wins: 1 },
  { name: "Babosa", wins: 1 },
  { name: "Slimy", wins: 0 },
];

/** Suma de victorias de la jornada; debe coincidir con `SIMULATED_RACES`. */
export function totalWins(results: SnailResult[] = snails): number {
  return results.reduce((total, snail) => total + snail.wins, 0);
}
