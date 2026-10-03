import { describe, expect, it } from 'vitest';
import {
  SIMULATED_RACES,
  bets,
  snails,
  totalWins,
} from './simulation';

/**
 * Los datos del dashboard son simulados, pero deben ser congruentes con las
 * reglas del negocio: 6 caracoles que corren 6 carreras en el día y, por lo
 * tanto, 6 victorias repartidas entre ellos.
 */
describe('simulated dashboard data', () => {
  it('includes exactly six snails with unique names', () => {
    // La especificación fija 6 participantes; aquí no se cuentan las carreras.
    expect(snails).toHaveLength(6);
    expect(new Set(snails.map((snail) => snail.name)).size).toBe(snails.length);
  });

  it('distributes the wins of the six simulated races among the snails', () => {
    expect(totalWins()).toBe(SIMULATED_RACES);
  });

  it('never reports negative or fractional wins', () => {
    expect(
      snails.every(
        (snail) => snail.wins >= 0 && Number.isInteger(snail.wins),
      ),
    ).toBe(true);
  });

  it('keeps the winning and losing bets as positive counts', () => {
    expect(bets).toHaveLength(2);
    expect(bets.map((bet) => bet.name)).toEqual(['Ganadas', 'Perdidas']);
    expect(bets.every((bet) => bet.value >= 0 && Number.isInteger(bet.value))).toBe(
      true,
    );
  });
});
