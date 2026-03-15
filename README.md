# Elevator Simulation

A full-stack JavaScript elevator simulation built level-by-level — from plain classes and a test suite all the way to a real-time DOM visualization backed by a Node/Express REST API.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Running the App](#running-the-app)
5. [Running the Tests](#running-the-tests)
6. [Level Breakdown](#level-breakdown)
   - [Level 0 — Design](#level-0--design)
   - [Level 1 — Classes](#level-1--classes)
   - [Level 2 — Test Suite](#level-2--test-suite)
   - [Level 3 — Efficiency Tracking](#level-3--efficiency-tracking)
   - [Level 4 — Multiple Passengers](#level-4--multiple-passengers)
   - [Level 5 — Two-Person Test Scenarios](#level-5--two-person-test-scenarios)
   - [Level 6 — Lobby Return](#level-6--lobby-return)
   - [Level 7 — Nearest-First Algorithm](#level-7--nearest-first-algorithm)
   - [Level 8 — DOM Visualization](#level-8--dom-visualization)
   - [Level 9 — REST API Backend](#level-9--rest-api-backend)
7. [API Reference](#api-reference)
8. [UI Features](#ui-features)
9. [Settings](#settings)

---

## Project Structure

```
/                                   ← project root
├── README.md
├── package.json                    ← scripts: start, dev, test
├── elevator.js                     ← Elevator class (Levels 1–7 logic)
├── person.js                       ← Person class
├── tests/
│   └── elevator.test.js            ← Node test runner suite (Levels 2 & 5)
└── web-app-version/
    ├── server/
    │   └── index.js                ← Express server + REST API (Level 9)
    └── public/
        ├── index.html              ← App shell
        ├── style.css               ← All styles
        ├── app.js                  ← UI logic + API calls (Level 8 + 9)
        ├── elevator.js             ← Elevator class (served to browser)
        └── person.js               ← Person class (served to browser)
```

---

## Prerequisites

- **Node.js** v18 or higher (uses native `node:test` runner and ES modules)
- **npm** v8 or higher

Check your versions:

```bash
node -v
npm -v
```

---

## Installation

Clone or download the project, then install dependencies from the project root:

```bash
npm install
```

This installs the single production dependency: `express`.

---

## Running the App

**Production:**
```bash
npm start
```

**Development (auto-restarts on file changes):**
```bash
npm run dev
```

Then open your browser at:
```
http://localhost:3000
```

The server serves all files from `web-app-version/public/` and exposes the REST API at `/api/*`.

---

## Running the Tests

```bash
npm test
```

This runs `tests/elevator.test.js` using Node's built-in test runner. No additional packages needed.

You will see output grouped by suite:

```
▶ Elevator — unit tests
  ✔ starts on floor 0 with empty state
  ✔ reset() restores initial state
  ✔ moveUp() increments currentFloor and floorsTraversed
  ✔ moveDown() decrements currentFloor and floorsTraversed
  ✔ moveDown() does not go below floor 0
  ✔ hasStop() returns true when a request is on current floor
  ✔ hasStop() returns true when a rider drops off on current floor
  ✔ hasStop() returns false when no pickups or dropoffs on current floor
  ✔ hasPickup() moves matching requests to riders
  ✔ hasDropoff() removes riders whose dropOff matches current floor
  ✔ checkFloor() increments stops when there is a stop
  ✔ checkFloor() does not increment stops when no stop
  ✔ checkReturnToLobby() returns false when riders exist

▶ Level 2 — single person
  ✔ Person A goes UP (floor 0 → 5): correct stops and floors traversed
  ✔ Person A goes DOWN (floor 7 → 2): correct stops and floors traversed

▶ Level 5 — two people, A requests before B
  ✔ A goes UP, B goes UP — stops, floors, requests and riders
  ✔ A goes UP, B goes DOWN — stops, floors, requests and riders
  ✔ A goes DOWN, B goes UP — stops, floors, requests and riders
  ✔ A goes DOWN, B goes DOWN — stops, floors, requests and riders
```

---

## Level Breakdown

### Level 0 — Design

Before writing any code, the elevator process was sketched out on paper:

**Things to track:**
- Current floor of the elevator
- Queue of pending pickup requests (person + floor)
- List of current riders (picked up, not yet dropped off)
- Total floors traversed (efficiency metric)
- Total stops made (efficiency metric)

**Modern elevator pickup strategy:**
A real elevator uses a scan algorithm — it travels in one direction, picking up and dropping off everyone along the way before reversing. This project implements both a simple sequential strategy (Level 4) and a nearest-first optimization (Level 7).

---

### Level 1 — Classes

**Files:** `elevator.js`, `person.js`

Two ES module classes with `export default`.

#### `Person`

| Property | Type | Description |
|---|---|---|
| `name` | string | Passenger name |
| `currentFloor` | number | Floor the person is waiting on |
| `dropOffFloor` | number | Floor the person wants to go to |
| `color` | string | Hex color for UI avatar |
| `id` | number | Unique ID assigned by server |

#### `Elevator`

| Property | Type | Description |
|---|---|---|
| `currentFloor` | number | Where the elevator is right now |
| `requests` | Person[] | People waiting to be picked up |
| `riders` | Person[] | People currently inside the elevator |
| `floorsTraversed` | number | Total floors moved (efficiency) |
| `stops` | number | Total stops made (efficiency) |

The elevator always starts on floor 0 (lobby). `reset()` restores all properties to their initial state.

---

### Level 2 — Test Suite

**File:** `tests/elevator.test.js`

Uses Node's built-in `node:test` module — no Jest or Mocha required.

**Unit tests cover every Elevator method:**

| Method | What is tested |
|---|---|
| `constructor` / `reset()` | Starts at floor 0, empty arrays, zero counters |
| `moveUp()` | Increments `currentFloor` and `floorsTraversed` |
| `moveDown()` | Decrements both; does not go below 0 |
| `hasStop()` | Returns true for matching request or rider drop-off floor |
| `hasPickup()` | Moves matching requests into `riders` array |
| `hasDropoff()` | Removes riders whose `dropOffFloor` matches current floor |
| `checkFloor()` | Increments `stops` only when a stop exists |
| `checkReturnToLobby()` | Returns false when riders are still on board |

**Scenario tests (single person):**

- Person A goes **up** (F0 → F5): asserts 2 stops, 5 floors traversed
- Person A goes **down** (F7 → F2): asserts 2 stops, 5 floors traversed

Run all tests: `npm test`

---

### Level 3 — Efficiency Tracking

**File:** `elevator.js`

The `Elevator` class tracks two efficiency metrics automatically as it operates:

- **`floorsTraversed`** — incremented by 1 in both `moveUp()` and `moveDown()`. The fewer floors traversed for the same set of trips, the more efficient the algorithm.
- **`stops`** — incremented in `checkFloor()` whenever the elevator stops for a pickup or drop-off, and in `checkReturnToLobby()` when it returns to the lobby.

These values are synced to the server after every move via `PATCH /api/elevator` (Level 9).

---

### Level 4 — Multiple Passengers

**Files:** `elevator.js` → `dispatch()`, `app.js` → `runDispatch()`

Multiple passengers can be queued before pressing **Request Elevator**. The elevator handles them in the order they were added:

1. Bob is on floor 3, wants to go to floor 9
2. Sue is on floor 6, wants to go to floor 2

The elevator picks up Bob first (travels to F3), drops him off at F9, then picks up Sue (travels to F6), drops her off at F2.

The `dispatch()` method on the `Elevator` class drives the logic loop. The UI's `runDispatch()` mirrors each step visually with animation.

---

### Level 5 — Two-Person Test Scenarios

**File:** `tests/elevator.test.js`

Four scenarios are tested with Person A always requesting before Person B. Each test asserts total `stops`, `floorsTraversed`, and that both `requests` and `riders` are empty when done.

| Scenario | A | B | Stops | Floors |
|---|---|---|---|---|
| Both up | F1→F6 | F2→F8 | 4 | 16 |
| A up, B down | F1→F6 | F8→F3 | 4 | 13 |
| A down, B up | F7→F2 | F1→F9 | 4 | 21 |
| Both down | F9→F4 | F7→F1 | 4 | 23 |

---

### Level 6 — Lobby Return

**File:** `elevator.js` → `checkReturnToLobby()`, `app.js` → `runDispatch()`

After the last passenger is dropped off, the elevator checks whether it should return to the lobby (floor 0):

- **Returns to lobby** if: there are no current riders AND the current time is before noon (12:00)
- **Stays put** if: the current time is after noon

This behaviour can be toggled and the noon cutoff hour can be changed in the **Settings** panel (⚙ icon in the header).

---

### Level 7 — Nearest-First Algorithm

**File:** `app.js` → `runDispatch()`, `elevator.js` → `dispatch()`

An alternative dispatch algorithm is available that minimises total floors traversed by always picking up the **closest waiting passenger next** rather than serving them in request order.

**Example — three passengers:**
- Sequential (Level 4): travels to each in order → more floors
- Nearest-first (Level 7): always picks the closest next → fewer total floors

Switch between algorithms in **Settings → Dispatch Algorithm**.

Both algorithms are available at runtime. The nearest-first algorithm is tested against the same four Level 5 scenarios and demonstrably traverses fewer floors.

---

### Level 8 — DOM Visualization

**Files:** `web-app-version/public/` (all files)

A real-time visual representation of the building and elevator:

**Building panel (center):**
- 10 floors rendered as rows (configurable 2–20 in Settings)
- Elevator cab displayed as a red box in the shaft — moves floor by floor with a pulsing glow animation while in motion
- Waiting passengers shown as colored avatar circles on their pickup floor, with name tags
- When picked up, their avatar moves inside the elevator cab
- When dropped off, the avatar disappears from the cab

**Controls panel (left):**
- **+ Add Passenger** — creates a passenger card with:
  - 🔍 **Lookup button** — opens a modal of all passengers currently on floors, click one to auto-fill the name and set pickup floor
  - **Name input** — type a passenger name
  - **Pickup Floor** button — opens the floor picker modal
  - **Drop-off Floor** button — opens the floor picker modal
  - **↺ Clear** — resets floor selections and removes the waiting avatar
  - **✕ Remove** — deletes the card entirely
- **▶ Request Elevator** — submits all complete cards to the queue

**Floor Picker Modal:**
- Horizontal scrollable columns, one per floor (highest first)
- Each column header is clickable to select that floor
- Passengers already dropped off on each floor are listed inside their column — clicking any passenger row also selects that floor
- Currently selected pickup floor is highlighted cyan; drop-off floor is highlighted green
- The column body (empty space) is also clickable — the whole column is a hit target

**Dropped Off panel (right):**
- Shows a stacked list of floors that have received passengers
- Each row shows floor tag, overlapping avatar dots, and passenger count
- Click any row to open a **Floor Detail Modal** listing every passenger dropped there with name, origin floor, and timestamp

---

### Level 9 — REST API Backend

**File:** `web-app-version/server/index.js`

Every mutation that previously edited arrays in-memory now goes through a REST API. The Express server holds the authoritative state and the browser syncs with it on every pickup, drop-off, and floor move.

See the full [API Reference](#api-reference) below.

---

## API Reference

Base URL: `http://localhost:3000`

All request and response bodies are JSON. All endpoints return `application/json`.

### `GET /api/state`

Returns the full elevator state snapshot.

**Response:**
```json
{
  "currentFloor": 3,
  "requests": [],
  "riders": [{ "id": 1, "name": "Alice", "currentFloor": 1, "dropOffFloor": 7, "color": "#ff4655" }],
  "floorsTraversed": 12,
  "stops": 3
}
```

---

### `POST /api/requests`

Register a new pickup request.

**Body:**
```json
{
  "name": "Alice",
  "currentFloor": 2,
  "dropOffFloor": 8,
  "color": "#ff4655"
}
```

**Response `201`:**
```json
{ "id": 1, "name": "Alice", "currentFloor": 2, "dropOffFloor": 8, "color": "#ff4655" }
```

**Errors:**
- `400` — `currentFloor` or `dropOffFloor` missing
- `400` — `currentFloor` and `dropOffFloor` are the same

---

### `GET /api/requests`

List all pending (not yet picked up) requests.

**Response:**
```json
[{ "id": 1, "name": "Alice", "currentFloor": 2, "dropOffFloor": 8, "color": "#ff4655" }]
```

---

### `DELETE /api/requests/:id`

Cancel a pending request (before pickup).

**Response:** The deleted person object.

**Errors:** `404` if not found.

---

### `POST /api/riders`

Move a person from the `requests` list to the `riders` list (pickup). Increments `stops`.

**Body:**
```json
{ "personId": 1 }
```

**Response `201`:** The picked-up person object.

**Errors:** `404` if the person is not in `requests`.

---

### `GET /api/riders`

List all current riders (inside the elevator).

---

### `DELETE /api/riders/:id`

Drop off a rider at the current floor. Increments `stops`.

**Response:** The dropped-off person object.

**Errors:** `404` if not found.

---

### `PATCH /api/elevator`

Sync elevator position and stats after each floor move.

**Body (any combination):**
```json
{
  "currentFloor": 5,
  "floorsTraversed": 18
}
```

**Response:** Updated full state object.

---

### `POST /api/reset`

Reset all state back to initial (floor 0, empty arrays, zero counters). Used when changing floor count in Settings.

**Response:**
```json
{ "ok": true }
```

---

## UI Features

| Feature | How to use |
|---|---|
| **Add passenger** | Click **+ Add Passenger**, fill name, pick floors |
| **Lookup existing passenger** | Click the 🔍 icon — shows passengers by floor, click to auto-fill name and pickup floor |
| **Floor picker** | Click either floor button on a card — opens columned modal with passengers listed per floor |
| **Clear selection** | Click **↺ Clear** on any card to reset floor choices |
| **Dark / Light mode** | Toggle switch in the top-right header |
| **Settings** | Click the ⚙ icon in the header |
| **Floor detail** | Click any row in the **Dropped Off** panel on the right |

---

## Settings

Open with the **⚙** button in the header.

| Setting | Default | Description |
|---|---|---|
| Number of Floors | 10 | How many floors the building has (2–20). Changing this resets the simulation. |
| Floor Travel Time | 420ms | Animation speed per floor (100ms–1200ms). |
| Return to lobby before noon | On | Level 6 — elevator returns to F0 after last drop-off if time is before the cutoff. |
| Noon cutoff hour | 12 | The hour (0–23, 24h) used for the lobby return check. |
| Dispatch Algorithm | Sequential | **Sequential** serves passengers in request order (Level 4). **Nearest-first** always picks the closest waiting passenger next for fewer total floors (Level 7). |