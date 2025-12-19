# Codenames MVP - Development Summary

## Project Overview
Built an online multiplayer Codenames game using Next.js 15, TypeScript, Socket.IO, and Jitsi Meet for video chat. The application enables friends to play Codenames together remotely with real-time game state synchronization, integrated video chat, and text messaging.

---

## Phase 1: Core Game Mechanics ✅

### Game State & Logic
- **Type System**: Created comprehensive TypeScript interfaces for game state, players, cards, and teams
- **Word List**: Implemented 400+ word dictionary for random grid generation
- **Grid Generation**: 25-card grid with random word selection
- **Card Distribution**:
  - Starting team: 9 cards
  - Other team: 8 cards
  - Neutral: 7 cards
  - Assassin: 1 card
- **Game Logic**:
  - Turn management (Red vs Blue)
  - Card reveal mechanics
  - Win conditions (find all cards or hit assassin)
  - Score tracking and remaining cards display

### Player Management
- **Invitation System**: 6-character game codes for easy joining
- **Role Assignment**: Spymaster and Operative roles for each team
- **Views**:
  - Spymasters see all card types (color-coded borders)
  - Operatives see only revealed cards

---

## Phase 2: Real-Time Synchronization ✅

### Socket.IO Integration
- **Custom Server**: Implemented custom Next.js server with Socket.IO
- **Real-time Events**:
  - `join-game`: Player joins game room
  - `assign-role`: Role and team assignment
  - `reveal-card`: Card selection synchronization
  - `end-turn`: Turn switching
  - `reset-game`: New game creation
  - `chat-message`: Text chat broadcasting

### Player Persistence & Reconnection
**Problem**: Socket.IO connection IDs change on refresh, creating new players

**Solution**: Implemented persistent player identification
- **localStorage Player IDs**: Generate unique ID on first visit per game
- **Dual ID System**:
  - `playerId`: Persistent identifier (survives reconnects)
  - `socketId`: Current WebSocket connection
- **Reconnection Logic**:
  - Server recognizes returning players by `playerId`
  - Preserves team and role assignments
  - Updates only the socket connection
- **Storage Key**: `codenames-player-{GAMECODE}`

**Benefits**:
- Players maintain identity across page refreshes
- Team/role preserved through computer reboots
- Works same browser, same device
- Simple, no authentication needed

---

## Phase 3: Communication Features ✅

### Jitsi Meet Video Chat Integration
**Implementation**: iframe-based integration (not React SDK)

**Configuration**:
- **Room Naming**: `codenames-{GAMECODE}`
- **Auto-join**: No prejoin screen
- **Default State**: Audio and video muted on join
- **Player Names**: Automatically set from localStorage
- **Grid View**: Tile view button for all participants
- **Toolbar**: Limited to essential controls only:
  - Microphone toggle
  - Camera toggle
  - Settings
  - Participants pane
  - Tile view
  - Hangup

**Why iframe over React SDK**:
- Zero Next.js SSR issues (React SDK requires `ssr: false` workaround)
- No extra dependencies or bundle size
- Simple, bulletproof implementation
- Same functionality for our use case

### Text Chat System
**Features**:
- **Public Chat**: All messages visible to all players
- **Real-time Broadcasting**: Socket.IO message relay
- **Message Structure**:
  - Player name prefix
  - Message content
  - Timestamp
  - Unique ID
- **Auto-scroll**: Always shows latest messages
- **Character Limit**: 200 characters per message

### Chat Persistence
- **localStorage**: Messages saved per game
- **Storage Key**: `codenames-chat-{GAMECODE}`
- **Per-game History**: Different games have separate chat histories
- **Survives**: Page refreshes, browser restarts
- **Auto-clear**: Resets on "New Game" button

---

## Phase 4: UI/UX Enhancements ✅

### Resizable Panels
**Problem**: Fixed panel sizes didn't accommodate different screen sizes and preferences

**Solution**: Implemented smooth, draggable resize functionality

