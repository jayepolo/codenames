# Admin Panel Documentation

## Overview

The Codenames admin panel provides real-time monitoring and management of active games, including integration with Jitsi video metrics.

**Access URL:** `https://codenames.pololabs.io/admin` (or `http://localhost:3000/admin` in development)

---

## Features

### Real-Time Dashboard
- **Auto-refresh** every 5 seconds (can be toggled off)
- **Active games list** with detailed metrics
- **Jitsi video metrics** integration
- **Server health monitoring**

### Game Monitoring
- Game code and phase (Lobby, Active, Finished)
- Player count and team distribution
- Current score (Red vs Blue)
- Game duration
- Current clue (if active)
- Video participants count
- Direct link to join Jitsi room

### Server Metrics
- Total active games
- Total online players
- Jitsi server status (healthy/error)
- Server stress percentage
- Network jitter

---

## Setup

### 1. Set Admin Password

Create or edit `.env.local` in your project root:

```bash
# Admin Panel Configuration
ADMIN_PASSWORD=your-secure-password-here

# Optional: Jitsi server URL (defaults to localhost:8080)
JITSI_METRICS_URL=http://localhost:8080
```

**IMPORTANT:**
- Use a strong password
- Never commit `.env.local` to git (already in .gitignore)
- Change the default password immediately

### 2. Production Deployment

On your production server, ensure the `.env.local` file exists with the admin password:

```bash
# SSH to your server
cd ~/codenames

# Create .env.local if it doesn't exist
nano .env.local

# Add the admin password
ADMIN_PASSWORD=your-production-password

# Restart the app
docker-compose restart codenames
```

---

## Usage

### Accessing the Admin Panel

1. Navigate to `/admin` in your browser
2. You'll be redirected to the login page
3. Enter your admin password
4. Access granted for 24 hours (session cookie)

### Dashboard Features

#### Stats Cards
- **Active Games:** Number of currently running games
- **Total Players:** All connected players across all games
- **Jitsi Status:** Health indicator for video server
- **Server Stress:** Jitsi server load (0-100%)

#### Games Table
Each game shows:
- **Game Code:** Click to expand details
- **Phase:** Current game state (color-coded badge)
- **Players:** Count and team distribution (🔴/🔵)
- **Score:** Red vs Blue, with remaining cards
- **Duration:** Time since game started
- **Video:** Participants in Jitsi call + jitter
- **Actions:** Link to join video call

#### Expanded Game View
Click any game code to see:
- **Red Team:** All players with roles (👑 = Spymaster)
- **Blue Team:** All players with roles
- **Game Info:** Current turn, current clue, game status
- **Unassigned players:** Players not yet on a team

---

## API Endpoints

All admin endpoints require authentication via session cookie.

### POST /api/admin/login
Login and create session.

**Request:**
```json
{
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /api/admin/logout
Clear session and logout.

### GET /api/admin/games
Get all active games.

**Response:**
```json
{
  "games": [
    {
      "id": "ABC123",
      "phase": "active",
      "playerCount": 6,
      "players": [...],
      "redScore": 3,
      "blueScore": 5,
      "elapsedTime": 1800000
    }
  ],
  "totalGames": 1,
  "totalPlayers": 6
}
```

### GET /api/admin/jitsi
Get Jitsi server metrics.

**Response:**
```json
{
  "status": "RUNNING",
  "healthy": true,
  "stress": 0.01196,
  "jitter": 4.68e-7,
  "conferences": [
    {
      "id": "af51040da75f6cb6",
      "name": "codenames-abc123@muc.meet.jitsi",
      "participantCount": 3,
      "participants": [
        { "id": "bb8fc7c2", "name": "Alice-xyz" }
      ]
    }
  ],
  "conferenceCount": 1,
  "totalParticipants": 3
}
```

### GET /api/admin/game/[code]
Get detailed game state including board (cards).

**Response:**
```json
{
  "game": {
    "id": "ABC123",
    "cards": [...],
    "phase": "active",
    ...
  }
}
```

---

## Security

### Authentication
- **Password-based:** Simple admin password from environment variable
- **Session cookie:** HTTP-only, 24-hour expiration
- **No accounts:** Single admin user (you)

### Best Practices
- ✅ Use a strong, unique password
- ✅ Change password regularly
- ✅ Never share password or commit to git
- ✅ Access only via HTTPS in production
- ✅ The admin route is not linked anywhere (security through obscurity)

### Session Management
- Sessions expire after 24 hours
- Logout button clears session immediately
- Session validated on every API request

---

## Jitsi Integration

### How It Works
The admin panel queries your Jitsi server's `/debug` endpoint to get real-time metrics:

- **Endpoint:** `http://localhost:8080/debug` (on production server)
- **Data:** Conference list, participant counts, server health
- **Matching:** Game codes are matched to Jitsi room names

