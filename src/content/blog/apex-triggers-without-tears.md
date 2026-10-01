---
title: "The Apex Incantation: Triggers Without Tears"
description: "Every trigger you write is a binding spell — speak it carelessly and it fires a thousand times in the dark, recursing until your governor limits collapse. Speak it with intent, and a single incantation governs every record that crosses your altar."
author: "Oracle of Orgs"
category: "Apex"
tags: ["Apex", "Conjuration", "Mechanic"]
rank: "Mechanic"
meta: "12 min · ✦ 120 Aether"
order: 1
status: "published"
featured: true
---

Every trigger you write is a binding spell — speak it carelessly and it fires a thousand times in the dark, recursing until your governor limits collapse. Speak it with intent, and a single incantation governs every record that crosses your altar.

## One trigger per object

The first law of the craft: bind one trigger to each object and let a handler class carry the logic. Scatter your spells across many triggers and you forfeit all control over the order in which they wake.

> "A trigger should decide nothing and delegate everything. It is the doorway, not the room."

```apex
// the incantation
trigger AccountTrigger on Account (before insert) {
    AccountHandler.conjure(Trigger.new);
}
```

Master this rite and the next scrolls — bulkification, recursion wards, and the trigger framework — will open to you.
