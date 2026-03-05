# Chess Web Application — High-Level Design

## 1. Overview

Real-time multiplayer chess platform with AI support. Two communication channels: REST API (auth, board management) and WebSocket (gameplay). Two data stores: MongoDB (persistent) and an in-memory Map (ephemeral game state for move validation).

**Frontend:** React SPA — handles rendering, drag-and-drop, client-side move validation, Stockfish AI (runs in-browser via Web Worker). Not covered in this document.

---

## 2. Backend Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           HTTP Server (Node.js)         │
                    │                                         │
                    │   ┌─────────────┐  ┌────────────────┐  │
 HTTP requests ────►│   │  Express    │  │  Socket.io     │◄──── WebSocket
                    │   │  (REST API) │  │  (Real-time)   │  │
                    │   └──────┬──────┘  └───────┬────────┘  │
                    │          │                  │           │
                    │          ▼                  ▼           │
                    │   ┌────────────┐    ┌──────────────┐   │
                    │   │ Middleware  │    │   Socket     │   │
                    │   │ ──────────│    │   Handlers   │   │
                    │   │ auth (JWT) │    │ ────────────│   │
                    │   │ validate   │    │ join         │   │
                    │   │ error      │    │ send-pieces  │   │
                    │   └──────┬─────┘    │ game-end-*   │   │
                    │          │          │ user-left     │   │
                    │          ▼          └──────┬────────┘   │
                    │   ┌────────────┐          │            │
                    │   │Controllers │          │            │
                    │   │ ──────────│          │            │
                    │   │ auth.ctrl  │          │            │
                    │   │ board.ctrl │          │            │
                    │   └──────┬─────┘          │            │
                    │          │                │            │
                    │          ▼                ▼            │
                    │   ┌─────────────────────────────────┐  │
                    │   │            Services              │  │
                    │   │ ───────────────────────────────│  │
                    │   │ auth.service    game.service     │  │
                    │   └──────┬──────────────┬───────────┘  │
                    │          │              │              │
                    │          ▼              ▼              │
                    │   ┌───────────┐  ┌──────────────┐     │
                    │   │  Models   │  │ ChessLogic   │     │
                    │   │  (User,   │  │ (validation) │     │
                    │   │ Document) │  └──────────────┘     │
                    │   └─────┬─────┘                       │
                    │         │                              │
                    └─────────┼──────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼                               ▼
      ┌──────────────┐              ┌──────────────────┐
      │   MongoDB    │              │  gameStateStore   │
      │              │              │  (in-memory Map)  │
      │  Users       │              │                  │
      │  Documents   │              │  roomId → {      │
      │              │              │    pieces,        │
      │              │              │    turn,          │
      │              │              │    enPassantTarget│
      │              │              │  }               │
      └──────────────┘              └──────────────────┘
       persistent                    ephemeral, per-room
       (accounts, boards)            (move validation only)
```

---

## 3. Server Bootstrap

`index.js` is the entry point. Startup order:

1. Create `http.Server` from the Express app
2. Attach Socket.io to the HTTP server (`initializeSocket`)
3. Connect to MongoDB (`connectDB`)
4. Start listening on `PORT` (default 5000)

Shutdown is graceful: `SIGTERM`/`SIGINT` → close HTTP server → close MongoDB connection → `process.exit(0)`. Uncaught exceptions and unhandled rejections trigger `process.exit(1)`.

**Configuration** (`config/index.js`): loads from environment variables via `dotenv`. Validates that `DB_CONNECT` and `TOKEN` exist at startup — fails fast if missing. JWT expires in 3 days.

---

## 4. REST API Layer

### 4.1 Request Flow

```
Request → CORS → JSON parser → Cookie parser → Route → Controller → Service → Model → Response
                                                  │
                                              (on error)
                                                  ▼
                                         errorConverter → errorHandler → Response
