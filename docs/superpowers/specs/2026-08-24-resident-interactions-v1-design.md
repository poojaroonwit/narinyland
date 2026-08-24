# Resident Interactions v1 Design

Date: 2026-08-24
Status: Approved design, implementation not started
Branch: `feat/explore-resident-interactions-v1`

## Summary

Resident Interactions v1 extends Narinyland Explore mode so the player can approach moving household residents and interact with them in-world. The first version covers `partner-1`, `partner-2`, the optional `child`, and the chosen `pet`.

This feature builds on the existing Explore proximity interaction system instead of creating a second movement or interaction framework. Resident world positions remain deterministic presentation state derived from the existing Homestead Presence routes; no resident coordinates, conversation history, affection score, or dialogue state are persisted.

The interaction loop is:

1. A resident follows the existing deterministic Homestead Presence route.
2. Explore receives the resident's current presentation position.
3. The player interaction resolver compares nearby supported buildings and supported residents.
4. The closest valid target inside the interaction radius becomes the current prompt target.
5. Desktop shows `E · Talk`; mobile shows a contextual `Talk` control.
6. Opening the resident interaction suspends player movement and keeps the 3D scene/camera visible.
7. A compact deterministic conversation card shows a context-aware line and only real actions supported by existing Homestead Life state.
8. Closing the card returns immediately to Explore at the same player/camera position.

## Goals

- Make Narinyland's moving family and pet presence feel interactable rather than decorative.
- Reuse the existing Explore target/prompt/open/close lifecycle introduced by Explore Interactions v1.
- Keep moving resident positions deterministic and presentation-only.
- Provide short dialogue that reacts to existing game state without an AI/network dependency.
- Reuse existing Homestead Life actions where a resident action already exists.
- Keep World/build/farm/expand persistence and gameplay authority unchanged.
- Preserve desktop and mobile Explore controls.

## Non-goals

Resident Interactions v1 does not add:

- persistent resident coordinates
- conversation history
- free-text chat
- LLM-generated dialogue
- affection or relationship meters
- romance systems
- gift inventory or gifting
- quest chains or quest markers
- voice dialogue
- new currencies
- new Prisma models or database columns
- new API routes solely for conversations
- cow/sheep direct world interactions
- multiplayer NPC synchronization

Cow and sheep continue to use the existing Barn/animal-care gameplay in this version.

## Existing authority to preserve

### Resident movement

`lib/hex-world/homestead-presence.ts` remains the single authority for deterministic household routes and positions. Resident routes are still derived from:

- resident id
- current Homestead day
- current Homestead time
- elapsed presentation time
- available building-role anchors
- reduced-motion preference

The feature must not persist or mutate these coordinates.

### Resident rendering

`components/hex-world/HexLivingWorldLayer.tsx` continues to render partners, optional child, pet, cow, sheep, crops, weather, and seasonal presentation.

The only new responsibility added to moving resident rendering is optional reporting of current interactable resident samples to the Explore interaction layer.

### Gameplay actions

`lib/homestead-life-engine.ts` and the existing Family Farm/Homestead client APIs remain authoritative for gameplay mutations.

Resident Interactions v1 may invoke existing actions such as:

- `pet_time`
- `family_time`

when those actions are valid for the current resident/context. The conversation feature must not reproduce the reward logic client-side.

## Supported residents

### Partner 1

Always present when Homestead state is available.

Interaction kind: `resident`
Resident id: `partner-1`
Display role: `Partner`
Primary verb: `Talk`

May offer:

- `Talk`
- `Family Time` when the existing Homestead state/action rules allow it
- `Close`

### Partner 2

Always present when Homestead state is available.

Interaction kind: `resident`
Resident id: `partner-2`
Display role: `Partner`
Primary verb: `Talk`

May offer the same v1 action set as Partner 1, with independently selected deterministic dialogue copy.

### Child

Only interactable when `state.family.stage === 'child'`.

Interaction kind: `resident`
Resident id: `child`
Display role: `Child`
Primary verb: `Talk`

May offer:

- `Talk`
- `Family Time` when valid
- `Close`

The child must not be reported as an interaction target before the existing family progression unlocks the child.

### Pet

Only interactable when `state.animals.pet.kind` is `cat` or `dog`.

