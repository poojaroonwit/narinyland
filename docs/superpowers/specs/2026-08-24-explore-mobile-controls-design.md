# Narinyland Explore Mobile Controls Design

Date: 2026-08-24
Branch: `feat/explore-mobile-controls`
Base: `main` at `1251fc9a23a4969963b071c7fa617141150951f8`

## Goal

Make person-scale Explore mode fully playable on phones and touch devices without introducing a second movement system or changing Narinyland persistence, farming, building, expansion, economy, or backend APIs.

The approved interaction model is:

- left-side virtual movement joystick on mobile
- drag the remaining 3D scene to orbit the existing third-person camera
- pinch on the 3D scene to retain camera zoom
- desktop WASD / arrow movement stays unchanged
- touch and keyboard both feed the same camera-relative player traversal logic

This closes the current product gap where mobile Explore can look around but still says movement requires a keyboard.

## Product Principles

1. **One movement authority.** Touch input is only another source of normalized forward/right axes. `HexPlayerController` remains the only component that converts movement axes into camera-relative traversal and enforces unlocked-tile boundaries.
2. **World mode stays untouched.** The joystick exists only in person Explore mode and never appears in World/build/farm/expand workflows.
3. **No stuck movement.** Any pointer cancellation, loss of capture, view-mode change, hidden controls, or open primary sheet must immediately zero touch movement.
4. **Do not fight the camera.** The joystick consumes only pointer events inside its own hit area. Touches elsewhere continue reaching the R3F canvas and existing `OrbitControls` for camera orbit and pinch zoom.
5. **Mobile-safe UI.** Controls respect safe areas, stay clear of the bottom navigation and Explore action cluster, and keep a minimum comfortable touch target.
6. **No fake mobile-only gameplay rules.** Touch players use the exact same player speed, walkability, avatar heading, spawn, and camera-relative movement rules as keyboard players.

## Architecture

### Shared movement input

Add `lib/hex-world/explore-movement-input.ts` containing presentation/input-only types and pure helpers:

```ts
export type HexExploreMovementInput = {
  forward: number;
  right: number;
};
```

The module owns pure normalization helpers for a joystick displacement:

- clamp magnitude to 1
- apply a small radial dead zone
- preserve analog magnitude outside the dead zone
- convert screen-space joystick Y so upward drag becomes positive `forward`
- return exact `{ forward: 0, right: 0 }` when inside the dead zone or reset

No React, DOM, Three.js, API, or persistence dependency belongs in this module.

### Input ownership

`HexBuildController` owns one mutable ref for the current touch movement axes. That ref is passed down both sides of the existing UI/render split:

- `HexGameplayOverlay` / Explore HUD writes touch joystick values into it
- `HexWorld3D` / `HexPlayerController` reads it every frame

This keeps touch input transient and frame-friendly. Joystick motion does not need React state updates on every pointer move just to drive the 3D player.

The ref is reset whenever person mode is exited or the active Land changes.

### Mobile joystick component

Add `components/hex-world/HexExploreTouchControls.tsx`.

Responsibilities:

- render only as mobile Explore presentation
- fixed bottom-left placement above the app safe-area/bottom-nav envelope
- round translucent outer pad with a smaller thumb
- use Pointer Events and pointer capture
- compute displacement from the pad center
- normalize through the shared pure helper
- write directly to the movement input ref
- visually move the thumb within a bounded radius
- call `stopPropagation()` for joystick pointer events so `OrbitControls` does not rotate while the user is walking
- zero input on `pointerup`, `pointercancel`, `lostpointercapture`, unmount, and when disabled
- use `touch-action: none` only on the joystick surface, not on the entire screen

Target sizing:

- outer visual/control diameter: approximately 88-96 px
- thumb diameter: approximately 38-44 px
- effective travel radius: approximately 32-36 px
- safe-area aware left/bottom offsets

The control should feel present but visually subordinate to the world.

### Overlay integration and suspension

`HexGameplayOverlay` already owns `inventoryOpen`, `hudPanel`, and `detailsOpen`, so it is the correct place to determine whether Explore touch movement is allowed.

Touch movement is suspended and zeroed when any primary blocking surface is open:

- Bag / inventory
- Goals or another living HUD panel
- full details layer if one becomes reachable from Explore in the future
- non-interactive/loading states

`HexExploreHUD` receives the movement input ref plus a `touchControlsEnabled`/equivalent boolean and renders `HexExploreTouchControls` only when allowed.

The existing mobile hint changes from:

`Drag to look · movement requires a keyboard`

to a concise touch hint such as:

`Move with the joystick · drag to look`

Desktop keeps its WASD/arrows hint.

### Player controller integration

`HexPlayerController` receives the shared movement input ref.

Each frame it derives:

- keyboard forward/right axes exactly as today
- touch forward/right axes from the ref
- combined axes by summing keyboard + touch, then clamping/normalizing to a maximum magnitude of 1

