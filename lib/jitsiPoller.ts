import { recordMetric } from './metricsCollector';
import { gameManager } from './gameManager';

const JITSI_METRICS_URL = process.env.JITSI_METRICS_URL || 'http://localhost:8080';
const POLL_INTERVAL = 5000; // 5 seconds

interface JitsiConference {
  name: string;
  endpoints: { [endpointId: string]: string };
}

interface JitsiDebugResponse {
  overall_bridge_jitter?: number;
  conferences?: { [conferenceId: string]: JitsiConference };
}

let pollingInterval: NodeJS.Timeout | null = null;

/**
 * Fetch Jitsi metrics from the debug endpoint
 */
async function fetchJitsiMetrics(): Promise<JitsiDebugResponse | null> {
  try {
    const response = await fetch(`${JITSI_METRICS_URL}/debug`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Jitsi API returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Jitsi metrics:', error);
    return null;
  }
}

/**
 * Extract game ID from Jitsi conference name
 * Conference names are in format: "codenames-{gameId}@muc.meet.jitsi"
 */
function extractGameIdFromConferenceName(conferenceName: string): string | null {
  const match = conferenceName.match(/codenames-([^@]+)@/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Poll Jitsi and record metrics for active games
 */
async function pollJitsiMetrics(): Promise<void> {
  const data = await fetchJitsiMetrics();

  if (!data) {
    return;
  }

  const jitter = data.overall_bridge_jitter || 0;
  const conferences = data.conferences || {};

  // Get all active games
  const activeGames = gameManager.getAllGames();

  // Record metrics for each active game
  for (const game of activeGames) {
    // Find the corresponding Jitsi conference for this game
    const conferenceEntry = Object.entries(conferences).find(([_, conf]) => {
      const gameId = extractGameIdFromConferenceName(conf.name);
      return gameId === game.id.toLowerCase();
    });

    const participantCount = conferenceEntry
      ? Object.keys(conferenceEntry[1].endpoints || {}).length
      : 0;

    // Record the metric
    recordMetric(game.id, jitter, participantCount);
  }
}

/**
 * Start polling Jitsi metrics
 */
export function startJitsiPoller(): void {
  if (pollingInterval) {
    console.log('[JitsiPoller] Already running');
    return;
  }

  console.log(`[JitsiPoller] Starting Jitsi metrics polling (interval: ${POLL_INTERVAL}ms)`);

  // Poll immediately on start
  pollJitsiMetrics();

  // Then poll at regular intervals
  pollingInterval = setInterval(() => {
    pollJitsiMetrics();
  }, POLL_INTERVAL);
}

/**
 * Stop polling Jitsi metrics
 */
export function stopJitsiPoller(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[JitsiPoller] Stopped');
  }
}
