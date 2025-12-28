# Game Started

A 3D table soccer game built with React, Three.js, and Cannon.js physics engine.

## Overview

This package implements an interactive 3D table soccer game where players can control teams using keyboard inputs. The game features physics-based ball movement, player positioning, and goal detection.

## Architecture

The codebase follows modern game development best practices with a clean, modular architecture:

```
src/
├── config/          # Game configuration
├── entities/        # Game entities (Ball, Field, Player)
├── hooks/           # Custom React hooks
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.tsx        # Main component
```

### Key Principles

- **Separation of Concerns**: Rendering, physics, game logic, and input handling are separated
- **Reusability**: Entities and hooks can be easily reused and tested
- **Type Safety**: Full TypeScript support with proper type definitions
- **Resource Management**: Proper cleanup of Three.js and Cannon.js resources
- **Modularity**: Each game entity and system is self-contained

## Functions

### Main Component Functions (`src/index.tsx`)

#### `basicTexture(color?: string): Three.Texture`
Creates a canvas-based texture with a checkerboard pattern for game pieces.

**Parameters:**
- `color` (optional): Hex color string, defaults to `'#027902'` (green)

**Returns:** Three.js Texture object

**Description:** Generates a 64x64 canvas with the specified color and a subtle checkerboard pattern overlay for visual depth.

---

#### `getStaticBox({ size, position, rotation? }): { mesh: Three.Mesh, body: Cannon.Body }`
Creates a static (non-moving) box mesh and physics body for walls and ground.

**Parameters:**
- `size`: `number[]` - Array of 3 numbers `[width, height, depth]`
- `position`: `number[]` - Array of 3 numbers `[x, y, z]` for position
- `rotation` (optional): `number[]` - Array of 3 numbers `[x, y, z]` for rotation in degrees, defaults to `[0, 0, 0]`

**Returns:** Object containing:
- `mesh`: Three.js Mesh object
- `body`: Cannon.js Body object (static type)

**Description:** Creates a static box geometry with shadow casting/receiving enabled, used for walls and ground elements.

---

#### `getMenAndHandlers({ numberOfMan, z, manMap? }): { handlers, men, contraints }`
Creates a row of soccer players (men) and handlers with physics constraints.

**Parameters:**
- `numberOfMan`: `number` - Number of soccer players in the row
- `z`: `number` - Z-axis position for the row
- `manMap` (optional): `Three.Texture` - Texture for the players, defaults to green texture

**Returns:** Object containing:
- `handlers`: Array of handler objects `{ mesh: Three.Mesh, body: Cannon.Body }`
- `men`: Array of player objects `{ mesh: Three.Mesh, body: Cannon.Body }`
- `contraints`: Array of Cannon.js LockConstraint objects connecting handlers to players

**Description:** 
- Creates `numberOfMan + 1` handlers (spacers between players)
- Creates `numberOfMan` players with the specified texture
- Automatically calculates positions to evenly distribute players across the field width
- Links handlers and players using LockConstraints to create connected rows

---

#### `getGroundAndWalls(): { ground, rightWall, leftWall, topLeftWall, topRightWall, bottomLeftWall, bottomRightWall }`
Creates all static game field elements (ground and walls).

**Returns:** Object containing:
- `ground`: Ground box object
- `rightWall`: Right side wall
- `leftWall`: Left side wall
- `topLeftWall`: Top-left goal wall
- `topRightWall`: Top-right goal wall
- `bottomLeftWall`: Bottom-left goal wall
- `bottomRightWall`: Bottom-right goal wall

**Description:** Creates the complete playing field structure with walls forming goal areas on both ends.

---

#### `GameStarted(): JSX.Element`
Main React component that renders the 3D game scene.

**Returns:** JSX element containing a canvas element

**Description:**
- Initializes Three.js scene, camera, lights, and renderer
- Sets up Cannon.js physics world
- Creates game objects (ball, players, walls, ground)
- Implements animation loop
- Handles keyboard controls for player movement
- Detects goal conditions

**Internal Functions:**
- `animate()`: Animation loop that updates physics simulation and renders the scene
- `onKeyDown(event)`: Keyboard event handler for player controls

**Keyboard Controls:**
- `ArrowLeft` / `ArrowRight`: Move green team left/right
- `a` / `d`: Move red team left/right
- `,` / `.`: Rotate green team players
- `h` / `j`: Rotate red team players

