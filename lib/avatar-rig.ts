import * as THREE from 'three';

export type AvatarRigAnchors = {
  head?: THREE.Object3D;
  back?: THREE.Object3D;
  hand?: THREE.Object3D;
};

function normalizedNodeName(node: THREE.Object3D) {
  return node.name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function scoreAnchor(name: string, slot: keyof AvatarRigAnchors) {
  if (slot === 'head') {
    if (name === 'head' || name.endsWith('chead') || name.endsWith('biphead')) return 120;
    if (name.endsWith('head')) return 110;
    if (name.includes('head') && !name.includes('end')) return 70;
    return name.includes('head') ? 20 : 0;
  }

  if (slot === 'back') {
    if (name.includes('upperchest')) return 120;
    if (name.endsWith('cchest') || name === 'chest') return 115;
    if (name.includes('spine2')) return 105;
    if (name.includes('chest')) return 95;
    if (name.includes('spine1')) return 85;
    return name.includes('spine') ? 65 : 0;
  }

  if (name.includes('righthand') || name.endsWith('rhand')) return 120;
  if (name === 'handr' || name.endsWith('handr')) return 115;
  if (name.includes('hand') && (name.includes('right') || name.includes('mixamorigr'))) return 90;
  return 0;
}

export function findAvatarRigAnchors(root: THREE.Object3D): AvatarRigAnchors {
  const candidates: THREE.Object3D[] = [];
  root.traverse(node => {
    if (node instanceof THREE.Bone || /head|chest|spine|hand/i.test(node.name)) candidates.push(node);
  });

  const findBest = (slot: keyof AvatarRigAnchors) => candidates
    .map(node => ({ node, score: scoreAnchor(normalizedNodeName(node), slot) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.node;

  return {
    head: findBest('head'),
    back: findBest('back'),
    hand: findBest('hand'),
  };
}
