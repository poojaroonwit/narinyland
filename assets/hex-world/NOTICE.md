# Hex World PBR Asset Notice

Narinyland's Hybrid PBR Floating Island uses the following Poly Haven assets. Poly Haven distributes these assets under CC0; attribution is not required, but this file records provenance for maintenance and review.

| Logical use | Poly Haven asset | Source |
| --- | --- | --- |
| grass terrain | `leafy_grass` | https://polyhaven.com/a/leafy_grass |
| exposed soil | `dirt` | https://polyhaven.com/a/dirt |
| compacted path | `raked_dirt` | https://polyhaven.com/a/raked_dirt |
| cliff rock | `rock_face` | https://polyhaven.com/a/rock_face |
| building wood | `weathered_planks` | https://polyhaven.com/a/weathered_planks |
| building plaster | `plastered_wall` | https://polyhaven.com/a/plastered_wall |
| roof surface | `roof_tiles` | https://polyhaven.com/a/roof_tiles |
| small-tree / tall shrub silhouette | `shrub_02` | https://polyhaven.com/a/shrub_02 |
| shrub | `shrub_03` | https://polyhaven.com/a/shrub_03 |
| fern | `fern_02` | https://polyhaven.com/a/fern_02 |
| grass tuft | `grass_medium_01` | https://polyhaven.com/a/grass_medium_01 |
| moss rock set | `rock_moss_set_01` | https://polyhaven.com/a/rock_moss_set_01 |
| stump / root dressing | `tree_stump_01` | https://polyhaven.com/a/tree_stump_01 |
| environment lighting | `meadow` | https://polyhaven.com/a/meadow |

## Runtime policy

The source URLs above are provenance only. Browser/runtime code must load only local `/assets/hex-world/...` files. `scripts/resolve-hex-pbr-manifest.mjs` is a maintenance resolver; `scripts/vendor-hex-pbr-assets.mjs` consumes the committed SHA-256-pinned manifest and vendors verified local files before the production build.

## Asset-size note

Large full-tree packages were evaluated and rejected after resolving their exact dependency sizes. `shrub_02` is intentionally used as the scanned small-tree source for the first web PBR pass because it preserves scanned foliage fidelity while keeping the complete pinned v1 source payload below the 64 MB pre-decode guardrail.
