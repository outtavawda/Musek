"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function GiftModel({ giftName }: { giftName: string }) {
  const chest = useRef<THREE.Group>(null);
  const hero = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const ease = (v: number) => { const x = THREE.MathUtils.clamp(v, 0, 1); return 1 - Math.pow(1 - x, 3); };
    if (chest.current) {
      const arrival = ease(t / 1.45);
      chest.current.position.x = THREE.MathUtils.lerp(-viewport.width * 0.8, 0, arrival);
      chest.current.position.y = Math.sin(t * 2.1) * 0.045;
      chest.current.rotation.y = Math.sin(t * 1.3) * 0.12;
      chest.current.visible = t < 2.05;
      chest.current.scale.setScalar(0.68 + arrival * 0.28);
    }
    if (hero.current) {
      const reveal = ease((t - 1.35) / 0.9);
      const exit = ease((t - 3.0) / 4.25);
      hero.current.visible = t >= 1.35;
      hero.current.position.x = THREE.MathUtils.lerp(0, viewport.width * 0.92, exit);
      hero.current.position.y = Math.sin(t * 2.2) * 0.11 + reveal * 0.18;
      hero.current.rotation.y += delta * (giftName === "Galaxy" || giftName === "Universe" ? 0.7 : 0.34);
      hero.current.rotation.z = Math.sin(t * 1.1) * 0.055;
      hero.current.scale.setScalar(Math.max(0.001, reveal) * (0.82 + Math.sin(t * 2.4) * 0.035));
    }
    if (orbit.current) orbit.current.rotation.z += delta * 0.8;
  });

  const gold = <meshPhysicalMaterial color="#f6c453" metalness={0.94} roughness={0.16} clearcoat={1} />;
  const crystal = <meshPhysicalMaterial color="#8b5cf6" metalness={0.42} roughness={0.1} transmission={0.2} thickness={1.6} clearcoat={1} emissive="#3b0764" emissiveIntensity={0.8} />;
  const flame = <meshPhysicalMaterial color="#fb6a24" emissive="#f97316" emissiveIntensity={1.8} metalness={0.2} roughness={0.2} />;
  const emerald = <meshPhysicalMaterial color="#10b981" metalness={0.68} roughness={0.2} clearcoat={1} />;
  return (
    <>
      <group ref={chest}>
        <mesh position={[0,-0.08,0]}><boxGeometry args={[1.55,1.08,1.12]}/><meshPhysicalMaterial color="#24104f" metalness={0.62} roughness={0.2} clearcoat={1}/></mesh>
        <mesh position={[0,0.52,0]}><boxGeometry args={[1.68,0.2,1.22]}/>{gold}</mesh>
        <mesh position={[0,-0.08,0.58]}><boxGeometry args={[0.18,1.05,0.035]}/>{gold}</mesh>
        <mesh position={[0,-0.08,-0.58]}><boxGeometry args={[0.18,1.05,0.035]}/>{gold}</mesh>
        <mesh position={[0,0.73,0]}><boxGeometry args={[0.56,0.16,0.56]}/>{gold}</mesh>
        <mesh position={[-0.34,0.82,0]} rotation={[0,0,-0.48]}><torusGeometry args={[0.28,0.07,16,48,Math.PI*1.5]}/>{gold}</mesh>
        <mesh position={[0.34,0.82,0]} rotation={[0,0,0.48]}><torusGeometry args={[0.28,0.07,16,48,Math.PI*1.5]}/>{gold}</mesh>
        <mesh position={[0,0.05,0.64]}><boxGeometry args={[0.36,0.38,0.06]}/><meshPhysicalMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={1.8} metalness={0.8}/></mesh>
      </group>
      <group ref={hero} visible={false}>
        {giftName === "Galaxy" && <>
          <mesh><sphereGeometry args={[1.05,64,64]}/><meshPhysicalMaterial color="#30206f" metalness={0.5} roughness={0.15} emissive="#312e81" emissiveIntensity={0.9} clearcoat={1}/></mesh>
          <mesh ref={orbit} rotation={[0.7,0.2,0.25]}><torusGeometry args={[1.45,0.045,16,160]}/>{gold}</mesh>
          <mesh rotation={[1.1,0.2,-0.4]}><torusGeometry args={[1.62,0.018,12,140]}/><meshStandardMaterial color="#67e8f9" emissive="#0891b2" emissiveIntensity={2}/></mesh>
          <mesh position={[1.28,0.25,0.15]}><sphereGeometry args={[0.2,32,32]}/><meshPhysicalMaterial color="#38bdf8" metalness={0.7} roughness={0.15}/></mesh>
          <mesh position={[-1.2,-0.35,0.1]}><sphereGeometry args={[0.13,32,32]}/><meshPhysicalMaterial color="#f59e0b" metalness={0.8} roughness={0.2}/></mesh>
        </>}
        {giftName === "Universe" && <>
          <mesh><icosahedronGeometry args={[1.12,2]}/>{crystal}</mesh>
          <mesh rotation={[0.5,0.2,0.2]}><torusGeometry args={[1.48,0.055,20,160]}/>{gold}</mesh>
          <mesh rotation={[1.2,0.8,0.4]}><torusGeometry args={[1.62,0.025,12,140]}/><meshStandardMaterial color="#67e8f9" emissive="#0891b2" emissiveIntensity={2}/></mesh>
          <mesh position={[0,0,1.12]}><octahedronGeometry args={[0.22,1]}/><meshPhysicalMaterial color="#fff1a8" emissive="#fbbf24" emissiveIntensity={1.8} metalness={0.6}/></mesh>
        </>}
        {giftName === "MUSEK Legend" && <>
          <mesh position={[0,0.55,0]}><cylinderGeometry args={[0.85,0.55,0.22,64]}/>{gold}</mesh>
          <mesh position={[0,0.12,0]}><cylinderGeometry args={[0.52,0.72,0.75,64,1,true]}/>{gold}</mesh>
          <mesh position={[0,-0.42,0]}><cylinderGeometry args={[0.18,0.2,0.42,32]}/>{gold}</mesh>
          <mesh position={[0,-0.72,0]}><cylinderGeometry args={[0.72,0.82,0.2,64]}/>{gold}</mesh>
          <mesh position={[0,1.08,0]}><torusGeometry args={[0.42,0.08,16,64]}/>{gold}</mesh>
          <mesh position={[-0.8,0.25,0]} rotation={[0,0,0.6]}><torusGeometry args={[0.35,0.075,16,64,Math.PI]}/>{gold}</mesh>
          <mesh position={[0.8,0.25,0]} rotation={[0,0,-0.6]}><torusGeometry args={[0.35,0.075,16,64,Math.PI]}/>{gold}</mesh>
        </>}
        {giftName === "Dragon" && <>
          <mesh position={[0,0,0]} rotation={[0,0,Math.PI/2]}><capsuleGeometry args={[0.38,1.05,8,24]}/>{emerald}</mesh>
          <mesh position={[0.82,0.48,0.04]}><sphereGeometry args={[0.42,32,32]}/>{emerald}</mesh>
          <mesh position={[1.1,0.52,0.28]}><coneGeometry args={[0.11,0.38,16]}/>{gold}</mesh>
          <mesh position={[1.1,0.52,-0.28]}><coneGeometry args={[0.11,0.38,16]}/>{gold}</mesh>
          <mesh position={[1.12,0.35,0.35]}><sphereGeometry args={[0.055,16,16]}/><meshBasicMaterial color="#fef08a"/></mesh>
          <mesh position={[-0.42,0.62,0]} rotation={[0,0,0.6]} scale={[1.1,0.12,0.7]}><coneGeometry args={[0.9,1.2,3]}/><meshPhysicalMaterial color="#064e3b" side={THREE.DoubleSide} metalness={0.35} roughness={0.32}/></mesh>
          <mesh position={[-0.42,-0.62,0]} rotation={[0,0,-0.6]} scale={[1.1,0.12,0.7]}><coneGeometry args={[0.9,1.2,3]}/><meshPhysicalMaterial color="#065f46" side={THREE.DoubleSide} metalness={0.35} roughness={0.32}/></mesh>
          <mesh position={[-1.05,-0.15,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[0.38,0.09,16,48,Math.PI*1.55]}/>{emerald}</mesh>
          <mesh position={[1.3,0.4,0.4]}><coneGeometry args={[0.12,0.65,20]}/>{flame}</mesh>
        </>}
        {giftName === "Phoenix" && <>
          <mesh position={[0,0,0]}><sphereGeometry args={[0.45,32,32]}/><meshPhysicalMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.5} metalness={0.35}/></mesh>
          {[0,1,2,3,4].map((n)=><mesh key={n} position={[-0.65-n*0.08,0.15-n*0.08,0]} rotation={[0,0,0.8+n*0.16]}><coneGeometry args={[0.22,1.15,24]}/>{flame}</mesh>)}
          {[0,1,2,3,4].map((n)=><mesh key={n} position={[0.65+n*0.08,0.15-n*0.08,0]} rotation={[0,0,-0.8-n*0.16]}><coneGeometry args={[0.22,1.15,24]}/>{flame}</mesh>)}
          <mesh position={[0,-0.75,0]}><coneGeometry args={[0.28,1.1,32]}/><meshBasicMaterial color="#fef08a"/></mesh>
          <mesh position={[0,0.78,0]}><coneGeometry args={[0.18,0.65,24]}/><meshPhysicalMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={2}/></mesh>
        </>}
        {giftName === "Money Rain" && <>
          {[0,1,2,3,4,5].map((n)=><mesh key={n} position={[(n-2.5)*0.3,Math.sin(n)*0.48,0]} rotation={[0.2,n*0.5,n*0.32]}><boxGeometry args={[0.72,0.34,0.045]}/><meshPhysicalMaterial color={n%2?"#22c55e":"#86efac"} metalness={0.42} roughness={0.3} clearcoat={1}/></mesh>)}
          <mesh><torusGeometry args={[0.95,0.07,16,80]}/>{gold}</mesh>
        </>}
        {giftName === "Money Vault" && <>
          <mesh><cylinderGeometry args={[0.95,0.95,0.5,64]}/><meshPhysicalMaterial color="#334155" metalness={0.95} roughness={0.16} clearcoat={1}/></mesh>
          <mesh position={[0,0,0.28]}><cylinderGeometry args={[0.72,0.72,0.12,64]}/>{gold}</mesh>
          <mesh position={[0,0,0.36]}><torusGeometry args={[0.48,0.07,16,64]}/><meshPhysicalMaterial color="#cbd5e1" metalness={0.98} roughness={0.12}/></mesh>
          <mesh position={[0,0,0.43]}><sphereGeometry args={[0.16,32,32]}/>{gold}</mesh>
        </>}
        {giftName === "Rocket" && <>
          <mesh rotation={[0,0,-Math.PI/2]}><capsuleGeometry args={[0.34,1.25,8,32]}/><meshPhysicalMaterial color="#e2e8f0" metalness={0.78} roughness={0.18} clearcoat={1}/></mesh>
          <mesh position={[0.85,0,0]} rotation={[0,0,-Math.PI/2]}><coneGeometry args={[0.36,0.65,32]}/>{gold}</mesh>
          <mesh position={[-0.58,-0.42,0]} rotation={[0,0,0.6]}><coneGeometry args={[0.3,0.72,3]}/><meshPhysicalMaterial color="#ef4444" side={THREE.DoubleSide}/></mesh>
          <mesh position={[-0.58,0.42,0]} rotation={[0,0,-0.6]}><coneGeometry args={[0.3,0.72,3]}/><meshPhysicalMaterial color="#ef4444" side={THREE.DoubleSide}/></mesh>
          <mesh position={[-1.05,0,0]} rotation={[0,0,Math.PI/2]}><coneGeometry args={[0.22,0.75,24]}/>{flame}</mesh>
        </>}
        {giftName === "Private Jet" && <>
          <mesh rotation={[0,0,Math.PI/2]}><capsuleGeometry args={[0.28,1.65,8,32]}/><meshPhysicalMaterial color="#f8fafc" metalness={0.7} roughness={0.16} clearcoat={1}/></mesh>
          <mesh position={[0,-0.08,0]} rotation={[0,0,Math.PI/2]}><boxGeometry args={[0.18,3.1,0.12]}/><meshPhysicalMaterial color="#cbd5e1" metalness={0.9} roughness={0.16}/></mesh>
          <mesh position={[-0.88,0.02,0]}><boxGeometry args={[0.42,0.7,0.13]}/>{gold}</mesh>
          <mesh position={[0.8,0.1,0]}><boxGeometry args={[0.3,0.85,0.12]}/>{gold}</mesh>
        </>}
        {giftName === "Mansion" && <>
          <mesh position={[0,-0.25,0]}><boxGeometry args={[1.65,1.15,1.15]}/><meshPhysicalMaterial color="#f8fafc" metalness={0.28} roughness={0.25}/></mesh>
          <mesh position={[0,0.48,0]} rotation={[0,0,Math.PI/4]}><coneGeometry args={[1.15,0.9,4]}/><meshPhysicalMaterial color="#7c3aed" metalness={0.58} roughness={0.2}/></mesh>
          {[-0.48,0.48].map((x)=><mesh key={x} position={[x,-0.18,0.59]}><boxGeometry args={[0.28,0.42,0.05]}/><meshPhysicalMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8}/></mesh>)}
          <mesh position={[0,-0.55,0.6]}><boxGeometry args={[0.34,0.58,0.06]}/><meshPhysicalMaterial color="#7c2d12" metalness={0.4}/></mesh>
        </>}
      </group>
    </>
  );
}