Interaction kind: `resident`
Resident id: `pet`
Display role: `Cat` or `Dog`
Primary verb: `Pet`

May offer:

- `Pet` backed by the existing `pet_time` Homestead action
- `Talk`/ambient acknowledgement copy without gameplay mutation
- `Close`

The pet must not exist as an interaction target until a pet has actually been chosen in authoritative Homestead state.

## Unified Explore target model

The current building proximity interaction should be generalized into one discriminated transient target model.

Conceptually:

```ts
type HexExploreInteractionTarget =
  | {
      kind: 'building';
      id: string;
      buildingId: string;
      role: LivingBuildingRole;
      x: number;
      z: number;
      distance: number;
    }
  | {
      kind: 'resident';
      id: string;
      residentId: HexResidentId;
      residentRole: HexResidentRole;
      x: number;
      z: number;
      distance: number;
    };
```

Exact naming may follow existing repository conventions, but the public boundary must stay discriminated and testable.

Buildings remain sourced from authoritative `HexBuildingDTO` records. Residents are sourced from presentation-only current positions.

## Resident position reporting

### Why reporting is needed

Resident coordinates currently exist inside the R3F living-world presentation layer. Player proximity resolution cannot correctly target a moving resident by using only its route anchor or building anchor.

### Reporting contract

`HexLivingWorldLayer` will optionally report a compact set of current resident interaction samples to its parent/scene integration.

A sample contains only what targeting needs:

```ts
type HexResidentInteractionSample = {
  residentId: 'partner-1' | 'partner-2' | 'child' | 'pet';
  role: 'partner' | 'child' | 'pet';
  petKind?: 'cat' | 'dog';
  x: number;
  z: number;
};
```

Rules:

- Cow and sheep are not reported in v1.
- Child is omitted unless unlocked.
- Pet is omitted unless chosen.
- Reporting is presentation-only and does not write to persistent state.
- R3F frame updates must not cause a React state update every frame when the sample set is effectively unchanged.
- Position reporting should be throttled or change-gated to a bounded cadence suitable for interaction targeting.
- Reduced-motion mode reports the deterministic stationary resident position.

The target is responsive proximity behavior, not exact physics-grade synchronization.

## Proximity and target arbitration

### Interaction radius

Resident interactions use the same general Explore interaction distance envelope as building interactions. The implementation should preserve the current 1.7 world-unit building radius unless testing shows a small resident-specific tolerance is required for usability.

The preferred design is one shared default radius so the prompt feels consistent.

### Candidate resolution

The resolver receives:

- current player horizontal position
- supported building candidates
- current resident interaction samples

It filters candidates outside radius, then chooses the nearest remaining target by horizontal X/Z distance.

If a resident and a building are both inside range, the physically closer candidate wins. There is no blanket resident priority over buildings.

Deterministic ties resolve by a stable target id, not array order.

Height does not affect targeting.

### Open-target stability

Once a resident conversation is open, the open interaction remains bound to that resident until the player closes it or the resident becomes invalid because its authoritative state disappears (for example, Land switch/state reset). The dialogue must not auto-close merely because the presentation route moves the resident slightly while the conversation is open.

## Interaction prompt

The existing Explore prompt should support target-aware verbs.

### Desktop

Building example:

`E · Interact — Garden Patch`

Resident examples:

`E · Talk — Partner`

`E · Talk — Child`

`E · Pet — Cat`

Keyboard rules remain:

- only act on non-repeated `E` keydown
- ignore editable controls (`input`, `textarea`, `select`, contenteditable)
- do nothing while another blocking surface is open

### Mobile

The existing contextual interaction control becomes verb-aware:

- `Interact` for buildings
- `Talk` for partner/child
- `Pet` for pet

Minimum target size remains 44px.

The mobile button owns its pointer stream and must not rotate the camera underneath it.

## Conversation presentation

Add a focused `HexResidentConversationPanel` (exact name may follow repository conventions).

The panel is a compact bottom/side card, not a full-screen dialogue scene.

It shows:

- small resident icon/avatar cue
- resident label (`Partner`, `Child`, `Cat`, `Dog`)
- one deterministic context-aware dialogue line
- at most 1–3 context actions
- explicit `Close`

The 3D world stays visible behind it.

Opening the panel:

