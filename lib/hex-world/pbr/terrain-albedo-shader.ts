import type { HexTerrainPBRStyle } from './terrain-surface-style';

type TerrainShader = {
  uniforms: Record<string, { value: unknown }>;
  fragmentShader: string;
};

type TerrainAlbedoStyle = Pick<HexTerrainPBRStyle, 'albedoContrast' | 'albedoSaturation'>;

export function applyTerrainAlbedoReadability(shader: TerrainShader, style: TerrainAlbedoStyle): void {
  shader.uniforms.uTerrainAlbedoContrast = { value: style.albedoContrast };
  shader.uniforms.uTerrainAlbedoSaturation = { value: style.albedoSaturation };

  shader.fragmentShader = shader.fragmentShader
    .replace(
      'void main() {',
      `uniform float uTerrainAlbedoContrast;\nuniform float uTerrainAlbedoSaturation;\n\nvoid main() {`,
    )
    .replace(
      '#include <map_fragment>',
      `#include <map_fragment>\n\n// Keep the original PBR map as the source of truth, then make its detail readable\n// from the diorama camera without replacing normal or roughness response.\nfloat terrainLuma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));\nvec3 terrainChroma = diffuseColor.rgb - vec3(terrainLuma);\nfloat terrainPivot = 0.18;\nfloat terrainContrastLuma = clamp((terrainLuma - terrainPivot) * uTerrainAlbedoContrast + terrainPivot, 0.0, 1.0);\ndiffuseColor.rgb = clamp(vec3(terrainContrastLuma) + terrainChroma * uTerrainAlbedoSaturation, 0.0, 1.0);`,
    );
}
