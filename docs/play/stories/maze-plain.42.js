window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "35",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_3",
        "text": "The passage collapses into a wall of fused bones, their sockets arranged in a mockery of a stained-glass rose window, and you realize this is not rubble but architecture—someone built this on purpose. Wedged between two skulls, a rusted key catches the candlelight, though what door it opens, you suspect you do not want to know."
      }
    },
    {
      "v": "47",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_6",
        "text": "The passage collapses into a wall of fused bones, femurs and skulls mortared together with something that glistens like fresh wax—and among them, one skull still wears a rusted crown, its jaw hinged open in silent, eternal accusation. No path forward remains here, only the certainty that whatever built this ossuary meant it to be found."
      }
    },
    {
      "v": "48",
      "value": {
        "type": "room",
        "nodeId": "room_4",
        "text": "You step into a chamber where rows of stone sarcophagi lean at unnatural angles, their lids cracked like eggshells from the inside. Wax pools thick beneath a wrought-iron candelabra that no one has lit in a century, yet still it burns."
      }
    },
    {
      "v": "50",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "The first step down cracks beneath your boot like a knuckle breaking, and the darkness below exhales to meet you, cold and patient as a held breath. Somewhere in the black, iron groans against stone—not falling, not settling, but *waiting*, as though the cathedral itself has been expecting you far longer than you've been alive."
      }
    },
    {
      "v": "51",
      "value": {
        "type": "room",
        "nodeId": "approach_1",
        "text": "You step into a chamber where broken pews lie stacked like funeral pyres, their carved saints defaced with fingernail scratches from the inside of the wood. A single votive candle burns without a wick, and the shadows it casts move a half-second slower than they should."
      }
    },
    {
      "v": "52",
      "value": {
        "type": "room",
        "nodeId": "approach_2",
        "text": "You step into a chamber where the walls weep rust-colored tears from cracks shaped like reaching fingers, and a hundred dead candles stand fused to the stone in frozen waterfalls of wax. Something has arranged the bones along the far wall into a semblance of a doorway, though no door has ever stood there."
      }
    },
    {
      "v": "54",
      "value": {
        "type": "room",
        "nodeId": "room_1",
        "text": "The chamber opens before you like a wound, its vaulted ceiling lost to shadow where stone ribs arch overhead like the bones of some buried leviathan. Wax has pooled into grotesque little monuments across the floor, and among them you notice fresh droplets still gleaming—someone, or something, lit these candles only moments before you arrived."
      }
    },
    {
      "v": "55",
      "value": {
        "type": "room",
        "nodeId": "approach_3",
        "text": "You step into a chamber where the ceiling weeps a slow, black moisture that pools in the grooves between skulls mortared into the walls, each one arranged with unsettling reverence. A single votive candle gutters on a stone shelf, though no draft stirs the air, and its flame bends toward you as if in recognition."
      }
    },
    {
      "v": "56",
      "value": {
        "type": "room",
        "nodeId": "approach_4",
        "text": "You step into a chamber where the vaulted ceiling weeps rust-colored streaks onto broken pews, and rows of votive candles gutter in unison though no draft stirs them. Something has arranged the hymnals into a perfect spiral at the room's center, their pages fluttering as if breathing."
      }
    },
    {
      "v": "57",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "The final bell falls silent as your hand closes around the black rosary, and Ravensmoor's ancient sorrow exhales through the cracked ossuary walls like a held breath finally released. Above you, dawn light bleeds through the shattered rose window for the first time in a hundred years, and the dead, at last, are still."
      }
    },
    {
      "v": "58",
      "value": {
        "type": "room",
        "nodeId": "room_2",
        "text": "You step into a chamber where rows of stone sarcophagi lie cracked open like eggshells, their occupants long since wandered elsewhere. Wax pools thick upon the floor beneath a wrought-iron candelabra, and in its trembling light you notice the nearest coffin lid bears fresh scratches from the inside."
      }
    },
    {
      "v": "59",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_5",
        "text": "The passage collapses into a wall of fused bones, their sockets arranged in a pattern too deliberate to be accident—a mosaic of empty stares that seems to follow your candle's light. Carved beneath them, in a script that predates the cathedral itself, a single word weeps rust-colored moisture down the stone: *Enough.*"
      }
    }
  ],
  "edges": [
    {
      "v": "51",
      "w": "48",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_mb_4"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "51",
      "w": "50",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_approach_am_1"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "48",
      "w": "51",
      "value": {
        "type": "passage",
        "edgeId": "e_mb_4",
        "link": "Enter the Bone-Chapel Annex"
      }
    },
    {
      "v": "50",
      "w": "51",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_1",
        "link": "Enter the Weeping Alcove"
      }
    },
    {
      "v": "52",
      "w": "47",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_6",
        "link": "Enter the weeping alcove"
      }
    },
    {
      "v": "52",
      "w": "51",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_approach_am_2"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "47",
      "w": "52",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_6"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "51",
      "w": "52",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_2",
        "link": "Enter the bleeding tunnel"
      }
    },
    {
      "v": "52",
      "w": "54",
      "value": {
        "type": "passage",
        "link": "Enter the shadowed cloister",
        "edgeId": "e_approach_am_3"
      }
    },
    {
      "v": "55",
      "w": "52",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_approach_am_3"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "52",
      "w": "55",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_3",
        "link": "Slip past the rusted grate"
      }
    },
    {
      "v": "54",
      "w": "55",
      "value": {
        "type": "passage",
        "link": "Slip past the rusted grate"
      }
    },
    {
      "v": "56",
      "w": "55",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_approach_am_4"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "55",
      "w": "56",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_4",
        "link": "Enter the Bleeding Chamber"
      }
    },
    {
      "v": "56",
      "w": "57",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_mw_4",
        "link": "Descend Toward the Tolling Bells"
      }
    },
    {
      "v": "58",
      "w": "35",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_3",
        "link": "Descend the Weeping Stair"
      }
    },
    {
      "v": "58",
      "w": "48",
      "value": {
        "type": "passage",
        "edgeId": "e_am_4",
        "link": "Descend into the ossuary tunnel"
      }
    },
    {
      "v": "35",
      "w": "58",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_3"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "48",
      "w": "58",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_4"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "50",
      "w": "58",
      "value": {
        "type": "passage",
        "link": "Enter the Sepulcher Annex",
        "edgeId": "e_approach_am_1"
      }
    },
    {
      "v": "59",
      "w": "58",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_5"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "58",
      "w": "59",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_5",
        "link": "Descend the sloping nave"
      }
    }
  ]
};