- zeroes joystick input
- suspends both keyboard and touch movement through the existing movement-suspension path
- hides the proximity prompt
- disables touch joystick while the panel is open
- keeps Orbit/camera presentation stable unless existing overlay conventions already disable it

Closing the panel returns to Explore without changing World/Explore mode, player spawn, camera reset nonce, or selected builder state.

`Escape` closes the conversation on desktop when focus is not inside an editable control.

## Deterministic dialogue model

Dialogue is generated locally from bounded templates and existing authoritative Homestead state.

Create a pure helper such as:

`lib/hex-world/resident-dialogue.ts`

Input should contain only existing state needed to choose copy, for example:

- resident id/role
- pet kind when relevant
- day
- timeMinutes
- season
- weather
- family stage
- energy/maxEnergy
- hearts
- whether family time has already occurred today
- whether pet interaction already occurred today
- current/last Homestead message when safe and useful

Output is a small presentation object:

```ts
type HexResidentDialogue = {
  title: string;
  line: string;
  actions: HexResidentDialogueAction[];
};
```

### Selection rules

Dialogue selection must be deterministic for identical relevant input. It may use a stable seed derived from resident id + day + contextual bucket.

Priority should prefer meaningful current context before generic ambient copy:

1. pet daily interaction availability / completion
2. low-energy or late-day home/rest context
3. rainy/weather-specific copy
4. season-specific copy
5. current family-stage context
6. general location/day ambient copy

Avoid long prose. One line should usually fit in 1–2 short sentences.

### Example copy direction

Partner:
- `The garden feels calm after the rain.`
- `We did a lot today. The house is starting to feel like ours.`

Child:
- `Can we go look at the pond?`
- `The flowers are different this season!`

Pet:
- `Mochi trots over and waits for attention.`
- `Your cat curls around your feet.`

Names are not introduced unless an authoritative resident/pet name already exists. If no authoritative name exists, use role-based labels such as `Partner`, `Child`, `Cat`, or `Dog`.

## Resident actions

### Talk

`Talk` itself is presentation-only in v1. It may advance to another deterministic line within the current card only if that behavior stays deterministic and ephemeral; no reward is granted for simply cycling dialogue.

The simplest acceptable v1 is one context line with no dialogue pagination.

### Family Time

When shown for Partner/Child, it invokes the existing authoritative `family_time` action.

The UI must derive availability from current Homestead state and handle the existing action response/error path.

No duplicate heart/XP logic is added to the conversation module.

### Pet

When shown for a chosen pet, it invokes existing `pet_time`.

The panel updates from refreshed authoritative Homestead state after the action. It must not optimistically mint hearts or mark the day complete itself.

## Component/data flow

Preferred flow:

```text
Homestead state + buildings
        |
        v
HexLivingWorldLayer
  - renders moving residents
  - reports bounded resident samples
        |
        v
HexWorld3D
  - forwards resident samples / player context
        |
        v
Explore interaction resolver
  - building candidates
  - moving resident candidates
  - nearest deterministic target
        |
        v
HexBuildController
  - owns transient current target/open target
        |
        v
HexGameplayOverlay
  - prompt
  - building quick/deep panels
  - resident conversation panel
        |
        v
existing useLivingHomestead().act(...)
```

The controller remains the lifecycle authority for transient interaction state. R3F remains responsible for presentation positions. Homestead Life remains responsible for gameplay mutations.

## Overlay coordination

Resident conversation is another blocking Explore surface and must participate in the existing single-surface policy.

Mutual exclusion rules:

- Bag opening closes resident conversation.
- Goals opening closes resident conversation.
- Resident conversation cannot open while Bag/Goals/build/world transition is blocking interaction.
- Building interaction and resident conversation cannot both be open.
- Switching to World closes resident conversation.
- Entering Build/Farm/Expand/Move closes resident conversation.

The touch joystick is enabled only when Explore is interactive and no blocking sheet/panel/conversation is open.

## Lifecycle cleanup

Transient resident interaction state must clear on:

- Land change
- switching Explore → World
- entering Build
- entering Farm/world farm focus
- entering Expand
- starting Move
- resetting view/player
- loss/replacement of authoritative Homestead state
- child becoming unavailable through normalized state replacement
- pet becoming unavailable through normalized state replacement
- component unmount

