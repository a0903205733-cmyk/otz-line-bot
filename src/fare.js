export function estimateFare(distanceKm, durationMinutes, toll = 0) {
  const baseFare = Number(process.env.BASE_FARE || 50);
  const perKm = Number(process.env.PER_KM || 20);
  const perMinute = Number(process.env.PER_MINUTE || 2);
  const raw = baseFare + Number(distanceKm) * perKm + Number(durationMinutes) * perMinute + Number(toll || 0);
  return Math.round(raw / 10) * 10;
}
