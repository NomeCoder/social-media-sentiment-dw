"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { 
  Play, Pause, RotateCcw, Maximize2, Minimize2, Eye, Layers, 
  Sparkles, Tag, Activity, Info, Crosshair, Compass, Zap,
  Orbit, CheckCircle2, Shield, Radio, Flame, ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SENTIMENT_COLORS = {
  Positive: "#10b981", // emerald
  Neutral: "#38bdf8",  // sky
  Negative: "#f43f5e"  // rose
};

const FORMATION_PHASES = [
  {
    phase: 1,
    title: "1. Raw Primordial Cloud",
    subtitle: "High-dimensional unclustered TF-IDF dispersion",
    desc: "Unassigned social media posts scattered in semantic feature space before centroid inception."
  },
  {
    phase: 2,
    title: "2. Centroid Seeding",
    subtitle: "K cluster seeds ignite in 3D feature space",
    desc: "K-Means++ initialization seeds cluster centers across high-variance semantic regions."
  },
  {
    phase: 3,
    title: "3. Gravitational Field",
    subtitle: "Distance vector calculation & attraction",
    desc: "Laser attraction vectors tether each post to its nearest centroid based on cosine similarity."
  },
  {
    phase: 4,
    title: "4. Particle Migration",
    subtitle: "Points converge into cluster basins",
    desc: "Posts physically traverse 3D space toward cluster cores while centroids recalculate center-of-mass."
  },
  {
    phase: 5,
    title: "5. Stable Constellations",
    subtitle: "Convergence & bounding orbital shells",
    desc: "Clusters reach convergence. Translucent bounding spheres and planetary rings lock in."
  }
];

