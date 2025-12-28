import {
  GROUND_LENGTH,
  WALL_WIDTH,
  HANDLER_GOAL_KEEPER_BUFFER,
  HANDLER_SPACE,
} from '../constants';

export const handlerZIndex = Array(8)
  .fill(0)
  .map((_, i) => {
    return (
      GROUND_LENGTH / 2 -
      WALL_WIDTH -
      HANDLER_GOAL_KEEPER_BUFFER -
      i * HANDLER_SPACE
    );
  });

