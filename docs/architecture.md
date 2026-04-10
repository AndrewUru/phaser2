# Rocket Hangar Architecture

## System analysis

Core player loop:

1. Build a modular rocket in the hangar.
2. Validate the assembly against structural rules.
3. Convert the build into a launch-ready snapshot.
4. Simulate ascent with thrust, gravity, fuel, and steering.
5. Judge orbit success or failure.
6. Present results and let the player retry or return to the hangar.

Primary entities:

- Rocket build grid
- Palette parts and part definitions
- Placed rocket modules
- Launch snapshot derived from the build
- Flight vehicle visual and exhaust
- Launch pad and environment
- HUD panels and result panels

Primary systems:

- Asset bootstrapping
- Responsive layout computation
- Build placement and snapping
- Validation and stat aggregation
- Flight simulation
- Result evaluation

## Scene architecture

- `BootScene`: preload the asset manifest, create fallback placeholder textures, initialize shared state, and hand off to the menu.
- `MenuScene`: responsive front door into the game with clear loop communication and entry into the hangar.
- `BuildScene`: grid assembly scene with palette, selection, deletion, validation, and launch preparation.
- `FlightScene`: launch pad staging, ascent simulation, camera behavior, world visuals, and flight HUD.
- `ResultScene`: success or failure messaging, flight metrics, relaunch, and return-to-build actions.

No helper overlay scene is required yet. Shared UI and layout modules keep scene boundaries clear without introducing scene churn too early.

## Persistent state

Persistent data lives in a dedicated store instead of scene globals:

- `build.placedParts`: the current hangar assembly
- `build.derivedStats`: mass, thrust, fuel, stability, and related computed values
- `build.validation`: launch readiness and validation messages
- `flight.launchSnapshot`: frozen rocket data prepared from the build
- `flight.lastTelemetry`: important runtime metrics from the most recent ascent
- `results.lastResult`: success or failure plus summary metrics

## Physics and gameplay model

The project uses Phaser 3 with Arcade physics available in config for simple helpers and future collisions, but the rocket ascent itself will use a custom delta-time simulation. That keeps the flight model readable, deterministic enough for tuning, and decoupled from rigid-body behavior that would make launch readability harder to control.

Planned flight inputs and forces:

- Thrust from engines
- Gravity
- Fuel burn over time
- Steering torque or heading adjustments
- Stability damping derived from the build

## Responsive layout strategy

Responsive behavior is centralized:

- `getViewportMetrics()` normalizes viewport facts
- `compute*Layout()` functions return scene-specific layout objects
- `createResponsiveController()` subscribes scenes to resize events and reapplies layout

Scenes own presentation, but layout math lives outside the scenes. This keeps resize handling consistent across panels, HUD, backgrounds, and camera framing.

## Build architecture

Phase 2 turns the hangar into a modular builder while keeping `BuildScene` orchestration-focused.

- `src/game/build/BuildState.js` owns logical placements and selection state.
- `src/game/build/GridPlacementService.js` converts between part definitions and occupied grid cells, checks overlap, and evaluates attachment compatibility.
- `src/game/build/BuildValidator.js` performs launch-readiness checks outside the scene.
- `src/game/build/ShipStatsCalculator.js` derives aggregate ship stats such as mass, thrust, fuel, center of mass, and stability.
- `src/game/build/serializeBuild.js` prepares a clean launch payload for `FlightScene`.
- `src/game/ui/build/*` contains the hangar UI modules for the grid, palette, sidebar, stats, and controls.

The key rule is that build placements are stored in logical grid coordinates, not pixel coordinates. Rendering adapts to layout changes, but the rocket data model stays resolution-independent.

## Flight architecture

Phase 3 introduces a custom flight stack that consumes only the serialized launch payload produced by the build phase.

- `src/game/flight/FlightState.js` initializes runtime state from the launch payload and exposes telemetry snapshots.
- `src/game/flight/FlightSimulator.js` is a Phaser-free delta-time simulator for thrust, gravity, drag, fuel use, and rotational stability.
- `src/game/flight/FlightInputController.js` abstracts keyboard and touch controls into a simple input contract.
- `src/game/flight/FlightRenderer.js` handles the rocket visual, world presentation, HUD, and camera follow without owning any simulation math.
- `src/game/flight/FlightConstants.js` centralizes the tunable flight parameters.

`FlightScene` remains the orchestrator: it reads the payload from `GameStateStore`, wires the controller, simulator, and renderer together, persists telemetry back into shared state, and transitions to `ResultScene` on success or failure.

## Staging architecture

Phase 4 extends flight with stage-aware rockets while preserving the existing serialized build contract.

