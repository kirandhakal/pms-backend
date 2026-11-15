# Real-time text chat

Friend DMs, existing channels, project discussions, and workflow task discussions use
`conversation:join`, `message:send`, and `message:new` on Socket.IO. V1 is text only.
The deployment has one backend instance and uses Socket.IO's in-memory adapter.

## Local setup

1. Run `npm ci` in both backend and frontend (lockfiles include Socket.IO).
2. Configure the existing backend database and JWT/session environment. Set
   `CHAT_ALLOWED_ORIGINS=http://localhost:3000` (comma-separated exact browser
   origins in production). No token or message content should be logged; TypeORM
   query logging is disabled because queries contain session tokens and text.
3. With an **existing initialized database**, run from backend:
   `NODE_ENV=production npm run migration:run`.
   This uses the configured `.env` database, not a separate production database.
   Back up the database first and schedule a migration window: the migration adds
   sequences and indexes to existing message tables and backfills their order.
   Do not run schema synchronization before this migration. The repository's
   historical migrations are not a complete empty-database bootstrap; for a fresh
   disposable local database, initialize the pre-chat schema first, or use the
   existing `NODE_ENV=development` schema synchronization instead of this migration.
   Never mix synchronization and migration execution on the same new schema.
4. Start backend with `npm run dev` (default port 5000).
5. In frontend `.env.local`, set `NEXT_PUBLIC_SOCKET_URL=http://localhost:5000`
   and `API_URL=http://localhost:5000`, then run `npm run dev` (port 3000).
   The socket URL is a browser-reachable backend URL, without `/api`. REST uses
   the existing Next.js API rewrite. Public environment values require rebuilding.
6. Run `npm run test:chat` in backend. These are isolated validation, access,
   and retry tests using fake repositories; they do not prove PostgreSQL constraints
   or actual socket/browser behavior.

## Storage and access assumptions

Existing `Friendship` rows represent the two conversation members. Only accepted
friends may join, read, or send. Their canonical room key sorts both user IDs.
`DirectMessage` is reused; its retry key is `(recipientId,senderId,clientMessageId)`,
which identifies the same sender's one-to-one conversation without a new table.
Channels reuse `Channel`/`ChannelMember`; public-channel membership is implicit
through the existing team rule, while private channels require an explicit member.
All channel reads now require the user's team to match, including public channels.
Projects reuse `Project`/`ProjectMember`: managers, leads and explicit project
members can participate. Task discussions allow the creator, owner, assignee,
or a member of the associated project. Workflow-wide organization membership
alone does not grant task discussion access. All IDs must be persisted UUIDs.

Messages reuse `ChannelMessage`, `DirectMessage`, and `TaskComment`; the new
`ProjectMessage` table stores project discussions. Browser-local discussion data
is not uploaded automatically. Old project report counters still describe that
legacy local data, rather than server chat totals. Attachments, replies, typing,
read receipts, presence, edits, and realtime deletion are outside this text release.

Each new send requires a UUID `clientMessageId` and 1–4000 trimmed characters.
Unique indexes make retries durable; legacy REST sends may omit the ID and get a
server-generated UUID. Clients requiring idempotency must supply the same UUID on
all retries. Both REST send paths call the same service as socket sends. Sockets
check active sessions on connect and each action; delivery also rechecks the
recipient's active session and current conversation access. Room joins check access.
Limits: 60 send attempts per authenticated user per minute, shared across sockets
and REST within the single instance; packet maximum 20 KB. No tokens or text are
included in application chat logs.

A PostgreSQL transaction-level advisory lock serializes each conversation's sends.
Messages commit before ACK/broadcast. Duplicate retries return the original row
without rebroadcasting. Bigint sequence cursors provide ordered pagination and
catch-up without timestamp collisions. Legacy rows are backfilled by creation time
and ID. Sequence cursors are strings, not JavaScript numbers. Broadcast is best
effort; periodic catch-up (15 seconds), room rejoin on reconnect, and REST history
repair the commit-to-broadcast crash window. ACK means persisted, not read/delivered.
The current chat component retains failed/pending messages across reconnects while
mounted; it does not persist an outbox across page reloads.

