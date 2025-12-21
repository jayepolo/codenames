# Codenames - Feature Backlog

This document tracks planned features and enhancements for the Codenames multiplayer game.

---

## Planned Features

### 1. Spectator Mode

**Status:** Planned
**Priority:** High
**Estimated Effort:** Medium

#### Description
Allow players to join games as spectators without being assigned to a team. Spectators can watch the game unfold and participate in video/text chat without affecting gameplay.

#### Features
- **Two Viewing Modes:**
  - Operative View (default): See only revealed cards, no spoilers
  - Spymaster View (toggle): See all card colors with colored borders

- **Spectator Permissions:**
  - ✅ Watch the game board
  - ✅ See chat messages and participate in text chat
  - ✅ Participate in video chat
  - ✅ Toggle between operative/spymaster view
  - ✅ See current clue, score, and turn state
  - ❌ Cannot reveal cards
  - ❌ Cannot give clues
  - ❌ Cannot end turn
  - ❌ Cannot vote for spymasters
  - ❌ Cannot ready up in lobby

- **UI Changes:**
  - Add "Spectator" role option in role selection
  - Add spectator section in player list (gray background)
  - Add view toggle button for spectators: [👁️ Operative View] / [🔍 Spymaster View]
  - Show spectator count in player list

#### Technical Implementation
- Update `Role` type: `"spymaster" | "operative" | "spectator"`
- Add `spectatorView?: "operative" | "spymaster"` to Player interface
- Spectators have `team: null`, `role: "spectator"`
- Add socket events: `toggle-spectator-view`
- Update card rendering logic to check spectator view mode
- Update permission checks to block spectator actions

#### Optional Enhancements
- Spectator limit (e.g., max 10 spectators per game)
- Gray color for spectator chat messages
- "Join Red Team" / "Join Blue Team" quick-switch buttons for spectators
- Persist spectatorView preference in localStorage

---

## Future Enhancements (Lower Priority)

### Database Persistence
Replace in-memory storage with MongoDB/PostgreSQL for persistent game state across server restarts.

### Custom Word Lists
Allow users to upload or select custom word lists for themed games.

### Game Statistics and History
Track player statistics, win rates, and game history.

### Timer for Turns
Optional countdown timer for turn duration to keep games moving.

### Sound Effects
Add sound effects for card reveals, turn changes, and game events.

### Mobile App Optimization
Optimize UI/UX specifically for mobile devices and touch interactions.

### Alternative Game Modes
- Different grid sizes (4x4, 6x6)
- Teams with more than 2 colors
- Duet mode (cooperative 2-player)

---

## Completed Features

See [DEVELOPMENT_SUMMARY.md](./DEVELOPMENT_SUMMARY.md) for all implemented features.

---

**Last Updated:** 2025-12-21
