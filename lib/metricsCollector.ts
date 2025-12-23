export interface MetricDataPoint {
  timestamp: number;
  jitter: number;
  participantCount: number;
}

interface GameMetrics {
  gameId: string;
  dataPoints: MetricDataPoint[];
  startTime: number;
}

// In-memory storage for metrics (last 30 minutes per game)
const metricsStorage = new Map<string, GameMetrics>();

// 30 minutes in milliseconds
const RETENTION_PERIOD = 30 * 60 * 1000;

/**
 * Record a metric data point for a game
 */
export function recordMetric(
  gameId: string,
  jitter: number,
  participantCount: number
): void {
  const now = Date.now();

  let gameMetrics = metricsStorage.get(gameId);

  if (!gameMetrics) {
    gameMetrics = {
      gameId,
      dataPoints: [],
      startTime: now,
    };
    metricsStorage.set(gameId, gameMetrics);
  }

  // Add new data point
  gameMetrics.dataPoints.push({
    timestamp: now,
    jitter,
    participantCount,
  });

  // Remove data points older than 30 minutes
  const cutoffTime = now - RETENTION_PERIOD;
  gameMetrics.dataPoints = gameMetrics.dataPoints.filter(
    dp => dp.timestamp >= cutoffTime
  );
}

/**
 * Get metrics for a specific game (last 30 minutes)
 */
export function getMetrics(gameId: string): MetricDataPoint[] {
  const gameMetrics = metricsStorage.get(gameId);

  if (!gameMetrics) {
    return [];
  }

  // Filter to ensure only last 30 minutes
  const now = Date.now();
  const cutoffTime = now - RETENTION_PERIOD;

  return gameMetrics.dataPoints.filter(dp => dp.timestamp >= cutoffTime);
}

/**
 * Clean up old metrics for all games
 * Should be called periodically (e.g., every 5 minutes)
 */
export function cleanupOldMetrics(): void {
  const now = Date.now();
  const cutoffTime = now - RETENTION_PERIOD;

  for (const [gameId, gameMetrics] of metricsStorage.entries()) {
    // Remove old data points
    gameMetrics.dataPoints = gameMetrics.dataPoints.filter(
      dp => dp.timestamp >= cutoffTime
    );

    // If no data points left, remove the game entirely
    if (gameMetrics.dataPoints.length === 0) {
      metricsStorage.delete(gameId);
    }
  }
}

/**
 * Get aggregated metrics for a game when it ends
 */
export function getMetricsForEndedGame(gameId: string): {
  totalDuration: number;
  averageJitter: number;
  averageParticipants: number;
} | null {
  const gameMetrics = metricsStorage.get(gameId);

  if (!gameMetrics || gameMetrics.dataPoints.length === 0) {
    return null;
  }

  const dataPoints = gameMetrics.dataPoints;
  const totalDuration = Date.now() - gameMetrics.startTime;

  const averageJitter =
    dataPoints.reduce((sum, dp) => sum + dp.jitter, 0) / dataPoints.length;

  const averageParticipants =
    dataPoints.reduce((sum, dp) => sum + dp.participantCount, 0) /
    dataPoints.length;

  return {
    totalDuration,
    averageJitter,
    averageParticipants: Math.round(averageParticipants),
  };
}

/**
 * Remove metrics for a specific game
 */
export function removeMetrics(gameId: string): void {
  metricsStorage.delete(gameId);
}

// Run cleanup every 5 minutes
if (typeof window === "undefined") {
  setInterval(() => {
    cleanupOldMetrics();
  }, 5 * 60 * 1000);
}
