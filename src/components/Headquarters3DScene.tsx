import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { GameState } from '../types/game';

export type InteractiveBuildingId =
  | 'WAREHOUSE'
  | 'OFFICE'
  | 'FLEET'
  | 'DISPATCH'
  | 'MARKETING'
  | 'FINANCE'
  | 'BUSINESS_DEV';

interface Headquarters3DSceneProps {
  gameState: GameState;
  activeBuilding?: InteractiveBuildingId | null;
  onSelectBuilding: (buildingId: InteractiveBuildingId) => void;
  onResetView?: () => void;
}

interface HotspotConfig {
  id: InteractiveBuildingId;
  nameAr: string;
  icon: string;
  pos: [number, number, number];
  lookAt: [number, number, number];
  camPos: [number, number, number];
}

const HOTSPOTS: HotspotConfig[] = [
  {
    id: 'WAREHOUSE',
    nameAr: 'المستودع المركزي',
    icon: '📦',
    pos: [-4.2, 1.8, 2],
    lookAt: [-4.2, 1.2, 2],
    camPos: [-1.5, 6.5, 7],
  },
  {
    id: 'OFFICE',
    nameAr: 'المقر الإداري والموظفين',
    icon: '🏢',
    pos: [4.2, 2.5, -2.5],
    lookAt: [4.2, 1.8, -2.5],
    camPos: [6.5, 6.8, 3.2],
  },
  {
    id: 'FLEET',
    nameAr: 'كراج وساحة الأسطول',
    icon: '🚚',
    pos: [-4.2, 1.2, -4.5],
    lookAt: [-4.2, 0.8, -4.5],
    camPos: [-1.8, 6.0, -1.2],
  },
  {
    id: 'DISPATCH',
    nameAr: 'أرصفة الفرز والترحيل',
    icon: '⚡',
    pos: [1.2, 1.5, 3.5],
    lookAt: [1.2, 0.8, 3.5],
    camPos: [3.2, 5.5, 7.2],
  },
  {
    id: 'MARKETING',
    nameAr: 'لوحة الإعلانات والحملات',
    icon: '📢',
    pos: [6.2, 2.2, 4.8],
    lookAt: [6.2, 1.8, 4.8],
    camPos: [7.2, 5.0, 8.0],
  },
  {
    id: 'FINANCE',
    nameAr: 'الخزينة والحسابات',
    icon: '💰',
    pos: [1.5, 1.4, -4.2],
    lookAt: [1.5, 0.8, -4.2],
    camPos: [3.2, 5.2, -1.2],
  },
  {
    id: 'BUSINESS_DEV',
    nameAr: 'بوابة المدينة والتعاقدات',
    icon: '🌐',
    pos: [-6.8, 1.8, 6.2],
    lookAt: [-6.8, 1.2, 6.2],
    camPos: [-3.8, 5.8, 9.5],
  },
];

