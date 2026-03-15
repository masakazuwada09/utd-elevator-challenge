let elevatorFloor = 0

function moveElevator(floor) {

  const elevator = document.getElementById("elevator")

  const heightPerFloor = 40
  const newPosition = floor * heightPerFloor

  elevator.style.bottom = `${newPosition}px`

  elevatorFloor = floor
}

function addPerson() {

  const start = Math.floor(Math.random() * 9)
  const end = Math.floor(Math.random() * 9)

  fetch("/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "User",
      currentFloor: start,
      dropOffFloor: end
    })
  })
}