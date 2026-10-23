#!/usr/bin/env bash
# Regenerate the illustrated world tiles. The first tile sets the style; every
# other tile is drawn with it attached as a reference so the set matches.
# Usage: bash scripts/make-world-tiles.sh [id ...]   (no ids = all missing tiles)
set -u
cd "$(dirname "$0")/.."
OUT=public/art/worlds
FRAME="Square illustration for a small app tile. One clear, charming scene centred in the frame, readable at thumbnail size, with the main subject large in the upper two thirds and a soft darker area along the bottom edge for a label. Night-time bedtime mood: deep blues with a warm golden glow on the subject."
declare -A P=(
  [home]="A cosy child's bedroom at night where something magical is happening: the toys have come alive and are tiptoeing across the rug by the glow of a nightlight, a teddy bear holding a tiny lantern, a toy train on the floor."
  [trains]="A little red steam train with no face, a plain realistic engine, puffing over a moonlit stone bridge, with a yellow digger and a green tractor (also with no faces) waiting by the tracks under the stars."
  [animals]="A woodland clearing at dusk with a friendly fox, a rabbit, a hedgehog and a little owl gathered round a glowing toadstool, cosy and gentle."
  [ocean]="Under the sea: a smiling whale and a little turtle swimming past glowing coral and a treasure chest, shafts of moonlight from above."
  [dinosaurs]="A gentle long-necked dinosaur and a small friendly green dinosaur among giant ferns under a big moon, a volcano softly smoking far away."
  [unicorns]="A white unicorn with a pastel mane in an enchanted moonlit wood, tiny fairies with glowing wings floating around it, mushrooms and flowers glowing softly."
  [dragons]="A small friendly blue-green dragon curled on top of a rocky hill beside a castle tower, a little puff of warm smoke, stars behind."
  [space]="A little rocket with round windows flying past a ringed planet and a smiling crescent moon, stars and a comet in a deep blue sky."
  [pirates]="A small wooden pirate ship with patched sails on gentle moonlit waves, a parrot on the mast, a treasure island with one palm tree behind."
  [royal]="A fairytale castle with turrets and glowing windows on a hill at night, a little crown and a knight's shield resting on the grass in front."
  [heroes]="A small superhero child seen from behind, cape fluttering, standing on a rooftop looking over a friendly glowing city at night, a cat sidekick in a tiny cape beside them."
  [football]="A football glowing softly in the middle of a moonlit grass pitch with little goalposts, a friendly floodlight, stars above, a fox in a team scarf watching."
  [robots]="A small round friendly robot with big glowing eyes holding a spanner in a cosy inventor's workshop full of cogs, a glowing lightbulb above."
  [mystery]="A magnifying glass, a lantern and a trail of glowing footprints leading across a moonlit garden to a mysterious little door in an old wall."
  [magicschool]="A magical school tower at night with glowing windows, a pointed wizard's hat, a broomstick and a spell book with floating sparks of light."
  [other]="A big open storybook with many different tiny worlds spilling out of its pages: a castle, a rocket, a wave, a tree, with question-mark shaped swirls of light."
)
ORDER=(home trains animals ocean dinosaurs unicorns dragons space pirates royal heroes football robots mystery magicschool other)
IDS=("$@"); [ ${#IDS[@]} -eq 0 ] && IDS=("${ORDER[@]}")
STYLE_REF="$OUT/home.webp"
for id in "${IDS[@]}"; do
  f="$OUT/$id.webp"
  [ -f "$f" ] && [ $# -eq 0 ] && { echo "skip $id"; continue; }
  ref=()
  if [ "$id" != "home" ] && [ -f "$STYLE_REF" ]; then
    ref=(--ref "$STYLE_REF")
    extra=" Match the art style, colour palette, lighting and framing of the reference image exactly, but with this completely different subject."
  else
    extra=""
  fi
  node scripts/make-art.mjs --out "$f" --aspect 1:1 "${ref[@]}" --prompt "$FRAME ${P[$id]}$extra" 2>&1 | grep -E "saved|fail|rror" || echo "FAILED $id"
done
