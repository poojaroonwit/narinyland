"use client";

import { TreeContent } from './tree/TreeContent';
import { TreeContentProps } from './tree/shared';

export * from './tree/shared';
export * from './tree/HeartFruit';
export * from './tree/InstancedLeaves';
export * from './tree/Branch';
export * from './tree/TreeContent';

export const Tree = (props: TreeContentProps) => {
    return <TreeContent {...props} />;
};
