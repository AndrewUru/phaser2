import { FLIGHT_CONSTANTS, FLIGHT_RESULT_CODES } from "./FlightConstants.js";
import { refreshFlightStageContext } from "./FlightState.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  return current + Math.sign(target - current) * maxDelta;
}

function normalizeInput(input) {
  return {
    thrust: Boolean(input?.thrust),
    rotate: clamp(input?.rotate ?? 0, -1, 1),
    stagePressed: Boolean(input?.stagePressed),
  };
}

function setFailure(state, code, label, summary) {
  if (state.status !== "flying") {
    return state;
  }

  state.status = "failed";
  state.resultCode = code;
  state.resultLabel = label;
  state.resultSummary = summary;
  state.finalVelocity = { ...state.velocity };
  state.finalAngle = state.angle;

  return state;
}

function setSuccess(state) {
  if (state.status !== "flying") {
    return state;
  }

  state.status = "success";
  state.resultCode = FLIGHT_RESULT_CODES.SUCCESS;
  state.resultLabel = "Orbit Achieved";
  state.resultSummary =
    "The rocket reached target altitude with a stable ascent profile.";
  state.finalVelocity = { ...state.velocity };
  state.finalAngle = state.angle;

  return state;
}

function setEventMessage(state, message, duration = 1.2) {
  state.eventMessage = message;
  state.eventTimer = duration;
}

function getAirDensity(altitude) {
  const density = 1 - Math.max(0, altitude) / FLIGHT_CONSTANTS.atmosphereHeight;
  return clamp(density, FLIGHT_CONSTANTS.minAirDensity, 1);
}

function canSeparateStage(state) {
  return (
    state.currentStageIndex < state.stages.length - 1 &&
    state.stageCooldown <= 0
  );
}

function separateStage(state) {
  if (!canSeparateStage(state)) {
    if (state.currentStageIndex >= state.stages.length - 1) {
      setEventMessage(state, "Final stage active");
    }

    return false;
  }

  const stage = state.stages[state.currentStageIndex];
  stage.detached = true;
  state.currentStageIndex += 1;
  state.stageSeparationCount += 1;
  state.stagesUsed = Math.max(state.stagesUsed, state.currentStageIndex + 1);
  state.stageCooldown = FLIGHT_CONSTANTS.minimumStageGapTime;
  state.velocity.y += FLIGHT_CONSTANTS.stageSeparationImpulse;
  state.throttle = Math.max(0.18, state.throttle * 0.6);

  refreshFlightStageContext(state);
  setEventMessage(state, `Stage ${state.currentStageIndex + 1} ignition`, 1.4);

  return true;
}

/**
 * Calculate the orbital velocity required at a given altitude
 * Based on circular orbit mechanics: v = sqrt(GM/r)
 * Simplified for arcade gameplay with arcade scaling
 */
function calculateOrbitalVelocityRequired(altitude) {
  // Arcade scaling: at target altitude (2000m), we want ~65 velocity units
  // Using simplified orbital mechanics scaled for arcade gameplay
  const altitudeRatio = 1 + altitude / FLIGHT_CONSTANTS.targetAltitude;
  // v = sqrt(GM/(R+h)) - simplified as arcade formula
  // Lower altitude = higher velocity needed
  const baseVelocity = FLIGHT_CONSTANTS.minOrbitalVelocity;
  const maxVelocity = FLIGHT_CONSTANTS.maxOrbitalVelocityTolerance;

  // As altitude increases, less horizontal velocity needed (inverse of gravity effect)
  const requiredVelocity = baseVelocity / Math.sqrt(altitudeRatio * 0.8);

  return clamp(requiredVelocity, baseVelocity * 0.9, maxVelocity);
}

