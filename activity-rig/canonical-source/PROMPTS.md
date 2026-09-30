# Canonical Kiwi art prompts

Tool: built-in GPT image generation, transparent_background=true. Identity reference: ../canonical-body.png. The canonical original is never replaced by a generated whole-character rest pose. Generated material is registered behind retained canonical pixels.

## Seated hidden torso

Use case: precise-object-edit. The original seated Kiwi is the only identity/material reference. Remove the head, hanging ears and front legs/paws, preserve seated rear haunches/paws, and complete the cream chest and belly behind the missing forelegs. Extend the neck behind the original face. Preserve the scalloped chest, fine matte clay/flocked texture, latte and cream palette and lighting. No new limbs, eyes, nose, tail, props, or shadow. A single transparent underplate with complete hidden surfaces.

## Eye insert sheet

Use case: identity-preserve. Two matching front face panels use the original Kiwi identity, same forehead, cream eye patches, small nose, muzzle and materials. Left panel has blank cream skin where both eyes were. Right panel has two small peaceful closed-eyelid arcs at the original eye centers. No body, text, props, new expression features or new camera angle. Only small eye patches are used; original open-eye pixels and the rest of the face remain canonical. The renderer matches insert tone to adjacent original skin in linear RGB.

## First prone underplate

Use case: precise-object-edit. Original Kiwi, frontal belly-down body with head removed, complete low chest pad, four paws and softly resting scalloped ears, no tail, props or shadow. The output was registered as a pose-specific body; its visibly splayed rear legs were rejected by the user. Source kept for provenance, not selected after the compact-pose revision.

## Compact prone revision

Use case: precise-object-edit. Current complete sleeping sprite is the edit target; the original seated image remains the locked identity/material reference. Fix only body and leg placement: comfortably asleep, not splayed. Tuck both rear legs/paws under the belly, mostly hidden; do not show rear paws sticking out at the far left/right. Put only two small front paws together directly under the chin, nearly touching with a narrow gap and parallel wrists. Keep a compact low rounded body and gently relaxed shoulders. Long scalloped ears stay close beside the cheeks/paws and curve inward, not like broad wings. Keep the same frontal face size, forehead silhouette, nose, eyelid arcs and matte latte/cream clay texture. Remove dream effects; they are independent animated overlays. Transparent, generous padding, no haze/ground/shadow/props/text. Draw the anatomy naturally; do not horizontally squeeze the previous image.

## Hind-standing revision

Original canonical-body.png is the identity reference. Front-view dog sit-pretty / beg: exactly two lifted front paws with naturally bent elbows, exactly two hind paws on one floor line, short dachshund proportions, no extra feet behind. Complete cream belly and brown hind thighs; original face size, scalloped ears, palette and flocked-clay surface preserved. No shadow, tail, props or text. The first generation had six paws and was rejected. The selected correction redraws the entire lower half into a continuous belly with only two supporting hind paws; final rendering retains the original canonical head and ears. Landmark registration is in ../stand-registration.json; a common lower-body registration aligns the floor while leaving the original head rigid.
