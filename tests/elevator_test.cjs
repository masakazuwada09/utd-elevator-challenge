require('babel-core/register')({
  ignore: /node_modules\/(?!ProjectB)/
});

const assert = require('chai').assert;
const Elevator = require('../elevator').default;
const Person = require('../person').default

describe('Elevator', function() {
  let elevator = new Elevator();

  beforeEach(function() {
    elevator.reset();
  });

  it('should bring a rider to a floor above their current floor', () => {
    let mockUser = { name: "Brittany", currentFloor: 2, dropOffFloor: 5 };
    elevator.requests.push(mockUser)
    elevator.goToFloor(mockUser);

    //check if the elevator automatically  returns to the loby and set the end values
    const endFloor = elevator.checkReturnToLoby() ? 0 : 5
    const floorsTraversed = elevator.checkReturnToLoby() ? 10 : 5

    assert.equal(elevator.currentFloor, endFloor);
    assert.equal(elevator.floorsTraversed, floorsTraversed)
    assert.equal(elevator.stops, 2)
  });

  it('should bring a rider to a floor below their current floor', () => {
    let mockUser = { name: "Brittany", currentFloor: 8, dropOffFloor: 3 };
    elevator.requests.push(mockUser)
    elevator.goToFloor(mockUser);

    const endFloor = elevator.checkReturnToLoby() ? 0 : 3
    const floorsTraversed = elevator.checkReturnToLoby() ? 16 : 13

    assert.equal(elevator.currentFloor, endFloor);
    assert.equal(elevator.floorsTraversed, floorsTraversed)
    assert.equal(elevator.stops, 2)
  });

  it('The moveUp function should move the elevator up once',() => {
    const nextFloor = elevator.currentFloor + 1
    elevator.moveUp()

    assert.equal(elevator.currentFloor, nextFloor)
  })

  it('The moveDown function should move the elevator down once until the bottom floor but no further',() => {
    elevator.currentFloor++
    const nextFloor = elevator.currentFloor - 1
    elevator.moveDown()

    assert.equal(elevator.currentFloor, nextFloor)

    elevator.currentFloor = 0
    assert.equal(elevator.currentFloor, 0)
  })

  it('should check if the current floor  of the elevator should stop (picking up/dropping off riders)', ()=> {
    const riderA = new Person('Bob',4,5)    
    const riderB = new Person('John',1,4)
    elevator.currentFloor = elevator.floorsTraversed = 4  
    
    elevator.requests.push(riderA) 
    assert.equal(elevator.hasStop(), true)  
    
    elevator.requests = []
    elevator.riders.push(riderB)
    assert.equal(elevator.hasStop(), true)  
  })

  it('when checking the floor, the person requesting the elevator will enter and become a rider', ()=> {
    const request = new Person('Anne', 3, 1)
    elevator.requests.push(request)
    elevator.currentFloor = 3

    elevator.hasPickup()

    assert.equal(elevator.requests.length, 0)
    assert.equal(elevator.riders[0], request)
  })

  it('dropping a person off the elevator should remove the person entirely', () => {
    const rider = new Person('Anne', 1, 3)
    elevator.riders.push(rider)
    elevator.currentFloor = 3

    elevator.hasDropoff()

    assert.equal(elevator.riders.length, 0)
  })

  it('should cater to the riders in order (first come, first serve)', () => {
    //both person A and B are going up
    let personA = new Person('Oliver',3,6)
    let personB = new Person('Angela',1,5)    
    elevator.requests = [personA, personB]
    let endFloor = elevator.checkReturnToLoby() ? 0 : 6
    let floorsTraversed = elevator.checkReturnToLoby() ? 12 : 6

    elevator.dispatch()

    assert.equal(elevator.stops, 4)
    assert.equal(elevator.floorsTraversed, floorsTraversed)
    assert.equal(elevator.currentFloor, endFloor)

    elevator.reset()

    //person A goes up and B goes down
    personA = new Person('Beverly',3,6)
    personB = new Person('James',5,1)
    elevator.requests = [personA, personB]
    endFloor = elevator.checkReturnToLoby() ? 0 : 1
    floorsTraversed = elevator.checkReturnToLoby() ? 12 : 11

    elevator.dispatch()

    assert.equal(elevator.stops, 4)   
    assert.equal(elevator.floorsTraversed, floorsTraversed)
    assert.equal(elevator.currentFloor, endFloor)

    elevator.reset()

    //person A goes down and B goes up
    personA = new Person('Jeanne',7,1)
    personB = new Person('Karl',2,8)
    elevator.requests = [personA, personB]
    endFloor = elevator.checkReturnToLoby() ? 0 : 1
    floorsTraversed = elevator.checkReturnToLoby() ? 16 : 15

    elevator.dispatch()
    
    assert.equal(elevator.stops, 4)
    assert.equal(elevator.floorsTraversed, floorsTraversed)
    assert.equal(elevator.currentFloor, endFloor)
    
    elevator.reset()
    
    //both Person A and B go down
    personA = new Person('Max',8,2)
    personB = new Person('Charlie',5,0)
    elevator.requests = [personA, personB]
    
    elevator.dispatch()

    assert.equal(elevator.stops, 4)
    assert.equal(elevator.floorsTraversed, 16)
    assert.equal(elevator.currentFloor, 0)
  })
  
  it('should check if the elevator must return to the loby when there are no riders and the time is earlier than 12PM', () => {
    elevator.currentFloor = 5

    if(new Date().getHours() < 12 && !elevator.riders.length){
      assert.equal(elevator.checkReturnToLoby(), true)
    }
  })
});
