class Elevator {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentFloor = 0;
    this.requests = [];
    this.riders = [];
    this.floorsTraversed = 0;
    this.stops = 0;
  }

  moveUp() {
    this.currentFloor++;
    this.floorsTraversed++;
  }

  moveDown() {
    if (this.currentFloor > 0) {
      this.currentFloor--;
      this.floorsTraversed++;
    }
  }

  hasStop() {
    return this.requests.some(p => p.currentFloor === this.currentFloor) ||
           this.riders.some(r => r.dropOffFloor === this.currentFloor);
  }

  hasPickup() {
    const pickups = this.requests.filter(p => p.currentFloor === this.currentFloor);
    pickups.forEach(p => {
      this.riders.push(p);
      this.requests.splice(this.requests.indexOf(p), 1);
    });
    return pickups;
  }

  hasDropoff() {
    const dropoffs = this.riders.filter(r => r.dropOffFloor === this.currentFloor);
    dropoffs.forEach(r => {
      this.riders.splice(this.riders.indexOf(r), 1);
    });
    return dropoffs;
  }

  checkFloor() {
    if (this.hasStop()) {
      const dropped = this.hasDropoff();
      const picked  = this.hasPickup();
      this.stops++;
      return { dropped, picked };
    }
    return { dropped: [], picked: [] };
  }

  goToFloor(person) {
    while (this.currentFloor !== person.currentFloor) {
      if (this.currentFloor < person.currentFloor) this.moveUp();
      else this.moveDown();
      this.checkFloor();
    }
    this.checkFloor();

    while (this.currentFloor !== person.dropOffFloor) {
      if (this.currentFloor < person.dropOffFloor) this.moveUp();
      else this.moveDown();
      this.checkFloor();
    }
    this.checkFloor();
  }

  dispatch() {
    while (this.requests.length || this.riders.length) {
      const targets = [
        ...this.requests.map(p => p.currentFloor),
        ...this.riders.map(r => r.dropOffFloor)
      ];
      const nextFloor = targets.reduce((a, b) =>
        Math.abs(a - this.currentFloor) < Math.abs(b - this.currentFloor) ? a : b
      );

      while (this.currentFloor !== nextFloor) {
        if (this.currentFloor < nextFloor) this.moveUp();
        else this.moveDown();
        this.checkFloor();
      }

      this.checkFloor();
    }

    if (this.checkReturnToLobby()) {
      while (this.currentFloor > 0) this.moveDown();
    }
  }

  checkReturnToLobby() {
    const hour = new Date().getHours();
    if (!this.riders.length && hour < 12 && this.currentFloor !== 0) {
      this.stops++;
      return true;
    }
    return false;
  }
}

export default Elevator;