- `src/game/flight/StagePlanner.js` derives bottom-to-top stages from the serialized parts and decoupler boundaries.
- `serializeBuildForLaunch()` now emits payload `version: 2` and includes a `stages` array in addition to the existing `parts`, `stats`, and legacy `staging` summary.
- `FlightState` stores runtime stage data, active attached parts, per-stage remaining fuel, current stage index, and stage usage counts.
- `FlightSimulator` owns stage separation and active-stage recalculation, so `FlightScene` only forwards the stage input command.
- `FlightRenderer` renders only the currently attached parts, which makes separated lower stages disappear without simulation logic leaking into rendering.

Updated launch payload shape:

```text
{
  version: 2,
  parts: [...],
  stats: {...},
  stages: [
    {
      id,
      number,
      partIds,
      mass,
      dryMass,
      thrust,
      fuel,
      separatorIds
    }
  ]
}
```

## Debug and telemetry architecture

Phase 4 also adds QA-friendly debugging and richer mission telemetry.

- `src/game/flight/FlightDebugOverlay.js` owns the toggleable debug panel and world gizmos.
- `src/game/flight/FlightTelemetry.js` centralizes telemetry snapshots and mission-result shaping.
- `FlightConstants.js` now exposes mutable tuning values on `globalThis.__rocketFlightTuning` for manual browser-side balancing.
- `GameStateStore` still carries launch data into `FlightScene`, but now also receives richer flight telemetry and mission results including stages used, final velocity, and final angle.

Telemetry flow:

1. `BuildScene` serializes the validated rocket into a versioned launch payload.
2. `FlightScene` initializes `FlightState` from that payload.
3. Each frame the simulator updates state, telemetry is derived by `FlightTelemetry`, and the latest snapshot is stored in `GameStateStore`.
4. On success or failure, the final mission result is shaped by `FlightTelemetry` and shown by `ResultScene`.

## Onboarding and help flow

Phase 5 adds a lightweight help layer without mixing tutorial copy into the build or flight rules.

- `src/game/ui/help/TutorialHints.js` stores concise contextual hints for menu, build, and flight.
- `src/game/ui/help/HowToPlayOverlay.js` is the shared skippable overlay used by scenes that need more explanation.
- `MenuScene` exposes player-facing entry actions such as `Build Rocket`, `How to Play`, and `Mission Brief`.
- `BuildScene` keeps a compact hangar hint panel visible while the detailed overlay remains optional and dismissible.
- `FlightScene` can pause behind the help overlay so first-time instructions do not burn mission time before the player is ready.

The important architectural rule is that onboarding stays in UI modules and scene orchestration, not in the build validator or flight simulator.

## Mission and scoring flow

Phase 5 adds a simple mission framing layer around the existing telemetry pipeline.

- `src/game/mission/MissionDefinitions.js` defines the active mission brief and target altitude.
- `src/game/mission/MissionEvaluator.js` decides whether the flight result satisfied the mission goal.
- `src/game/mission/ScoreCalculator.js` converts mission outcome plus telemetry into a readable score breakdown.
- `src/game/flight/FlightTelemetry.js` remains the bridge between runtime state and the final mission result shape stored in `GameStateStore`.

Mission flow:

1. The build phase produces a clean launch payload.
2. The flight phase runs the simulator and emits telemetry snapshots.
3. On mission end, `FlightTelemetry` shapes a result object and mission modules add outcome and score data.
4. `ResultScene` renders that mission debrief without recalculating flight logic in-scene.

## Starter rockets and QA flow

Phase 5 also improves manual browser balancing and QA iteration.

- `src/game/flight/FlightTestRockets.js` defines starter and test rockets for quick build loading.
- `src/game/ui/build/StarterRocketAction.js` surfaces those presets in the hangar without bypassing the normal build pipeline.
- `FlightConstants.js` still exposes mutable tuning values through `globalThis.__rocketFlightTuning`.
- `FlightDebugOverlay.js` shows live mission telemetry plus the active tuning values and supports resetting tuning back to defaults.

This keeps QA utilities modular: test builds are loaded through `BuildState`, staging still comes from `StagePlanner`, and flight tuning remains centralized in one constants module.

## Player-facing loop

The current vertical slice now reads as a complete end-to-end game loop instead of a systems demo:

1. `MenuScene` frames the mission and points the player toward the hangar.
2. `BuildScene` teaches the assembly rules with contextual hints, starter rockets, validation, and responsive grid tooling.
3. `FlightScene` launches the serialized vehicle, supports staged ascent, and provides readable HUD, warning, and debug feedback.
4. `ResultScene` delivers a mission debrief with outcome, score, breakdown, and retry paths.

The loop stays scene-first and modular: scenes orchestrate, build modules own assembly rules, flight modules own simulation and rendering, and mission modules own evaluation and scoring.

## Folder structure

```text
src/
  game/
    config/
    layout/
    scenes/
    state/
    systems/
    ui/
  styles/
```

`public/assets/` is the drop-in location for real art and audio. The codebase currently generates fallback placeholder textures during boot so real assets can replace them without rewriting scene logic.
