import Person   from './person.js';
import Elevator from './elevator.js';

// ── SETTINGS (defaults, overridden by modal) ──────────────────────────────
let settings = {
  totalFloors:   10,
  moveDelay:     420,
  lobbyReturn:   true,
  noonHour:      12,
  algorithm:     'sequential',  // 'sequential' | 'nearest'
};

const COLORS = [
  "#ff4655","#00e5ff","#39ff95","#ff9f43",
  "#a29bfe","#fd79a8","#fdcb6e","#6c5ce7","#00cec9","#e17055"
];

const API = '';

// ── DOM REFS ──────────────────────────────────────────────────────────────
const building       = document.getElementById("building");
const passengerList  = document.getElementById("passengerList");
const addBtn         = document.getElementById("addPassengerBtn");
const requestBtn     = document.getElementById("requestBtn");
const statusDot      = document.getElementById("statusDot");
const statusText     = document.getElementById("statusText");
const modeToggle     = document.getElementById("modeToggle");
const settingsBtn    = document.getElementById("settingsBtn");
const settingsOverlay= document.getElementById("settingsOverlay");
const settingsClose  = document.getElementById("settingsClose");
const settingsApply  = document.getElementById("settingsApply");

// Settings inputs
const settingFloors      = document.getElementById("settingFloors");
const settingSpeed       = document.getElementById("settingSpeed");
const settingSpeedLabel  = document.getElementById("settingSpeedLabel");
const settingLobbyReturn = document.getElementById("settingLobbyReturn");
const settingNoonHour    = document.getElementById("settingNoonHour");
const settingAlgorithm   = document.getElementById("settingAlgorithm");

// ── STATE ─────────────────────────────────────────────────────────────────
let elevatorModel = new Elevator();
let animFloor     = 0;
let isMoving      = false;
let pidCounter    = 0;
const elevatorEl  = document.createElement("div");
elevatorEl.className = "elevator";

// ── API HELPERS ───────────────────────────────────────────────────────────
const api = {
  async addRequest(person) {
    const res = await fetch(`${API}/api/requests`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: person.name, currentFloor: person.currentFloor, dropOffFloor: person.dropOffFloor, color: person.color }),
    });
    return res.json();
  },
  async pickup(personId) {
    const res = await fetch(`${API}/api/riders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId }),
    });
    return res.json();
  },
  async dropoff(id) {
    const res = await fetch(`${API}/api/riders/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async syncElevator(currentFloor, floorsTraversed) {
    await fetch(`${API}/api/elevator`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentFloor, floorsTraversed }),
    });
  },
  async reset() { await fetch(`${API}/api/reset`, { method: 'POST' }); },
};

// ── BUILD / REBUILD FLOORS ────────────────────────────────────────────────
function buildFloors() {
  building.innerHTML = "";
  for (let i = settings.totalFloors - 1; i >= 0; i--) {
    const floor   = document.createElement("div");
    floor.className     = "floor";
    floor.dataset.floor = i;

    const label   = document.createElement("div");
    label.className = "floor-label";
    if (i === 0) {
      label.innerHTML = `F0<span class="lobby-tag">Lobby</span>`;
    } else {
      label.textContent = `F${i}`;
    }

    const waiting = document.createElement("div");
    waiting.className = "waiting";
    waiting.id        = `waiting-${i}`;

    const shaft   = document.createElement("div");
    shaft.className = "shaft";
    shaft.id        = `shaft-${i}`;

    if (i === 0) shaft.appendChild(elevatorEl);

    floor.appendChild(waiting);
    floor.appendChild(shaft);
    floor.appendChild(label);
    building.appendChild(floor);
  }
}

buildFloors();