export const Headquarters3DScene: React.FC<Headquarters3DSceneProps> = ({
  gameState,
  activeBuilding,
  onSelectBuilding,
  onResetView,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep live reference to gameState without re-initializing Three.js
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  // Scene instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Orbit control angles (single finger drag)
  const sphericalRef = useRef({ radius: 21, theta: 0.78, phi: 0.95 });
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);

  // Camera lerp targets
  const targetCamPos = useRef(new THREE.Vector3(14, 16, 14));
  const currentCamPos = useRef(new THREE.Vector3(14, 16, 14));
  const targetLookAt = useRef(new THREE.Vector3(0, 1, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 1, 0));
  const isFocusedOnBuilding = useRef(false);

  // Dynamic animation handles
  const movingVehiclesRef = useRef<THREE.Group[]>([]);
  const conveyorParcelsRef = useRef<THREE.Mesh[]>([]);
  const animatedWorkersRef = useRef<THREE.Group[]>([]);
  const clickableMeshesRef = useRef<THREE.Object3D[]>([]);

  // Lighting refs
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const streetSpotsRef = useRef<THREE.SpotLight[]>([]);

  // Active status badges derived from gameState
  const activeShipmentsCount = useMemo(() => {
    return gameState.shipments.filter(
      (s) =>
        s.status === 'OUT_FOR_DELIVERY' ||
        s.status === 'ASSIGNED_TO_COURIER' ||
        s.status === 'DELIVERY_ATTEMPT'
    ).length;
  }, [gameState.shipments]);

  const pendingRequestsCount = useMemo(() => {
    return gameState.shipments.filter((s) => s.status === 'NEW_REQUEST').length;
  }, [gameState.shipments]);

  const warehouseCount = useMemo(() => {
    return gameState.shipments.filter(
      (s) =>
        s.status === 'ARRIVED_AT_WAREHOUSE' ||
        s.status === 'RECEIVED_AT_WAREHOUSE' ||
        s.status === 'WAITING_SORTING' ||
        s.status === 'SORTING' ||
        s.status === 'PREPARING_AT_WAREHOUSE'
    ).length;
  }, [gameState.shipments]);

  const fleetCount = gameState.vehicles?.length || 0;
  const companyLevel = gameState.company?.level || 1;

  // Zoom / Focus on building change
  const focusOn = useCallback((buildingId: InteractiveBuildingId | null) => {
    if (!buildingId) {
      isFocusedOnBuilding.current = false;
      const { radius, theta, phi } = sphericalRef.current;
      targetCamPos.current.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
      targetLookAt.current.set(0, 1, 0);
      return;
    }

    const spot = HOTSPOTS.find((h) => h.id === buildingId);
    if (spot) {
      isFocusedOnBuilding.current = true;
      targetCamPos.current.set(...spot.camPos);
      targetLookAt.current.set(...spot.lookAt);
    }
  }, []);

  useEffect(() => {
    focusOn(activeBuilding || null);
  }, [activeBuilding, focusOn]);

  // Main Three.js Lifecycle
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 360;
    const height = containerRef.current.clientHeight || 500;

    // 1. Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x172b3b);
    scene.fog = new THREE.FogExp2(0x172b3b, 0.02);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 120);
    camera.position.set(14, 16, 14);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;
    currentCamPos.current.copy(camera.position);

    // 3. Renderer with capped pixel ratio (saves mobile battery and eliminates freeze)
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Lighting
    const hemiLight = new THREE.HemisphereLight(0xfff5e6, 0x172b3b, 0.8);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff0d0, 1.3);
    sunLight.position.set(16, 22, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 512;
    sunLight.shadow.mapSize.height = 512;
    sunLight.shadow.bias = -0.002;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Palette Definition
    const palette = {
      ground: 0x1b2f42,
      asphalt: 0x22364a,
      lineOrange: 0xe99a36,
      concrete: 0xc4beaf,
      warehouseWall: 0x24425a,
      warehouseRoof: 0x182d3f,
      officeWall: 0x142330,
      officeGlass: 0x63a88b,
      wood: 0x8a5833,
      box: 0xd9a46f,
      white: 0xf5f3ee,
    };

    // 5. Campus Ground Base
    const groundMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(15, 16, 1, 32),
      new THREE.MeshStandardMaterial({ color: palette.ground, roughness: 0.9 })
    );
    groundMesh.position.y = -0.5;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Main Asphalt Roads
    const roadMat = new THREE.MeshStandardMaterial({ color: palette.asphalt, roughness: 0.75 });
    const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(15, 0.08, 4), roadMat);
    mainRoad.position.set(0, 0.04, 0);
    mainRoad.receiveShadow = true;
    scene.add(mainRoad);

    const crossRoad = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 13), roadMat);
    crossRoad.position.set(-4.5, 0.04, 1.5);
    crossRoad.receiveShadow = true;
    scene.add(crossRoad);

    // Road dash lines
    const lineMat = new THREE.MeshBasicMaterial({ color: palette.lineOrange });
    for (let i = -6; i <= 6; i += 2.2) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.16), lineMat);
      line.position.set(i, 0.05, 0);
      scene.add(line);
    }

    // 6. BUILDINGS SETUP
    const clickableMeshes: THREE.Object3D[] = [];

    const registerHitBox = (
      parentGroup: THREE.Group,
      id: InteractiveBuildingId,
      size: [number, number, number]
    ) => {
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.userData = { buildingId: id };
      parentGroup.add(hitBox);
      clickableMeshes.push(hitBox);
    };

    // A. CENTRAL WAREHOUSE
    const whGroup = new THREE.Group();
    whGroup.position.set(-4.2, 0, 2);

    const whBody = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 3.2, 4.0),
      new THREE.MeshStandardMaterial({ color: palette.warehouseWall, roughness: 0.6 })
    );
    whBody.position.y = 1.6;
    whBody.castShadow = true;
    whBody.receiveShadow = true;
    whGroup.add(whBody);

    const whRoof = new THREE.Mesh(
      new THREE.ConeGeometry(3.6, 1.1, 4),
      new THREE.MeshStandardMaterial({ color: palette.warehouseRoof, roughness: 0.5 })
    );
    whRoof.position.y = 3.7;
    whRoof.rotation.y = Math.PI / 4;
    whRoof.scale.set(1.1, 1, 0.85);
    whRoof.castShadow = true;
    whGroup.add(whRoof);

    // Rollup doors
    const rollMat = new THREE.MeshStandardMaterial({ color: palette.lineOrange, metalness: 0.4 });
    const rDoor1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.15), rollMat);
    rDoor1.position.set(-1.1, 1.05, 2.05);
    whGroup.add(rDoor1);

    const rDoor2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.15), rollMat);
    rDoor2.position.set(1.1, 1.05, 2.05);
    whGroup.add(rDoor2);

    // Cardboard boxes & pallets outside
    const palletMat = new THREE.MeshStandardMaterial({ color: palette.wood });
    const boxMat = new THREE.MeshStandardMaterial({ color: palette.box, roughness: 0.8 });
    for (let p = 0; p < 3; p++) {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.1), palletMat);
      pallet.position.set(-3.0, 0.06, 0.8 + p * 1.3);
      whGroup.add(pallet);

      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.48), boxMat);
      b1.position.set(-3.2, 0.35, 0.8 + p * 1.3 - 0.15);
      b1.castShadow = true;
      whGroup.add(b1);

      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.48), boxMat);
      b2.position.set(-2.8, 0.35, 0.8 + p * 1.3 + 0.15);
      b2.castShadow = true;
      whGroup.add(b2);

      const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.42), boxMat);
      b3.position.set(-3.0, 0.78, 0.8 + p * 1.3);
      b3.castShadow = true;
      whGroup.add(b3);
    }

    registerHitBox(whGroup, 'WAREHOUSE', [5.6, 4.4, 4.8]);
    scene.add(whGroup);

    // B. HEADQUARTERS OFFICE
    const offGroup = new THREE.Group();
    offGroup.position.set(4.2, 0, -2.5);

    const offHeight = 2.4 + Math.min(companyLevel, 4) * 0.8;
    const offBody = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, offHeight, 3.6),
      new THREE.MeshStandardMaterial({ color: palette.officeWall, roughness: 0.5 })
    );
    offBody.position.y = offHeight / 2;
    offBody.castShadow = true;
    offBody.receiveShadow = true;
    offGroup.add(offBody);

    // Office glass bands
    const glassMat = new THREE.MeshStandardMaterial({
      color: palette.officeGlass,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    for (let f = 0; f < 3; f++) {
      const windowBand = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.45, 0.1), glassMat);
      windowBand.position.set(0, 0.8 + f * 0.85, 1.85);
      offGroup.add(windowBand);
    }

    // Modern canopy
    const offCanopy = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.1, 1.1),
      new THREE.MeshStandardMaterial({ color: palette.lineOrange })
    );
    offCanopy.position.set(0, 1.3, 2.3);
    offCanopy.castShadow = true;
    offGroup.add(offCanopy);

    registerHitBox(offGroup, 'OFFICE', [4.8, offHeight + 1.2, 4.4]);
    scene.add(offGroup);

    // C. FLEET DEPOT & PARKING
    const fleetGroup = new THREE.Group();
    fleetGroup.position.set(-4.2, 0, -4.5);

    const fleetGround = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.08, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x1f3448 })
    );
    fleetGround.position.y = 0.04;
    fleetGround.receiveShadow = true;
    fleetGroup.add(fleetGround);

    // Parked van & motorcycle models
    const parkedVan = createSimpleVehicle('VAN', palette.lineOrange);
    parkedVan.position.set(-1.2, 0, 0);
    fleetGroup.add(parkedVan);

    const parkedScooter = createSimpleVehicle('SCOOTER', palette.officeGlass);
    parkedScooter.position.set(0.1, 0, 0);
    fleetGroup.add(parkedScooter);

    const parkedTruck = createSimpleVehicle('TRUCK', palette.white);
    parkedTruck.position.set(1.4, 0, 0);
    fleetGroup.add(parkedTruck);

    registerHitBox(fleetGroup, 'FLEET', [6.0, 2.5, 4.2]);
    scene.add(fleetGroup);

    // D. SORTING & DISPATCH BAY
    const dispatchGroup = new THREE.Group();
    dispatchGroup.position.set(1.2, 0, 3.5);

    const dPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.35, 2.4),
      new THREE.MeshStandardMaterial({ color: palette.concrete })
    );
    dPlatform.position.y = 0.18;
    dispatchGroup.add(dPlatform);

    // Conveyor belt
    const cBelt = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.2, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 })
    );
    cBelt.position.set(0, 0.45, 0);
    dispatchGroup.add(cBelt);

    // Animated Conveyor parcels
    const conveyorBoxes: THREE.Mesh[] = [];
    for (let c = 0; c < 3; c++) {
      const pBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.32), boxMat);
      pBox.position.set(-1.0 + c * 1.0, 0.68, 0);
      dispatchGroup.add(pBox);
      conveyorBoxes.push(pBox);
    }
    conveyorParcelsRef.current = conveyorBoxes;

    registerHitBox(dispatchGroup, 'DISPATCH', [4.2, 2.2, 2.8]);
    scene.add(dispatchGroup);

    // E. MARKETING LED BILLBOARD
    const mktGroup = new THREE.Group();
    mktGroup.position.set(6.2, 0, 4.8);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), poleMat);
    p1.position.set(-0.8, 1.4, 0);
    mktGroup.add(p1);

    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), poleMat);
    p2.position.set(0.8, 1.4, 0);
    mktGroup.add(p2);

    const boardScreen = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.3, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, emissive: 0x172b3b })
    );
    boardScreen.position.set(0, 3.0, 0);
    boardScreen.rotation.y = -Math.PI / 6;
    mktGroup.add(boardScreen);

    registerHitBox(mktGroup, 'MARKETING', [2.8, 4.0, 1.8]);
    scene.add(mktGroup);

    // F. TREASURY / SAFE
    const finGroup = new THREE.Group();
    finGroup.position.set(1.5, 0, -4.2);

    const safeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.6, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x243342, metalness: 0.8, roughness: 0.3 })
    );
    safeMesh.position.y = 0.8;
    safeMesh.castShadow = true;
    finGroup.add(safeMesh);

    const dialMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0xe99a36, metalness: 0.9 })
    );
    dialMesh.rotation.x = Math.PI / 2;
    dialMesh.position.set(0, 0.95, 0.8);
    finGroup.add(dialMesh);

    registerHitBox(finGroup, 'FINANCE', [2.2, 2.2, 2.2]);
    scene.add(finGroup);

    // G. CITY CONTRACTS GATE
    const gateGroup = new THREE.Group();
    gateGroup.position.set(-6.8, 0, 6.2);

    const archMat = new THREE.MeshStandardMaterial({ color: palette.concrete });
    const gL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.2, 0.7), archMat);
    gL.position.set(-1.6, 1.6, 0);
    gateGroup.add(gL);

    const gR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.2, 0.7), archMat);
    gR.position.set(1.6, 1.6, 0);
    gateGroup.add(gR);

    const gTop = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.7, 0.9), archMat);
    gTop.position.set(0, 3.3, 0);
    gateGroup.add(gTop);

    registerHitBox(gateGroup, 'BUSINESS_DEV', [4.5, 4.0, 1.8]);
    scene.add(gateGroup);

    // 7. ACTIVE MOVING DELIVERY VEHICLE
    const movingVan = createSimpleVehicle('VAN', palette.lineOrange);
    movingVan.position.set(-5, 0, 0);
    scene.add(movingVan);
    movingVehiclesRef.current = [movingVan];

    // 8. ANIMATED WORKERS
    const workers: THREE.Group[] = [];
    for (let w = 0; w < 3; w++) {
      const worker = createSimpleWorker(w === 0 ? 0x2563eb : w === 1 ? 0xe99a36 : 0x10b981);
      worker.position.set(-1.8 + w * 1.4, 0, 2.6);
      scene.add(worker);
      workers.push(worker);
    }
    animatedWorkersRef.current = workers;

    clickableMeshesRef.current = clickableMeshes;

    // 9. ANIMATION LOOP (Throttles when tab is backgrounded)
    let clock = new THREE.Clock();

    const renderLoop = () => {
      animFrameIdRef.current = requestAnimationFrame(renderLoop);

      // Skip render if page is hidden to save battery
      if (document.hidden) return;

      const time = clock.getElapsedTime();

      // Camera lerp
      currentCamPos.current.lerp(targetCamPos.current, 0.08);
      currentLookAt.current.lerp(targetLookAt.current, 0.08);
      camera.position.copy(currentCamPos.current);
      camera.lookAt(currentLookAt.current);

      // Animate conveyor parcels
      conveyorParcelsRef.current.forEach((box, i) => {
        box.position.x = ((time * 0.7 + i * 1.0) % 2.8) - 1.4;
      });

      // Animate active delivery van if shipments are in progress
      const state = gameStateRef.current;
      const activeShipments = state.shipments.filter(
        (s) =>
          s.status === 'OUT_FOR_DELIVERY' ||
          s.status === 'ASSIGNED_TO_COURIER' ||
          s.status === 'DELIVERY_ATTEMPT'
      ).length;

      if (activeShipments > 0 && movingVehiclesRef.current[0]) {
        const van = movingVehiclesRef.current[0];
        const lap = (time * 0.9) % 14;
        if (lap < 7) {
          van.position.x = -5 + (lap / 7) * 9;
          van.rotation.y = 0;
        } else {
          van.position.x = 4 - ((lap - 7) / 7) * 9;
          van.rotation.y = Math.PI;
        }
      }

      // Animate worker stepping bob
      animatedWorkersRef.current.forEach((w, idx) => {
        w.position.y = Math.abs(Math.sin(time * 3.5 + idx * 1.5)) * 0.06;
      });

      // Day / Night lighting update (every frame, light calculation)
      const minutes = state.clock?.minutesFromMidnight ?? 540;
      const hour = 8 + minutes / 60;
      const isNight = hour >= 19 || hour < 6;
      const isDusk = hour >= 17 && hour < 19;

      if (isNight) {
        sunLight.intensity = 0.2;
        hemiLight.intensity = 0.35;
      } else if (isDusk) {
        sunLight.intensity = 0.8;
        hemiLight.intensity = 0.65;
      } else {
        sunLight.intensity = 1.3;
        hemiLight.intensity = 0.8;
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    // 10. RESIZE OBSERVER
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      if (newW <= 0 || newH <= 0) return;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      renderer.dispose();
    };
  }, []); // Run ONCE for lifetime to eliminate memory leaks and render stalls

  // Single-finger touch orbit & drag handling
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    prevPointerRef.current = { x: e.clientX, y: e.clientY };
    dragDistanceRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - prevPointerRef.current.x;
    const dy = e.clientY - prevPointerRef.current.y;
    prevPointerRef.current = { x: e.clientX, y: e.clientY };
    dragDistanceRef.current += Math.hypot(dx, dy);

    // If focused on building, allow dragging to break free to free orbit
    if (isFocusedOnBuilding.current && dragDistanceRef.current > 15) {
      isFocusedOnBuilding.current = false;
      targetLookAt.current.set(0, 1, 0);
    }

    // Update spherical angles
    sphericalRef.current.theta -= dx * 0.007;
    sphericalRef.current.phi = Math.max(
      0.3,
      Math.min(1.35, sphericalRef.current.phi - dy * 0.007)
    );

    if (!isFocusedOnBuilding.current) {
      const { radius, theta, phi } = sphericalRef.current;
      targetCamPos.current.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;

    // If drag distance is very small, it's a Tap!
    if (dragDistanceRef.current < 10) {
      if (!containerRef.current || !cameraRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      const intersects = raycaster.intersectObjects(clickableMeshesRef.current, true);

      if (intersects.length > 0) {
        let currentObj: THREE.Object3D | null = intersects[0].object;
        while (currentObj && !currentObj.userData.buildingId) {
          currentObj = currentObj.parent;
        }
        if (currentObj && currentObj.userData.buildingId) {
          const buildingId = currentObj.userData.buildingId as InteractiveBuildingId;
          onSelectBuilding(buildingId);
        }
      }
    }
  };

  // Zoom controls (+ / -)
  const handleZoom = (delta: number) => {
    sphericalRef.current.radius = Math.max(12, Math.min(30, sphericalRef.current.radius + delta));
    if (!isFocusedOnBuilding.current) {
      const { radius, theta, phi } = sphericalRef.current;
      targetCamPos.current.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => (isDraggingRef.current = false)}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Tycoon Controls & Status Overlay */}
      <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
        {/* Top Floating Badges */}
        <div className="flex items-center justify-between gap-2">
          {/* Company Level & Environment Badge */}
          <div className="pointer-events-auto bg-[#101F2B]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#3D5467]/60 text-xs text-[#E9E4D9] flex items-center gap-2 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-[#E99A36]">المقر الرئيسي:</span>
            <span>القاهرة الكبرى</span>
            <span className="text-slate-500">|</span>
            <span className="font-mono-num font-black text-amber-300">مستوى {companyLevel}</span>
          </div>

          {/* Quick Zoom & Reset Controls (Touch Friendly) */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleZoom(-3)}
              className="w-8 h-8 rounded-xl bg-[#101F2B]/90 hover:bg-[#172B3B] text-[#E9E4D9] border border-[#3D5467]/60 flex items-center justify-center font-bold text-sm shadow transition-transform active:scale-90 cursor-pointer"
              title="تقريب الكاميرا (+)"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => handleZoom(3)}
              className="w-8 h-8 rounded-xl bg-[#101F2B]/90 hover:bg-[#172B3B] text-[#E9E4D9] border border-[#3D5467]/60 flex items-center justify-center font-bold text-sm shadow transition-transform active:scale-90 cursor-pointer"
              title="تبعيد الكاميرا (-)"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                focusOn(null);
                if (onResetView) onResetView();
              }}
              className="px-2.5 h-8 rounded-xl bg-[#101F2B]/90 hover:bg-[#172B3B] text-[#E9E4D9] border border-[#3D5467]/60 flex items-center justify-center text-xs font-bold shadow transition-transform active:scale-90 cursor-pointer"
              title="نظرة عامة على المقر"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Bottom Hotspots Quick Selection Pill Strip */}
        <div className="pointer-events-auto flex items-center justify-center gap-1.5 flex-wrap">
          {HOTSPOTS.map((spot) => {
            const isSelected = activeBuilding === spot.id;
            let badge = 0;
            if (spot.id === 'WAREHOUSE') badge = warehouseCount;
            if (spot.id === 'DISPATCH') badge = activeShipmentsCount + pendingRequestsCount;
            if (spot.id === 'FLEET') badge = fleetCount;

            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => onSelectBuilding(spot.id)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-black transition-all shadow-md flex items-center gap-1 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[#E99A36] text-[#101F2B] ring-2 ring-amber-300'
                    : 'bg-[#101F2B]/90 text-[#E9E4D9] hover:bg-[#172B3B] border border-[#3D5467]/60'
                }`}
              >
                <span>{spot.icon}</span>
                <span className="hidden sm:inline">{spot.nameAr}</span>
                {badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono-num font-black">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Procedural 3D Helpers (Low Poly, Fast Creation)
function createSimpleVehicle(type: 'VAN' | 'SCOOTER' | 'TRUCK', color: number): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });

  if (type === 'VAN') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 1.7), bodyMat);
    cab.position.y = 0.5;
    cab.castShadow = true;
    group.add(cab);

    [-0.42, 0.42].forEach((x) => {
      [-0.5, 0.5].forEach((z) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.16, z);
        group.add(wheel);
      });
    });
  } else if (type === 'SCOOTER') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.8), bodyMat);
    frame.position.y = 0.3;
    group.add(frame);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xe99a36 })
    );
    box.position.set(0, 0.55, -0.2);
    group.add(box);

    [-0.3, 0.3].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 8), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.13, z);
      group.add(wheel);
    });
  } else {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.85, 0.85), bodyMat);
    cab.position.set(0, 0.65, 0.65);
    cab.castShadow = true;
    group.add(cab);

    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.7),
      new THREE.MeshStandardMaterial({ color: 0xdedad1 })
    );
    cargo.position.set(0, 0.85, -0.55);
    cargo.castShadow = true;
    group.add(cargo);

    [-0.54, 0.54].forEach((x) => {
      [-1.0, -0.25, 0.65].forEach((z) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.2, z);
        group.add(wheel);
      });
    });
  }

  return group;
}

function createSimpleWorker(vestColor: number): THREE.Group {
  const group = new THREE.Group();

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xd4a373 })
  );
  head.position.y = 0.8;
  group.add(head);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: vestColor })
  );
  torso.position.y = 0.52;
  group.add(torso);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xd4a373 })
  );
  box.position.set(0, 0.52, 0.18);
  group.add(box);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  [-0.06, 0.06].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 6), legMat);
    leg.position.set(x, 0.18, 0);
    group.add(leg);
  });

  return group;
}
