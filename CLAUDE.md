# hompag

hompag is a **local-first, self-hosted browser home page**. You run a small web
server on your own machine, point your browsers' "new tab" / home page at it, and
get a live, editable dashboard of links, notes, and small widgets. The North Star:
a home page you build once and see everywhere, where **color and position help you
remember what things are for** — fast access to the things you do on the web
without the weight of heavier tools.

Key idea: the store folder lives in cloud-synced storage (Dropbox, OneDrive, etc.),
so the page persists across machines. The server **pushes changes over WebSocket**,
so an edit on one browser shows up instantly on every other open page.

This codebase is hand-written by a single author. Favor clarity and small,
surgical changes that match the existing style over large rewrites.

## Repository layout (monorepo, three packages)

| Package | Path | Stack | Role |
|---|---|---|---|
| `hompag-common` | `common/` | TypeScript lib | Shared client/server contract: WebSocket message types, data interfaces, helpers |
| `hompag` (client) | `clientapp/` | React 17 + MobX 6 + TypeScript (CRA) | The editable page UI |
| `hompag-server` | `webserver/` | Express + express-ws + TypeScript (ESM) | Local server, persistence, integrations |

`common` is consumed by both via a `file:../common` dependency, so it **must be
built before** the client or server. `build-all.js` builds them in the required
order: `common` → `clientapp` → `webserver`.

## Build, run, test

All commands assume you are at the repo root unless noted.

**First-time setup**
1. `cp webserver/src/config.ts.template webserver/src/config.ts` and edit it
   (see [webserver/src/config.ts.template](webserver/src/config.ts.template)).
   `config.ts` is required to build the server and holds secrets (Spotify, stock
   API key, store path) — it is gitignored, never commit it.
2. `node build-all.js` — installs and builds all three packages in order.

**Run (production-style)**
- `node webserver/dist/index.js storepath=[path to your hompag store]`
- Server listens on port **8101** (override with `PORT`). Open
  `http://localhost:8101/anypagename` — pages are created on demand by URL.

**Active client development** (hot reload)
- `cd webserver && npm run startdev` (server on 8101, runs TS directly via ts-node/ESM)
- `cd clientapp && npm start` (CRA dev server on 3200, proxies API to 8101)
- Use `http://localhost:3200/dev`. Build the client with `npm run build` when done.

**Tests**
- Server: `cd webserver && npm test` (Mocha + Chai, files in `webserver/src/tests/`).
- Client: `cd clientapp && npm test` (react-scripts/Jest).
- Per global practice: run the relevant tests after each build and before every
  commit. The server has the meaningful unit tests (PageCache, PageAccessLocalDisk,
  StockModel, Throttler); the client is largely untested (see Improvements).

**Commits**: use `/prep-commit`. Stage explicit paths, never `git add .`.

## Architecture

### The client–server contract (`common/`)
All cross-boundary communication flows through types in `common/src`:
- `ServerMessageType` (`ServerMessageType.ts`): `item_change`, `transient_change`,
  `transient_request`, `refresh`. Every WebSocket message is `{type, data}`.
- `StatePacket` (`StatePacket.ts`): the universal payload envelope `{id, name, instance?, data}`.
- Domain interfaces: `SpotifyPlayerState`, `StockData`/`StockDetail`, etc.
- When you change a message shape or payload, change it **here** and update both
  sides — this is the single source of truth.

### Persistent vs. transient state — the central distinction
- **Persistent data** is serialized to disk and survives restarts (page layout,
  widget content). It is versioned and synced.
- **Transient state** is live, in-memory runtime data that is *not* persisted and
  resets on server restart (Spotify playback position, ping status, stock pushes).
  Carried by `transient_change`/`transient_request` messages.
- Naming convention enforces this throughout the client: properties prefixed
  `ref_`/`_ref_` (references) and `state_`/`_state_` (transient) are **excluded
  from serialization**. Respect these prefixes when adding model fields.

