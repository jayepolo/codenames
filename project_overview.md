Distributed Codenames - Online Multiplayer Game
Project Objectives

Create an online Codenames game for friends separated by distance
Provide seamless multiplayer experience
Implement simple, invitation-based access
Support real-time gameplay and communication

Site Features

Private game rooms
Simple invitation-based authentication
Real-time game state synchronization
Integrated video chat
Persistent game session management
Easy reconnection after connection loss

Game Features
Core Gameplay

Standard Codenames rules
Real-time word grid
Team-based play (Red vs. Blue)
Spymaster and Operative roles
Clue giving and word selection mechanics
Automatic score tracking
Game state preservation

Communication

Integrated video chat
In-game text chat
Role-based communication controls

High-Level Architecture
Frontend

Framework: Next.js with TypeScript
State Management: React Context
Real-time Communication: Socket.IO
Video Chat: WebRTC

Backend

Runtime: Node.js
Framework: Next.js API Routes
In-Memory Game State Management
WebSocket Support via Socket.IO

Authentication

Invitation-based access
Game code generation
Simple player name entry
24-hour invite expiration
Unique game session tracking

Technical Choices
Rationale

Next.js: Unified frontend/backend
Socket.IO: Real-time synchronization
WebRTC: Peer-to-peer video chat
In-Memory Storage: Simplicity and performance
TypeScript: Type safety

Key Technologies

React 19
Next.js 16
Socket.IO
Simple-Peer (WebRTC)
TypeScript
Docker

Development Roadmap
Phase 1: Core Game Mechanics

Design game state management
Implement word grid generation
Create basic game logic
Develop invitation system

Phase 2: Real-Time Synchronization

Implement Socket.IO game state sync
Develop reconnection mechanisms
Create player role assignment

Phase 3: Communication Features

Integrate WebRTC video chat
Add in-game text communication
Implement role-based communication controls

Phase 4: Deployment & Testing

Docker containerization
Local network testing
Friend group beta testing
Performance optimization

Phase 5: Refinement

User experience improvements
Bug fixes
Optional feature considerations

Deployment

Self-hosted on personal server
Cloudflare reverse proxy
Docker containerization
SSL via Cloudflare

Non-Goals

Public game rooms
Matchmaking
Competitive ranking system
Extensive user profiles

Future Considerations

Customizable word lists
Themed game modes
Spectator mode
Enhanced game statistics
ArtifactsDownload allProject overviewDocument · MD 
