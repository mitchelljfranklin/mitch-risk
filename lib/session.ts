export function computeSessionExpiry(
  sessionTimeoutMinutes: number,
): number | undefined {
  return sessionTimeoutMinutes > 0
    ? Math.floor(Date.now() / 1000) + sessionTimeoutMinutes * 60
    : undefined;
}