// ── HELPERS ───────────────────────────────────────────────────────────────
function personSVG() {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="7" r="4"/>
    <path d="M12 13c-5.5 0-8 3-8 5v1h16v-1c0-2-2.5-5-8-5z"/>
  </svg>`;
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

// ── ANIMATION ─────────────────────────────────────────────────────────────
function animateElevatorTo(target, onArrival) {
  if (target === animFloor) {
    elevatorEl.classList.remove("moving");
    setStatus(false, animFloor);
    onArrival && onArrival();
    return;
  }
  elevatorEl.classList.add("moving");
  const next = animFloor + (target > animFloor ? 1 : -1);
  const curShaft  = document.getElementById(`shaft-${animFloor}`);
  const nextShaft = document.getElementById(`shaft-${next}`);
  if (curShaft && curShaft.contains(elevatorEl)) curShaft.removeChild(elevatorEl);
  if (nextShaft) nextShaft.appendChild(elevatorEl);
  animFloor = next;
  setStatus(true, animFloor);
  setTimeout(() => animateElevatorTo(target, onArrival), settings.moveDelay);
}

function addCabAvatar(person) {
  const av = document.createElement("div");
  av.className        = "cab-avatar";
  av.dataset.pid      = person.id;
  av.style.background = person.color;
  av.innerHTML        = personSVG();
  elevatorEl.appendChild(av);
}

function removeCabAvatar(person) {
  const av = elevatorEl.querySelector(`[data-pid="${person.id}"]`);
  if (av) av.remove();
}

function removeWaitingAvatar(person) {
  const waitDiv = document.getElementById(`waiting-${person.currentFloor}`);
  const av = waitDiv && waitDiv.querySelector(`[data-pid="${person.id}"]`);
  if (av) {
    av.style.transform = "scale(0)";
    av.style.transition = "transform 0.25s";
    setTimeout(() => av.remove(), 250);
  }
}

// ── PER-FLOOR DROP-OFF REGISTRY ──────────────────────────────────────────
// droppedByFloor[floorNum] = [ { name, color, from, time }, ... ]
const droppedByFloor = {};

function getFloorStack(floor) {
  if (!droppedByFloor[floor]) droppedByFloor[floor] = [];
  return droppedByFloor[floor];
}

// Update the right-panel floor stack list
function renderFloorStacks() {
  const container = document.getElementById("floorStacks");
  if (!container) return;
  container.innerHTML = "";

  // Show floors that have at least one dropped passenger, newest floor first
  const floorsWithPassengers = Object.keys(droppedByFloor)
    .map(Number)
    .filter(f => droppedByFloor[f].length > 0)
    .sort((a, b) => b - a);

  if (!floorsWithPassengers.length) {
    container.innerHTML = `<div class="stack-empty">No drop-offs yet</div>`;
    return;
  }

  floorsWithPassengers.forEach(floor => {
    const passengers = droppedByFloor[floor];
    const row = document.createElement("div");
    row.className = "stack-row";
    row.title     = `Click to view floor ${floor} passengers`;

    const floorTag = document.createElement("div");
    floorTag.className   = "stack-floor-tag";
    floorTag.textContent = floor === 0 ? "Lobby" : `F${floor}`;

    const avatars = document.createElement("div");
    avatars.className = "stack-avatars";
    // Show up to 4 stacked dots
    const visible = passengers.slice(-4);
    visible.forEach((p, idx) => {
      const dot = document.createElement("div");
      dot.className   = "stack-dot";
      dot.style.background  = p.color;
      dot.style.zIndex      = idx + 1;
      dot.style.marginLeft  = idx === 0 ? "0" : "-8px";
      dot.innerHTML   = personSVG();
      avatars.appendChild(dot);
    });

    const count = document.createElement("div");
    count.className   = "stack-count";
    count.textContent = `${passengers.length} pax`;

    row.appendChild(floorTag);
    row.appendChild(avatars);
    row.appendChild(count);

    row.onclick = () => openFloorModal(floor);
    container.appendChild(row);
  });
}

// Open modal for a specific floor's dropped passengers
function openFloorModal(floor) {
  const passengers = getFloorStack(floor);
  const overlay    = document.getElementById("floorModalOverlay");
  const title      = document.getElementById("floorModalTitle");
  const body       = document.getElementById("floorModalBody");

  title.textContent = floor === 0 ? "Lobby (F0)" : `Floor ${floor}`;
  body.innerHTML    = "";

  if (!passengers.length) {
    body.innerHTML = `<div class="modal-empty">No passengers dropped off here.</div>`;
  } else {
    passengers.slice().reverse().forEach(p => {
      const item = document.createElement("div");
      item.className = "floor-modal-item";
      item.innerHTML = `
        <div class="fmi-avatar" style="background:${p.color}">${personSVG()}</div>
        <div class="fmi-info">
          <div class="fmi-name">${p.name}</div>
          <div class="fmi-route">From F${p.from} → Dropped F${floor}</div>
        </div>
        <div class="fmi-time">${p.time}</div>`;
      body.appendChild(item);
    });
  }

  overlay.classList.remove("hidden");
}

// Close floor modal
document.getElementById("floorModalOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("floorModalOverlay"))
    document.getElementById("floorModalOverlay").classList.add("hidden");
});
document.getElementById("floorModalClose").addEventListener("click", () => {
  document.getElementById("floorModalOverlay").classList.add("hidden");
});

function logHistory(person) {
  // Record in per-floor registry
  const entry = {
    name:  person.name,
    color: person.color,
    from:  person.currentFloor,
    time:  nowTime(),
  };
  getFloorStack(person.dropOffFloor).push(entry);
  renderFloorStacks();
}

// ── DISPATCH (Level 4 sequential + Level 7 nearest-first) ─────────────────
async function runDispatch(queue, done) {
  if (!queue.length) { done && done(); return; }

  // Level 7: nearest-first reorders remaining queue each step
  if (settings.algorithm === 'nearest' && queue.length > 1) {
    queue.sort((a, b) =>
      Math.abs(a.currentFloor - animFloor) - Math.abs(b.currentFloor - animFloor)
    );
  }

  const person = queue.shift();

  animateElevatorTo(person.currentFloor, async () => {
    await api.pickup(person.id);
    await api.syncElevator(animFloor, elevatorModel.floorsTraversed);
    removeWaitingAvatar(person);
    addCabAvatar(person);

    animateElevatorTo(person.dropOffFloor, async () => {
      await api.dropoff(person.id);
      await api.syncElevator(animFloor, elevatorModel.floorsTraversed);
      removeCabAvatar(person);
      logHistory(person);

      // Level 6: return to lobby if no riders and before noon
      if (!queue.length) {
        const hour = new Date().getHours();
        if (settings.lobbyReturn && hour < settings.noonHour && animFloor !== 0) {
          animateElevatorTo(0, () => runDispatch(queue, done));
          return;
        }
      }

      runDispatch(queue, done);
    });
  });
}

// ── REQUEST BUTTON ────────────────────────────────────────────────────────
requestBtn.onclick = async () => {
  const cards = document.querySelectorAll(".passenger-card");
  const batch = [];

  for (const card of cards) {
    const pid     = Number(card.dataset.pid);
    const name    = card.querySelector("input").value || `P${pid}`;
    const current = card.dataset.current;
    const drop    = card.dataset.drop;

    if (current !== "" && drop !== "" && current !== drop) {
      const color  = COLORS[pid % COLORS.length];
      const person = new Person(name, Number(current), Number(drop), color, pid);
      const saved  = await api.addRequest(person);
      person.id    = saved.id;
      elevatorModel.requests.push(person);
      batch.push(person);
    }
  }

  passengerList.innerHTML = "";
  if (!batch.length || isMoving) return;
  isMoving = true;

  runDispatch([...batch], async () => {
    isMoving = false;
    setStatus(false, animFloor);
    await api.syncElevator(animFloor, elevatorModel.floorsTraversed);
  });
};

// ── ADD PASSENGER CARD ────────────────────────────────────────────────────
addBtn.onclick = () => {
  const pid   = ++pidCounter;
  const color = COLORS[pid % COLORS.length];

  const card = document.createElement("div");
  card.className       = "passenger-card";
  card.dataset.pid     = pid;
  card.dataset.current = "";
  card.dataset.drop    = "";

  // ── NAME ROW (lookup icon + input) ───────────────────────────────────────
  const nameRow = document.createElement("div");
  nameRow.className = "name-row";

  const lookupBtn = document.createElement("button");
  lookupBtn.className = "lookup-btn";
  lookupBtn.title     = "Pick from floor passengers";
  lookupBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <path d="M11 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" stroke="none" fill="currentColor" opacity=".3"/>
    <circle cx="11" cy="10" r="2.5" fill="currentColor" stroke="none"/>
    <path d="M6 18c0-2.5 2-4 5-4s5 1.5 5 4" fill="currentColor" stroke="none"/>
  </svg>`;

  lookupBtn.onclick = () => {
    // Collect all passengers currently on floors
    const allFloors = Object.keys(droppedByFloor)
      .map(Number)
      .filter(f => droppedByFloor[f].length > 0)
      .sort((a, b) => b - a);

    const overlay = document.getElementById("passengerLookupOverlay");
    const body    = document.getElementById("passengerLookupBody");
    body.innerHTML = "";

    if (!allFloors.length) {
      body.innerHTML = `<div class="plookup-empty">No passengers on any floor yet.</div>`;
    } else {
      // One column per floor
      allFloors.forEach(f => {
        const col = document.createElement("div");
        col.className = "plookup-col";

        const header = document.createElement("div");
        header.className   = "plookup-floor-header";
        header.textContent = f === 0 ? "Lobby" : `F${f}`;
        col.appendChild(header);

        droppedByFloor[f].slice().reverse().forEach(p => {
          const row = document.createElement("button");
          row.className = "plookup-row";
          row.innerHTML = `
            <div class="plookup-dot" style="background:${p.color}">${personSVG()}</div>
            <div class="plookup-info">
              <span class="plookup-name">${p.name}</span>
              <span class="plookup-sub">from F${p.from}</span>
            </div>`;

          row.onclick = () => {
            // Fill name
            nameInput.value = p.name;

            // Auto-set pickup floor to where this passenger currently is (f)
            // Clear any previous pickup avatar first
            if (card.dataset.current !== "") {
              const oldWait = document.getElementById(`waiting-${card.dataset.current}`);
              const oldAv   = oldWait && oldWait.querySelector(`[data-pid="${pid}"]`);
              if (oldAv) oldAv.remove();
              // Reset dropoff too since pickup changed
              card.dataset.drop = "";
              const fpvDrop = document.getElementById(`fpv-dropoff-${pid}`);
              if (fpvDrop) fpvDrop.textContent = "—";
              dropoffBtn.classList.remove("floor-pick-btn--set");
            }

            card.dataset.current = f;
            const fpvPickup = document.getElementById(`fpv-pickup-${pid}`);
            if (fpvPickup) fpvPickup.textContent = f === 0 ? "Lobby" : `F${f}`;
            pickupBtn.classList.add("floor-pick-btn--set");

            // Spawn waiting avatar on that floor
            const waitDiv = document.getElementById(`waiting-${f}`);
            if (waitDiv && !waitDiv.querySelector(`[data-pid="${pid}"]`)) {
              const av  = document.createElement("div");
              av.className        = "waiting-avatar";
              av.dataset.pid      = pid;
              av.style.background = p.color;
              av.innerHTML        = personSVG();
              const tag = document.createElement("div");
              tag.className   = "tag";
              tag.textContent = p.name;
              av.appendChild(tag);
              waitDiv.appendChild(av);
              // Keep tag in sync if user edits the name after
              nameInput.addEventListener("input", () => {
                tag.textContent = nameInput.value || `P${pid}`;
              });
            }

            // Update hint
            hint.innerHTML = `<span class="pick">↑ Pickup: F${f}</span> · <span style="color:var(--muted)">Select dropoff</span>`;

            // Trigger input event so any existing tag listener also fires
            nameInput.dispatchEvent(new Event("input"));
            overlay.classList.add("hidden");
            nameInput.focus();
          };

          col.appendChild(row);
        });

        body.appendChild(col);
      });
    }

    overlay.classList.remove("hidden");
  };

  const nameInput = document.createElement("input");
  nameInput.placeholder = "Passenger name…";
  nameInput.maxLength   = 20;

  nameRow.appendChild(lookupBtn);
  nameRow.appendChild(nameInput);

  const hint = document.createElement("div");
  hint.className = "floor-hint";
  hint.innerHTML = '<span style="color:var(--muted)">Select pickup floor</span>';

  // ── FLOOR PICKER BUTTONS ──────────────────────────────────────────────
  const pickupBtn = document.createElement("button");
  pickupBtn.className   = "floor-pick-btn";
  pickupBtn.dataset.role = "pickup";
  pickupBtn.innerHTML   = `<span class="fpb-label">Pickup Floor</span><span class="fpb-value" id="fpv-pickup-${pid}">—</span>`;

  const dropoffBtn = document.createElement("button");
  dropoffBtn.className   = "floor-pick-btn";
  dropoffBtn.dataset.role = "dropoff";
  dropoffBtn.innerHTML   = `<span class="fpb-label">Drop-off Floor</span><span class="fpb-value" id="fpv-dropoff-${pid}">—</span>`;

  function openFloorPicker(role) {
    const isPickup   = role === "pickup";
    const lockedFloor = isPickup ? null : card.dataset.current;

    // Require pickup first
    if (!isPickup && card.dataset.current === "") {
      hint.innerHTML = `<span style="color:var(--accent)">Select pickup floor first</span>`;
      return;
    }

    const overlay  = document.getElementById("floorPickerOverlay");
    const title    = document.getElementById("floorPickerTitle");
    const subtitle = document.getElementById("floorPickerSubtitle");
    const body     = document.getElementById("floorPickerBody");

    title.textContent    = isPickup ? "Select Pickup Floor" : "Select Drop-off Floor";
    subtitle.textContent = isPickup ? "" : `Pickup: F${card.dataset.current}`;
    body.innerHTML       = "";

    // Build one column per floor (highest first)
    for (let f = settings.totalFloors - 1; f >= 0; f--) {
      const isLocked   = !isPickup && String(f) === String(lockedFloor);
      const col        = document.createElement("div");
      col.className    = "fp-col" + (isLocked ? " fp-col--locked" : "");

      // Floor header button
      const floorBtn   = document.createElement("button");
      floorBtn.className   = "fp-floor-btn";
      floorBtn.disabled    = isLocked;
      floorBtn.innerHTML   = `<span class="fp-fn">${f === 0 ? "Lobby" : `F${f}`}</span>`;

      if (!isLocked) {
        floorBtn.onclick = () => {
          if (isPickup) {
            // Clear old waiting avatar
            if (card.dataset.current !== "") {
              const old = document.getElementById(`waiting-${card.dataset.current}`);
              const oldAv = old && old.querySelector(`[data-pid="${pid}"]`);
              if (oldAv) oldAv.remove();
              // Also clear dropoff if pickup changes
              card.dataset.drop = "";
              document.getElementById(`fpv-dropoff-${pid}`).textContent = "—";
              dropoffBtn.classList.remove("floor-pick-btn--set");
            }
            card.dataset.current = f;
            document.getElementById(`fpv-pickup-${pid}`).textContent = f === 0 ? "Lobby" : `F${f}`;
            pickupBtn.classList.add("floor-pick-btn--set");

            // Spawn waiting avatar
            const waitDiv = document.getElementById(`waiting-${f}`);
            if (waitDiv && !waitDiv.querySelector(`[data-pid="${pid}"]`)) {
              const av  = document.createElement("div");
              av.className        = "waiting-avatar";
              av.dataset.pid      = pid;
              av.style.background = color;
              av.innerHTML        = personSVG();
              const tag = document.createElement("div");
              tag.className   = "tag";
              tag.textContent = nameInput.value || `P${pid}`;
              av.appendChild(tag);
              waitDiv.appendChild(av);
              nameInput.addEventListener("input", () => {
                tag.textContent = nameInput.value || `P${pid}`;
              });
            }
          } else {
            card.dataset.drop = f;
            document.getElementById(`fpv-dropoff-${pid}`).textContent = f === 0 ? "Lobby" : `F${f}`;
            dropoffBtn.classList.add("floor-pick-btn--set");
          }

          // Update hint
          const cur  = card.dataset.current;
          const drop = card.dataset.drop;
          if (cur !== "" && drop !== "") {
            hint.innerHTML = `<span class="pick">↑ F${cur}</span> → <span class="drop">↓ F${drop}</span>`;
          } else if (cur !== "") {
            hint.innerHTML = `<span class="pick">↑ Pickup: F${cur}</span> · <span style="color:var(--muted)">Select dropoff</span>`;
          }

          overlay.classList.add("hidden");
        };
      }

      col.appendChild(floorBtn);

      // Passenger list for this floor (dropped off passengers)
      const stack = getFloorStack(f);
      if (stack.length) {
        const pList = document.createElement("div");
        pList.className = "fp-plist";
        stack.slice().reverse().forEach(p => {
          const pRow = document.createElement("div");
          pRow.className = "fp-prow";
          pRow.innerHTML = `
            <div class="fp-dot" style="background:${p.color}">${personSVG()}</div>
            <span class="fp-pname">${p.name}</span>`;
          pList.appendChild(pRow);
        });
        col.appendChild(pList);
      } else {
        const empty = document.createElement("div");
        empty.className   = "fp-empty";
        empty.textContent = "—";
        col.appendChild(empty);
      }

      body.appendChild(col);
    }

    overlay.classList.remove("hidden");
  }

  pickupBtn.onclick  = () => openFloorPicker("pickup");
  dropoffBtn.onclick = () => openFloorPicker("dropoff");

  const floorPickRow = document.createElement("div");
  floorPickRow.className = "floor-pick-row";
  floorPickRow.appendChild(pickupBtn);
  floorPickRow.appendChild(dropoffBtn);

  function clearSelection() {
    if (card.dataset.current !== "") {
      const waitDiv = document.getElementById(`waiting-${card.dataset.current}`);
      const av = waitDiv && waitDiv.querySelector(`[data-pid="${pid}"]`);
      if (av) av.remove();
    }
    card.dataset.current = "";
    card.dataset.drop    = "";
    document.getElementById(`fpv-pickup-${pid}`).textContent  = "—";
    document.getElementById(`fpv-dropoff-${pid}`).textContent = "—";
    pickupBtn.classList.remove("floor-pick-btn--set");
    dropoffBtn.classList.remove("floor-pick-btn--set");
    hint.innerHTML = '<span style="color:var(--muted)">Select pickup floor</span>';
  }

  const clearBtn = document.createElement("button");
  clearBtn.className   = "clear-btn";
  clearBtn.textContent = "↺ Clear";
  clearBtn.onclick     = clearSelection;

  const removeBtn = document.createElement("button");
  removeBtn.className   = "remove-btn";
  removeBtn.textContent = "✕ Remove";
  removeBtn.onclick     = () => { clearSelection(); card.remove(); };

  const cardActions = document.createElement("div");
  cardActions.className = "card-actions";
  cardActions.appendChild(clearBtn);
  cardActions.appendChild(removeBtn);

  card.appendChild(nameRow);
  card.appendChild(floorPickRow);
  card.appendChild(hint);
  card.appendChild(cardActions);
  passengerList.appendChild(card);
  nameInput.focus();
};

