function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundScore(value) {
  return Math.round(value);
}

export function calculateMissionScore(result, evaluation) {
  const altitudeRatio =
    evaluation.targetAltitude > 0
      ? clamp((result?.maxAltitude ?? 0) / evaluation.targetAltitude, 0, 1.2)
      : 0;
  const successBonus = evaluation.success ? 550 : 0;
  const altitudeScore = roundScore(altitudeRatio * 260);
  const fuelScore = roundScore(clamp((result?.fuelRemaining ?? 0) * 0.9, 0, 120));
  const stageEfficiencyScore = roundScore(
    clamp(((result?.stageCount ?? 1) - (result?.stagesUsed ?? 1) + 1) * 35, 20, 120)
  );
  const timeScore = evaluation.success
    ? roundScore(clamp(180 - (result?.elapsedTime ?? 0) * 4, 25, 180))
    : 0;
  const landingPenalty = result?.code === 'impact' ? -110 : 0;
  const instabilityPenalty = result?.code === 'excessive_tilt' ? -90 : 0;
  const dryPenalty = result?.code === 'out_of_fuel' ? -70 : 0;

  const total =
    successBonus +
    altitudeScore +
    fuelScore +
    stageEfficiencyScore +
    timeScore +
    landingPenalty +
    instabilityPenalty +
    dryPenalty;

  return {
    total: Math.max(0, total),
    breakdown: [
      { label: 'Mission completion', value: successBonus },
      { label: 'Altitude progress', value: altitudeScore },
      { label: 'Fuel efficiency', value: fuelScore },
      { label: 'Stage efficiency', value: stageEfficiencyScore },
      { label: 'Time bonus', value: timeScore },
      { label: 'Crash penalty', value: landingPenalty },
      { label: 'Instability penalty', value: instabilityPenalty },
      { label: 'Fuel-out penalty', value: dryPenalty }
    ].filter((entry) => entry.value !== 0)
  };
}
