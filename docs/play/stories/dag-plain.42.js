window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "34",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "The final bell falls silent as your hand closes around the black rosary, and Ravensmoor's ancient sorrow exhales through the cracked ossuary walls like a held breath finally released. Above you, dawn light bleeds through the shattered rose window for the first time in a hundred years, and the dead, at last, are still.",
        "dot": {
          "label": "win"
        }
      }
    },
    {
      "v": "41",
      "value": {
        "type": "room",
        "nodeId": "dag_room_3",
        "text": "The passage opens into a chamber of leaning stone coffins, their lids cracked like eggshells and long since emptied of whatever slept within. Wax from a thousand dead candles has pooled across the floor in frozen rivers, and your footsteps crack through them like walking on brittle bone.",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "47",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "The first step down cracks beneath your boot like a knuckle breaking, and the darkness below exhales to meet you, cold and patient as a held breath. Somewhere in the black, iron groans against stone—not falling, not settling, but *waiting*, as though the cathedral itself has been expecting you far longer than you've been alive.",
        "dot": {
          "label": "start"
        }
      }
    },
    {
      "v": "48",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_2",
        "text": "The passage splits into a low chamber where broken pews lie stacked like kindling, their carved saints defaced with fingernail scratches from the inside of the wood. A draft moves through the room though no windows break the stone, carrying the faint, unmistakable sound of choir voices singing a hymn backwards.",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "49",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_1",
        "text": "The passage forks beneath a low archway choked with rotted vestments, their brass buttons gleaming like dead eyes in your torchlight. To your left, a draft carries the whisper of hymns sung backward; to your right, only silence—the kind that listens back.",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "51",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_1",
        "text": "The passage splits before you, its stone floor scarred with claw marks that trail into both shadowed archways like something dragged itself in indecision. A child's rosary, its beads black with age, hangs forgotten from a rusted sconce, swaying faintly though no draft stirs the air.",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "52",
      "value": {
        "type": "room",
        "nodeId": "approach_1",
        "text": "You step into a chamber where broken pews lie stacked like funeral pyres, their carved saints defaced with fingernail scratches from the inside of the wood. A single votive candle burns without a wick, and the shadows it casts move a half-second slower than they should.",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "53",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_2",
        "text": "The passage splits ahead in a chamber choked with the scent of tallow and rot, where a single candelabra gutters atop a font of stone gone black with age. Carved into the archway before you, a Latin inscription has been scratched through by something with claws, as if to unmake whatever warning it once gave.",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "54",
      "value": {
        "type": "room",
        "nodeId": "approach_2",
        "text": "You step into a chamber where the walls weep rust-colored tears from cracks shaped like reaching fingers, and a hundred dead candles stand fused to the stone in frozen waterfalls of wax. Something has arranged the bones along the far wall into a semblance of a doorway, though no door has ever stood there.",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "55",
      "value": {
        "type": "room",
        "nodeId": "approach_3",
        "text": "You step into a chamber where the ceiling weeps a slow, black moisture that pools in the grooves between skulls mortared into the walls, each one arranged with unsettling reverence. A single votive candle gutters on a stone shelf, though no draft stirs the air, and its flame bends toward you as if in recognition.",
        "dot": {
          "label": "room"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "47",
      "w": "48",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_2",
        "link": "Enter the Bone-Lined Antechamber",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "41",
      "w": "49",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_3",
        "link": "Pass Beneath the Bleeding Arch",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "48",
      "w": "49",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_2",
        "link": "Cross the Sunken Transept",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "47",
      "w": "51",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_1",
        "link": "Enter the Sunken Transept",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "49",
      "w": "52",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_1",
        "link": "Enter the Weeping Transept",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "51",
      "w": "52",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_1",
        "link": "Enter the Bone-Lined Antechamber",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "53",
      "w": "41",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_3",
        "link": "Descend the bleeding stair",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "47",
      "w": "53",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_2",
        "link": "Climb to the mezzanine landing",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "52",
      "w": "54",
      "value": {
        "type": "path",
        "edgeId": "e_approach_am_2",
        "link": "Enter the bleeding tunnel",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "55",
      "w": "34",
      "value": {
        "type": "path",
        "edgeId": "e_approach_mw_3",
        "link": "Descend the Weeping Stair",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "54",
      "w": "55",
      "value": {
        "type": "path",
        "edgeId": "e_approach_am_3",
        "link": "Slip past the rusted grate",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
