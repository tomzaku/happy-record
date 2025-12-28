# Game Architecture

## Overview

This document describes the refactored architecture of the Game Started package, following modern game development best practices.

## Directory Structure

```
src/
├── config/          # Game configuration
│   └── gameConfig.ts        # Default game settings and keyboard controls
├── entities/        # Game entities (self-contained modules)
│   ├── Ball.ts              # Ball entity creation
│   ├── Field.ts              # Field, walls, and floor creation
│   └── Player.ts             # Player rows with handlers and constraints
├── hooks/           # Custom React hooks
│   ├── useGameLoop.ts        # Animation loop and physics simulation
│   ├── useGameWorld.ts       # Physics world and entity initialization
│   ├── useKeyboardControls.ts # Keyboard input handling
│   └── useThreeScene.ts      # Three.js scene setup
├── types/           # TypeScript type definitions
│   └── index.ts              # All type definitions
├── utils/           # Utility functions
│   ├── cannon.ts             # Physics conversion utilities
│   ├── fieldLayout.ts         # Field layout calculations
│   ├── texture.ts            # Texture creation utilities
│   └── utils.ts               # General utilities
├── constants.ts     # Game constants (dimensions, etc.)
└── index.tsx        # Main GameStarted component
```

## Architecture Principles

### 1. Separation of Concerns

Each module has a single, well-defined responsibility:

- **Entities**: Create and configure game objects (meshes + physics bodies)
- **Hooks**: Manage lifecycle and state
- **Utils**: Provide reusable helper functions
- **Config**: Centralize game settings

### 2. Entity-Based Design

Game entities are self-contained modules that:
- Create Three.js meshes
- Create Cannon.js physics bodies
- Return both for integration into the scene

Example: `createBall()` returns `{ mesh, body }` ready to be added to scene and world.

### 3. Hook-Based State Management

Custom hooks encapsulate complex logic:

- **useThreeScene**: Manages Three.js initialization and cleanup
- **useGameWorld**: Creates and manages all game entities
- **useGameLoop**: Handles animation and physics updates
- **useKeyboardControls**: Manages input handling

### 4. Type Safety

All functions and data structures are fully typed:
- `GameEntity`: Standard entity structure
- `PlayerRow`: Player row with handlers and constraints
- `GameConfig`: Game configuration type
- `KeyboardControls`: Control mapping type

### 5. Resource Management

Proper cleanup is handled in hooks:
- Three.js renderer disposal
- Event listener removal
- Animation frame cancellation
- Physics world cleanup

## Data Flow

```
GameStarted Component
    ↓
useThreeScene → Creates scene, camera, renderer
    ↓
useGameWorld → Creates physics world and entities
    ↓
useGameLoop → Updates entities and renders scene
    ↓
useKeyboardControls → Handles user input
```

## Benefits of This Architecture

1. **Testability**: Each module can be tested independently
2. **Maintainability**: Clear separation makes code easier to understand and modify
3. **Extensibility**: Easy to add new entities, hooks, or features
4. **Reusability**: Entities and hooks can be reused in other projects
5. **Type Safety**: TypeScript catches errors at compile time
6. **Performance**: Proper cleanup prevents memory leaks

## Migration from Old Code

The refactored code maintains the same functionality while improving:

- **Before**: 647 lines in a single file
- **After**: Modular structure with focused, single-responsibility modules
- **Before**: Mixed concerns (rendering, physics, input in one place)
- **After**: Clear separation with dedicated hooks and entities
- **Before**: Hard-coded configuration
- **After**: Centralized, easily modifiable configuration

## Future Enhancements

This architecture makes it easy to add:

- Game state management (pause, resume, restart)
- Score tracking
- Multiplayer support
- Different game modes
- Replay system
- AI players
- Sound effects
- Particle effects

