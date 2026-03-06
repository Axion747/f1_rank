import assert from 'node:assert/strict';

import { RACES } from './data/f1-data.mjs';
import {
  computeAccuracy,
  computePowerScores,
  getPredictionLock,
  normalizeRouteFromHash,
} from './lib/f1-utils.mjs';

const accuracy = computeAccuracy(
  [
    { race_id: 1, race_type: 'race', position: 1, driver_id: 1 },
    { race_id: 1, race_type: 'race', position: 2, driver_id: 81 },
  ],
  [
    { race_id: 1, race_type: 'race', position: 1, driver_id: 1 },
    { race_id: 1, race_type: 'race', position: 2, driver_id: 16 },
    { race_id: 1, race_type: 'race', position: 3, driver_id: 81 },
  ],
);

assert.equal(accuracy.accuracy, 50);
assert.equal(accuracy.total_correct, 1);
assert.equal(accuracy.total_predictions, 2);
assert.equal(accuracy.position_diff_avg, 0.5);

const powerScores = computePowerScores(
  [
    { user_id: 'a', race_type: 'race', position: 1, driver_id: 1 },
    { user_id: 'a', race_type: 'race', position: 2, driver_id: 81 },
    { user_id: 'b', race_type: 'race', position: 1, driver_id: 1 },
    { user_id: 'b', race_type: 'race', position: 2, driver_id: 16 },
  ],
  'race',
);

assert.equal(powerScores[0].driverId, 1);
assert.equal(powerScores[0].score, 1000);
assert.equal(normalizeRouteFromHash('#/calendar'), '/');
assert.equal(normalizeRouteFromHash('#/profile/benson'), '/profile/benson');

const sprintRace = RACES.find((race) => race.sprint);
const beforeLock = getPredictionLock(
  sprintRace,
  'sprint',
  new Date(new Date(sprintRace.sprint_starts_at).getTime() - 60_000),
);
const afterLock = getPredictionLock(
  sprintRace,
  'sprint',
  new Date(new Date(sprintRace.sprint_starts_at).getTime() + 60_000),
);

assert.equal(beforeLock.isLocked, false);
assert.equal(afterLock.isLocked, true);

console.log('logic checks passed');
