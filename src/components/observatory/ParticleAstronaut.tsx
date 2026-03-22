"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, Canvas } from "@react-three/fiber";
import { Stars, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

// 注册此模型的预加载提示️ (Next.js build-time only)
useGLTF.preload("/astronaut.glb");

interface ParticleSystemProps {
  phase: number;
}

export function ParticleSystem({ phase }: ParticleSystemProps) {
  const particleCount = 6000; // 线框主体 + 少量彩色粒子点缀

  // 挂起式加载真正的太空人体素级精模（极度逼真的剪影）
  const { scene } = useGLTF("/astronaut.glb");

  // Generate target shapes once
  const {
    edgePositions,
    initialPositions,
    planetPositions,
    astronautPositions,
    colors,
  } = useMemo(() => {
    // ==========================================
    // 1. 预解析宇航员 GLTF 高模，提取 100% 仿真顶点网格
    // ==========================================
    const geos: THREE.BufferGeometry[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry.clone();
        // 需要应用模型内部自身的局部缩放旋转，还原正确形态
        geom.applyMatrix4(mesh.matrixWorld);
        geos.push(geom);
      }
    });

    // 燃焦所有碎片并规范化
    // @ts-ignore
    const rawMergedGeom = mergeGeometries(geos);
    rawMergedGeom.computeBoundingBox();
    const box = rawMergedGeom.boundingBox!;
    const height = box.max.y - box.min.y;
    const scale = 6.0 / height;
    rawMergedGeom.scale(scale, scale, scale);
    rawMergedGeom.computeBoundingBox();
    const center = new THREE.Vector3();
    rawMergedGeom.boundingBox!.getCenter(center);
    rawMergedGeom.translate(-center.x, -center.y + 0.5, -center.z);

    // ==================================================
    // Layer A: 提取边缘线框——这是宇航员形态的主骨架
    // ==================================================
    const edgesGeom = new THREE.EdgesGeometry(rawMergedGeom, 15); // 15度阈值过滤掉内部细辨面
    const edgePositions = edgesGeom.attributes.position.array as Float32Array;

    // ==================================================
    // Layer B: 能量场粒子——在线框内饰山饰海漂浮的微小元素点
    // ==================================================
    const astronautMesh = new THREE.Mesh(rawMergedGeom);
    const sampler = new MeshSurfaceSampler(astronautMesh).build();
    const _tempPos = new THREE.Vector3();

    const initPos = new Float32Array(particleCount * 3);
    const pPos = new Float32Array(particleCount * 3);
    const aPos = new Float32Array(particleCount * 3);
    const cols = new Float32Array(particleCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      sampler.sample(_tempPos);
      aPos[i * 3] = _tempPos.x;
      aPos[i * 3 + 1] = _tempPos.y;
      aPos[i * 3 + 2] = _tempPos.z;

      // 粒子颜色：配合线框风格，主导青蓝能量色渐变
      if (_tempPos.y > 2.0 && _tempPos.z > 0.1 && Math.abs(_tempPos.x) < 0.7) {
        // 面罩 (Visor)：NASA 镀金面罩的琥珀金色，高辨识度
        color.set("#fbbf24"); // amber-400
      } else if (_tempPos.y > 2.0) {
        color.set("#67e8f9"); // 头盔外壳 冰蓝
      } else if (_tempPos.z < -0.3 && _tempPos.y > -0.2) {
        color.set("#3b82f6"); // 背包 蓝
      } else if (_tempPos.y < -0.8) {
        color.set("#a78bfa"); // 腿 紫
      } else if (Math.abs(_tempPos.x) > 1.0) {
        color.set("#34d399"); // 手臂 翠
      } else if (_tempPos.z > 0.5 && _tempPos.y > 0.8 && _tempPos.y < 2.0) {
        color.set("#f87171"); // 胸口 红
      } else {
        color.set("#bae6fd"); // 躯干 淡蓝
      }
      color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.15);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }

    // 其他形态：尘埃和星球
    for (let i = 0; i < particleCount; i++) {
      initPos[i * 3] = (Math.random() - 0.5) * 50;
      initPos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      initPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
      const u = Math.random(),
        v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 2.5 + Math.random() * 0.8;
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
    }

    return {
      edgePositions,
      initialPositions: initPos,
      planetPositions: pPos,
      astronautPositions: aPos,
      colors: cols,
    };
  }, [scene]);

  // 两层共用的父容器引用，统一指挥运动
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // 粒子能量场的可变位置缓冲
  const renderPositions = useMemo(
    () => new Float32Array(initialPositions),
    [initialPositions],
  );

  // 线框的可变渲染缓冲（每帧应用骨架变形，与粒子完全同步）
  const baseEdgePositions = useMemo(
    () => new Float32Array(edgePositions),
    [edgePositions],
  );
  const renderEdgePositions = useMemo(
    () => new Float32Array(edgePositions),
    [edgePositions],
  );

  // 骨架变形函数 —— 粒子和线框共用，保证完全同步
  // 输入基础坐标 (bx,by,bz) + 四个波形参数，输出变形后坐标
  const deformPoint = (
    bx: number,
    by: number,
    bz: number,
    w1: number,
    w2: number,
    w3: number,
    w4: number,
  ): [number, number, number] => {
    let x = bx,
      y = by,
      z = bz;
    // ── 左臂：围绕肩关节 (y≈1.8) 大幅摆动 ──
    if (y < 1.8 && x > 1.1) {
      const dy = y - 1.8;
      const aX = w1 * 0.55 + w4 * 2.2; // 大幅前后挥臂
      const aZ = w2 * 0.3 + w3 * 1.0; // 侧方展开
      z += dy * Math.sin(aX);
      const ny = dy * Math.cos(aX);
      x += ny * Math.sin(aZ);
      y = 1.8 + ny * Math.cos(aZ);
    }
    // ── 右臂：反相，避免两臂同步 ──
    else if (y < 1.8 && x < -1.1) {
      const dy = y - 1.8;
      const aX = -w1 * 0.55 + w3 * 1.8;
      const aZ = -w2 * 0.3 - w4 * 1.0;
      z += dy * Math.sin(aX);
      const ny = dy * Math.cos(aX);
      x += ny * Math.sin(aZ);
      y = 1.8 + ny * Math.cos(aZ);
    }
    // ── 左腿：围绕胯关节 (y≈-0.4) 踢腿漫步 ──
    if (y < -0.4 && x > 0.3) {
      const dy = y - -0.4;
      const aX = w2 * 0.45 + w3 * 1.2;
      z += dy * Math.sin(aX);
      y = -0.4 + dy * Math.cos(aX);
    }
    // ── 右腿：反相 ──
    else if (y < -0.4 && x < -0.3) {
      const dy = y - -0.4;
      const aX = -w1 * 0.45 + w4 * 1.2;
      z += dy * Math.sin(aX);
      y = -0.4 + dy * Math.cos(aX);
    }
    return [x, y, z];
  };

  // 圆形柔光纹理：将每个方块像素点变成柔和发光的球形光晕
  const particleTexture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0.0, "rgba(255,255,255,1.0)");
    gradient.addColorStop(0.2, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.4)");
    gradient.addColorStop(1.0, "rgba(255,255,255,0.0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    const g = groupRef.current;
    const p = pointsRef.current;
    const l = linesRef.current;
    if (!g || !p) return;
    const time = state.clock.getElapsedTime();
    const positionsAttr = p.geometry.attributes.position;

    // 根据阶段选择目标形态缓冲和收敛速度
    let baseBuffer = initialPositions; // 粒子目标基础坐标（未变形）
    let lerpSpeed = 0.01;
    let wanderAmplitude = 0;

    if (phase >= 1 && phase < 2) {
      baseBuffer = planetPositions;
      lerpSpeed = 0.04;
    } else if (phase >= 2) {
      baseBuffer = astronautPositions;
      lerpSpeed = 0.2;
      wanderAmplitude = 1;
    }

    // 粒子目标就是宇航员表面采样，直接收敛贴合线框
    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3,
        iy = i * 3 + 1,
        iz = i * 3 + 2;
      const tx = baseBuffer[ix];
      const ty = baseBuffer[iy];
      const tz = baseBuffer[iz];

      // 微小呼吸噪点，让能量云有微微跤动（但不会脱离线框）
      const nx = Math.sin(time * 1.5 + i) * 0.06 * wanderAmplitude;
      const ny = Math.cos(time * 2.0 + i) * 0.06 * wanderAmplitude;
      const nz = Math.sin(time * 2.5 + i * 0.007) * 0.06 * wanderAmplitude;

      positionsAttr.array[ix] +=
        (tx + nx - positionsAttr.array[ix]) * lerpSpeed;
      positionsAttr.array[iy] +=
        (ty + ny - positionsAttr.array[iy]) * lerpSpeed;
      positionsAttr.array[iz] +=
        (tz + nz - positionsAttr.array[iz]) * lerpSpeed;
    }
    positionsAttr.needsUpdate = true;

    // 线框保持静态轮廓（EdgesGeometry 不支持逐骨骼变形，强制变形会产生穿越全身的扭曲边线）
    // 粒子在线框内律动 = 全息投影外壳固定 + 内部能量流动的科幻效果

    // 宏观运动：两层完全同步（都在 groupRef 下）
    // 全身的多轴翻滚和漂移＝失重力 EVA 漫游感
    if (phase < 2) {
      g.rotation.y = time * 0.5;
      g.position.set(0, 0, 0);
    } else {
      // 漂移范围收窄，保持宇航员在屏幕内可见
      const driftX = Math.sin(time * 0.13) * 3.5 + Math.cos(time * 0.07) * 2.0;
      const driftY =
        Math.sin(time * 0.11 + 1) * 1.5 + Math.cos(time * 0.17) * 0.8;
      const driftZ =
        Math.sin(time * 0.09 + 3) * 2.0 + Math.cos(time * 0.05) * 1.0;
      const recoilX = phase === 2.5 ? -3.5 : phase === 3.5 ? 3.5 : 0;

      // 多轴缓慢翻滚
      const tRotY = Math.sin(time * 0.22) * 2.5; // 左右转身
      const tRotZ = Math.sin(time * 0.14 + 1.5) * 0.5; // 侧倒
      const tRotX =
        Math.cos(time * 0.18 + 0.8) * 0.35 + Math.sin(time * 0.06) * 0.45; // 俯仰

      g.rotation.y += (tRotY - g.rotation.y) * 0.02;
      g.rotation.z += (tRotZ - g.rotation.z) * 0.016;
      g.rotation.x += (tRotX - g.rotation.x) * 0.016;

      g.position.x += (driftX + recoilX - g.position.x) * 0.02;
      g.position.y += (driftY - g.position.y) * 0.02;
      g.position.z += (driftZ - g.position.z) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {/* === Layer A: 霸光线框——全息投影宇航员轮廓 === */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edgePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* === Layer B: 能量场粒子——漂浮在线框内的微小发光元素点 === */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[renderPositions, 3]}
          />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          map={particleTexture}
          alphaTest={0.01}
          vertexColors
          transparent
          opacity={0.7}
          sizeAttenuation
          blending={THREE.NormalBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

// --- 新增：内太空深层环境（流动星尘/星云） ---
function EnvironmentDust() {
  const dustRef = useRef<THREE.Points>(null);
  const dustCount = 8000;

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(dustCount * 3);
    const cols = new Float32Array(dustCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < dustCount; i++) {
      // 更加深邃广阔的球形分布
      const r = 10 + Math.random() * 40;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // 深蓝色与暗紫色交织的深空环境背景色
      const isPurple = Math.random() > 0.5;
      color.set(isPurple ? "#3b0764" : "#083344"); // 暗紫 vs 暗青
      color.offsetHSL(0, 0, Math.random() * 0.2);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return { positions: pos, colors: cols };
  }, []);

  useFrame((state) => {
    if (!dustRef.current) return;
    const time = state.clock.getElapsedTime();
    // 环境星云缓慢自转和呼吸
    dustRef.current.rotation.y = time * 0.05;
    dustRef.current.rotation.z = time * 0.02;
  });

  return (
    <points ref={dustRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function LifeSigns({ phase }: { phase: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const numSigns = 7;
  const particlesPerSign = 300;
  const totalCount = numSigns * particlesPerSign;

  const { positions, baseOffsets, colors, signsData } = useMemo(() => {
    const pos = new Float32Array(totalCount * 3);
    const offset = new Float32Array(totalCount * 3);
    const cols = new Float32Array(totalCount * 3);
    const sData = [];
    const color = new THREE.Color();

    for (let s = 0; s < numSigns; s++) {
      const isCore = s === 0;
      // 分布在宇航员漫游的路径周围
      const x = (Math.random() - 0.5) * 15;
      const y = (Math.random() - 0.5) * 8;
      const z = (Math.random() - 0.5) * 10 - 5;
      const size = 0.3 + Math.random() * 0.4;
      const speed = 0.5 + Math.random();
      sData.push({ x, y, z, size, speed, isCore, id: s });

      // 为这个节点生成 300 个簇状粒子
      for (let p = 0; p < particlesPerSign; p++) {
        const i = s * particlesPerSign + p;

        // 在球体范围内随机分布
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = size * Math.cbrt(Math.random());

        const ox = r * Math.sin(phi) * Math.cos(theta);
        const oy = r * Math.sin(phi) * Math.sin(theta);
        const oz = r * Math.cos(phi);

        offset[i * 3] = ox;
        offset[i * 3 + 1] = oy;
        offset[i * 3 + 2] = oz;

        pos[i * 3] = x + ox;
        pos[i * 3 + 1] = y + oy;
        pos[i * 3 + 2] = z + oz;

        // 根据身份赋予不同颜色
        if (isCore) {
          color.set(Math.random() > 0.5 ? "#10b981" : "#34d399"); // 核心灵魂：翡翠绿
        } else {
          const hues = ["#f43f5e", "#fb7185", "#f97316", "#eab308"]; // 边缘过客灵魂：红/橙/黄
          color.set(hues[Math.floor(Math.random() * hues.length)]);
        }
        color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.2); // 明暗变化
        cols[i * 3] = color.r;
        cols[i * 3 + 1] = color.g;
        cols[i * 3 + 2] = color.b;
      }
    }
    return {
      positions: pos,
      baseOffsets: offset,
      colors: cols,
      signsData: sData,
    };
  }, []);

  const renderPositions = useMemo(
    () => new Float32Array(positions),
    [positions],
  );

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();
    const positionsAttr = pointsRef.current.geometry.attributes.position;

    // 每一帧动态更新每个灵魂节点粒子的中心和散布状态
    for (let s = 0; s < numSigns; s++) {
      const sign = signsData[s];

      let targetX = sign.x;
      let targetY = sign.y + Math.sin(time * sign.speed) * 0.5;
      let targetZ = sign.z;

      let scatterMultiplier = 1;

      // ==== 交互逻辑阵列 ====
      if (sign.isCore) {
        if (phase >= 4) {
          // 匹配成功：粒子灵魂冲刺到屏幕中央与本我融合（Fusion）
          targetX += (0 - targetX) * 0.05;
          targetY += (0 - targetY) * 0.05;
          targetZ += (0 - targetZ) * 0.05;
          scatterMultiplier = 0.4 + Math.sin(time * 15) * 0.1; // 极速收缩并高频震颤，暗示生命力
        }
      } else {
        // 将普通节点模拟为前两轮排斥筛选的视觉对象
        const isInteracting1 = s === 1 && (phase === 2 || phase === 2.5);
        const isInteracting2 = s === 2 && (phase === 3 || phase === 3.5);

        if (isInteracting1 || isInteracting2) {
          const isRepulsing = phase === 2.5 || phase === 3.5;
          if (isRepulsing) {
            // 排斥阶段：粒子被暴力打散（互斥散射效果）
            scatterMultiplier = 4.0 + Math.sin(time * 20);
            targetX += (sign.x > 0 ? 8 : -8 - targetX) * 0.05; // 抛远
          } else {
            // 接触探伤阶段：粒子体膨胀，向本我靠近
            scatterMultiplier = 1.3 + Math.sin(time * 30) * 0.2;
            targetX += (0 - targetX) * 0.02; // 缓慢吸过去
          }
        }
      }

      // 将计算结果应用到子粒子上
      for (let p = 0; p < particlesPerSign; p++) {
        const i = s * particlesPerSign + p;
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        const ox = baseOffsets[ix];
        const oy = baseOffsets[iy];
        const oz = baseOffsets[iz];

        // 让粒子绕着自己的灵魂中心公转，更有生命力
        const cosT = Math.cos(time * sign.speed);
        const sinT = Math.sin(time * sign.speed);

        const rotX = (ox * cosT - oz * sinT) * scatterMultiplier;
        const rotY = oy * scatterMultiplier;
        const rotZ = (ox * sinT + oz * cosT) * scatterMultiplier;

        // 平滑插值更新
        positionsAttr.array[ix] +=
          (targetX + rotX - positionsAttr.array[ix]) * 0.1;
        positionsAttr.array[iy] +=
          (targetY + rotY - positionsAttr.array[iy]) * 0.1;
        positionsAttr.array[iz] +=
          (targetZ + rotZ - positionsAttr.array[iz]) * 0.1;
      }
    }

    positionsAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[renderPositions, 3]}
        />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function ParticleAstronautCanvas({ phase }: { phase: number }) {
  return (
    <div className="absolute inset-0 z-0 bg-brand-slate-950 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <color attach="background" args={["#020617"]} /> {/* brand-slate-950 */}
        <ambientLight intensity={0.5} />
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />
        {/* 新增：深空粒子环境潮汐 */}
        <EnvironmentDust />
        {/* 新增：其他生命体征节点 */}
        {phase > 0 && <LifeSigns phase={phase} />}
        {/* 主角：本我星球 / 宇航员 */}
        <React.Suspense fallback={null}>
          <ParticleSystem phase={phase} />
        </React.Suspense>
        {/* We can disable orbit controls to keep the narrative scripted, or enable autoRotate */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