### Server (`webserver/src`)
Layered: `index.ts` (Express + express-ws bootstrap, arg parsing, static hosting
of the built client, graceful shutdown) → `apis/*` (REST + WebSocket handlers) →
`ServerModel` (orchestrator, listener registry, `sendAlert` broadcast, transient
state, action execution) → `PageCache` (write-through memory cache, background
flush ~every 20s) → `PageAccessLocalDisk` (file I/O under the store path).

- **Storage on disk**: `storePath/{page|widget|cache|config}/{id}/{version}.json`.
  Version = `Date.now()` timestamp, giving natural ordering and history.
- **Cloud-sync awareness**: the store may be edited externally (another machine
  syncing via Dropbox). The server uses `fs.watch` plus a **30-second poll** of
  file mtimes to detect external changes, and distinguishes server-initiated
  writes from external ones to avoid echo loops, then broadcasts `item_change`.
- **REST**: `GET/POST /api/pages/:id`, `GET/POST /api/widgets/:id`, `/api/query`,
  `/api/actions/*`, `/api/spotify/:command`, `/api/ping`, `/api/stock/:symbol`,
  `/api/refresh`, `/api/loginresponder/:app` (OAuth callback).
- **WebSocket**: clients connect to `/subscribe`; `ServerModel.sendAlert` fans out
  to all `WebSocketListener`s.
- **Integrations** (one model each): `SpotifyModel` (OAuth2, polls player state),
  `StockModel` (RapidAPI Twelve Data, rate-limited via `Throttler`, market-hours
  aware, caches to disk), `PingModel` (HTTP/ICMP with backoff and auto-expiry).
  User-defined shell commands ("run apps locally") live in `config/Action.json`
  and run via `exec` from `apis/actions.ts`.
- **Conventions**: API handlers are factories `(logger) => (req,res) => ...`;
  wrap responses in `safeSend` (`helpers/SafeSend.ts`) which knows `UserError` /
  `AuthorizationError`; models are `*Model`; logging via `ILogger` +
  `LoggerPrefixer` (`helpers/logger.ts`).

### Client (`clientapp/src`)
React 17 + MobX 6, class components with `@observer`, dependency-injected
`AppModel` via mobx-react `Provider`/`@inject`.

- **Model tree** (`models/`): `AppModel` (root — server connection, load/save,
  serializer, type registry, transient handlers) → `PageModel` (grid dims, color
  theme, widget containers, auto-save via `reaction`) → `WidgetContainer`
  (position/size/colors) → `WidgetModel` + `WidgetModelData` (type + persisted data).
- **Server comms**: `helpers/RestHelper.ts` (HTTP + cache via `LocalStorage`) and
  `helpers/DataChangeListener.ts` (`WebSocketListener`). Saves are debounced with
  `ThrottledAction` (500ms) to limit traffic.
- **Serialization**: `helpers/BruteForceSerializer.ts` is a custom JSON serializer
  handling circular refs and polymorphic type reconstruction, driven by an
  `ITypeHelper` (`models/hompagTypeHelper.ts`) that maps `__t` type names to
  constructors. This registry also enables data migrations (rename old type → new).
- **Layout**: `Components/PageControl.tsx` renders `react-grid-layout`
  (no auto-compact, collision prevented, drag handle `.widgetFrameDragHandleTag`).
  The whole page is CSS-`transform: scale()`-d to fit the window width.
- **Color theme**: `helpers/ColorTool.ts` — 5 color roles × 9 brightness levels,
  with named preset themes. Color is a first-class memory aid, not decoration.

### Widget system (the main extension point)
Widgets are registered in [clientapp/src/widgetLibrary.ts](clientapp/src/widgetLibrary.ts)
(`WidgetType` enum + `registerWidget`). Each widget extends
`Widgets/WidgetBase.tsx` and implements `renderContent()` and `renderConfigUI()`.

To add a widget (see README "Creating a new widget type"):
1. Copy `Widgets/Widget_TEMPLATE.tsx` → `Widgets/Widget[NewType].tsx`.
2. String-replace `_TEMPLATE_` with `[NewType]`.
3. In `widgetLibrary.ts`: add the enum value and register it.

