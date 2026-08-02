import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { findAvatarRigAnchors } from '@/lib/avatar-rig';

function rig(names: string[]) {
  const root = new THREE.Group();
  names.forEach(name => {
    const bone = new THREE.Bone();
    bone.name = name;
    root.add(bone);
  });
  return root;
}

test('avatar rig discovery recognizes Ready Player Me and Mixamo anchors', () => {
  const anchors = findAvatarRigAnchors(rig([
    'mixamorigSpine2',
    'mixamorigHead',
    'mixamorigHeadTop_End',
    'mixamorigRightHand',
  ]));

  assert.equal(anchors.head?.name, 'mixamorigHead');
  assert.equal(anchors.back?.name, 'mixamorigSpine2');
  assert.equal(anchors.hand?.name, 'mixamorigRightHand');
});

test('avatar rig discovery recognizes VRM humanoid-style bone names', () => {
  const anchors = findAvatarRigAnchors(rig([
    'J_Bip_C_Chest',
    'J_Bip_C_Head',
    'J_Bip_R_Hand',
  ]));

  assert.equal(anchors.head?.name, 'J_Bip_C_Head');
  assert.equal(anchors.back?.name, 'J_Bip_C_Chest');
  assert.equal(anchors.hand?.name, 'J_Bip_R_Hand');
});

test('avatar rig discovery leaves unsupported slots undefined for fallback rendering', () => {
  const anchors = findAvatarRigAnchors(rig(['Root', 'LeftFoot']));

  assert.equal(anchors.head, undefined);
  assert.equal(anchors.back, undefined);
  assert.equal(anchors.hand, undefined);
});
