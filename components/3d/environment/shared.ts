import { advanceSeed, hashString, nextSeededRatio, seededRatio } from '../../game-engine-3d';

export type EnvironmentTheme = {
    leaves: string[];
};

export type FlowerPosition = {
    x: number;
    z: number;
};

export { advanceSeed, hashString, nextSeededRatio, seededRatio };
