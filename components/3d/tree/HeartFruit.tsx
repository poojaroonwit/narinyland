"use client";

export const HeartFruit = ({ position, color, scale = 1 }: { position: [number, number, number], color: string, scale?: number }) => {
    return (
        <group position={position} scale={[0.15 * scale, 0.15 * scale, 0.15 * scale]}>
            <mesh rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[1, 1, 0.5]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
            <mesh position={[0.35, 0.35, 0]}>
                <sphereGeometry args={[0.5, 12, 12]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
            <mesh position={[-0.35, 0.35, 0]}>
                <sphereGeometry args={[0.5, 12, 12]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
        </group>
    );
};
