import { useEffect, useRef } from 'react';
import * as Three from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import type { RefObject } from 'react';

type SceneSetup = {
  scene: Three.Scene;
  camera: Three.PerspectiveCamera;
  renderer: Three.WebGLRenderer;
  controls: OrbitControls;
  ambientLight: Three.AmbientLight;
  spotlight: Three.SpotLight;
};

export function useThreeScene(
  canvasRef: RefObject<HTMLCanvasElement>
): SceneSetup | null {
  const sceneRef = useRef<SceneSetup | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene
    const scene = new Three.Scene();

    // Use viewport dimensions for full screen
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Renderer
    const renderer = new Three.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = Three.PCFSoftShadowMap;

    // Camera
    const camera = new Three.PerspectiveCamera(
      30,
      width / height,
      0.5,
      1000
    );
    camera.position.set(0, 2, 1);

    // Controls
    const controls = new OrbitControls(camera, canvasRef.current);
    controls.update();

    // Lights
    const ambientLight = new Three.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const spotlight = new Three.SpotLight(0xffffff, 0.7, 0, Math.PI / 4, 1);
    spotlight.position.set(10, 30, 20);
    spotlight.target.position.set(0, 0, 0);
    spotlight.castShadow = true;
    spotlight.shadow.camera.near = 20;
    spotlight.shadow.camera.far = 50;
    spotlight.shadow.camera.fov = 40;
    spotlight.shadow.bias = -0.001;
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;
    scene.add(spotlight);

    // Handle window resize
    const handleResize = () => {
      if (!canvasRef.current) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      ambientLight,
      spotlight,
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
      // Note: Three.js objects will be garbage collected, but we could add more cleanup if needed
    };
  }, [canvasRef]);

  return sceneRef.current;
}