export default function RealGift3D({ giftName, senderName }: { giftName: string; senderName: string }) {
  const legendary = ["Dragon", "Phoenix", "Galaxy", "Universe", "MUSEK Legend"].includes(giftName);
  return (
    <div className="pointer-events-none absolute inset-0 z-[121] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(79,70,229,.28),rgba(5,5,22,.2)_42%,rgba(0,0,0,.62)_82%)]"/>
      <div className="absolute left-1/2 top-[12%] z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/25 bg-black/55 px-4 py-2 text-sm font-black text-white shadow-[0_0_35px_rgba(139,92,246,.6)] backdrop-blur-md">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 to-indigo-600">{senderName.slice(0,1).toUpperCase()}</span>
        <span>{senderName}</span><span className="text-white/65">sent</span><span className="text-amber-200">{giftName}</span><span className="text-white">×1</span>
      </div>
      <div className="absolute left-1/2 top-1/2 h-[min(72dvh,680px)] w-full -translate-x-1/2 -translate-y-1/2">
        <Canvas className="!absolute !inset-0 !h-full !w-full" camera={{ position: [0,0,7], fov: 42 }} dpr={[1,1.5]} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={0.9}/>
          <directionalLight position={[4,5,6]} intensity={2.8} color="#fff1c2"/>
          <pointLight position={[-4,1,3]} intensity={2.8} color={legendary ? "#a855f7" : "#f59e0b"}/>
          <pointLight position={[2,-2,-2]} intensity={2} color="#38bdf8"/>
          <GiftModel giftName={giftName}/>
          <Sparkles count={220} scale={[9,10,4]} size={2.4} speed={0.7} color={legendary ? "#e9d5ff" : "#fde68a"}/>
          <Environment preset="studio"/>
        </Canvas>
      </div>
      <div className="absolute inset-x-0 bottom-[12%] z-10 text-center">
        <p className="text-xs font-black tracking-[.34em] text-amber-100 drop-shadow-[0_0_14px_rgba(168,85,247,.95)]">{legendary ? "✦ MUSEK LEGENDARY MOMENT ✦" : "MUSEK PREMIUM GIFT"}</p>
        <p className="mt-2 text-3xl font-black text-white drop-shadow-[0_3px_22px_rgba(0,0,0,.95)]">{giftName}</p>
        <p className="mt-2 text-[10px] font-bold tracking-[.22em] text-white/75">A MOMENT THAT MOVES THE ROOM</p>
      </div>
    </div>
  );
}