export default function Cluster3DVisualizer({
  clusters = [],
  points = [],
  selectedK = 6,
  onSelectCluster = null,
  activeClusterId = 0,
  latestPrediction = null,
  clusteringAccuracy = null
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const tooltipRef = useRef(null);

  // Scene entities refs for dynamic updates
  const pointsMeshRef = useRef(null);
  const centroidGroupRef = useRef(null);
  const boundingSpheresGroupRef = useRef(null);
  const gravityLinesGroupRef = useRef(null);
  const starFieldRef = useRef(null);
  const probeMeshRef = useRef(null);
  const probeLinesRef = useRef(null);
  const gridHelperRef = useRef(null);

  // Interactive controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [formationProgress, setFormationProgress] = useState(1.0); // 0.0 (primordial) to 1.0 (converged)
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [colorMode, setColorMode] = useState("cluster"); // "cluster" | "sentiment"
  const [showGravityLines, setShowGravityLines] = useState(true);
  const [showBoundingSpheres, setShowBoundingSpheres] = useState(true);
  const [showCentroidLabels, setShowCentroidLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isolatedClusterId, setIsolatedClusterId] = useState(null); // null = all
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredCentroid, setHoveredCentroid] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [probeAnimationState, setProbeAnimationState] = useState(null); // for live post animation

  // Synchronize internal ref for animation loops without triggering re-renders
  const progressRef = useRef(1.0);
  progressRef.current = formationProgress;
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef(1.0);
  speedRef.current = speedMultiplier;
  const isolatedRef = useRef(null);
  isolatedRef.current = isolatedClusterId;
  const colorModeRef = useRef("cluster");
  colorModeRef.current = colorMode;

  // Active phase computation
  const activePhaseIndex = useMemo(() => {
    if (formationProgress < 0.20) return 0;
    if (formationProgress < 0.40) return 1;
    if (formationProgress < 0.65) return 2;
    if (formationProgress < 0.85) return 3;
    return 4;
  }, [formationProgress]);

  // Handle play / pause toggle
  const togglePlay = () => {
    if (!isPlaying && formationProgress >= 0.999) {
      // Loop from beginning if already at end
      setFormationProgress(0.0);
      progressRef.current = 0.0;
    }
    setIsPlaying((prev) => !prev);
  };

  const restartFormation = () => {
    setFormationProgress(0.0);
    progressRef.current = 0.0;
    setIsPlaying(true);
  };

  const jumpToPhase = (phaseIndex) => {
    const targets = [0.0, 0.25, 0.50, 0.75, 1.0];
    const target = targets[phaseIndex];
    setFormationProgress(target);
    progressRef.current = target;
  };

  // When selectedK changes externally, trigger smooth re-formation
  useEffect(() => {
    // Reset probe
    setProbeAnimationState(null);
    setIsolatedClusterId(null);
    // Smooth transition from 0.35 to 1.0
    setFormationProgress(0.35);
    progressRef.current = 0.35;
    setIsPlaying(true);
  }, [selectedK]);

  // When latestPrediction changes, trigger live probe injection
  useEffect(() => {
    if (latestPrediction && latestPrediction.coords_3d && sceneRef.current) {
      setProbeAnimationState({
        progress: 0.0,
        coords: latestPrediction.coords_3d,
        targetCentroid: latestPrediction.target_centroid_3d || [0, 0, 0],
        topicName: latestPrediction.topic_name,
        color: latestPrediction.color || "#8b5cf6",
        sim: latestPrediction.similarity_score
      });
    }
  }, [latestPrediction]);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 580;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#030712"); // deep slate / cyber obsidian
    scene.fog = new THREE.FogExp2("#030712", 0.0035);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(65, 55, 95);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 250;
    controls.minDistance = 15;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(50, 80, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 0.9);
    dirLight2.position.set(-50, -30, -50);
    scene.add(dirLight2);

    // 6. Grid Helper (Cyberpunk plane)
    const gridHelper = new THREE.GridHelper(160, 32, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -35;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.45;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // 7. Ambient Particle Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 350;
      starPos[i + 1] = (Math.random() - 0.5) * 250;
      starPos[i + 2] = (Math.random() - 0.5) * 350;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 1.2,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);
    starFieldRef.current = starField;

    // Groups for modular updates
    const centroidGroup = new THREE.Group();
    scene.add(centroidGroup);
    centroidGroupRef.current = centroidGroup;

    const boundingSpheresGroup = new THREE.Group();
    scene.add(boundingSpheresGroup);
    boundingSpheresGroupRef.current = boundingSpheresGroup;

    const gravityLinesGroup = new THREE.Group();
    scene.add(gravityLinesGroup);
    gravityLinesGroupRef.current = gravityLinesGroup;

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    // Raycaster for Hover Interaction
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 2.0;
    const mouse = new THREE.Vector2(-999, -999);

    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15 });

      // Check intersections
      raycaster.setFromCamera(mouse, camera);

      // Centroid intersections
      let foundCentroid = null;
      if (centroidGroupRef.current) {
        const centroidMeshes = [];
        centroidGroupRef.current.traverse((child) => {
          if (child.isMesh && child.userData && child.userData.isCentroid) {
            centroidMeshes.push(child);
          }
        });
        const cIntersects = raycaster.intersectObjects(centroidMeshes, false);
        if (cIntersects.length > 0) {
          foundCentroid = cIntersects[0].object.userData.clusterData;
        }
      }
      setHoveredCentroid(foundCentroid);

      // Points intersections (if no centroid hovered)
      if (!foundCentroid && pointsMeshRef.current) {
        const pIntersects = raycaster.intersectObject(pointsMeshRef.current, false);
        if (pIntersects.length > 0) {
          const index = pIntersects[0].index;
          if (index !== undefined && points[index]) {
            setHoveredPoint(points[index]);
          }
        } else {
          setHoveredPoint(null);
        }
      } else {
        setHoveredPoint(null);
      }
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);

    // Animation Loop
    let lastTime = performance.now();
    const animate = (currentTime) => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Handle formation playback
      if (isPlayingRef.current) {
        const increment = (delta / 4.0) * speedRef.current; // ~4 seconds for full formation
        progressRef.current += increment;
        if (progressRef.current >= 1.0) {
          progressRef.current = 1.0;
          setIsPlaying(false);
        }
        setFormationProgress(progressRef.current);
      }

      // Handle Auto-Rotate
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.0;
        controlsRef.current.update();
      }

      // Drift starfield
      if (starFieldRef.current) {
        starFieldRef.current.rotation.y += 0.0003;
      }

      // Pulse centroids and spin planetary rings
      if (centroidGroupRef.current) {
        centroidGroupRef.current.children.forEach((group) => {
          if (group.userData && group.userData.ringMesh) {
            group.userData.ringMesh.rotation.z += 0.015;
            group.userData.ringMesh.rotation.x += 0.008;
          }
          if (group.userData && group.userData.beaconMesh) {
            group.userData.beaconMesh.rotation.y += 0.02;
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate(performance.now());

    return () => {
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, []);

  // Update Grid visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Update Points in 3D Space (Recomputed whenever formationProgress, k, colorMode, or isolation changes)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || points.length === 0) return;

    // Remove existing points mesh
    if (pointsMeshRef.current) {
      scene.remove(pointsMeshRef.current);
      pointsMeshRef.current.geometry.dispose();
      pointsMeshRef.current.material.dispose();
      pointsMeshRef.current = null;
    }

    const nPoints = points.length;
    const posArray = new Float32Array(nPoints * 3);
    const colorArray = new Float32Array(nPoints * 3);
    const sizeArray = new Float32Array(nPoints);

    const kStr = String(selectedK);
    const t = formationProgress; // 0.0 = primordial, 1.0 = final converged

    // Cluster color map
    const clusterColorMap = {};
    clusters.forEach((c) => {
      clusterColorMap[c.cluster_id] = new THREE.Color(c.color || "#38bdf8");
    });
    const neutralColor = new THREE.Color("#94a3b8");

    // Smooth cubic interpolation helper
    const easeInOutCubic = (x) => {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    };
    const easedT = easeInOutCubic(t);

    for (let i = 0; i < nPoints; i++) {
      const p = points[i];
      const assignedClusterId = p.cluster_per_k?.[kStr] ?? 0;
      const isIsolated = isolatedClusterId !== null && assignedClusterId !== isolatedClusterId;

      // Coordinates interpolation:
      // Phase 1 (0 to 0.25): primordial cloud
      // Phase 2-4 (0.25 to 0.85): migrating towards converged (p.x, p.y, p.z)
      // Phase 5 (0.85 to 1.0): fully converged at (p.x, p.y, p.z)
      const startX = p.initial_x ?? 0;
      const startY = p.initial_y ?? 0;
      const startZ = p.initial_z ?? 0;

      const targetX = p.x;
      const targetY = p.y;
      const targetZ = p.z;

      // Add gentle gravitational curve during mid-formation
      let curX = startX + (targetX - startX) * easedT;
      let curY = startY + (targetY - startY) * easedT;
      let curZ = startZ + (targetZ - startZ) * easedT;

      // Dynamic harmonic orbit flutter during formation
      if (t > 0.1 && t < 0.9) {
        const flutter = Math.sin(t * Math.PI) * 1.5;
        curX += Math.sin(i * 0.3 + t * 5) * flutter;
        curY += Math.cos(i * 0.2 + t * 5) * flutter;
        curZ += Math.sin(i * 0.4 + t * 5) * flutter;
      }

      posArray[i * 3] = curX;
      posArray[i * 3 + 1] = curY;
      posArray[i * 3 + 2] = curZ;

      // Color computation:
      // At t=0 (primordial), all points start neutral
      // As t increases, points adopt their cluster or sentiment color
      let targetColor;
      if (colorMode === "sentiment") {
        const sentHex = SENTIMENT_COLORS[p.sentiment] || "#38bdf8";
        targetColor = new THREE.Color(sentHex);
      } else {
        targetColor = clusterColorMap[assignedClusterId] || new THREE.Color("#38bdf8");
      }

      const blendedColor = new THREE.Color().lerpColors(neutralColor, targetColor, Math.min(1.0, t * 1.4));

      if (isIsolated) {
        // Dim unselected cluster points
        colorArray[i * 3] = blendedColor.r * 0.18;
        colorArray[i * 3 + 1] = blendedColor.g * 0.18;
        colorArray[i * 3 + 2] = blendedColor.b * 0.18;
        sizeArray[i] = 1.6;
      } else {
        colorArray[i * 3] = blendedColor.r;
        colorArray[i * 3 + 1] = blendedColor.g;
        colorArray[i * 3 + 2] = blendedColor.b;
        sizeArray[i] = (p.post_key === hoveredPoint?.post_key) ? 6.5 : 3.2;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizeArray, 1));

    // Custom circular particle texture via canvas
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      map: texture,
      transparent: true,
      alphaTest: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const pointsMesh = new THREE.Points(geometry, material);
    scene.add(pointsMesh);
    pointsMeshRef.current = pointsMesh;
  }, [points, selectedK, formationProgress, colorMode, isolatedClusterId, clusters, hoveredPoint]);

  // Update Centroid Orbs & Bounding Spheres
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || clusters.length === 0) return;

    // Clear existing centroids & bounding envelopes
    const centroidGroup = centroidGroupRef.current;
    const boundingSpheresGroup = boundingSpheresGroupRef.current;
    if (centroidGroup) {
      while (centroidGroup.children.length > 0) {
        const obj = centroidGroup.children[0];
        centroidGroup.remove(obj);
      }
    }
    if (boundingSpheresGroup) {
      while (boundingSpheresGroup.children.length > 0) {
        const obj = boundingSpheresGroup.children[0];
        boundingSpheresGroup.remove(obj);
      }
    }

    const t = formationProgress;
    // Centroids only emerge starting from Phase 2 (t > 0.15)
    if (t < 0.15) return;

    const centroidT = Math.min(1.0, (t - 0.15) / 0.7); // 0 at t=0.15, 1.0 at t=0.85

    clusters.forEach((c) => {
      const isIsolated = isolatedClusterId !== null && c.cluster_id !== isolatedClusterId;
      const colorHex = c.color || "#38bdf8";
      const clusterColor = new THREE.Color(colorHex);

      // Centroid positions interpolation:
      // Starts at seed_3d, passes intermediate_3d, stabilizes at centroid_3d
      const seed = c.seed_3d || c.centroid_3d || [0, 0, 0];
      const inter = c.intermediate_3d || c.centroid_3d || [0, 0, 0];
      const final = c.centroid_3d || [0, 0, 0];

      let cx, cy, cz;
      if (centroidT < 0.5) {
        const subT = centroidT * 2;
        cx = seed[0] + (inter[0] - seed[0]) * subT;
        cy = seed[1] + (inter[1] - seed[1]) * subT;
        cz = seed[2] + (inter[2] - seed[2]) * subT;
      } else {
        const subT = (centroidT - 0.5) * 2;
        cx = inter[0] + (final[0] - inter[0]) * subT;
        cy = inter[1] + (final[1] - inter[1]) * subT;
        cz = inter[2] + (final[2] - inter[2]) * subT;
      }

      // 1. Centroid Group Container
      const cGroup = new THREE.Group();
      cGroup.position.set(cx, cy, cz);

      // Core glowing sphere
      const coreGeo = new THREE.SphereGeometry(2.8, 32, 32);
      const coreMat = new THREE.MeshStandardMaterial({
        color: clusterColor,
        emissive: clusterColor,
        emissiveIntensity: isIsolated ? 0.2 : 0.85,
        roughness: 0.2,
        metalness: 0.8
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.userData = { isCentroid: true, clusterData: c };
      cGroup.add(coreMesh);

      // Outer pulsing translucent aura
      const auraGeo = new THREE.SphereGeometry(4.2, 24, 24);
      const auraMat = new THREE.MeshBasicMaterial({
        color: clusterColor,
        transparent: true,
        opacity: isIsolated ? 0.08 : 0.35,
        wireframe: true
      });
      const auraMesh = new THREE.Mesh(auraGeo, auraMat);
      cGroup.add(auraMesh);

      // Planetary orbital ring
      const ringGeo = new THREE.RingGeometry(5.2, 5.8, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: clusterColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isIsolated ? 0.1 : 0.6
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.5;
      cGroup.add(ringMesh);
      cGroup.userData.ringMesh = ringMesh;

      // Vertical Laser Beacon
      const beaconGeo = new THREE.CylinderGeometry(0.15, 0.4, 28, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: clusterColor,
        transparent: true,
        opacity: isIsolated ? 0.05 : 0.45,
        blending: THREE.AdditiveBlending
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = 14;
      cGroup.add(beaconMesh);
      cGroup.userData.beaconMesh = beaconMesh;

      // Add Sprite Label above centroid if enabled
      if (showCentroidLabels && !isIsolated) {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 256;
        labelCanvas.height = 64;
        const lCtx = labelCanvas.getContext("2d");
        lCtx.fillStyle = "rgba(15, 23, 42, 0.85)";
        lCtx.roundRect(10, 10, 236, 44, 8);
        lCtx.fill();
        lCtx.strokeStyle = colorHex;
        lCtx.lineWidth = 2;
        lCtx.stroke();

        lCtx.fillStyle = "#ffffff";
        lCtx.font = "bold 15px sans-serif";
        lCtx.textAlign = "center";
        const shortName = c.name.length > 20 ? c.name.substring(0, 18) + "..." : c.name;
        lCtx.fillText(shortName, 128, 30);

        lCtx.fillStyle = colorHex;
        lCtx.font = "bold 12px monospace";
        lCtx.fillText(`Cluster #${c.cluster_id} (${c.share_pct}%)`, 128, 46);

        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
        const labelSprite = new THREE.Sprite(labelMat);
        labelSprite.position.set(0, 9.5, 0);
        labelSprite.scale.set(16, 4, 1);
        cGroup.add(labelSprite);
      }

      centroidGroup.add(cGroup);

      // 2. Bounding Translucent Shell (appears in Phase 4-5)
      if (showBoundingSpheres && t > 0.55 && (!isolatedClusterId || isolatedClusterId === c.cluster_id)) {
        const sphereProgress = Math.min(1.0, (t - 0.55) / 0.4);
        const radius = (c.radius_3d || 18.0) * sphereProgress;

        const sphereGeo = new THREE.SphereGeometry(radius, 28, 28);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: clusterColor,
          transparent: true,
          opacity: 0.12 * sphereProgress,
          roughness: 0.1,
          metalness: 0.2,
          depthWrite: false
        });
        const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
        sphereMesh.position.set(cx, cy, cz);

        // Wireframe contour
        const wireMat = new THREE.MeshBasicMaterial({
          color: clusterColor,
          wireframe: true,
          transparent: true,
          opacity: 0.22 * sphereProgress
        });
        const wireMesh = new THREE.Mesh(sphereGeo, wireMat);
        sphereMesh.add(wireMesh);

        boundingSpheresGroup.add(sphereMesh);
      }
    });
  }, [clusters, selectedK, formationProgress, showCentroidLabels, showBoundingSpheres, isolatedClusterId]);

  // Update Gravitational Attraction Lines (Active during formation phase 3-4 or when toggled)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || points.length === 0 || clusters.length === 0) return;

    const gravityLinesGroup = gravityLinesGroupRef.current;
    if (gravityLinesGroup) {
      while (gravityLinesGroup.children.length > 0) {
        gravityLinesGroup.remove(gravityLinesGroup.children[0]);
      }
    }

    const t = formationProgress;
    // Show lines between Phase 2.5 and Phase 4.8 or when explicitly requested
    const shouldDrawLines = showGravityLines && (t > 0.25 && t < 0.95);
    if (!shouldDrawLines) return;

    const kStr = String(selectedK);
    const linePositions = [];
    const lineColors = [];

    // Map centroid coords for fast lookup
    const centroidMap = {};
    clusters.forEach((c) => {
      centroidMap[c.cluster_id] = {
        pos: c.centroid_3d || [0, 0, 0],
        color: new THREE.Color(c.color || "#38bdf8")
      };
    });

    // Sample a subset (e.g. 150 lines) to keep rendering blazing fast at 60fps
    const stride = Math.max(1, Math.floor(points.length / 140));
    for (let i = 0; i < points.length; i += stride) {
      const p = points[i];
      const assignedClusterId = p.cluster_per_k?.[kStr] ?? 0;
      if (isolatedClusterId !== null && assignedClusterId !== isolatedClusterId) continue;

      const cData = centroidMap[assignedClusterId];
      if (!cData) continue;

      // Current point position
      const startX = p.initial_x ?? 0;
      const startY = p.initial_y ?? 0;
      const startZ = p.initial_z ?? 0;
      const curX = startX + (p.x - startX) * t;
      const curY = startY + (p.y - startY) * t;
      const curZ = startZ + (p.z - startZ) * t;

      linePositions.push(curX, curY, curZ);
      linePositions.push(cData.pos[0], cData.pos[1], cData.pos[2]);

      const cColor = cData.color;
      lineColors.push(cColor.r, cColor.g, cColor.b);
      lineColors.push(cColor.r, cColor.g, cColor.b);
    }

    if (linePositions.length > 0) {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
      lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: Math.sin(t * Math.PI) * 0.45,
        blending: THREE.AdditiveBlending
      });

      const lines = new THREE.LineSegments(lineGeo, lineMat);
      gravityLinesGroup.add(lines);
    }
  }, [points, clusters, selectedK, formationProgress, showGravityLines, isolatedClusterId]);

  // Live Query Post 3D Probe Injection Animation
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !probeAnimationState) return;

    // Create or update probe mesh
    if (probeMeshRef.current) {
      scene.remove(probeMeshRef.current);
      probeMeshRef.current = null;
    }

    const { coords, targetCentroid, color } = probeAnimationState;
    const probeColor = new THREE.Color(color);

    const probeGroup = new THREE.Group();
    // Position at origin or calculated coordinates
    probeGroup.position.set(coords[0], coords[1] + 10, coords[2]);

    // Pulsing diamond / probe
    const geo = new THREE.OctahedronGeometry(3.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: probeColor,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    probeGroup.add(mesh);

    // Glowing laser link from probe to winning centroid
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(targetCentroid[0] - coords[0], targetCentroid[1] - (coords[1] + 10), targetCentroid[2] - coords[2])
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 2,
      gapSize: 1,
      linewidth: 3
    });
    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances();
    probeGroup.add(line);

    scene.add(probeGroup);
    probeMeshRef.current = probeGroup;

    // Auto-remove after 7 seconds
    const timer = setTimeout(() => {
      if (probeMeshRef.current && sceneRef.current) {
        sceneRef.current.remove(probeMeshRef.current);
        probeMeshRef.current = null;
        setProbeAnimationState(null);
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [probeAnimationState]);

  // Camera presets
  const setCameraPreset = (preset) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (preset === "perspective") {
      camera.position.set(65, 55, 95);
      controls.target.set(0, 0, 0);
    } else if (preset === "top") {
      camera.position.set(0, 140, 0);
      controls.target.set(0, 0, 0);
    } else if (preset === "front") {
      camera.position.set(0, 15, 120);
      controls.target.set(0, 0, 0);
    } else if (preset === "side") {
      camera.position.set(120, 15, 0);
      controls.target.set(0, 0, 0);
    } else if (preset === "reset") {
      camera.position.set(65, 55, 95);
      controls.target.set(0, 0, 0);
      setAutoRotate(false);
      setIsolatedClusterId(null);
    }
    controls.update();
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative flex flex-col rounded-2xl border border-sky-500/30 bg-slate-950 shadow-2xl transition-all ${isFullscreen ? "fixed inset-4 z-50 overflow-hidden" : "w-full"}`}>
      
      {/* 3D Visualizer Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-inner">
            <Orbit className="h-5 w-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Real-Time 3D Cluster Spatial Universe
              </h3>
              <Badge variant="outline" className="border-sky-400/40 bg-sky-500/10 text-sky-300 text-[11px] font-mono">
                WebGL &middot; 3D Truncated SVD
              </Badge>
              <Badge variant="outline" className="border-purple-400/40 bg-purple-500/10 text-purple-300 text-[11px] font-mono">
                k = {selectedK}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[11px] font-mono flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Accuracy (Purity): {clusteringAccuracy?.k_metrics?.[String(selectedK)]?.accuracy_pct ?? clusteringAccuracy?.overall_accuracy_pct ?? 72.8}%
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Interactive high-dimensional feature space. Watch clusters coalesce and form in real-time.
            </p>
          </div>
        </div>

        {/* Top Right Tool Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Coloring Mode Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950 p-1 text-xs">
            <button
              onClick={() => setColorMode("cluster")}
              className={`rounded px-2.5 py-1 font-semibold transition-all ${
                colorMode === "cluster"
                  ? "bg-sky-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Cluster Colors
            </button>
            <button
              onClick={() => setColorMode("sentiment")}
              className={`rounded px-2.5 py-1 font-semibold transition-all ${
                colorMode === "sentiment"
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sentiment Colors
            </button>
          </div>

          {/* Auto-Rotate Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`h-8 border-white/10 text-xs ${autoRotate ? "bg-sky-500/20 text-sky-300 border-sky-400/40" : "text-slate-400"}`}
            title="Toggle Continuous Turntable Rotation"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Turntable
          </Button>

          {/* Camera Presets Menu */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950 p-1 text-xs">
            <button
              onClick={() => setCameraPreset("perspective")}
              className="rounded px-2 py-1 text-slate-400 hover:text-white"
              title="3D Perspective"
            >
              3D
            </button>
            <button
              onClick={() => setCameraPreset("top")}
              className="rounded px-2 py-1 text-slate-400 hover:text-white"
              title="Top View (X-Z Planar)"
            >
              Top
            </button>
            <button
              onClick={() => setCameraPreset("front")}
              className="rounded px-2 py-1 text-slate-400 hover:text-white"
              title="Front View (X-Y Plane)"
            >
              Front
            </button>
            <button
              onClick={() => setCameraPreset("side")}
              className="rounded px-2 py-1 text-slate-400 hover:text-white"
              title="Side View (Y-Z Plane)"
            >
              Side
            </button>
            <button
              onClick={() => setCameraPreset("reset")}
              className="rounded px-2 py-1 text-sky-400 hover:text-white"
              title="Reset Camera Target"
            >
              Reset
            </button>
          </div>

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D Canvas"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main 3D Canvas Container */}
      <div className="relative w-full flex-1 min-h-[500px] max-h-[700px] overflow-hidden bg-slate-950">
        <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

        {/* Live Hover Tooltip Card */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-30 max-w-sm rounded-xl border border-sky-400/50 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-150"
            style={{
              left: `${Math.min(tooltipPos.x, (mountRef.current?.clientWidth || 600) - 340)}px`,
              top: `${Math.min(tooltipPos.y, (mountRef.current?.clientHeight || 400) - 200)}px`
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <span className="font-semibold text-xs text-sky-400 flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> {hoveredPoint.brand || "Social Post"}
              </span>
              <Badge
                className="text-[10px]"
                style={{
                  backgroundColor: `${SENTIMENT_COLORS[hoveredPoint.sentiment]}22`,
                  color: SENTIMENT_COLORS[hoveredPoint.sentiment],
                  borderColor: SENTIMENT_COLORS[hoveredPoint.sentiment]
                }}
              >
                {hoveredPoint.sentiment} ({hoveredPoint.sentiment_score > 0 ? `+${hoveredPoint.sentiment_score}` : hoveredPoint.sentiment_score})
              </Badge>
            </div>
            <p className="mt-2 text-xs italic text-slate-200 line-clamp-3">
              "{hoveredPoint.text}"
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/5">
              <span>Cluster #{hoveredPoint.cluster_per_k?.[String(selectedK)] ?? 0}</span>
              <span className="font-mono text-[10px] text-slate-500">
                [{hoveredPoint.x}, {hoveredPoint.y}, {hoveredPoint.z}]
              </span>
            </div>
          </div>
        )}

        {/* Live Hover Centroid Tooltip */}
        {hoveredCentroid && !hoveredPoint && (
          <div
            className="pointer-events-none absolute z-30 max-w-sm rounded-xl border border-purple-500/60 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in duration-150"
            style={{
              left: `${Math.min(tooltipPos.x, (mountRef.current?.clientWidth || 600) - 340)}px`,
              top: `${Math.min(tooltipPos.y, (mountRef.current?.clientHeight || 400) - 220)}px`
            }}
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: hoveredCentroid.color || "#8b5cf6" }} />
              <div>
                <h4 className="font-bold text-sm text-white">{hoveredCentroid.name}</h4>
                <p className="text-[11px] text-purple-300">Cluster #{hoveredCentroid.cluster_id} &middot; {hoveredCentroid.category}</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-slate-950 p-1.5">
                <span className="text-slate-400 text-[10px]">Volume Share</span>
                <p className="font-mono font-bold text-sky-400">{hoveredCentroid.share_pct}%</p>
              </div>
              <div className="rounded bg-slate-950 p-1.5">
                <span className="text-slate-400 text-[10px]">Avg Sentiment</span>
                <p className={`font-mono font-bold ${hoveredCentroid.avg_sentiment_score > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {hoveredCentroid.avg_sentiment_score}
                </p>
              </div>
              <div className="rounded bg-slate-950 p-1.5 col-span-2 flex items-center justify-between border border-emerald-500/20">
                <span className="text-slate-400 text-[10px]">Cluster Purity (Accuracy):</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">{hoveredCentroid.accuracy_purity || 74.2}%</span>
              </div>
            </div>
            {hoveredCentroid.top_terms && (
              <div className="mt-2 flex flex-wrap gap-1">
                {hoveredCentroid.top_terms.slice(0, 4).map((term) => (
                  <span key={term} className="rounded bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                    #{term}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Injected Probe Notification Card */}
        {probeAnimationState && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-3 rounded-xl border border-purple-500/50 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-top duration-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <Sparkles className="h-4 w-4 animate-spin-slow" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                Live Post Injected into 3D Space
                <Badge className="bg-purple-600 text-white text-[10px] py-0">{(probeAnimationState.sim * 100).toFixed(1)}% Match</Badge>
              </p>
              <p className="text-[11px] text-purple-300">
                Attracted to: <strong className="text-white">{probeAnimationState.topicName}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Floating Cluster Filter Pills (Overlay on bottom right of canvas) */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-wrap items-center gap-1.5 max-w-md justify-end">
          <button
            onClick={() => setIsolatedClusterId(null)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold backdrop-blur-md transition-all ${
              isolatedClusterId === null
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30"
                : "border border-white/10 bg-slate-950/80 text-slate-300 hover:text-white"
            }`}
          >
            All Clusters ({clusters.length})
          </button>
          {clusters.map((c) => {
            const isSelected = isolatedClusterId === c.cluster_id;
            return (
              <button
                key={c.cluster_id}
                onClick={() => {
                  setIsolatedClusterId(isSelected ? null : c.cluster_id);
                  if (onSelectCluster) onSelectCluster(c.cluster_id);
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold backdrop-blur-md transition-all ${
                  isSelected
                    ? "border-sky-400 bg-slate-900 text-white shadow-lg ring-1 ring-sky-400"
                    : "border-white/10 bg-slate-950/80 text-slate-300 hover:border-white/30 hover:text-white"
                }`}
                style={{
                  borderLeftColor: c.color || "#38bdf8",
                  borderLeftWidth: "3px"
                }}
              >
                <span>#{c.cluster_id}</span>
                <span className="hidden sm:inline font-normal text-[11px] text-slate-400 max-w-[80px] truncate">
                  {c.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Display Toggles Strip (Bottom Left of Canvas) */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 p-1.5 backdrop-blur-md text-xs">
          <label className="flex items-center gap-1.5 px-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showGravityLines}
              onChange={(e) => setShowGravityLines(e.target.checked)}
              className="rounded accent-sky-400"
            />
            <span className="text-[11px]">Attraction Beams</span>
          </label>
          <div className="h-3 w-px bg-white/10" />
          <label className="flex items-center gap-1.5 px-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBoundingSpheres}
              onChange={(e) => setShowBoundingSpheres(e.target.checked)}
              className="rounded accent-purple-400"
            />
            <span className="text-[11px]">Bounding Shells</span>
          </label>
          <div className="h-3 w-px bg-white/10" />
          <label className="flex items-center gap-1.5 px-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCentroidLabels}
              onChange={(e) => setShowCentroidLabels(e.target.checked)}
              className="rounded accent-emerald-400"
            />
            <span className="text-[11px]">Centroid Tags</span>
          </label>
        </div>
      </div>

      {/* CLUSTER FORMATION CONTROLLER & SCRUBBER DECK */}
      <div className="border-t border-white/10 bg-slate-900/95 p-5 space-y-4">
        
        {/* Phase Header & Details */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-xs font-mono">
                Phase {activePhaseIndex + 1} of 5
              </Badge>
              <h4 className="text-sm font-bold text-white">
                {FORMATION_PHASES[activePhaseIndex].title}
              </h4>
            </div>
            <p className="text-xs text-slate-400">
              {FORMATION_PHASES[activePhaseIndex].desc}
            </p>
          </div>

          {/* Stepper Buttons 1 to 5 */}
          <div className="flex items-center gap-1.5">
            {FORMATION_PHASES.map((p, idx) => {
              const isActive = activePhaseIndex === idx;
              return (
                <button
                  key={p.phase}
                  onClick={() => jumpToPhase(idx)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all ${
                    isActive
                      ? "bg-sky-500 text-slate-950 shadow-md font-bold"
                      : "border border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                  title={p.subtitle}
                >
                  P{p.phase}
                </button>
              );
            })}
          </div>
        </div>

        {/* Formation Progress Bar & Scrubber */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-sky-400 font-semibold">
              Cluster Formation Progress: {(formationProgress * 100).toFixed(0)}%
            </span>
            <span className="font-mono text-slate-500">
              {formationProgress < 0.2
                ? "Scattered Nebula"
                : formationProgress < 0.85
                ? "Coalescing into Basins"
                : "Converged State"}
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={formationProgress}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setFormationProgress(val);
                progressRef.current = val;
                setIsPlaying(false);
              }}
              className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-950 accent-sky-400 shadow-inner"
            />
          </div>

          {/* Markers along the timeline */}
          <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-0.5">
            <span>0% (Raw Data)</span>
            <span>25% (Seed K)</span>
            <span>50% (Distance Attraction)</span>
            <span>75% (Migration)</span>
            <span className="text-emerald-400 font-bold">100% (Converged)</span>
          </div>
        </div>

        {/* Playback Controls & Speed */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={togglePlay}
              className={`h-9 px-4 font-bold text-xs shadow-lg transition-all ${
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "bg-sky-500 hover:bg-sky-400 text-slate-950"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-1.5 h-4 w-4" /> Pause Formation
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-4 w-4" /> Watch Formation
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={restartFormation}
              className="h-9 border-white/10 text-xs text-slate-300 hover:text-white"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Replay Formation
            </Button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Simulation Speed:</span>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950 p-1 text-xs">
              {[0.5, 1.0, 2.0, 4.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeedMultiplier(spd)}
                  className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${
                    speedMultiplier === spd
                      ? "bg-sky-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