export class FlightSimulator {
  static update(state, input, dt) {
    if (!state || state.status !== "flying") {
      return state;
    }

    const safeDt = clamp(dt, 1 / 240, 1 / 20);
    const controls = normalizeInput(input);

    // Handle launch hold phase
    if (state.launchHold) {
      state.elapsedTime += safeDt;
      state.eventTimer = Math.max(0, state.eventTimer - safeDt);

      // Check if player requests thrust to begin liftoff
      if (controls.thrust) {
        state.launchHold = false;
        state.liftoffTime = state.elapsedTime;
        state.throttle = 0;
        setEventMessage(state, "Ignition sequence initiated", 1.2);
      }

      // During launch hold, no physics simulation
      return state;
    }

    if (controls.stagePressed) {
      separateStage(state);
    }

    state.elapsedTime += safeDt;
    state.stageCooldown = Math.max(0, state.stageCooldown - safeDt);
    state.eventTimer = Math.max(0, state.eventTimer - safeDt);

    refreshFlightStageContext(state);

    const activeStage = state.activeStage;
    const activeFuelRatio =
      activeStage && activeStage.fuel > 0
        ? activeStage.remainingFuel / activeStage.fuel
        : 0;
    const canBurn = Boolean(activeStage && activeStage.remainingFuel > 0);
    const desiredThrottle = controls.thrust && canBurn ? 1 : 0;
    const throttleRate =
      desiredThrottle > state.throttle
        ? FLIGHT_CONSTANTS.thrustRampUpRate
        : FLIGHT_CONSTANTS.thrustRampDownRate;

    state.throttle = moveToward(
      state.throttle,
      desiredThrottle,
      throttleRate * safeDt,
    );
    state.thrustActive = state.throttle > 0.02 && canBurn;

    const stability = clamp(state.stabilityFactor, 0, 1);
    const controlPenalty =
      (Math.max(
        0,
        Math.abs(radiansToDegrees(state.angle)) -
          FLIGHT_CONSTANTS.tiltWarningDegrees,
      ) *
        FLIGHT_CONSTANTS.tiltControlPenalty) /
      100;
    const controlAuthority = clamp(
      1 - controlPenalty - stability * 0.2,
      0.45,
      1,
    );

    if (Math.abs(controls.rotate) < 0.01) {
      state.steeringIdleTime += safeDt;
    } else {
      state.steeringIdleTime = 0;
    }

    const steeringAssist =
      state.steeringIdleTime > FLIGHT_CONSTANTS.stabilityRecoveryDelay
        ? FLIGHT_CONSTANTS.autoLevelStrength * stability
        : 0;

    state.angularVelocity +=
      controls.rotate *
      FLIGHT_CONSTANTS.rotationAcceleration *
      controlAuthority *
      safeDt;
    state.angularVelocity -=
      state.angularVelocity * FLIGHT_CONSTANTS.angularDamping * safeDt;
    state.angularVelocity -= state.angle * steeringAssist * safeDt;
    state.angularVelocity = clamp(
      state.angularVelocity,
      -FLIGHT_CONSTANTS.maxAngularSpeed,
      FLIGHT_CONSTANTS.maxAngularSpeed,
    );
    state.angle += state.angularVelocity * safeDt;

    const airDensity = getAirDensity(state.position.y);
    const speed = Math.hypot(state.velocity.x, state.velocity.y);
    const dragStrength =
      (FLIGHT_CONSTANTS.dragLinear + speed * FLIGHT_CONSTANTS.dragQuadratic) *
      airDensity;
    const dragX = -state.velocity.x * dragStrength;
    const dragY = -state.velocity.y * dragStrength;

    const thrustForce =
      (activeStage?.thrust ?? 0) *
      FLIGHT_CONSTANTS.thrustMultiplier *
      state.throttle;

    // Apply liftoff boost for dramatic arcade-like departure from pad
    const timeSinceLiftoff =
      state.liftoffTime >= 0 ? state.elapsedTime - state.liftoffTime : Infinity;
    const isInLiftoffBoost =
      timeSinceLiftoff < FLIGHT_CONSTANTS.liftoffInitialBoostDuration;
    const thrustMultiplier = isInLiftoffBoost
      ? FLIGHT_CONSTANTS.liftoffInitialBoostMultiplier
      : 1.0;

    const thrustAcceleration =
      state.currentMass > 0
        ? (thrustForce / state.currentMass) * thrustMultiplier
        : 0;

    const accelX = Math.sin(state.angle) * thrustAcceleration + dragX;
    const accelY =
      Math.cos(state.angle) * thrustAcceleration -
      FLIGHT_CONSTANTS.gravity +
      dragY;

    state.velocity.x += accelX * safeDt;
    state.velocity.y += accelY * safeDt;
    state.position.x += state.velocity.x * safeDt;
    state.position.y += state.velocity.y * safeDt;
    state.maxSpeed = Math.max(
      state.maxSpeed,
      Math.hypot(state.velocity.x, state.velocity.y),
    );

    // Track horizontal velocity for orbital mechanics
    state.horizontalVelocity = Math.abs(state.velocity.x);
    state.orbitalVelocityRequired = calculateOrbitalVelocityRequired(
      state.position.y,
    );
    state.isOrbitalVelocityAchieved =
      state.horizontalVelocity >= state.orbitalVelocityRequired;

    if (state.thrustActive && activeStage) {
      const fuelBurnRate =
        FLIGHT_CONSTANTS.fuelConsumptionRate *
        Math.max(0.25, activeStage.thrust / Math.max(1, state.totalThrust)) *
        state.throttle;

      activeStage.remainingFuel = Math.max(
        0,
        activeStage.remainingFuel - fuelBurnRate * safeDt,
      );
      refreshFlightStageContext(state);

      if (activeStage.remainingFuel === 0 && canSeparateStage(state)) {
        state.stageReady = true;
        setEventMessage(
          state,
          "Stage burnout. Separate to ignite next stage.",
          1.8,
        );
      }
    }

    state.maxAltitude = Math.max(state.maxAltitude, state.position.y);

    const tiltDegrees = Math.abs(radiansToDegrees(state.angle));
    if (
      tiltDegrees > FLIGHT_CONSTANTS.tiltWarningDegrees &&
      state.position.y > FLIGHT_CONSTANTS.tiltFailureAltitude
    ) {
      state.tiltExposure +=
        ((tiltDegrees - FLIGHT_CONSTANTS.tiltWarningDegrees) /
          Math.max(
            1,
            FLIGHT_CONSTANTS.maxTiltDegrees -
              FLIGHT_CONSTANTS.tiltWarningDegrees,
          )) *
        safeDt;
    } else {
      state.tiltExposure = Math.max(0, state.tiltExposure - safeDt * 1.2);
    }

    // Check for orbital mechanics: altitude, velocity, and vertical velocity
    const hasReachedTargetAltitude = state.position.y >= state.targetAltitude;
    const velocityWithinRange =
      state.horizontalVelocity >= state.orbitalVelocityRequired;
    const verticalVelocityStable =
      Math.abs(state.velocity.y) <= FLIGHT_CONSTANTS.maxVerticalVelocityInOrbit;

    // Orbital stability: all three conditions must be met
    const canBeInOrbit =
      hasReachedTargetAltitude && velocityWithinRange && verticalVelocityStable;

    // Maintain time in orbit counter
    if (canBeInOrbit) {
      state.orbitalStable = true;
      state.timeInStableOrbit += safeDt;

      // Orbital decay simulation: if velocity drops below required, altitude decreases
      if (state.horizontalVelocity < state.orbitalVelocityRequired * 0.92) {
        state.position.y -=
          (state.orbitalVelocityRequired - state.horizontalVelocity) *
          safeDt *
          0.5;
      }
    } else {
      state.orbitalStable = false;
      state.timeInStableOrbit = Math.max(0, state.timeInStableOrbit - safeDt);
    }

    // Victory condition: maintain stable orbit for minimum time
    if (
      state.orbitalStable &&
      state.timeInStableOrbit >= FLIGHT_CONSTANTS.minTimeInOrbit
    ) {
      state.resultSummary = `Stable orbit maintained for ${state.timeInStableOrbit.toFixed(1)}s at ${state.position.y.toFixed(0)}m altitude with ${state.horizontalVelocity.toFixed(1)} m/s orbital velocity.`;
      return setSuccess(state);
    }

    // Provide feedback when close to orbital insertion
    if (hasReachedTargetAltitude && state.eventTimer <= 0) {
      if (!velocityWithinRange) {
        const velocityDeficit =
          state.orbitalVelocityRequired - state.horizontalVelocity;
        setEventMessage(
          state,
          `Altitude reached! Need ${velocityDeficit.toFixed(1)} more m/s horizontal velocity`,
          2.0,
        );
      } else if (!verticalVelocityStable) {
        setEventMessage(
          state,
          `Velocity OK. Vertical descent too fast: ${Math.abs(state.velocity.y).toFixed(1)} m/s (max ${FLIGHT_CONSTANTS.maxVerticalVelocityInOrbit.toFixed(1)})`,
          2.0,
        );
      } else if (state.timeInStableOrbit > 0) {
        const remaining =
          FLIGHT_CONSTANTS.minTimeInOrbit - state.timeInStableOrbit;
        setEventMessage(
          state,
          `Stable orbit! Maintain for ${remaining.toFixed(1)}s more to victory`,
          1.5,
        );
      }
    }

    if (
      tiltDegrees > FLIGHT_CONSTANTS.maxTiltDegrees &&
      state.tiltExposure >= FLIGHT_CONSTANTS.tiltFailureDuration
    ) {
      return setFailure(
        state,
        FLIGHT_RESULT_CODES.EXCESSIVE_TILT,
        "Vehicle Tumbled",
        "A sustained high tilt pushed the rocket beyond controllable flight.",
      );
    }

    if (
      state.fuelRemaining <= 0 &&
      !canSeparateStage(state) &&
      state.position.y < state.targetAltitude &&
      state.velocity.y <= 0
    ) {
      return setFailure(
        state,
        FLIGHT_RESULT_CODES.OUT_OF_FUEL,
        "Fuel Exhausted",
        "All stages ran dry before the mission reached target altitude.",
      );
    }

    if (
      state.position.y <= FLIGHT_CONSTANTS.touchdownAltitude &&
      state.elapsedTime > 1 &&
      (state.velocity.y < FLIGHT_CONSTANTS.crashVerticalSpeed ||
        Math.abs(state.velocity.x) > FLIGHT_CONSTANTS.crashHorizontalSpeed ||
        tiltDegrees > FLIGHT_CONSTANTS.crashTiltDegrees)
    ) {
      return setFailure(
        state,
        FLIGHT_RESULT_CODES.IMPACT,
        "Hard Impact",
        "The vehicle struck the pad too fast or too far off-axis to recover.",
      );
    }

    return state;
  }
}
