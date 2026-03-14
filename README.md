# Elevator Challenge

Exam requirement is upto level 6, but you can work upto level 9 if you want to.

## Description

For this challenge, you will be implementing an API for an elevator with JavaScript. While the challenge might seem trivial, you will quickly find out all the nuances of the elevator world and be marveled that they work as well as they do. You cannot move on to the next Level unless you have completed the current Level (or made a valiant effort).

We will focus heavily on **TDD** and writing super clean code. We will be considering the following criteria:

- Code Quality
- Robustness of test suite
- Efficiency of elevator algorithm
- Number of Levels completed

When you start a new level, read through the level's specification and write failing (red) tests to satisfy the spec. Then write your implementation code to make the tests pass (green).

Clone this repository and run `npm install` to install testing dependencies.

### Level 0

Sketch out the elevator process on pencil and paper. What kinds of things do you need to keep track of? What is a modern elevator's pickup and drop off strategy?

### Level 1

Build two JavaScript classes - Elevator and Person. A person should have a current floor and be able to request a drop-off floor.
The elevator should be able to pick up the person on their current floor and drop them off on the requested floor.

Elevator properties:

- When a class of Elevator is instantiated, it should start on floor 0 (lobby).
- It should be able to keep track of it's current floor.
- It should store a collection of requests and a collection of current riders on the elevator.

Person properties:

- Name
- Current floor
- Drop-off floor

### Level 2

Create a test suite that tests the following scenarios:

- Person A goes up.
- Person A goes down.
- Both tests should assert total number of stops and floors the elevator traversed.
- There should also be a unit test for every Elevator method.

### Level 3

An elevator should be able to keep track of how many total floors it has traversed and how many total stops it has made. This is to be able to see how efficient an elevator is (the less number of floors an elevator traverses, the better).

### Level 4

Create the ability for multiple people to request drop off floors. The elevator should pick up and drop off each person in order of the requests. For example:

- Bob is on floor 3 and requests to go to floor 9.
- Sue is on floor 6 and requests to go to floor 2.
- The elevator will pick up Bob, drop him off on floor 9, then pick up Sue and drop her off on floor 2.

### Level 5

Add to your test suite that tests the following scenarios with the assumption that Person A sends an elevator request before Person B:

- Person A goes up, Person B goes up.
- Person A goes up, Person B goes down.
- Person A goes down, Person B goes up.
- Person A goes down, Person B goes down.
- All four tests should assert total number of stops and floors the elevator traversed.
- All four tests should assert the total number of requests and current riders.

### Level 6

- Have the elevator return to floor 0 (lobby) if there are no current riders in the elevator and the current time is before 12:00 p.m.
- Have the elevator stay on current floor of last drop off if there are no current riders in the elevator and the current time is after 12:00 p.m.

### Level 7

Can you create a more efficient algorithm for pickups and drop offs? Whatever algorithm you chose needs to be tested against the same four Level 4 situations and show for each situation the elevator traversed less total floors.

## Elevator Challenge on Steroids

### Level 8

Create a DOM representation of the elevator and people to visualize the elevator process.

### Level 9

Replace all insertions and deletions of requests and current riders with API calls to a Node/Express backend with the correct CRUD methods.