## API

Socket authentication: `auth: { token: existingAccessToken }`.

- `conversation:join`: `{ kind: "friend"|"channel"|"project"|"task", id: UUID }`.
  For friends, `id` is the other user's ID. Joining replaces the socket's previous
  conversation room. Each chat component owns a separate socket.
- `message:send`: same target plus `{ body, clientMessageId: UUID }`.
- ACK: `{ ok: true, data }` or `{ ok: false, error }`.
- `message:new`: `{ id, senderId, recipientId?, body, clientMessageId,
  sequence, createdAt }`. Clients merge by server ID and reconcile their pending
  entry by sender + clientMessageId.
- `GET /api/chat/:kind/:id/messages?limit=50&before=123` fetches older history;
  `?after=123&limit=100` fetches missed messages. Response is
  `{ data: [...ascendingSequence], hasMore }`. With no cursor, returns the newest
  page. Drain forward pages until `hasMore` is false. Limit is 1–100; before and
  after are mutually exclusive. Existing bearer authentication is required.

## Two-browser acceptance checks (still required)

Use two separate browser profiles, authenticated as accepted friends A and B;
also prepare a third user C who lacks access. Use the same channel/project/task
where applicable, and repeat delivery checks for each scope.

1. Open the same conversation in A and B. Send both directions; confirm one row
   per send, immediate live delivery, correct sender, and a sent state. Create
   over 100 messages and check older pagination and multi-page catch-up.
2. As C, request history and emit join/send for that conversation. Expect 403
   from REST and error ACKs from Socket.IO. Try no token, an expired/logged-out
   token, a foreign public channel, and a private channel without membership.
   A browser origin outside CHAT_ALLOWED_ORIGINS must fail its socket handshake.
3. Lost ACK: using a temporary browser test harness with socket.io-client, join,
   send a fixed clientMessageId and deliberately ignore the first ACK, then send
   that exact ID again. Expect the same server ID and exactly one recipient event.
   Simultaneously send the same ID twice to verify the database unique constraint.
   Also retry after restarting the backend and verify the ID remains unchanged.
4. Take B offline in DevTools, send from A, reconnect B. Expect persisted missed
   messages exactly once. Send while A is offline: failed state must offer Retry;
   reconnect and Retry must preserve the client ID. Repeat after switching chats.
5. Restart the backend with both browsers open. Send while it is unavailable and
   retry after reconnect. Rooms must rejoin, history catch up, and UI events/history
   must merge without duplicate bubbles. To exercise the commit/broadcast gap,
   stop the backend after a committed insert before its broadcast and reconnect.
6. Send empty/oversized/invalid payloads and exceed the rate limit from multiple
   tabs for one account. Confirm rejected attempts create no message rows.
7. Revoke membership or log out while a room is open: subsequent sends/history
   and new deliveries must fail. Confirm logs contain neither tokens nor text.

## Deployment checks

Compose configures one backend container. The Dockerfile entrypoint now launches
`dist/index.js`; run the migration as a separate release step before new traffic.
Confirm the PostgreSQL UUID default is available (`gen_random_uuid()` on PG17).
Validate backup/rollback and query/index performance against representative data.
Set exact HTTPS frontend origins and a public HTTPS Socket.IO URL. The reverse
proxy must route `/socket.io/` to this backend, allow HTTP polling and WebSocket
Upgrade/Connection headers, and use a timeout longer than the default 25s ping +
20s timeout (e.g. 75s). Verify TLS, upgrades, polling fallback, and rolling restart
behavior against the deployed proxy. Docker build and live proxy tests remain
necessary. Existing Next.js configuration ignores TypeScript errors during build;
run `npx tsc --noEmit` separately.

Before adding replicas, install a shared Socket.IO adapter (e.g. Redis), distribute
rate limits, and ensure recipient membership checks work across nodes. Polling
requires sticky sessions at the load balancer even with a Redis adapter; a
WebSocket-only configuration avoids that requirement but removes polling fallback.
Do not scale this in-memory-adapter release beyond one backend instance.
