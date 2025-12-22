import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';

const JITSI_METRICS_URL = process.env.JITSI_METRICS_URL || 'http://localhost:8080';

export async function GET() {
  // Check authentication
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${JITSI_METRICS_URL}/debug`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jitsi API returned ${response.status}`);
    }

    const data = await response.json();

    // Transform Jitsi data for easier consumption
    const conferences = data.conferences || {};
    const conferenceList = Object.entries(conferences).map(([id, conf]: [string, any]) => ({
      id,
      name: conf.name,
      meetingId: conf.meeting_id,
      participantCount: Object.keys(conf.endpoints || {}).length,
      participants: Object.entries(conf.endpoints || {}).map(([epId, name]) => ({
        id: epId,
        name,
      })),
      rtcstatsEnabled: conf.rtcstatsEnabled,
    }));

    return NextResponse.json({
      status: data.shutdownState,
      healthy: data.health?.success || false,
      stress: parseFloat(data['load-management']?.stress || '0'),
      overloaded: data['load-management']?.state !== 'NOT_OVERLOADED',
      jitter: data.overall_bridge_jitter || 0,
      drain: data.drain || false,
      timestamp: data.time,
      conferences: conferenceList,
      conferenceCount: conferenceList.length,
      totalParticipants: conferenceList.reduce((sum, conf) => sum + conf.participantCount, 0),
    });
  } catch (error) {
    console.error('Error fetching Jitsi metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Jitsi metrics',
        status: 'UNKNOWN',
        healthy: false,
        conferences: [],
        conferenceCount: 0,
        totalParticipants: 0,
      },
      { status: 200 } // Return 200 with error flag so UI doesn't break
    );
  }
}