### Conference Matching
Game `ABC123` → Jitsi room `codenames-abc123@muc.meet.jitsi`

The dashboard automatically matches games to their video rooms.

### If Jitsi Metrics Fail
- Dashboard still works (shows "No video data")
- Error displayed in Jitsi Status card
- Games data remains available

### Joining Video as Observer
Click "Join Video" link in any game row to open the Jitsi room in a new tab. You can observe (or participate) without being in the actual game.

---

## Troubleshooting

### "Unauthorized" Error
- Session expired (24 hours)
- Log out and log back in
- Check that `ADMIN_PASSWORD` is set correctly

### Jitsi Metrics Not Showing
1. Verify Jitsi server is running:
   ```bash
   docker ps | grep jitsi-jvb
   ```

2. Test Jitsi API directly:
   ```bash
   curl http://localhost:8080/debug
   ```

3. Check `JITSI_METRICS_URL` in `.env.local` (should be `http://localhost:8080`)

4. Ensure JVB container port 8080 is accessible from Codenames container

### No Games Showing
- Verify games are actually active (join one from main page)
- Check server logs for errors
- Refresh dashboard manually

### Auto-refresh Not Working
- Check browser console for errors
- Toggle auto-refresh off and back on
- Hard refresh page (Ctrl+Shift+R)

---

## Development

### Running Locally

```bash
# 1. Create .env.local with admin password
echo "ADMIN_PASSWORD=dev123" > .env.local

# 2. Start dev server
npm run dev

# 3. Access admin panel
open http://localhost:3000/admin
```

### Testing

```bash
# Test admin API (requires auth cookie)
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"dev123"}' \
  -c cookies.txt

curl http://localhost:3000/api/admin/games \
  -b cookies.txt

curl http://localhost:3000/api/admin/jitsi \
  -b cookies.txt
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Admin Panel (/admin)                                   │
│  - Password-protected route                             │
│  - React dashboard with auto-refresh                    │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────────┐  ┌──────────────────────┐
│ Game Data        │  │ Jitsi Metrics        │
│ (gameManager)    │  │ (HTTP /debug API)    │
│ - In-memory Map  │  │ - Conferences        │
│ - All games      │  │ - Participants       │
│ - Player data    │  │ - Server health      │
└──────────────────┘  └──────────────────────┘
```

### File Structure

```
app/
├── admin/
│   ├── page.tsx                     # Main admin route (auth check)
│   ├── AdminDashboard.tsx          # Dashboard UI component
│   └── login/
│       └── page.tsx                 # Login page
├── api/
    └── admin/
        ├── login/route.ts           # Login API
        ├── logout/route.ts          # Logout API
        ├── games/route.ts           # Games list API
        ├── jitsi/route.ts           # Jitsi metrics API
        └── game/[code]/route.ts     # Single game detail API

lib/
└── adminAuth.ts                     # Auth utilities
```

---

## Future Enhancements

Potential features for Phase 2/3:

- [ ] Force end game button
- [ ] Kick player functionality
- [ ] Historical game statistics (requires logging)
- [ ] Charts and visualizations
- [ ] Export data as CSV/JSON
- [ ] Email notifications for issues
- [ ] Rate limiting on login attempts
- [ ] Multi-user admin with roles
- [ ] Game activity timeline
- [ ] Player statistics (requires tracking)

---

## Support

For issues or questions:
1. Check this documentation
2. Review server logs: `docker logs codenames`
3. Check Jitsi logs: `docker logs jitsi-jvb`
4. Create GitHub issue in codenames repo
