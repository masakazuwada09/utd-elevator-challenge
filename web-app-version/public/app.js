import Person   from './person.js';
import Elevator from './elevator.js';

// ── CONSTANTS ──────────────────────────────────────────
const TOTAL_FLOORS = 10;
const MOVE_DELAY   = 420; // ms per floor step

const COLORS = [
  "#ff4655","#00e5ff","#39ff95","#ff9f43",
  "#a29bfe","#fd79a8","#fdcb6e","#6c5ce7","#00cec9","#e17055"
];

// ── DOM REFS ───────────────────────────────────────────
const building      = document.getElementById("building");
const historyList   = document.getElementById("historyList");
const passengerList = document.getElementById("passengerList");
const addBtn        = document.getElementById("addPassengerBtn");
const requestBtn    = document.getElementById("requestBtn");
const statusDot     = document.getElementById("statusDot");
const statusText    = document.getElementById("statusText");
const modeToggle    = document.getElementById("modeToggle");

// ── STATE ──────────────────────────────────────────────
const elevatorModel = new Elevator();
let   animFloor     = 0;   // current visual floor of the cab
let   isMoving      = false;
let   pidCounter    = 0;
let   visualQueue   = [];  // Person instances waiting to be dispatched

// ── BUILD ELEVATOR CAB ELEMENT ─────────────────────────
const elevatorEl = document.createElement("div");
elevatorEl.className = "elevator";

// ── BUILD FLOORS ───────────────────────────────────────
// Rendered top→bottom (floor 9 at top, floor 0 at bottom)
for (let i = TOTAL_FLOORS - 1; i >= 0; i--) {
  const floor   = document.createElement("div");
  floor.className   = "floor";
  floor.dataset.floor = i;

  const label   = document.createElement("div");
  label.className   = "floor-label";
  label.textContent = `F${i}`;

  const waiting = document.createElement("div");
  waiting.className = "waiting";
  waiting.id        = `waiting-${i}`;

  const shaft   = document.createElement("div");
  shaft.className   = "shaft";
  shaft.id          = `shaft-${i}`;

  if (i === 0) shaft.appendChild(elevatorEl);

  floor.appendChild(label);
  floor.appendChild(waiting);
  floor.appendChild(shaft);
  building.appendChild(floor);
}