```

### 4.2 Routes

| Method | Path | Auth | Controller | Service Method |
|--------|------|------|------------|----------------|
| `GET` | `/` | No | inline | — (health check, returns `{ status: 'success' }`) |
| `POST` | `/users/register` | No | `auth.ctrl.register` | `auth.svc.register` |
| `POST` | `/users/login` | No | `auth.ctrl.login` | `auth.svc.login` |
| `GET` | `/me` | `verifyToken` | `auth.ctrl.getUser` | `auth.svc.getUserById` |
| `POST` | `/deleteboard` | `verifyToken` | `board.ctrl.deleteBoard` | `game.svc.deleteBoard` |

### 4.3 Middleware Pipeline

**`verifyToken`** — Reads `Authorization: Bearer <token>` header → `jwt.verify()` with the server secret → attaches `req.userId` → calls `next()`. Throws `ApiError(401)` if missing or invalid.

**`errorConverter`** — Catches any error. If it's not an `ApiError` instance, wraps it as one (default 500).

**`errorHandler`** — Sends JSON error response. In production, suppresses stack traces and internal messages for non-operational errors. In development, includes full error details.

**`notFoundHandler`** — Catches unmatched routes, throws `ApiError(404)`.

### 4.4 Services

**`auth.service`**

| Method | What it does |
|--------|-------------|
| `register({ name, id, email, password })` | Checks email + playerId uniqueness → `bcrypt.genSalt(10)` + `bcrypt.hash` → `User.create` → returns `user.toPublicProfile()` |
| `login({ id, password })` | `User.findByPlayerId(id)` (includes password via `.select('+playerPassword')`) → `bcrypt.compare` → `jwt.sign({ id: user._id }, secret, { expiresIn: 3d })` → returns `{ token, user }` |
| `getUserById(userId)` | `User.findById` → `toPublicProfile()` (strips password) |

**`game.service`**

| Method | What it does |
|--------|-------------|
| `findOrCreateGame(roomId, pieces)` | Calls `Document.findOrCreate` — finds by `_id: roomId`, creates with initial pieces if absent |
| `saveChessboard(roomId, data, chance, email)` | Finds doc → updates `data` and `chance` → assigns player color if slot is null → `doc.save()` |
| `savePlayerColor(roomId, email, color)` | Finds doc → sets `doc.black` or `doc.white` if null → `doc.save()` |
| `handleCheckmate(roomId, loserColor)` | Finds doc → looks up both players by email → adjusts `playerRating` ±10 → `Promise.all([save, save])` → `doc.deleteOne()` |
| `handleStalemate(roomId)` | Finds doc → `doc.deleteOne()` (no rating change) |
| `deleteBoard(roomId)` | Finds doc → `doc.deleteOne()` or throws `ApiError(404)` |
| `getRoomInfo(io, roomId)` | Reads Socket.io adapter `rooms.get(roomId)` → returns `{ size, exists }` |

---

## 5. Socket Layer

### 5.1 Initialization

`socket/index.js` creates a `Socket.io Server` attached to the HTTP server, with CORS restricted to `config.frontendUrl`. On each `'connection'` event, registers a `'join'` handler and a `'disconnect'` logger.

### 5.2 Room Lifecycle

```
'connection' event
  │
  ▼
socket.on('join') → handleJoin(io, socket)
  │
  ├── socket.join(roomId)
  ├── game.svc.findOrCreateGame(roomId, pieces)
  ├── gameStateStore.setState(roomId, doc.data, doc.chance, null)
  ├── emit 'load-chessboard' to this socket
  │
  ├── Room size check:
  │     size == 1 && white == null → emit 'player-color': 'white'
  │     size == 2 && black == null → emit 'player-color': 'black'
  │     size <= 2                  → emit 'opponent-reconnected' to room
  │     size > 2                   → emit 'room-full' to this socket
  │
  └── Register room handlers (once per socket, guarded by _roomHandlersRegistered flag)
```

### 5.3 Room Event Handlers

Registered once per socket inside `registerRoomHandlers`. All scoped to the `roomId` captured in the closure.

**Move handling (`send-pieces`):**
```
receive (pieces, nextTurn, enPassantTarget, uciMove, timerData)
  │
  ├── Get server-side state: gameStateStore.getState(roomId)
  ├── Parse UCI: gameStateStore.parseUciMove(uciMove)
  │     "e2e4" → { fromX: 6, fromY: 4, toX: 4, toY: 4 }
  │
  ├── Validate: ChessLogic.isValidMove(from, to, state.pieces, state.turn, state.enPassant)
  │     ├── INVALID → emit 'error': 'Invalid move' to sender, return
  │     └── VALID   ↓
  │
  ├── gameStateStore.setState(roomId, pieces, nextTurn, enPassantTarget)
  └── broadcast 'recieve-pieces' to room (excludes sender)
