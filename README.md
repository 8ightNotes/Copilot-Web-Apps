# A Text Impostor

Phase 5 is a small, server-side hidden-role social simulation built with Node.js and Express.

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

NPCs have personal goals, richer schedules, memories, opinions, and relationships. Conversations, help, rumors, following, and time progression change trust and reputation. Each reset privately assigns the player and NPCs extensible roles such as Innocent, Impostor, Detective, Guardian, or Jester. The player can see their own role objective and ability, while NPC roles and objectives remain server-side.

Role abilities provide the first role-specific behaviors without adding the investigation, meeting, voting, or elimination systems reserved for later phases. Completing the private objective ends the current role challenge. Otherwise, the 24-hour challenge evaluates the role’s deadline condition; reset starts a new assignment.

The prototype keeps one in-memory simulation on the server, so resetting the game resets the shared session. Persistence and multi-player state are intentionally deferred.
