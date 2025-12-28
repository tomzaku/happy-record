import { useEffect } from 'react';
import * as Cannon from 'cannon-es';
import type { GameEntity, KeyboardControls } from '../types';

type KeyboardControlsOptions = {
  greenHandlers: GameEntity[];
  greenMen: GameEntity[];
  redHandlers: GameEntity[];
  redMen: GameEntity[];
  controls: KeyboardControls;
};

export function useKeyboardControls({
  greenHandlers,
  greenMen,
  redHandlers,
  redMen,
  controls,
}: KeyboardControlsOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case controls.greenLeft: {
          const delta = new Cannon.Vec3(-0.01, 0, 0);
          greenHandlers.forEach(handler => {
            handler.body.position.vadd(delta, handler.body.position);
          });
          greenMen.forEach(man => {
            man.body.position.vadd(delta, man.body.position);
          });
          break;
        }
        case controls.greenRight: {
          const delta = new Cannon.Vec3(0.01, 0, 0);
          greenHandlers.forEach(handler => {
            handler.body.position.vadd(delta, handler.body.position);
          });
          greenMen.forEach(man => {
            man.body.position.vadd(delta, man.body.position);
          });
          break;
        }
        case controls.redLeft: {
          const delta = new Cannon.Vec3(-0.01, 0, 0);
          redHandlers.forEach(handler => {
            handler.body.position.vadd(delta, handler.body.position);
          });
          redMen.forEach(man => {
            man.body.position.vadd(delta, man.body.position);
          });
          break;
        }
        case controls.redRight: {
          const delta = new Cannon.Vec3(0.01, 0, 0);
          redHandlers.forEach(handler => {
            handler.body.position.vadd(delta, handler.body.position);
          });
          redMen.forEach(man => {
            man.body.position.vadd(delta, man.body.position);
          });
          break;
        }
        case controls.greenRotateLeft: {
          greenMen.forEach(man => {
            man.body.quaternion.setFromAxisAngle(
              new Cannon.Vec3(1, 0, 0),
              Math.PI / 3
            );
          });
          break;
        }
        case controls.greenRotateRight: {
          greenMen.forEach(man => {
            man.body.quaternion.setFromAxisAngle(
              new Cannon.Vec3(1, 0, 0),
              -Math.PI / 3
            );
          });
          break;
        }
        case controls.redRotateLeft: {
          redMen.forEach(man => {
            const angle = man.body.quaternion.toAxisAngle()[1] || 0;
            if (angle > Math.PI) return;
            man.body.quaternion.setFromAxisAngle(
              new Cannon.Vec3(1, 0, 0),
              -Math.PI / 3
            );
          });
          break;
        }
        case controls.redRotateRight: {
          redMen.forEach(man => {
            const angle = man.body.quaternion.toAxisAngle()[1] || 0;
            if (angle > Math.PI) return;
            man.body.quaternion.setFromAxisAngle(
              new Cannon.Vec3(1, 0, 0),
              Math.PI / 3
            );
          });
          break;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [greenHandlers, greenMen, redHandlers, redMen, controls]);
}

