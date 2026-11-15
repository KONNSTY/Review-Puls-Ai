const PLAN_MONTHLY_GENERATION_LIMITS: Record<string, number> = {
  starter: 100,
  growth: 500,
  trial: 100,
};

export function generationLimit(plan: string) {
  return PLAN_MONTHLY_GENERATION_LIMITS[plan] ?? 0;
}

export function utcMonthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function publishSuccessRate(published: number, failed: number) {
  const attempts = published + failed;
  if (attempts <= 0) return 0;
  return Math.round((published / attempts) * 100);
}