The combined input then goes through the existing `getCameraRelativeMoveVector` and `resolveWalkablePlayerPosition` path.

This preserves:

- camera-relative direction
- `PLAYER_SPEED`
- unlocked-tile restriction
- player height resolution
- avatar walk animation state
- avatar heading smoothing
- camera follow behavior

Keyboard input remains usable even when a touch-capable device is present.

## Camera Interaction

No second camera stick is added.

The existing `OrbitControls` remains authoritative for:

- one-finger drag/orbit on the 3D canvas outside the joystick
- pinch zoom
- existing damping and polar/distance bounds

The joystick intercepts only its own pointer stream. This intentionally avoids dual-stick visual clutter and avoids duplicating camera gesture logic in DOM code.

## Responsive Behavior

The joystick is intended for the mobile breakpoint used by the existing Explore HUD (`sm:hidden` / narrow viewport behavior).

On larger screens:

- joystick is not shown
- WASD/arrows continue to work
- mouse drag and wheel continue to control camera
- no layout changes are required for the desktop Explore action group

On mobile:

- joystick occupies bottom-left
- compact Level/XP card may remain above/near it but must not overlap the active joystick hit area
- action buttons remain bottom-right
- center/bottom hint must not cover the joystick
- bottom navigation and device safe areas remain clear

## State Reset Rules

Touch movement must become zero immediately when:

- joystick pointer ends
- pointer is cancelled
- pointer capture is lost
- browser tab/window loses the active pointer stream
- joystick component unmounts
- Bag/Goals/blocking HUD opens
- Explore changes to World
- active Land changes
- controller reset/re-spawn is triggered

A stale non-zero ref after any of these transitions is considered a defect.

## Accessibility and Input Safety

- The joystick is an enhancement for direct touch play; desktop keyboard behavior is preserved.
- The joystick has an accessible label describing movement control, but it is not represented as four fake buttons.
- Existing keyboard guards for input/textarea/select/contenteditable remain unchanged.
- Pointer control must not block screen-reader access to Explore HUD buttons.
- Use at least the established 44 px interaction sizing for actionable HUD controls.
- Reduced-motion mode does not alter movement semantics; it only keeps the existing reduced visual interpolation behavior.

## Error / Edge Handling

- If touch input contains non-finite values, normalize to zero.
- If the joystick has zero/invalid radius, normalize to zero.
- Multi-touch beginning on the joystick does not become camera control; the captured joystick pointer remains dedicated to movement while camera gestures happen outside it.
- Movement still stops at locked/missing tiles through the existing traversal helper; the joystick must not implement collision or land rules.

## Testing Strategy

### Pure tests

Add tests for `explore-movement-input.ts`:

- center input resolves to zero
- values inside dead zone resolve to zero
- upward drag maps to positive forward
- right drag maps to positive right
- diagonal input remains normalized
- displacement beyond radius clamps to magnitude 1
- non-finite and invalid-radius inputs resolve safely to zero
- combining keyboard and touch axes never exceeds magnitude 1

### Source/contract tests

Add/extend Explore source contract tests to verify:

- mobile touch-control component exists
- it uses pointer capture and resets on pointer end/cancel/lost capture
- joystick events stop propagation so camera orbit is not triggered by the same pointer
- `HexBuildController` owns one shared movement ref and passes it to both world and overlay
- `HexGameplayOverlay` suspends touch controls while Bag/Goals/blocking UI is open
- `HexPlayerController` combines touch axes with existing keyboard axes before the existing camera-relative traversal helpers
- mobile hint no longer says a keyboard is required
- desktop WASD/arrows and OrbitControls remain present
- World mode does not render mobile Explore controls

### Full regression gate

Before merge, the exact PR head must pass the existing Hex Homestead CI, including:

- dependency/security gate
- Prisma validation/migrations
- security regressions
- full Hex/Garden/startup pure suite
- DB/Redis undo integration
- existing farm regression
- lint
- production build
- production runtime smoke

## Non-Goals

This change does **not** add:

- sprint or stamina movement
- jump
- combat/action buttons
- tap-to-move or pathfinding
- dual virtual sticks
- interaction prompts with buildings/NPCs
- multiplayer player movement synchronization
- gamepad support
- avatar customization
- camera collision
- new DB fields, APIs, save state, or economy rules

Those are separate product decisions and should not be smuggled into the mobile-control implementation.

## Acceptance Criteria

The work is accepted when:

1. A phone-width Explore session can move the player continuously with a left virtual joystick.
2. The same session can drag the remaining scene to orbit and pinch to zoom using the existing camera controller.
3. Keyboard and touch use the same traversal authority and cannot move outside unlocked land.
4. Opening Bag/Goals or leaving Explore immediately stops touch movement and hides/suspends the joystick.
5. Desktop Explore behavior remains functionally unchanged.
6. The mobile keyboard-required message is removed.
7. No persistence/API/gameplay-schema changes are introduced.
8. The full repository CI gate passes on the final PR head.
