# Narinyland — A World for Every Couple

## North star
Narinyland is a **living, private, two-player world**: not a public MMO with relationship widgets attached.
Each AppKit circle is an independent couple world with its own land, construction, pets, timeline,
memories, and story. Characters can still explore from person scale; collaborative activities
should add meaning to the physical world, rather than replace it.

## Inspiration, not copies
- **It Takes Two:** design *asymmetric roles* and puzzles that require both people, not just two copies of a solo quest.
- **Stardew Valley:** allow quiet, independent activities that still improve a shared home.
- **Sky: Children of the Light:** gentle friendship gestures, spontaneous exploration, and light as a visual metaphor.
- **Private couple journals:** private contributions revealed by mutual participation rather than one partner setting the narrative.

## Implemented in the initial adventure slice
- Active AppKit circle is the source of couple-world identity; all writes use authenticated circle membership.
- One, and no more than two, distinct local members may use Couple Adventures.
- Three deterministic, world-specific prompts daily; users can do one, two, or all three with no streak penalty.
- Each answer is immutable, private until both members have answered, and returned only to members of its circle.
- Each pair of responses lights a permanent story lantern. Chapters unlock at 1, 5, and 14 shared moments.
- The garden has a dedicated **Adventures** tab and responsive, keyboard-usable journal forms.
- Proposals are optional for new worlds so onboarding does not gate the actual game.
- DB rows cascade with the circle and partner. Migration applies to existing databases without deleting prior worlds.

## Next game iterations, in priority order
1. **Two-key dungeons:** short 3D puzzles where one player controls wind/light and the other controls terrain/bridges. Either can switch roles. Server-authoritative completion and accessible alternatives.
2. **Memory Grove:** completed real-life memories create an explorable, privacy-controlled landmark or lantern in the 3D map. No public exposure by default. Avoid storing raw media inside world metadata.
3. **Shared homestead:** gardening, crafting and customizing decorations from distinct play styles. Players may play asynchronously; synchronous co-op unlocks optional flourishes.
4. **Our seasons:** choose a world biome/theme (forest, coast, celestial, sakura) and season as per-circle saved settings; preserve seed, buildings, land ownership and performance tier.
5. **Companion quests:** two-player pet care with distributed roles, character emotes and optional companion dialogue. Do not substitute AI for the second person.
6. **Long-distance dates:** meet at a shared in-world scene at a chosen time, sketch a joint postcard, and keep the result as a private memory.
7. **Reversible privacy controls:** members can export/delete contributions, leave a world, remove a partner, and resolve world ownership without exposing other couples' media.
8. **Technical real-time layer:** server-confirmed presence and ephemeral room-based interaction. Avoid permanent connections on idle serverless instances; degrade to asynchronous play.

## Safety and architecture
- Never trust client-supplied circle ID without `requireConfigAccess`.
- The AppKit circle and local Partner binding, not an invite code, authorize access.
- Do not issue generic service-token self-adds from a submitted circle ID.
- Keep 3D terrain generation, placement, and asset loading decoupled from journal UI state.
- Do not store user answers in localStorage, analytics, logs, notifications or public world chat.
- Refresh state on circle changes, guard against stale requests, and use no-store private responses.
- Rewards must eventually use a transactionally idempotent ledger before granting build currency.
- Admin/setup settings are not a substitute for explicit agreement of both members on disclosures.

## Deployment / verification
1. Run `npm install`, `npm run db:generate`, and `npm run db:deploy` in deployment environment.
2. Run `npm test`, `npm run lint`, `npm run build`.
3. Create separate circles A and B; invite the second member through AppKit membership first.
4. Confirm A's answers never appear in B, or before both A members answer.
5. Test world switching while a request is in flight and confirm the old state is discarded.
6. Test 1-member onboarding, exactly 2 members, and a circle with 3+ members (blocked).
7. Check existing worlds still respect their configured proposal choice.

## Metric to prioritize
Track privacy-safe, aggregated weekly **pair completion** and **returning couples**.
Do not score or publicly rank relationship health, and do not reward forced daily logins.
