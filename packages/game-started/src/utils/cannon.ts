import * as Three from 'three';
import * as Cannon from 'cannon-es';

export const convertThreeBoxUnitToCannon = (size: number[]) => {
  return [size[0] / 2, size[1] / 2, size[2] / 2];
};

export const convertCannonPositionToThree = (position?: Cannon.Vec3) => {
  return new Three.Vector3(position?.x, position?.y, position?.z);
};

export const convertCannonQuaternionToThree = (
  quaternion?: Cannon.Quaternion
) => {
  return new Three.Quaternion(
    quaternion?.x,
    quaternion?.y,
    quaternion?.z,
    quaternion?.w
  );
};