```

**Persistence (`save-chessboard`):**
```
receive (newData, newChance, playerEmail)
  └── game.svc.saveChessboard(roomId, newData, newChance, playerEmail)
```

**Game end events:**

| Event | Handler |
|-------|---------|
| `game-end-checkmate(loserColor)` | `game.svc.handleCheckmate` (updates ELO, deletes doc) → `gameStateStore.removeState` → broadcast `receive-update-checkmate` |
| `game-end-stalemate` | `game.svc.handleStalemate` (deletes doc) → `gameStateStore.removeState` → broadcast `receive-update-stalemate` |
| `game-end-draw(reason)` | `gameStateStore.removeState` → broadcast `receive-update-draw` |
| `game-end-timeout(loserColor)` | `gameStateStore.removeState` → broadcast `receive-update-timeout` |

**Other events:**

| Event | Handler |
|-------|---------|
| `save-my-color(email, color)` | `game.svc.savePlayerColor` |
| `set-time-control(tc)` | Relay to room as `sync-time-control` |
| `user-left` | `gameStateStore.removeState` → broadcast `opponent-left` |
| `send-opponent-info(user)` | Relay to room as `recieve-opponent-info` |

### 5.4 All Socket Events (Reference)

| Direction | Event | Payload |
|-----------|-------|---------|
| C→S | `join` | `(roomId, pieces)` |
| C→S | `send-pieces` | `(pieces, nextTurn, enPassant, uciMove, timerData)` |
| C→S | `save-chessboard` | `(pieces, turn, email)` |
| C→S | `save-my-color` | `(email, color)` |
| C→S | `send-opponent-info` | `(user)` |
| C→S | `set-time-control` | `(timeControl)` |
| C→S | `game-end-checkmate` | `(losingColor)` |
| C→S | `game-end-stalemate` | — |
| C→S | `game-end-draw` | `(reason)` |
| C→S | `game-end-timeout` | `(losingColor)` |
| C→S | `user-left` | — |
| S→C | `load-chessboard` | `(pieces, turn, blackEmail, whiteEmail)` |
| S→C | `player-color` | `(color)` |
| S→C | `recieve-pieces` | `(pieces, turn, enPassant, uciMove, timerData)` |
| S→C | `receive-update-checkmate` | `(losingColor)` |
| S→C | `receive-update-stalemate` | — |
| S→C | `receive-update-draw` | `(reason)` |
| S→C | `receive-update-timeout` | `(losingColor)` |
| S→C | `sync-time-control` | `(timeControl)` |
| S→C | `opponent-left` | — |
| S→C | `opponent-reconnected` | — |
| S→C | `room-full` | — |
| S→C | `error` | `(message)` |

---

## 6. Data Stores

### 6.1 MongoDB — Persistent Storage

**Users Collection**

```
{
  playerName:     String    required, trimmed, max 50
  playerId:       String    required, unique, trimmed, lowercase, indexed
  playerEmailId:  String    required, unique, lowercase, validated (isEmail), indexed
  playerPassword: String    required, min 6, select: false (excluded from queries by default)
  playerRating:   Number    default 1200, min 0
  createdAt:      Date      (auto, via timestamps: true)
  updatedAt:      Date      (auto, via timestamps: true)
}

Instance methods:
  toPublicProfile()  → returns { _id, playerName, playerId, playerEmailId, playerRating }

Static methods:
  findByPlayerId(id) → findOne({ playerId }).select('+playerPassword')
```

**Documents Collection (Game Boards)**

```
{
  _id:       String    the roomId (user-provided, not ObjectId)
  data:      Object    array of Piece objects (current board state)
  chance:    String    enum ['white', 'black'], default 'white'
  black:     String    black player's email (null until assigned)
  white:     String    white player's email (null until assigned)
  createdAt: Date      (auto)
  updatedAt: Date      (auto)
}

Static methods:
  findOrCreate(id, initialPieces) → finds by _id, creates if missing

