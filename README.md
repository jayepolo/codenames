# Codenames - Online Multiplayer

A real-time online multiplayer implementation of the popular board game Codenames, featuring integrated video chat via Jitsi Meet.

**Live Demo:** https://codenames.pololabs.io

---

## Features

- 🎮 **Real-time multiplayer** using Socket.IO
- 🎥 **Integrated video chat** via Jitsi Meet
- 🎯 **Complete game logic** with spymasters and operatives
- 👥 **Team-based gameplay** (Red vs Blue)
- 🔄 **Persistent player identity** across page refreshes
- 📱 **Responsive design** for desktop and mobile
- 🎨 **Modern UI** with Tailwind CSS
- 🔒 **No authentication required** - frictionless game joining

### Admin Panel

- 📊 **Real-time dashboard** monitoring all active games
- 📹 **Jitsi metrics integration** showing video participants
- 🎯 **Game details** with player teams, roles, and scores
- 🔐 **Password-protected** admin access
- ⚡ **Auto-refresh** every 5 seconds

See [ADMIN_PANEL.md](./ADMIN_PANEL.md) for full admin documentation.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Real-time:** Socket.IO
- **Video:** Jitsi Meet (self-hosted)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Deployment:** Docker + Traefik

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for deployment)

### Development

```bash
# Install dependencies
npm install

# Set admin password (optional)
echo "ADMIN_PASSWORD=dev123" > .env.local

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### Production Build

```bash
# Build
npm run build

# Start production server
npm start
```

---

## How to Play

1. **Create/Join a Game**
   - Enter a 6-character game code (or create a new one)
   - Set your player name
   - Join the game

2. **Choose Your Team**
   - Join Red or Blue team
   - Wait for other players

3. **Select Spymasters**
   - Each team needs one spymaster
   - Vote for your team's spymaster (democratic selection)
   - Or assign directly in lobby mode

4. **Start the Game**
   - All players must be ready
   - Game begins when conditions are met

5. **Gameplay**
   - **Spymasters:** Give one-word clues with a number
   - **Operatives:** Guess cards based on clues
   - First team to reveal all their cards wins
   - Avoid the assassin card (instant loss!)

---

## Admin Panel

Access the admin dashboard at `/admin` to monitor:
- Active games and players
- Team distributions and scores
- Video chat participants (via Jitsi)
- Server health metrics

**Setup:**

1. Set admin password in `.env.local`:
   ```bash
   ADMIN_PASSWORD=your-secure-password
   ```

2. Access at `https://codenames.pololabs.io/admin`

See [ADMIN_PANEL.md](./ADMIN_PANEL.md) for detailed documentation.

---

## Deployment

### Docker Deployment

The app is deployed using Docker with automated GitHub Actions:

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker logs codenames -f
```

### Environment Variables

```bash
# .env.local (for admin panel)
ADMIN_PASSWORD=your-admin-password
JITSI_METRICS_URL=http://localhost:8080  # Optional, defaults to localhost:8080

# Production (set in deployment)
PORT=3000  # Optional, defaults to 3000
NODE_ENV=production
```

---

## Project Structure

```
codenames/
├── app/
│   ├── page.tsx                    # Home/lobby
│   ├── game/[code]/page.tsx       # Game room
│   ├── admin/                      # Admin panel
│   │   ├── page.tsx               # Dashboard
│   │   ├── login/page.tsx         # Login
│   │   └── AdminDashboard.tsx     # Dashboard component
│   └── api/admin/                 # Admin API routes
├── lib/
│   ├── gameManager.ts             # Game state management
│   ├── gameLogic.ts               # Game rules
│   ├── words.ts                   # Word dictionary
│   └── adminAuth.ts               # Admin authentication
├── types/
│   └── game.ts                    # TypeScript types
├── server.ts                      # Socket.IO server
└── ADMIN_PANEL.md                 # Admin documentation
```

---

## Game Rules

- **25 cards** on the board
- **9 cards** for one team (starting team)
- **8 cards** for the other team
- **7 neutral cards** (bystanders)
- **1 assassin card** (instant loss if revealed)

### Roles

- **Spymaster:** Can see all card types, gives one-word clues
- **Operative:** Guesses based on spymaster's clues

### Turn Flow

1. Spymaster gives clue: "word, number"
2. Team gets number + 1 guesses
3. Guessing continues until:
   - Wrong card revealed
   - Team chooses to end turn
   - All guesses used
4. Other team's turn

### Winning

- Reveal all your team's cards first
- Other team reveals the assassin card (you win)

---

## Jitsi Integration

### Self-Hosted Jitsi

The app integrates with a self-hosted Jitsi Meet server:

- **Domain:** meet.pololabs.io
- **Room naming:** `codenames-{GAMECODE}`
- **Auto-join:** Enabled (skips pre-join screen)
- **Display names:** Synced with game usernames

### Admin Jitsi Metrics

The admin panel queries Jitsi's `/debug` endpoint for:
- Active conferences
- Participant counts and names
- Server load/stress
- Network jitter

See [jitsi-deploy repository](https://github.com/jayepolo/jitsi-deploy) for Jitsi configuration.

---

## Development Notes

### Game Manager

In-memory game state management:
- Games stored in `Map<gameId, GameState>`
- Auto-cleanup after 24 hours of inactivity
- Singleton pattern for shared state

### Socket.IO Events

Server events:
- `join-game` - Player joins
- `join-team` - Player selects team
- `assign-spymaster` - Set spymaster
- `vote-spymaster` - Vote for spymaster
- `start-game` - Begin game
- `give-clue` - Spymaster clue
- `reveal-card` - Guess a card
- `end-turn` - Switch teams
- `chat-message` - Text chat

### Persistence

- **Player ID:** Stored in localStorage per game
- **Username:** Stored in localStorage globally
- **Game state:** In-memory only (lost on restart)
- **Chat history:** Stored in localStorage per game

---

## Future Enhancements

- [ ] Historical game statistics
- [ ] Player skill ratings
- [ ] Custom word lists
- [ ] Game replays
- [ ] Tournament mode
- [ ] Mobile app (React Native)

---

## License

MIT

---

## Credits

- **Original Game:** Codenames by Vlaada Chvátil
- **Video Chat:** Jitsi Meet
- **Developer:** Jay Polo
- **Domain:** pololabs.io

---

## Support

For issues or questions:
- Create a GitHub issue
- Check logs: `docker logs codenames`
- Review [ADMIN_PANEL.md](./ADMIN_PANEL.md) for admin help
