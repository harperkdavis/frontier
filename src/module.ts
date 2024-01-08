import * as lib from './lib';

for (const key in lib) {
  if (lib.hasOwnProperty(key)) {
    window[key] = lib[key];
  }
}

import * as sim from './sim';

for (const key in sim) {
  if (sim.hasOwnProperty(key)) {
    window[key] = sim[key];
  }
}