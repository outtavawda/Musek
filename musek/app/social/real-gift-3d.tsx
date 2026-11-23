"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Sparkles } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function GiftModel({ giftName }: { giftName: string }) {
  const group = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.42;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.7) * 0.08;
      group.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.12;
    }
    if (orbit.current) orbit.current.rotation.z += delta * 0.7;
  });

  const gold = <meshPhysicalMaterial color="#f6c453" metalness={0.92} roughness={0.19} clearcoat={1} />;
  const crystal = <meshPhysicalMaterial color="#8b5cf6" metalness={0.42} roughness={0.12} transmission={0.18} thickness={1.4} clearcoat={1} emissive="#3b0764" emissiveIntensity={0.65} />;
  const dark = <meshStandardMaterial color="#11152f" metalness={0.7} roughness={0.24} />;
  const flame = <meshPhysicalMaterial color="#fb6a24" emissive="#f97316" emissiveIntensity={1.6} metalness={0.2} roughness={0.22} />;
  return (
    <group ref={group}>
      {giftName === "Galaxy" && <>
        <mesh><sphereGeometry args={[1.05, 64, 64]} /><meshPhysicalMaterial color="#30206f" metalness={0.5} roughness={0.18} emissive="#312e81" emissiveIntensity={0.7} clearcoat={1}/></mesh>
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
        <mesh position={[0,0,0]} rotation={[0,0,Math.PI/2]}><capsuleGeometry args={[0.38,1.05,8,24]}/><meshPhysicalMaterial color="#087f5b" metalness={0.5} roughness={0.25} clearcoat={1}/></mesh>
        <mesh position={[0.82,0.48,0.04]}><sphereGeometry args={[0.42,32,32]}/><meshPhysicalMaterial color="#10b981" metalness={0.45} roughness={0.2}/></mesh>
        <mesh position={[1.1,0.52,0.28]}><coneGeometry args={[0.11,0.38,16]}/>{gold}</mesh>
        <mesh position={[1.1,0.52,-0.28]}><coneGeometry args={[0.11,0.38,16]}/>{gold}</mesh>
        <mesh position={[1.12,0.35,0.35]}><sphereGeometry args={[0.055,16,16]}/><meshBasicMaterial color="#fef08a"/></mesh>
        <mesh position={[-0.42,0.62,0]} rotation={[0,0,0.6]} scale={[1.1,0.12,0.7]}><coneGeometry args={[0.9,1.2,3]}/><meshPhysicalMaterial color="#064e3b" side={THREE.DoubleSide} metalness={0.35} roughness={0.32}/></mesh>
        <mesh position={[-0.42,-0.62,0]} rotation={[0,0,-0.6]} scale={[1.1,0.12,0.7]}><coneGeometry args={[0.9,1.2,3]}/><meshPhysicalMaterial color="#065f46" side={THREE.DoubleSide} metalness={0.35} roughness={0.32}/></mesh>
        <mesh position={[-1.05,-0.15,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[0.38,0.09,16,48,Math.PI*1.55]}/><meshPhysicalMaterial color="#10b981" metalness={0.55}/></mesh>
      </>}
      {giftName === "Phoenix" && <>
        <mesh position={[0,0,0]}><sphereGeometry args={[0.45,32,32]}/><meshPhysicalMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.3} metalness={0.35}/></mesh>
        {[0,1,2,3,4].map((n)=><mesh key={n} position={[-0.65-n*0.08,0.15-n*0.08,0]} rotation={[0,0,0.8+n*0.16]}><coneGeometry args={[0.22,1.15,24]}/>{flame}</mesh>)}
        {[0,1,2,3,4].map((n)=><mesh key={n} position={[0.65+n*0.08,0.15-n*0.08,0]} rotation={[0,0,-0.8-n*0.16]}><coneGeometry args={[0.22,1.15,24]}/>{flame}</mesh>)}
        <mesh position={[0,-0.75,0]}><coneGeometry args={[0.28,1.1,32]}/><meshBasicMaterial color="#fef08a"/></mesh>
        <mesh position={[0,0.78,0]}><coneGeometry args={[0.18,0.65,24]}/><meshPhysicalMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={2}/></mesh>
      </>}
    </group>
  );
}

export default function RealGift3D({ giftName, senderName }: { giftName: string; senderName: string }) {
  return (
    <div className="w-[min(86vw,420px)] overflow-hidden rounded-2xl border border-white/15 bg-[radial-gradient(ellipse_at_50%_45%,rgba(79,70,229,.36),rgba(5,5,22,.96)_72%)] shadow-[0_0_70px_rgba(99,102,241,.38)]">
      <div className="flex items-center justify-center gap-2 px-3 pt-3 text-[11px] font-bold text-white/90">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 to-indigo-600">{senderName.slice(0,1).toUpperCase()}</span>
        <span>{senderName}</span><span className="text-white/60">sent</span><span className="text-amber-200">{giftName}</span>
      </div>
      <div className="h-[245px] w-full">
        <Canvas camera={{ position: [0,0,5.4], fov: 38 }} dpr={[1,1.6]} gl={{ alpha: true, antialias: true }}>
          <color attach="background" args={["#070719"]}/>
          <ambientLight intensity={0.75}/>
          <directionalLight position={[4,5,6]} intensity={2.4} color="#fff1c2"/>
          <pointLight position={[-4,1,3]} intensity={2.1} color="#8b5cf6"/>
          <pointLight position={[2,-2,-2]} intensity={1.6} color="#38bdf8"/>
          <Float speed={1.6} rotationIntensity={0.18} floatIntensity={0.35}>
            <GiftModel giftName={giftName}/>
          </Float>
          <Sparkles count={90} scale={4.8} size={2.2} speed={0.45} color="#d8b4fe"/>
          <ContactShadows position={[0,-1.65,0]} opacity={0.5} scale={4} blur={2.5} far={3}/>
          <Environment preset="studio"/>
        </Canvas>
      </div>
      <div className="pb-3 text-center text-[10px] font-black tracking-[.28em] text-amber-100">MUSEK · PREMIUM LIVE GIFT</div>
    </div>
  );
}
