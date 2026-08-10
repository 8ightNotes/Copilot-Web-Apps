# A Text Impostor

Phase 2 is a small, server-side social simulation built with Node.js and Express.

## Run locally

```bash
npm start
```

Open <http://localhost:3000> in a browser.

The API exposes:

- `GET /api/health`
- `GET /api/game`
- `POST /api/game/actions`
- `POST /api/game/reset`

NPCs now have personal goals, richer schedules, memories, opinions, and relationships. Conversations, help, rumors, following, and time progression change trust and reputation. Hidden roles, investigations, meetings, and voting remain outside Phase 2.

The prototype keeps one in-memory simulation on the server, so resetting the game resets the shared session. Persistence and multi-player state are intentionally deferred.