Each widget gets two state classes: `Widget[NewType]Data` (persisted, extends
`WidgetModelData`, use the get/set + `updateMe` pattern) and an optional
`[NewType]TransientData` (live, not persisted). Existing widgets to model after:
RichText (TipTap editor), Search, Spotify, Pinger, StockTicker, ServerAction,
Picker (the "what am I?" type chooser placeholder for new widgets).

## Conventions to follow
- **One class per file**, OO structure, PascalCase filenames matching the class.
- Keep the **`ref_`/`state_` prefix discipline** — it is load-bearing for serialization.
- Put any client/server shared type in `common/`, never duplicate it.
- MobX: wrap mutations in `action`, use `reaction` for side effects like auto-save,
  use React component state only for purely-local UI state.
- Match the existing logging and `safeSend` error patterns on the server.

---

## Improvement opportunities (author summary)

A candid review of general, codebase-wide improvements. None are urgent; they are
ordered roughly by leverage.

1. **Pin the toolchain and modernize dependencies.** React 17, MobX 6, CRA 5
   (`react-scripts`), draft-js *and* TipTap both present, Okta packages, `strapi`,
   `jira-client`, enzyme + RTL side by side. Several of these look unused or
   superseded. Auditing and removing dead deps (e.g. draft-js if TipTap won, Okta
   if no longer used) would shrink install size and CVE surface. The three packages
   also pin **different TypeScript majors** (common on TS3.9, others on TS4) — align them.

2. **Client test coverage is essentially zero.** The serializer
   (`BruteForceSerializer`), the color math (`ColorTool`), and the model save/load
   logic are exactly the kind of pure logic that is cheap to unit-test and easy to
   break silently. The server's test pattern (Mocha) is a good model to extend, or
   lean on the Jest setup that already ships with CRA.

3. **Replace `build-all.js` with a real build orchestrator.** Its own comment asks
   for this. A workspaces setup (npm/pnpm/yarn workspaces or Turborepo/Nx) would
   give you ordered builds, shared `node_modules`, `common` watch-on-change during
   dev (today editing `common` requires a manual rebuild), and parallelism.

4. **Shell action execution is an injection risk.** `apis/actions.ts` runs
   user-config shell strings via `exec`. Since it's local-only and self-authored
   that's acceptable, but document the trust boundary clearly and consider
   `execFile` with an args array to avoid accidental shell-expansion surprises.

5. **No auth on the local server.** Fine for `localhost`, but anything bound to a
   non-loopback interface exposes file read/write and arbitrary command execution
   on the LAN. Worth an explicit bind-to-127.0.0.1 default and a note in config.

6. **Timestamp-as-version can collide and never garbage-collects.** `Date.now()`
   versions are written as separate `{version}.json` files per save; rapid saves
   within the same millisecond can collide, and old versions appear to accumulate
   forever on disk. Consider a monotonic counter and a retention/cleanup policy.

7. **`any` at the boundaries.** `StatePacket.data` and several serializer paths are
   `any`. Tightening these (discriminated unions on `ServerMessageType`, generics on
   `StatePacket<T>`) would catch contract drift between client and server at compile
   time — the highest-value place for type safety in this app.

8. **Magic numbers and timing constants are scattered** (500ms throttles, 20s flush,
   30s poll, 200ms Spotify poll, stock rate limits). Centralizing these as named
   constants (some in `common`) would make the system's behavior easier to reason
   about and tune.

9. **Inconsistent folder casing on the client** (`Components/`, `Widgets/` vs
   `models/`, `helpers/`, `views/`). Harmless, but normalizing avoids cross-platform
   import friction (Windows is case-insensitive, Linux is not).

10. **README/version drift.** `GLOBALS.ts` says `0.4.0` while package.json files say
    `0.5.0`; README still has "TBD" for Mac/Linux autostart and mentions Node v12.
    A single source of truth for version (already generated via `genversion`) and a
    docs pass would help future contributors.