All movement input refs are zeroed when a resident conversation opens or any lifecycle reset occurs.

## Error handling

- If an open resident becomes invalid, close the conversation cleanly.
- If `family_time` or `pet_time` fails, keep the panel open and use the existing Homestead action error/toast behavior.
- If Homestead state is loading, resident prompts should not offer state-dependent actions that cannot be validated.
- Missing resident interaction samples must degrade to building-only proximity interaction.
- Resident reporting must never block or crash world rendering.

## Performance constraints

- Do not set React state from every animation frame without change/cadence gating.
- Report at a bounded cadence or only when horizontal movement exceeds a small threshold.
- Keep resident candidate count tiny (maximum four in v1).
- Use horizontal distance comparisons; no physics engine or raycast nav system.
- Do not add postprocessing or new runtime asset/network dependencies for dialogue.

## Accessibility and input safety

- Mobile action targets remain at least 44px.
- Conversation buttons have visible text labels.
- `E` and `Escape` handlers ignore editable controls.
- Repeated keydown does not spam interaction actions.
- Reduced-motion users still have deterministic resident positions and fully functional prompts/dialogue.
- Dialogue remains readable without relying on animation.

## Testing strategy

### Pure tests

Add tests for:

- deterministic resident-dialogue output for identical input
- weather/season/context priority
- child omission before family-stage unlock
- pet omission before pet selection
- pet kind label/copy behavior
- nearest building vs resident arbitration
- exact radius boundary
- stable id tie-breaking
- horizontal-only distance
- open-target stability semantics

### Source/integration contracts

Add tests for:

- `HexLivingWorldLayer` reports only partner-1, partner-2, optional child, and optional pet
- cow/sheep are not direct resident interaction samples in v1
- R3F resident reporting is cadence/change gated
- `HexWorld3D` forwards the resident sample path only where needed
- Explore prompt renders `Talk`/`Pet` verbs safely
- conversation overlay reuses existing `onLivingAction`
- `pet_time` and `family_time` remain authoritative actions
- movement is suspended and touch joystick disabled behind conversation
- Bag/Goals/build/world transitions close resident conversation
- Land/reset lifecycle clears resident transient state
- World builder behavior remains unchanged

### Full verification gate

Before merge, the exact final PR head must pass the existing Hex Homestead CI end-to-end:

- dependency/security gate
- Prisma validation and migrations
- security regressions
- full Hex/Garden/startup pure suite
- DB/Redis undo integration
- existing farm regression
- lint
- production build
- production runtime smoke

## Implementation boundary

Expected files to add or modify include:

- `lib/hex-world/resident-dialogue.ts` (new)
- `lib/hex-world/explore-interactions.ts` (generalize candidate model/arbitration)
- `components/hex-world/HexLivingWorldLayer.tsx`
- `components/hex-world/HexWorld3D.tsx`
- `components/hex-world/HexPlayerController.tsx` or the existing interaction-reporting boundary as appropriate
- `components/hex-world/HexBuildController.tsx`
- `components/hex-world/HexGameplayOverlay.tsx`
- `components/hex-world/HexExploreInteractionPrompt.tsx`
- `components/hex-world/HexResidentConversationPanel.tsx` (new)
- focused `tests/hex-*.test.ts` contracts

Exact file boundaries may be refined during implementation planning if the existing merged interaction architecture makes a smaller boundary clearer, but the authority model and scope above must remain unchanged.

## Acceptance criteria

Resident Interactions v1 is complete when:

1. The player can approach either partner and receive a contextual Talk prompt.
2. Child targeting appears only after the existing child unlock.
3. Pet targeting appears only after an existing cat/dog is chosen.
4. The nearest physical target wins across building and resident candidates.
5. Desktop `E` and mobile contextual controls open the correct interaction.
6. Resident conversation copy is deterministic from existing state and has no AI/network dependency.
7. Pet interaction invokes existing `pet_time` authority.
8. Family Time, when offered, invokes existing `family_time` authority.
9. Movement is suspended while the conversation is open and safely resumes after close.
10. Building interactions, World mode, build/farm/expand/move, persistence, economy, and backend APIs remain unchanged.
11. No resident positions or conversation state are persisted.
12. The exact final PR head passes the complete Hex Homestead CI gate.