---

### Utility Functions (`src/utils.ts`)

#### `sum(arr: number[]): number`
Calculates the sum of all numbers in an array.

**Parameters:**
- `arr`: Array of numbers

**Returns:** Sum of all array elements

---

#### `interleaveArrays<T>(arr1: T[], arr2: T[]): T[]`
Interleaves elements from two arrays, alternating between them.

**Parameters:**
- `arr1`: First array
- `arr2`: Second array

**Returns:** New array with interleaved elements

**Example:**
```typescript
interleaveArrays([1, 2, 3], ['a', 'b', 'c'])
// Returns: [1, 'a', 2, 'b', 3, 'c']
```

---

#### `groupOfItems<T>({ step, arr, numberItemOfGroup }): T[][]`
Groups array elements into sub-arrays with specified step and group size.

**Parameters:**
- `step`: Number of elements to step forward between groups
- `arr`: Array to group
- `numberItemOfGroup`: Number of items per group

**Returns:** Array of grouped sub-arrays

**Description:** Used to create pairs or groups of handlers and players for constraint creation.

---

#### `random({ min, max }): number`
Generates a random number between min and max (inclusive).

**Parameters:**
- `min`: Minimum value
- `max`: Maximum value

**Returns:** Random number in the specified range

---

### Physics Conversion Functions (`src/cannon.ts`)

#### `convertThreeBoxUnitToCannon(size: number[]): number[]`
Converts Three.js box dimensions to Cannon.js half-extents.

**Parameters:**
- `size`: Array of 3 numbers `[width, height, depth]` (full dimensions)

**Returns:** Array of 3 numbers representing half-extents `[width/2, height/2, depth/2]`

**Description:** Cannon.js uses half-extents for box shapes, while Three.js uses full dimensions.

---

#### `convertCannonPositionToThree(position?: Cannon.Vec3): Three.Vector3`
Converts Cannon.js Vec3 position to Three.js Vector3.

**Parameters:**
- `position` (optional): Cannon.js Vec3 object

**Returns:** Three.js Vector3 object

---

#### `convertCannonQuaternionToThree(quaternion?: Cannon.Quaternion): Three.Quaternion`
Converts Cannon.js Quaternion rotation to Three.js Quaternion.

**Parameters:**
- `quaternion` (optional): Cannon.js Quaternion object

**Returns:** Three.js Quaternion object

---

## Constants (`src/constants.ts`)

Game field and object dimensions (in meters):

- `GROUND_WIDTH`: 0.5 - Width of the playing field
- `GROUND_LENGTH`: 0.8 - Length of the playing field
- `GROUND_HEIGHT`: 0.2 - Height of the ground
- `WALL_WIDTH`: 0.05 - Width of wall elements
- `WALL_HEIGHT`: 0.09 - Height of wall elements
- `SOCCER_MAN_HEIGHT`: 0.08 - Height of player figures
- `SOCCER_MAN_WIDTH`: 0.015 - Width of player figures
- `BALL_SIZE`: 0.01 - Radius of the ball
- `HANDLER_WIDTH`: 0.015 - Width of handler elements
- `HANDLER_HEIGHT`: 0.015 - Height of handler elements
- `HANDLER_GOAL_KEEPER_BUFFER`: 0.03 - Buffer space for goal keeper area
- `HANDLER_BUFFER_ROW`: 0.2 - Buffer space for row positioning
- `HANDLER_SPACE`: Calculated spacing between handler rows

## Dependencies

- **React**: UI framework
- **Three.js**: 3D graphics library
- **cannon-es**: Physics engine
- **OrbitControls**: Camera controls from Three.js examples

## Usage

```tsx
import GameStarted from '@table-soccer/game-started';

function App() {
  return <GameStarted />;
}
```

## Game Mechanics

- **Physics**: Uses Cannon.js for realistic ball and player physics
- **Controls**: Keyboard-based controls for two teams (green and red)
- **Goal Detection**: Automatically detects when ball crosses goal lines
- **Player Rotation**: Players can be rotated to control ball direction
- **Constraints**: Handlers and players are connected via physics constraints

## Notes

- The game uses a fixed timestep physics simulation (60 FPS)
- Canvas is rendered within the React component tree
- Shadow mapping is enabled for visual depth
- OrbitControls allow camera manipulation during gameplay