// ── HELPERS ────────────────────────────────────────────
function personSVG() {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="7" r="4"/>
    <path d="M12 13c-5.5 0-8 3-8 5v1h16v-1c0-2-2.5-5-8-5z"/>
  </svg>`;
}

function setStatus(moving, floor) {
  if (moving) {
    statusDot.classList.remove("idle");
    statusText.textContent = `Moving → Floor ${floor}`;
  } else {
    statusDot.classList.add("idle");
    statusText.textContent = `Idle — Floor ${floor}`;
  }
}

// Move elevator cab one floor at a time (visual animation)
function animateElevatorTo(target, onArrival) {
  if (target === animFloor) {
    elevatorEl.classList.remove("moving");
    setStatus(false, animFloor);
    onArrival && onArrival();
    return;
  }

  elevatorEl.classList.add("moving");
  const next = animFloor + (target > animFloor ? 1 : -1);

  document.getElementById(`shaft-${animFloor}`).removeChild(elevatorEl);
  document.getElementById(`shaft-${next}`).appendChild(elevatorEl);
  animFloor = next;

  setStatus(true, animFloor);
  setTimeout(() => animateElevatorTo(target, onArrival), MOVE_DELAY);
}

// Add a small avatar inside the cab
function addCabAvatar(person) {
  const av = document.createElement("div");
  av.className    = "cab-avatar";
  av.dataset.pid  = person.id;
  av.style.background = person.color;
  av.innerHTML    = personSVG();
  elevatorEl.appendChild(av);
}

// Remove avatar from cab
function removeCabAvatar(person) {
  const av = elevatorEl.querySelector(`[data-pid="${person.id}"]`);
  if (av) av.remove();
}

// Remove waiting avatar from a floor
function removeWaitingAvatar(person) {
  const waitDiv = document.getElementById(`waiting-${person.currentFloor}`);
  const av      = waitDiv && waitDiv.querySelector(`[data-pid="${person.id}"]`);
  if (av) {
    av.style.transform  = "scale(0)";
    av.style.transition = "transform 0.25s";
    setTimeout(() => av.remove(), 250);
  }
}

// Append a completed-trip entry to history
function logHistory(person) {
  const li = document.createElement("li");
  li.innerHTML = `
    <span class="history-name">${person.name}</span>
    <span class="history-route">F${person.currentFloor} → F${person.dropOffFloor}</span>`;
  historyList.prepend(li);
}

// ── ANIMATION QUEUE RUNNER ────────────────────────────
// Drives the Elevator model step-by-step and mirrors each move visually.
function runVisualDispatch(queue, done) {
  if (!queue.length) { done && done(); return; }

  const person = queue.shift();

  // 1. Go pick up
  animateElevatorTo(person.currentFloor, () => {
    removeWaitingAvatar(person);
    addCabAvatar(person);

    // 2. Go drop off
    animateElevatorTo(person.dropOffFloor, () => {
      removeCabAvatar(person);
      logHistory(person);

      // 3. Next in queue
      runVisualDispatch(queue, done);
    });
  });
}

// ── REQUEST HANDLER ───────────────────────────────────
requestBtn.onclick = () => {
  const cards = document.querySelectorAll(".passenger-card");
  const batch = [];

  cards.forEach(card => {
    const pid     = card.dataset.pid;
    const name    = card.querySelector("input").value || `P${pid}`;
    const current = card.dataset.current;
    const drop    = card.dataset.drop;

    if (current !== "" && drop !== "" && current !== drop) {
      const person = new Person(
        name,
        Number(current),
        Number(drop),
        COLORS[pid % COLORS.length],
        pid
      );
      elevatorModel.requests.push(person);
      batch.push(person);
    }
  });

  passengerList.innerHTML = "";

  if (!batch.length || isMoving) return;
  isMoving = true;

  runVisualDispatch([...batch], () => {
    isMoving = false;
    setStatus(false, animFloor);
  });
};

// ── ADD PASSENGER CARD ────────────────────────────────
addBtn.onclick = () => {
  const pid   = ++pidCounter;
  const color = COLORS[pid % COLORS.length];

  const card = document.createElement("div");
  card.className    = "passenger-card";
  card.dataset.pid  = pid;
  card.dataset.current = "";
  card.dataset.drop    = "";

  const nameInput = document.createElement("input");
  nameInput.placeholder = "Passenger name…";
  nameInput.maxLength   = 20;

  const hint = document.createElement("div");
  hint.className = "floor-hint";
  hint.innerHTML = '<span style="color:var(--muted)">Select pickup floor</span>';

  const numpad = document.createElement("div");
  numpad.className = "numpad";

  for (let i = 0; i < TOTAL_FLOORS; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;

    btn.onclick = () => {
      // First click = pickup floor
      if (card.dataset.current === "") {
        card.dataset.current = i;
        btn.classList.add("current");
        hint.innerHTML = `<span class="pick">↑ Pickup: F${i}</span> · <span style="color:var(--muted)">Select dropoff</span>`;

        // Spawn waiting avatar on floor
        const waitDiv = document.getElementById(`waiting-${i}`);
        const av      = document.createElement("div");
        av.className       = "waiting-avatar";
        av.dataset.pid     = pid;
        av.style.background = color;
        av.innerHTML       = personSVG();

        const tag = document.createElement("div");
        tag.className   = "tag";
        tag.textContent = nameInput.value || `P${pid}`;
        av.appendChild(tag);
        waitDiv.appendChild(av);

        nameInput.addEventListener("input", () => {
          tag.textContent = nameInput.value || `P${pid}`;
        });

      // Second click = dropoff floor (must differ from pickup)
      } else if (card.dataset.drop === "" && String(i) !== card.dataset.current) {
        card.dataset.drop = i;
        btn.classList.add("dropoff");
        hint.innerHTML = `<span class="pick">↑ F${card.dataset.current}</span> → <span class="drop">↓ F${i}</span>`;
      }
    };

    numpad.appendChild(btn);
  }

  const removeBtn = document.createElement("button");
  removeBtn.className   = "remove-btn";
  removeBtn.textContent = "✕ Remove";
  removeBtn.onclick = () => {
    // Clean up waiting avatar if pickup was already selected
    if (card.dataset.current !== "") {
      const waitDiv = document.getElementById(`waiting-${card.dataset.current}`);
      const av = waitDiv && waitDiv.querySelector(`[data-pid="${pid}"]`);
      if (av) av.remove();
    }
    card.remove();
  };

  card.appendChild(nameInput);
  card.appendChild(hint);
  card.appendChild(numpad);
  card.appendChild(removeBtn);
  passengerList.appendChild(card);
  nameInput.focus();
};

// ── DARK / LIGHT TOGGLE ───────────────────────────────
modeToggle.addEventListener("change", e => {
  document.body.classList.toggle("dark",  !e.target.checked);
  document.body.classList.toggle("light",  e.target.checked);
});

// ── INIT ──────────────────────────────────────────────
setStatus(false, 0);