// ── PASSENGER LOOKUP CLOSE ────────────────────────────────────────────────
document.getElementById("passengerLookupOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("passengerLookupOverlay"))
    document.getElementById("passengerLookupOverlay").classList.add("hidden");
});
document.getElementById("passengerLookupClose").addEventListener("click", () => {
  document.getElementById("passengerLookupOverlay").classList.add("hidden");
});

// ── FLOOR PICKER CLOSE ────────────────────────────────────────────────────
document.getElementById("floorPickerOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("floorPickerOverlay"))
    document.getElementById("floorPickerOverlay").classList.add("hidden");
});
document.getElementById("floorPickerClose").addEventListener("click", () => {
  document.getElementById("floorPickerOverlay").classList.add("hidden");
});

// ── SETTINGS MODAL ────────────────────────────────────────────────────────
settingsBtn.onclick = () => {
  // Sync inputs to current settings before opening
  settingFloors.value      = settings.totalFloors;
  settingSpeed.value       = settings.moveDelay;
  settingSpeedLabel.textContent = `${settings.moveDelay}ms`;
  settingLobbyReturn.checked = settings.lobbyReturn;
  settingNoonHour.value    = settings.noonHour;
  settingAlgorithm.value   = settings.algorithm;
  settingsOverlay.classList.remove("hidden");
};

