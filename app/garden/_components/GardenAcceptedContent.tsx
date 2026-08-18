"use client";

import React from 'react';

/**
 * The previous garden content layer rendered the legacy LoveTree3D tabs on top
 * of the world scene. The 2D family-farm world now owns the primary gameplay
 * surface and navigation, so keeping that layer mounted would duplicate UI and
 * pull the old Three.js runtime back into /garden.
 *
 * Romantic features remain available through their existing data/API modules
 * and global settings while the new 2D game loop is established. They can be
 * reintroduced later as dedicated 2D screens without coupling them to 3D.
 */
export const GardenAcceptedContent: React.FC = () => null;