#### Horizontal Resize (Game Board ↔ Right Sidebar)
- **Resize Handle**: 1px blue line between sections
- **Constraints**: 300px - 800px width
- **Performance Optimization**:
  - `requestAnimationFrame` for 60fps updates
  - Direct DOM manipulation during drag
  - React state update only on mouse release
  - Zero lag, buttery smooth

#### Vertical Resize (Video ↔ Chat)
- **Resize Handle**: 1px blue line between video and chat
- **Constraints**: 200px - 800px video height
- **Same Performance**: RAF-based smooth dragging

#### Resize Persistence
- **localStorage**: Settings saved automatically
- **Keys**:
  - `codenames-sidebar-width`
  - `codenames-video-height`
- **Load on Start**: Restores saved preferences
- **Default Values**:
  - Sidebar: 550px (~38% of screen)
  - Video: 480px (~60% of sidebar height)

### Collapsible Sidebars

#### Right Sidebar (Video & Chat)
- **Default**: Expanded (550px)
- **Collapsed**: 12px narrow bar with vertical label
- **Toggle**: Arrow button
- **Smooth Animation**: CSS transitions

#### Left Navbar (Players)
- **Default**: Collapsed to save space
- **Expanded**: 256px panel
- **Player Organization**:
  - Red Team (red-tinted cards)
  - Blue Team (blue-tinted cards)
  - Unassigned (gray cards)
- **Smart Display**: Shows placeholder before role selection
- **Empty States**: "No players yet" messages

**Benefits**: Removed bulky bottom player section, more vertical space for game board

### Visual Polish
- **Assassin Card**: Changed from red outline to gray outline (matches neutral cards, avoids red team confusion)
- **Chat Label**: Changed "Team Chat" → "Game Chat" (reflects public nature)
- **Player Cards**: Enhanced styling with semi-transparent team-colored backgrounds
- **Proportions**: Adjusted defaults to match reference screenshot

---

## Technical Architecture

### Frontend
- **Framework**: Next.js 15.1.0 with App Router
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **Real-time**: Socket.IO Client 4.8
- **Video**: Jitsi Meet (iframe embed)

### Backend
- **Runtime**: Node.js with custom HTTP server
- **Framework**: Next.js API
- **WebSockets**: Socket.IO Server 4.8
- **State Management**: In-memory game state (Map-based)
- **Cleanup**: Automatic 24-hour game expiration

### Data Persistence
- **Game State**: In-memory (server)
- **Player IDs**: localStorage (client)
- **Chat History**: localStorage per game (client)
- **Resize Settings**: localStorage global (client)

### Performance Optimizations
- **Resize Dragging**: `requestAnimationFrame` for 60fps
- **Chat Auto-scroll**: Smooth scroll behavior
- **Socket Events**: Efficient room-based broadcasting
- **State Updates**: Minimal re-renders during drag operations

---

## File Structure

```
codenames/
├── app/
│   ├── page.tsx                 # Home page (create/join game)
│   ├── game/[code]/page.tsx     # Main game page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── lib/
│   ├── gameLogic.ts             # Core game rules and logic
│   ├── gameManager.ts           # Game state management singleton
│   └── words.ts                 # Word list (400+ words)
├── types/
│   └── game.ts                  # TypeScript interfaces
├── server.ts                    # Custom server with Socket.IO
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind config
└── next.config.ts               # Next.js config
```

---

## Key Features Summary

### Game Features
✅ Standard Codenames rules
✅ 5x5 word grid with random generation
✅ Red vs Blue team gameplay
✅ Spymaster and Operative roles
✅ Real-time card reveals
✅ Automatic score tracking
✅ Win condition detection
✅ Game reset functionality

### Multiplayer Features
✅ Invitation-based access (6-char codes)
✅ Real-time game state synchronization
✅ Player reconnection with role preservation
✅ Integrated Jitsi video chat (up to 75-100 participants)
✅ Public text chat with persistence
✅ Live player list by team

### UI/UX Features
✅ Resizable panels (horizontal and vertical)
✅ Collapsible sidebars (left and right)
✅ Smooth 60fps resize dragging
✅ Persistent settings across sessions
✅ Responsive dark theme
✅ Role-based card views (spymaster vs operative)
✅ Empty state handling
✅ Clean, professional interface

