// ─────────────────────────────────────────────────────────────────────────────
// Sample script — "The Last Drop". A deliberately small film where ONE prop
// (the dispatcher's red wall phone) recurs across several scenes. That is the
// whole v1 thesis in one artifact: lock the prop once, watch it stay consistent
// across every scene, then change it ("now it's a walkie-talkie") and watch the
// change propagate. The [[type: name | note]] tags let the offline Line Producer
// build a real breakdown with zero API keys.
// ─────────────────────────────────────────────────────────────────────────────

/** Stable id for the bundled sample, so a keyless serverless deploy can
 *  self-heal: any instance can reconstruct "The Last Drop" on demand without a
 *  shared store. */
export const SAMPLE_PROJECT_ID = "proj_the_last_drop";

export const THE_LAST_DROP = {
  title: "The Last Drop",
  filename: "the-last-drop.fdx",
  logline:
    "On the night shift of a shuttered fire station, a lone dispatcher takes a call that should be impossible.",
  styleBible:
    "Rain-soaked neo-noir. Sodium-amber practicals against deep blue shadow, 1970s municipal textures, anamorphic flares, heavy grain. Everything municipal, worn, and slightly too quiet.",
  rawText: `INT. DISPATCH OFFICE - NIGHT

Rain streaks the window. MARLA (50s), the only soul in the building, nurses cold coffee. On the wall, a [[prop: red wall phone | hero prop; the film's spine; rotary, coiled cord]] hangs silent.

The red wall phone RINGS. Marla stares at it. Picks up the [[prop: red wall phone | same unit; she lifts the handset]].

MARLA
Station 9, go ahead.

INT. RECORDS ROOM - NIGHT

Marla pulls a dusty ledger from a shelf, flashlight in her teeth. A second [[prop: red wall phone | extension on the records-room wall; identical unit]] sits dead on the wall beside a [[prop: brass station bell | tarnished, mounted]].

Down the corridor, the red wall phone in dispatch RINGS again.

EXT. STATION APRON - NIGHT

Marla steps into the rain. The engine bay is empty. Through the doorway she can see the [[prop: red wall phone | glowing on the far wall, still ringing]] across the dark office.

INT. DISPATCH OFFICE - LATER

Marla picks up the [[prop: red wall phone | final time; she commits]] and listens. Her face changes.

MARLA (CONT'D)
...Say that again. Slowly.

She grips the handset of the [[prop: red wall phone | knuckles white]] as the lights flicker.

FADE OUT.`,
};