Piece object (within data array):
  { x: Number, y: Number, type: String, color: String, image: String, hasMoved: Boolean }
```

**Lifecycle:** A Document is created on first `join` for a room. Updated on every move (`save-chessboard`). Deleted on checkmate, stalemate, draw, or `user-left`.

### 6.2 gameStateStore — Ephemeral In-Memory State

```
Map<roomId, { pieces: [Piece], turn: String, enPassantTarget: Object|null }>
```

| Method | Behavior |
|--------|----------|
| `setState(roomId, pieces, turn, ep)` | Deep-copies pieces into the Map |
| `getState(roomId)` | Returns state or `null` |
| `removeState(roomId)` | Deletes from Map |
| `parseUciMove(uci)` | `"e2e4"` → `{ fromX: 6, fromY: 4, toX: 4, toY: 4, promotion: null }` |

**Lifecycle:** Set on `join` (from DB data). Updated on every valid `send-pieces`. Removed on any game-end event or `user-left`. Exists only in server memory — lost on restart.

**Purpose:** Avoids a MongoDB query on every move. The server needs the current board to validate moves via `ChessLogic.isValidMove`. The Map provides O(1) access.

---

## 7. Server-Side Move Validation

`ChessLogic` is a stateless class with these methods:

| Method | Purpose |
|--------|---------|
| `getPieceAt(x, y, pieces)` | Find piece at coordinates |
| `isPathClear(from, to, pieces)` | Check for obstructions along rank/file/diagonal |
| `isGeometryValid(piece, toX, toY, pieces, ep)` | Validates move shape per piece type (incl. en passant, pawn direction) |
| `isCastlingValid(king, toY, pieces)` | Checks king/rook haven't moved, path clear, not through check |
| `isSquareAttacked(x, y, byColor, pieces)` | Can any piece of `byColor` attack this square? |
| `isKingInCheck(color, pieces)` | Is `color`'s king under attack? |
| `isKingInCheckAfterMove(piece, toX, toY, pieces, ep)` | Simulates the move, checks if own king would be in check |
| `isValidMove(fromX, fromY, toX, toY, pieces, turn, ep)` | Full validation: piece exists, correct turn, geometry valid, doesn't leave king in check |

Validation runs synchronously in the `send-pieces` handler. No async, no DB calls — pure computation against the in-memory state.

---

## 8. Error Handling Strategy

**REST:** All errors flow through `errorConverter` → `errorHandler`. `ApiError` carries `statusCode`, `message`, and `isOperational` (operational = expected errors like 401, 404). In production, non-operational error details are hidden.

**Socket:** Errors in handlers are caught individually with try/catch. The `'error'` event is emitted to the sender socket only (not broadcast). Client uses this to roll back optimistic moves.

**Process-level:** `uncaughtException` and `unhandledRejection` → log and `process.exit(1)`.

---

## 9. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Dual data store** | MongoDB for durability (accounts, board snapshots). In-memory Map for speed (move validation per turn). |
| **Client sends full board with each move** | Simplifies server — no need to replay moves or compute new board. Server validates the UCI move against its own state, then accepts the client's board. |
| **Game doc uses roomId as `_id`** | Avoids extra index. Lookups by room are the primary access pattern. `findOrCreate` is a single query. |
| **Socket handler guard flag** | `_roomHandlersRegistered` on the socket object prevents duplicate listeners if `handleJoin` fires multiple times on the same socket (reconnection edge case). |
| **Password excluded by default** | `select: false` on `playerPassword` in the schema. Only `findByPlayerId` explicitly includes it via `.select('+playerPassword')`. Prevents accidental leaks. |
| **Game doc deleted on completion** | No game history retained. Checkmate/stalemate/draw → `doc.deleteOne()`. Keeps the Documents collection small. |
| **ELO ±10 flat change** | Simple rating update. Both players' ratings are loaded, adjusted, and saved in parallel (`Promise.all`). Only happens on checkmate (not stalemate/draw). |

---

## 10. Running Locally

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# MongoDB:  localhost:27017
```

**Required env vars (server):** `DB_CONNECT` (MongoDB URI), `TOKEN` (JWT secret), `FRONTEND` (allowed CORS origin), `PORT` (default 5000).