---

## localStorage Implementation Details

### Keys Used
| Key | Purpose | Scope | Clears On |
|-----|---------|-------|-----------|
| `codenames-player-{GAMECODE}` | Persistent player ID | Per game | Manual only |
| `codenames-chat-{GAMECODE}` | Chat message history | Per game | New game button |
| `codenames-sidebar-width` | Right sidebar width | Global | Manual only |
| `codenames-video-height` | Video section height | Global | Manual only |

### Data Examples
```javascript
// Player ID
"1765836664849-7cum4v73t"

// Chat history
[
  {
    "id": "1765836700000-0.123",
    "playerName": "Alice",
    "message": "Good clue!",
    "timestamp": 1765836700000
  }
]

// Resize settings
"550"  // pixels
"480"  // pixels
```

---

## Testing Checklist

### Core Gameplay
- [x] Create game with random code generation
- [x] Join game with code
- [x] Assign roles to players
- [x] Reveal cards as operative
- [x] See card types as spymaster
- [x] Turn switching on neutral/wrong team card
- [x] Win by finding all team cards
- [x] Lose by hitting assassin
- [x] Reset game functionality

### Persistence
- [x] Refresh page → same player identity
- [x] Close browser → reopen → same player
- [x] Refresh page → chat history preserved
- [x] Refresh page → resize settings preserved
- [x] New game → chat clears

### Communication
- [x] Video chat loads automatically
- [x] Grid view shows all participants
- [x] Text messages broadcast to all players
- [x] Chat scrolls to bottom automatically

### UI/UX
- [x] Drag sidebar width → smooth resize
- [x] Drag video/chat divider → smooth resize
- [x] Collapse/expand left navbar
- [x] Collapse/expand right sidebar
- [x] Player list updates in real-time
- [x] Responsive layout

---

## Known Limitations

### Video Chat
- Jitsi tile view requires manual toggle (one click)
- Spotlight mode can't be fully disabled via iframe config
- Would need Jitsi External API for programmatic control

### Persistence
- localStorage is device/browser-specific (no cross-device sync)
- Chat history not synced to server (lost if localStorage cleared)
- Resize settings are global, not per-game

### Scalability
- In-memory game state (server restart clears all games)
- No database persistence
- Games auto-delete after 24 hours
- Designed for small friend groups, not public matchmaking

---

## Next Steps (Deployment Phase)

### Phase 4: Deployment & Testing
1. **Docker Containerization**
   - Create Dockerfile
   - Create docker-compose.yml
   - Configure environment variables
   - Test container locally

2. **Server Deployment**
   - Deploy to personal server
   - Configure Cloudflare reverse proxy
   - Set up SSL via Cloudflare
   - Configure domain/subdomain

3. **Beta Testing**
   - Test with 4-8 friends
   - Monitor connection stability
   - Gather UX feedback
   - Test on different devices/browsers

4. **Performance Optimization**
   - Monitor server resource usage
   - Optimize bundle size if needed
   - Test with 10+ participants
   - Profile and fix any bottlenecks

### Future Enhancements (Optional)
- Database persistence (MongoDB/PostgreSQL)
- Custom word lists (upload your own)
- Game statistics and history
- Spectator mode
- Timer for turns
- Sound effects
- Mobile app optimization
- Alternative game modes

---

## Conclusion

Successfully built a fully functional online multiplayer Codenames game MVP with:
- ✅ Complete game mechanics
- ✅ Real-time synchronization
- ✅ Integrated video chat
- ✅ Text chat with persistence
- ✅ Player reconnection
- ✅ Resizable, collapsible UI
- ✅ Smooth performance (60fps interactions)
- ✅ Professional, polished interface

The application is ready for Docker containerization and deployment for beta testing with friends.

**Total Development Time**: Single session
**Lines of Code**: ~650 (game page), ~150 (server), ~100 (game logic)
**Build Status**: ✅ Compiles with no errors
**Ready for**: Docker deployment and beta testing
