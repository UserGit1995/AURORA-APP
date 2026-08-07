import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface ColorOption {
  id: string;
  label: string;
  hex: string;
  isKraft?: boolean;
  isTransparent?: boolean;
}

export const PACKAGING_COLORS: ColorOption[] = [
  { id: "bianco", label: "Bianco Puro", hex: "#f8fafc" },
  { id: "kraft", label: "Kraft Avana", hex: "#d2ad80", isKraft: true },
  { id: "nero", label: "Nero Opaco", hex: "#1e293b" },
  { id: "rosso", label: "Rosso Intenso", hex: "#dc2626" },
  { id: "verde", label: "Verde Smeraldo", hex: "#15803d" },
  { id: "blu", label: "Blu Notte", hex: "#1e3a8a" },
  { id: "oro", label: "Oro Elegance", hex: "#ca8a04" },
  { id: "trasparente", label: "Trasparente / PET", hex: "#e2e8f0", isTransparent: true },
];

interface Packaging3DViewerProps {
  productType: string;
  itemColorId: string;
  logoUrl: string | null;
  logoScale: number; // 10 to 85
  logoX: number; // 10 to 90
  logoY: number; // 10 to 90
  printColors?: number;
}

export function Packaging3DViewer({
  productType,
  itemColorId,
  logoUrl,
  logoScale,
  logoX,
  logoY,
}: Packaging3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Helper to draw composite texture on a 2D canvas and convert to Three.js texture
  const createTextureWithLogo = (
    baseColorHex: string,
    width = 1024,
    height = 1024,
    isKraft = false,
    isTransparent = false
  ): THREE.CanvasTexture => {
    if (!textureCanvasRef.current) {
      textureCanvasRef.current = document.createElement("canvas");
    }
    const canvas = textureCanvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Background base
      if (isTransparent) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = baseColorHex;
        ctx.fillRect(0, 0, width, height);

        // Kraft texture simulation
        if (isKraft) {
          ctx.fillStyle = "rgba(120, 80, 40, 0.05)";
          for (let i = 0; i < 3500; i++) {
            const rx = Math.random() * width;
            const ry = Math.random() * height;
            const rw = Math.random() * 3 + 1;
            const rh = Math.random() * 2 + 1;
            ctx.fillRect(rx, ry, rw, rh);
          }
        }
      }

      // Draw logo if present
      if (logoUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = logoUrl;
        img.onload = () => {
          // Calculate positions
          const scalePct = logoScale / 100;
          const logoW = width * scalePct;
          const logoH = (img.height / img.width) * logoW;

          const posX = (logoX / 100) * width - logoW / 2;
          const posY = (logoY / 100) * height - logoH / 2;

          if (isKraft) {
            ctx.globalCompositeOperation = "multiply";
          } else {
            ctx.globalCompositeOperation = "source-over";
          }
          ctx.drawImage(img, posX, posY, logoW, logoH);
          ctx.globalCompositeOperation = "source-over";

          if (logoTextureRef.current) {
            logoTextureRef.current.needsUpdate = true;
          }
        };
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    logoTextureRef.current = texture;
    return texture;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#f8fafc");

    // 2. Camera Setup
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 450;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 4.5);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clear previous children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.minDistance = 2;
    controls.maxDistance = 8;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    // 5. Lighting (Studio Lighting Setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.8);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffedd5, 0.6);
    rimLight.position.set(0, -3, -4);
    scene.add(rimLight);

    // Floor Shadow Plane
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Ring Indicator
    const discGeo = new THREE.RingGeometry(0.8, 1.2, 32);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.99;
    scene.add(disc);

    // 6. Build 3D Model Group
    const modelGroup = new THREE.Group();
    modelGroup.position.y = -0.2;
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  // Update Model Geometry & Material when productType, itemColorId, logo, or settings change
  useEffect(() => {
    const modelGroup = modelGroupRef.current;
    if (!modelGroup) return;

    // Clear existing model
    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      modelGroup.remove(child);
    }

    // Find selected color config
    const colorOpt = PACKAGING_COLORS.find((c) => c.id === itemColorId) || PACKAGING_COLORS[0];
    let isKraft = colorOpt.isKraft || productType.includes("kraft") || productType.includes("paglia");
    let isTransparent = colorOpt.isTransparent || productType === "bicchiere-12oz";
    let baseColorHex = colorOpt.hex;

    const mainTexture = createTextureWithLogo(
      baseColorHex,
      1024,
      1024,
      isKraft,
      isTransparent
    );

    // Construct 3D Mesh according to productType
    if (
      productType === "bicchierino-caffe" ||
      productType === "tazzina-caffe-paper" ||
      productType === "bicchiere-8oz" ||
      productType === "bicchiere-9oz" ||
      productType === "bicchiere-16oz"
    ) {
      // Paper Cup (Conical cylinder)
      const isMini = productType === "bicchierino-caffe" || productType === "tazzina-caffe-paper";
      const isLarge = productType === "bicchiere-16oz";
      const height = isMini ? 0.95 : isLarge ? 1.7 : 1.5;
      const topR = isMini ? 0.48 : isLarge ? 0.72 : 0.65;
      const botR = isMini ? 0.34 : isLarge ? 0.5 : 0.45;

      const cupGeo = new THREE.CylinderGeometry(topR, botR, height, 48, 1, true);
      const cupMat = new THREE.MeshStandardMaterial({
        map: mainTexture,
        roughness: 0.4,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });

      const cup = new THREE.Mesh(cupGeo, cupMat);
      cup.castShadow = true;
      cup.receiveShadow = true;
      modelGroup.add(cup);

      // Rolled Rim Top
      const rimGeo = new THREE.TorusGeometry(topR, 0.03, 16, 48);
      const rimMat = new THREE.MeshStandardMaterial({
        color: isKraft ? 0xc49b6c : 0xffffff,
        roughness: 0.3,
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = height / 2;
      modelGroup.add(rim);

      // Lid
      const lidGeo = new THREE.CylinderGeometry(topR + 0.02, topR + 0.01, 0.12, 48);
      const lidMat = new THREE.MeshStandardMaterial({
        color: itemColorId === "nero" ? 0x020617 : isMini ? 0x1e293b : 0xf8fafc,
        roughness: 0.2,
      });
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.position.y = height / 2 + 0.08;
      lid.castShadow = true;
      modelGroup.add(lid);
    } else if (productType === "bicchiere-12oz") {
      // PET Clear Smoothie Cup
      const height = 1.6;
      const topR = 0.68;
      const botR = 0.45;

      const cupGeo = new THREE.CylinderGeometry(topR, botR, height, 48, 1, true);
      const cupMat = new THREE.MeshPhysicalMaterial({
        map: mainTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
        transmission: 0.6,
        ior: 1.4,
        side: THREE.DoubleSide,
      });

      const cup = new THREE.Mesh(cupGeo, cupMat);
      cup.castShadow = true;
      modelGroup.add(cup);

      // Liquid filling inside
      const liquidGeo = new THREE.CylinderGeometry(topR * 0.9, botR * 0.95, height * 0.8, 32);
      const liquidMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.2,
      });
      const liquid = new THREE.Mesh(liquidGeo, liquidMat);
      liquid.position.y = -0.1;
      modelGroup.add(liquid);

      // PET Dome Lid
      const domeGeo = new THREE.SphereGeometry(topR + 0.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        roughness: 0.1,
        side: THREE.DoubleSide,
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.y = height / 2;
      modelGroup.add(dome);
    } else if (
      productType === "scatola-pizza" ||
      productType === "scatola-pizza-maxi" ||
      productType === "scatola-pinsa" ||
      productType === "porta-pinsa" ||
      productType === "scatola-asporto" ||
      productType === "scatola-menu"
    ) {
      // Pizza, Pinsa & Food Delivery Boxes
      const isMaxiPizza = productType === "scatola-pizza-maxi";
      const isPinsa = productType === "scatola-pinsa";
      const isPortaPinsa = productType === "porta-pinsa";
      const isDeliveryBox = productType === "scatola-asporto" || productType === "scatola-menu";

      let boxWidth = 1.8;
      let boxDepth = 1.8;
      let boxHeight = 0.22;

      if (isMaxiPizza) {
        boxWidth = 2.1;
        boxDepth = 2.1;
        boxHeight = 0.24;
      } else if (isPinsa) {
        boxWidth = 1.9;
        boxDepth = 1.1;
        boxHeight = 0.22;
      } else if (isPortaPinsa) {
        boxWidth = 1.3;
        boxDepth = 1.8;
        boxHeight = 0.35;
      } else if (isDeliveryBox) {
        boxWidth = 1.4;
        boxDepth = 1.2;
        boxHeight = 0.8;
      }

      const boxGeo = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

      // Side & Top Materials
      const sideMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseColorHex),
        roughness: 0.6,
      });
      const topMat = new THREE.MeshStandardMaterial({
        map: mainTexture,
        roughness: 0.5,
      });

      const materials = [
        sideMat, // right
        sideMat, // left
        topMat,  // top face
        sideMat, // bottom face
        sideMat, // front
        sideMat, // back
      ];

      const box = new THREE.Mesh(boxGeo, materials);
      box.castShadow = true;
      box.receiveShadow = true;
      modelGroup.add(box);

      // Vents detail on boxes
      if (!isDeliveryBox) {
        const ventGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.01, 16);
        const ventMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
        const vent1 = new THREE.Mesh(ventGeo, ventMat);
        vent1.position.set(-0.3, boxHeight / 2 + 0.005, -boxDepth / 2 + 0.2);
        const vent2 = vent1.clone();
        vent2.position.x = 0.3;
        modelGroup.add(vent1);
        modelGroup.add(vent2);
      }
    } else if (
      productType === "sacchetto-kraft" ||
      productType === "sacchetto-kraft-bianco" ||
      productType === "shopper-manico" ||
      productType === "shopper-rotolo" ||
      productType === "shopper-bio"
    ) {
      // Bags & Shoppers
      const bagWidth = 1.4;
      const bagHeight = 1.8;
      const bagDepth = 0.6;

      const bagGeo = new THREE.BoxGeometry(bagWidth, bagHeight, bagDepth);

      const sideMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseColorHex),
        roughness: 0.7,
      });

      const frontMat = new THREE.MeshStandardMaterial({
        map: mainTexture,
        roughness: 0.6,
      });

      const materials = [
        sideMat,  // right
        sideMat,  // left
        sideMat,  // top
        sideMat,  // bottom
        frontMat, // front
        frontMat, // back
      ];

      const bag = new THREE.Mesh(bagGeo, materials);
      bag.castShadow = true;
      bag.receiveShadow = true;
      modelGroup.add(bag);

      // Add Handles if Shopper
      if (productType === "shopper-manico" || productType === "shopper-bio") {
        const handleCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.3, bagHeight / 2, 0),
          new THREE.Vector3(-0.3, bagHeight / 2 + 0.4, 0),
          new THREE.Vector3(0.3, bagHeight / 2 + 0.4, 0),
          new THREE.Vector3(0.3, bagHeight / 2, 0),
        ]);

        const handleGeo = new THREE.TubeGeometry(handleCurve, 32, 0.025, 12, false);
        const handleMat = new THREE.MeshStandardMaterial({
          color: isKraft ? 0x5c4328 : 0x334155,
          roughness: 0.8,
        });

        const handleFront = new THREE.Mesh(handleGeo, handleMat);
        handleFront.position.z = bagDepth / 2 + 0.01;
        modelGroup.add(handleFront);

        const handleBack = new THREE.Mesh(handleGeo, handleMat);
        handleBack.position.z = -bagDepth / 2 - 0.01;
        modelGroup.add(handleBack);
      }
    } else {
      // Fallback Flat Placemat / Sheet
      const width = 2.2;
      const height = 1.5;
      const sheetGeo = new THREE.BoxGeometry(width, 0.02, height);
      const sheetMat = new THREE.MeshStandardMaterial({
        map: mainTexture,
        roughness: 0.5,
      });
      const sheet = new THREE.Mesh(sheetGeo, sheetMat);
      sheet.castShadow = true;
      sheet.receiveShadow = true;
      modelGroup.add(sheet);
    }
  }, [productType, itemColorId, logoUrl, logoScale, logoX, logoY]);

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] flex items-center justify-center rounded-xl overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200">
      {/* 3D Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Interactive Controls Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-md border border-border/70 text-[11px] font-medium text-muted-foreground shadow-sm pointer-events-none">
        <span>Ruota 3D con il mouse</span>
        <span>Zoom con rotellina</span>
      </div>
    </div>
  );
}