const closeModal = () => settingsOverlay.classList.add("hidden");
settingsClose.onclick   = closeModal;
settingsOverlay.onclick = (e) => { if (e.target === settingsOverlay) closeModal(); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// Live speed label
settingSpeed.addEventListener("input", () => {
  settingSpeedLabel.textContent = `${settingSpeed.value}ms`;
});

settingsApply.onclick = async () => {
  const newFloors = Number(settingFloors.value);
  const floorsChanged = newFloors !== settings.totalFloors;

  settings.totalFloors  = newFloors;
  settings.moveDelay    = Number(settingSpeed.value);
  settings.lobbyReturn  = settingLobbyReturn.checked;
  settings.noonHour     = Number(settingNoonHour.value);
  settings.algorithm    = settingAlgorithm.value;

  if (floorsChanged) {
    // Reset everything
    elevatorModel = new Elevator();
    animFloor     = 0;
    isMoving      = false;
    pidCounter    = 0;
    passengerList.innerHTML = "";
    historyList.innerHTML   = "";

    // Re-attach elevator cab to new shaft-0
    const curShaft = elevatorEl.parentElement;
    if (curShaft) curShaft.removeChild(elevatorEl);

    buildFloors();
    await api.reset();
    setStatus(false, 0);
  }

  closeModal();
};

// ── DARK / LIGHT TOGGLE ───────────────────────────────────────────────────
modeToggle.addEventListener("change", e => {
  document.body.classList.toggle("dark",  !e.target.checked);
  document.body.classList.toggle("light",  e.target.checked);
});

// ── INIT ──────────────────────────────────────────────────────────────────
setStatus(false, 0);