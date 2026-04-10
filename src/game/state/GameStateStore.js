function createDefaultState() {
  return {
    build: {
      placedParts: [],
      derivedStats: null,
      validation: null
    },
    flight: {
      launchSnapshot: null,
      lastTelemetry: null
    },
    results: {
      lastResult: null
    }
  };
}

export class GameStateStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = createDefaultState();
  }

  getSnapshot() {
    return structuredClone(this.state);
  }

  getBuildState() {
    return this.state.build;
  }

  setBuildState(nextBuildState) {
    this.state.build = {
      ...this.state.build,
      ...structuredClone(nextBuildState)
    };
  }

  setLaunchSnapshot(snapshot) {
    this.state.flight.launchSnapshot = structuredClone(snapshot);
  }

  setFlightTelemetry(telemetry) {
    this.state.flight.lastTelemetry = structuredClone(telemetry);
  }

  setResult(result) {
    this.state.results.lastResult = structuredClone(result);
  }
}

export const gameState = new GameStateStore();
