window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "36",
      "value": {
        "type": "secret",
        "nodeId": "sec_spine_3",
        "pairId": "secret_spine_3",
        "evidence": 1,
        "fact": "a second family across the water",
        "about": "housekeeper",
        "text": "[cosmic_horror:mystery_secret_site#secret_spine_3]",
        "secretSiteText": "[cosmic_horror:mystery_secret_site#secret_spine_3]",
        "secretText": "[cosmic_horror:mystery_secret#secret_spine_3]",
        "learnText": "[cosmic_horror:mystery_learn_secret#secret_spine_3]",
        "knowText": "[cosmic_horror:mystery_know_secret#secret_spine_3]",
        "dot": {
          "label": "secret (secret_spine_3)",
          "shape": "diamond",
          "color": "darkgreen"
        },
        "chain": "spine",
        "chainDepth": 3,
        "frontier": true
      }
    },
    {
      "v": "40",
      "value": {
        "type": "secret",
        "nodeId": "sec_cast_1",
        "pairId": "secret_cast_1",
        "evidence": 1,
        "fact": "a brother who is not dead after all",
        "about": "housekeeper",
        "text": "[cosmic_horror:mystery_secret_site#secret_cast_1]",
        "secretSiteText": "[cosmic_horror:mystery_secret_site#secret_cast_1]",
        "secretText": "[cosmic_horror:mystery_secret#secret_cast_1]",
        "learnText": "[cosmic_horror:mystery_learn_secret#secret_cast_1]",
        "knowText": "[cosmic_horror:mystery_know_secret#secret_cast_1]",
        "dot": {
          "label": "secret (secret_cast_1)",
          "shape": "diamond",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "63",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_1",
        "correct": false,
        "accuses": "sus_spine_3",
        "castRole": "housekeeper",
        "text": "[cosmic_horror:mystery_verdict_wrong#sus_spine_3]",
        "dot": {
          "label": "wrong",
          "shape": "doublecircle",
          "color": "gray"
        }
      }
    },
    {
      "v": "66",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_2",
        "correct": false,
        "accuses": "sus_spine_2",
        "castRole": "governess",
        "text": "[cosmic_horror:mystery_verdict_wrong#sus_spine_2]",
        "dot": {
          "label": "wrong",
          "shape": "doublecircle",
          "color": "gray"
        }
      }
    },
    {
      "v": "69",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_3",
        "correct": false,
        "accuses": "sus_cast_1",
        "castRole": "housekeeper",
        "text": "[cosmic_horror:mystery_verdict_wrong#sus_cast_1]",
        "dot": {
          "label": "wrong",
          "shape": "doublecircle",
          "color": "gray"
        }
      }
    },
    {
      "v": "72",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_4",
        "correct": false,
        "accuses": "sus_cast_2",
        "castRole": "valet",
        "text": "[cosmic_horror:mystery_verdict_wrong#sus_cast_2]",
        "dot": {
          "label": "wrong",
          "shape": "doublecircle",
          "color": "gray"
        }
      }
    },
    {
      "v": "78",
      "value": {
        "type": "secret",
        "nodeId": "sec_spine_1",
        "pairId": "secret_spine_1",
        "evidence": 1,
        "fact": "a key cut at the ironmonger without asking",
        "about": "footman",
        "text": "[cosmic_horror:mystery_secret_site#secret_spine_1]",
        "secretSiteText": "[cosmic_horror:mystery_secret_site#secret_spine_1]",
        "secretText": "[cosmic_horror:mystery_secret#secret_spine_1]",
        "learnText": "[cosmic_horror:mystery_learn_secret#secret_spine_1]",
        "knowText": "[cosmic_horror:mystery_know_secret#secret_spine_1]",
        "dot": {
          "label": "secret (secret_spine_1)",
          "shape": "diamond",
          "color": "darkgreen"
        },
        "chain": "spine",
        "chainDepth": 1,
        "frontier": false
      }
    },
    {
      "v": "87",
      "value": {
        "type": "secret",
        "nodeId": "sec_spine_2",
        "pairId": "secret_spine_2",
        "evidence": 1,
        "fact": "a debt to a bookmaker in the next town",
        "about": "governess",
        "text": "[cosmic_horror:mystery_secret_site#secret_spine_2]",
        "secretSiteText": "[cosmic_horror:mystery_secret_site#secret_spine_2]",
        "secretText": "[cosmic_horror:mystery_secret#secret_spine_2]",
        "learnText": "[cosmic_horror:mystery_learn_secret#secret_spine_2]",
        "knowText": "[cosmic_horror:mystery_know_secret#secret_spine_2]",
        "dot": {
          "label": "secret (secret_spine_2)",
          "shape": "diamond",
          "color": "darkgreen"
        },
        "chain": "spine",
        "chainDepth": 2,
        "frontier": false
      }
    },
    {
      "v": "91",
      "value": {
        "type": "evidence",
        "nodeId": "dossier",
        "text": "[cosmic_horror:mystery_dossier#dossier]",
        "dot": {
          "label": "dossier",
          "shape": "note",
          "color": "blue"
        }
      }
    },
    {
      "v": "93",
      "value": {
        "type": "distractor",
        "nodeId": "distractor1_2",
        "dot": {
          "label": "wrong",
          "shape": "octagon",
          "color": "gray"
        }
      }
    },
    {
      "v": "94",
      "value": {
        "type": "distractor",
        "nodeId": "distractor2_2",
        "dot": {
          "label": "wrong",
          "shape": "octagon",
          "color": "gray"
        }
      }
    },
    {
      "v": "95",
      "value": {
        "type": "distractor",
        "nodeId": "distractor3_2",
        "dot": {
          "label": "wrong",
          "shape": "octagon",
          "color": "gray"
        }
      }
    },
    {
      "v": "101",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_3",
        "suspectId": "sus_spine_3",
        "castRole": "housekeeper",
        "hiding": "a second family across the water",
        "text": "[cosmic_horror:mystery_suspect_intro#sus_spine_3]",
        "dot": {
          "label": "suspect (secret_spine_3)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_spine_3",
        "evasionText": "[cosmic_horror:mystery_evasion#secret_spine_3]",
        "openText": "[cosmic_horror:mystery_changed_manner#secret_spine_3]",
        "chain": "spine",
        "chainDepth": 3,
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "103",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_2",
        "suspectId": "sus_spine_2",
        "castRole": "governess",
        "hiding": "a debt to a bookmaker in the next town",
        "text": "[cosmic_horror:mystery_suspect_intro#sus_spine_2]",
        "dot": {
          "label": "suspect (secret_spine_2)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_spine_2",
        "evasionText": "[cosmic_horror:mystery_evasion#secret_spine_2]",
        "openText": "[cosmic_horror:mystery_changed_manner#secret_spine_2]",
        "chain": "spine",
        "chainDepth": 2,
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "104",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "[cosmic_horror:describe_win#win]",
        "dot": {
          "label": "win"
        }
      }
    },
    {
      "v": "105",
      "value": {
        "type": "scene",
        "nodeId": "deadend_7",
        "text": "[cosmic_horror:describe_dead_end#deadend_7]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "111",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_1",
        "suspectId": "sus_cast_1",
        "castRole": "housekeeper",
        "hiding": "a brother who is not dead after all",
        "text": "[cosmic_horror:mystery_suspect_intro#sus_cast_1]",
        "dot": {
          "label": "suspect (secret_cast_1)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_cast_1",
        "evasionText": "[cosmic_horror:mystery_evasion#secret_cast_1]",
        "openText": "[cosmic_horror:mystery_changed_manner#secret_cast_1]",
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "115",
      "value": {
        "type": "scene",
        "nodeId": "deadend_2",
        "text": "[cosmic_horror:describe_dead_end#deadend_2]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "116",
      "value": {
        "type": "scene",
        "nodeId": "room_3",
        "text": "[cosmic_horror:describe_room#room_3]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "117",
      "value": {
        "type": "scene",
        "nodeId": "room_6",
        "text": "[cosmic_horror:describe_room#room_6]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "120",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_1",
        "suspectId": "sus_spine_1",
        "castRole": "footman",
        "hiding": "a key cut at the ironmonger without asking",
        "text": "[cosmic_horror:mystery_suspect_intro#sus_spine_1]",
        "dot": {
          "label": "suspect (secret_spine_1)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_spine_1",
        "evasionText": "[cosmic_horror:mystery_evasion#secret_spine_1]",
        "openText": "[cosmic_horror:mystery_changed_manner#secret_spine_1]",
        "chain": "spine",
        "chainDepth": 1,
        "murderer": true,
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "124",
      "value": {
        "type": "puzzle_intro",
        "nodeId": "puzzle_2",
        "text": "[cosmic_horror:describe_puzzle_intro#puzzle_2]",
        "dot": {
          "label": "puzzle",
          "shape": "diamond",
          "color": "gold"
        }
      }
    },
    {
      "v": "126",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_2",
        "suspectId": "sus_cast_2",
        "castRole": "valet",
        "hiding": "a child nobody in the house knows about",
        "text": "[cosmic_horror:mystery_suspect_intro#sus_cast_2]",
        "dot": {
          "label": "suspect",
          "shape": "box",
          "color": "purple"
        },
        "testimonyText": "[cosmic_horror:mystery_testimony#sus_cast_2]",
        "accused": true
      }
    },
    {
      "v": "132",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[cosmic_horror:theme_intro#start]",
        "dot": {
          "label": "start"
        }
      }
    },
    {
      "v": "133",
      "value": {
        "type": "accusation",
        "nodeId": "accusation",
        "minEvidence": 3,
        "text": "[cosmic_horror:mystery_accusation#accusation]",
        "dot": {
          "label": "accusation",
          "shape": "doubleoctagon",
          "color": "red"
        }
      }
    },
    {
      "v": "134",
      "value": {
        "type": "scene",
        "nodeId": "room_4",
        "text": "[cosmic_horror:describe_room#room_4]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "135",
      "value": {
        "type": "scene",
        "nodeId": "room_5",
        "text": "[cosmic_horror:describe_room#room_5]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "136",
      "value": {
        "type": "scene",
        "nodeId": "room_1",
        "text": "[cosmic_horror:describe_room#room_1]",
        "dot": {
          "label": "scene"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "101",
      "w": "87",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_spine_3",
        "pairId": "secret_spine_3",
        "lockedText": "[cosmic_horror:mystery_locked_question#secret_spine_3]",
        "leverageText": "[cosmic_horror:mystery_recognise_leverage#secret_spine_3]",
        "confrontText": "[cosmic_horror:mystery_confront#secret_spine_3]",
        "prefaceText": "[cosmic_horror:mystery_ask_now#secret_spine_3]",
        "noteText": "[cosmic_horror:mystery_directive_note#secret_spine_3]",
        "directive": {
          "to": "housekeeper",
          "act": "put the day-book back where it was",
          "note": "[cosmic_horror:mystery_directive_note#secret_spine_3]"
        },
        "link": "[cosmic_horror:mystery_confront#secret_spine_3]",
        "prereq": {
          "pairId": "secret_spine_3",
          "link": "[cosmic_horror:mystery_confront#secret_spine_3]",
          "recognition": "[cosmic_horror:mystery_recognise_leverage#secret_spine_3]",
          "after": "[cosmic_horror:mystery_ask_now#secret_spine_3]"
        },
        "dot": {
          "label": "interview (secret_spine_3)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "87",
      "w": "101",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_tell_spine_3"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "91",
      "w": "101",
      "value": {
        "type": "directive",
        "directive": {
          "to": "housekeeper",
          "act": "put the day-book back where it was",
          "note": "[cosmic_horror:mystery_directive_note#secret_spine_3]"
        },
        "noteText": "[cosmic_horror:mystery_directive_note#secret_spine_3]",
        "link": "[cosmic_horror:button_read_note#secret_spine_3]",
        "prereq": {
          "pairId": "secret_spine_3"
        },
        "dot": {
          "label": "note",
          "style": "dotted",
          "color": "blue"
        }
      }
    },
    {
      "v": "103",
      "w": "78",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_spine_2",
        "pairId": "secret_spine_2",
        "lockedText": "[cosmic_horror:mystery_locked_question#secret_spine_2]",
        "leverageText": "[cosmic_horror:mystery_recognise_leverage#secret_spine_2]",
        "confrontText": "[cosmic_horror:mystery_confront#secret_spine_2]",
        "prefaceText": "[cosmic_horror:mystery_ask_now#secret_spine_2]",
        "noteText": "[cosmic_horror:mystery_directive_note#secret_spine_2]",
        "directive": {
          "to": "governess",
          "act": "say nothing about the west stair",
          "note": "[cosmic_horror:mystery_directive_note#secret_spine_2]"
        },
        "link": "[cosmic_horror:mystery_confront#secret_spine_2]",
        "prereq": {
          "pairId": "secret_spine_2",
          "link": "[cosmic_horror:mystery_confront#secret_spine_2]",
          "recognition": "[cosmic_horror:mystery_recognise_leverage#secret_spine_2]",
          "after": "[cosmic_horror:mystery_ask_now#secret_spine_2]"
        },
        "dot": {
          "label": "interview (secret_spine_2)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "78",
      "w": "103",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_tell_spine_2"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "91",
      "w": "103",
      "value": {
        "type": "directive",
        "directive": {
          "to": "governess",
          "act": "say nothing about the west stair",
          "note": "[cosmic_horror:mystery_directive_note#secret_spine_2]"
        },
        "noteText": "[cosmic_horror:mystery_directive_note#secret_spine_2]",
        "link": "[cosmic_horror:button_read_note#secret_spine_2]",
        "prereq": {
          "pairId": "secret_spine_2"
        },
        "dot": {
          "label": "note",
          "style": "dotted",
          "color": "blue"
        }
      }
    },
    {
      "v": "111",
      "w": "105",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_cast_1",
        "pairId": "secret_cast_1",
        "lockedText": "[cosmic_horror:mystery_locked_question#secret_cast_1]",
        "leverageText": "[cosmic_horror:mystery_recognise_leverage#secret_cast_1]",
        "confrontText": "[cosmic_horror:mystery_confront#secret_cast_1]",
        "prefaceText": "[cosmic_horror:mystery_ask_now#secret_cast_1]",
        "noteText": "[cosmic_horror:mystery_directive_note#secret_cast_1]",
        "directive": {
          "to": "housekeeper",
          "act": "do not mention the letter",
          "note": "[cosmic_horror:mystery_directive_note#secret_cast_1]"
        },
        "link": "[cosmic_horror:mystery_confront#secret_cast_1]",
        "prereq": {
          "pairId": "secret_cast_1",
          "link": "[cosmic_horror:mystery_confront#secret_cast_1]",
          "recognition": "[cosmic_horror:mystery_recognise_leverage#secret_cast_1]",
          "after": "[cosmic_horror:mystery_ask_now#secret_cast_1]"
        },
        "dot": {
          "label": "interview (secret_cast_1)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "91",
      "w": "111",
      "value": {
        "type": "directive",
        "directive": {
          "to": "housekeeper",
          "act": "do not mention the letter",
          "note": "[cosmic_horror:mystery_directive_note#secret_cast_1]"
        },
        "noteText": "[cosmic_horror:mystery_directive_note#secret_cast_1]",
        "link": "[cosmic_horror:button_read_note#secret_cast_1]",
        "prereq": {
          "pairId": "secret_cast_1"
        },
        "dot": {
          "label": "note",
          "style": "dotted",
          "color": "blue"
        }
      }
    },
    {
      "v": "105",
      "w": "111",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_tell_cast_1"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "120",
      "w": "117",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_spine_1",
        "pairId": "secret_spine_1",
        "lockedText": "[cosmic_horror:mystery_locked_question#secret_spine_1]",
        "leverageText": "[cosmic_horror:mystery_recognise_leverage#secret_spine_1]",
        "confrontText": "[cosmic_horror:mystery_confront#secret_spine_1]",
        "prefaceText": "[cosmic_horror:mystery_ask_now#secret_spine_1]",
        "noteText": "[cosmic_horror:mystery_directive_note#secret_spine_1]",
        "directive": {
          "to": "footman",
          "act": "swear the car never left the yard",
          "note": "[cosmic_horror:mystery_directive_note#secret_spine_1]"
        },
        "link": "[cosmic_horror:mystery_confront#secret_spine_1]",
        "prereq": {
          "pairId": "secret_spine_1",
          "link": "[cosmic_horror:mystery_confront#secret_spine_1]",
          "recognition": "[cosmic_horror:mystery_recognise_leverage#secret_spine_1]",
          "after": "[cosmic_horror:mystery_ask_now#secret_spine_1]"
        },
        "dot": {
          "label": "interview (secret_spine_1)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "91",
      "w": "120",
      "value": {
        "type": "directive",
        "directive": {
          "to": "footman",
          "act": "swear the car never left the yard",
          "note": "[cosmic_horror:mystery_directive_note#secret_spine_1]"
        },
        "noteText": "[cosmic_horror:mystery_directive_note#secret_spine_1]",
        "link": "[cosmic_horror:button_read_note#secret_spine_1]",
        "prereq": {
          "pairId": "secret_spine_1"
        },
        "dot": {
          "label": "note",
          "style": "dotted",
          "color": "blue"
        }
      }
    },
    {
      "v": "117",
      "w": "120",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_tell_spine_1"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "124",
      "w": "91",
      "value": {
        "type": "choice",
        "correct": true,
        "edgeId": "e_ev_den_1",
        "dot": {
          "label": "correct",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "124",
      "w": "93",
      "value": {
        "type": "choice",
        "correct": false,
        "index": 1,
        "dot": {
          "label": "distractor 1",
          "color": "gray"
        }
      }
    },
    {
      "v": "124",
      "w": "94",
      "value": {
        "type": "choice",
        "correct": false,
        "index": 2,
        "dot": {
          "label": "distractor 2",
          "color": "gray"
        }
      }
    },
    {
      "v": "124",
      "w": "95",
      "value": {
        "type": "choice",
        "correct": false,
        "index": 3,
        "dot": {
          "label": "distractor 3",
          "color": "gray"
        }
      }
    },
    {
      "v": "132",
      "w": "36",
      "value": {
        "type": "leverage",
        "link": "[cosmic_horror:button_passage#sec_spine_3]",
        "dot": {
          "label": "leverage",
          "style": "dotted",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "132",
      "w": "40",
      "value": {
        "type": "leverage",
        "link": "[cosmic_horror:button_passage#sec_cast_1]",
        "dot": {
          "label": "leverage",
          "style": "dotted",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "132",
      "w": "101",
      "value": {
        "type": "path",
        "edgeId": "e_ask_spine_3",
        "link": "[cosmic_horror:button_interview#sus_spine_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "132",
      "w": "103",
      "value": {
        "type": "path",
        "edgeId": "e_ask_spine_2",
        "link": "[cosmic_horror:button_interview#sus_spine_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "132",
      "w": "111",
      "value": {
        "type": "path",
        "edgeId": "e_ad_7",
        "link": "[cosmic_horror:button_interview#sus_cast_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "132",
      "w": "115",
      "value": {
        "type": "path",
        "edgeId": "e_ad_2",
        "link": "[cosmic_horror:button_passage#e_ad_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "132",
      "w": "116",
      "value": {
        "type": "path",
        "link": "[cosmic_horror:button_passage#room_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "132",
      "w": "120",
      "value": {
        "type": "path",
        "edgeId": "e_ask_spine_1",
        "link": "[cosmic_horror:button_interview#sus_spine_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "36",
      "w": "132",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "start"
        },
        "dot": {
          "label": "return",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "40",
      "w": "132",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "start"
        },
        "dot": {
          "label": "return",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "78",
      "w": "132",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "start"
        },
        "dot": {
          "label": "return",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "87",
      "w": "132",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "start"
        },
        "dot": {
          "label": "return",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "101",
      "w": "132",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ask_spine_3"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "103",
      "w": "132",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ask_spine_2"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "105",
      "w": "132",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_7"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "111",
      "w": "132",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_7"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "115",
      "w": "132",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_2"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "120",
      "w": "132",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ask_spine_1"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "133",
      "w": "63",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_spine_3",
        "castRole": "housekeeper",
        "link": "[cosmic_horror:button_accuse#sus_spine_3]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "133",
      "w": "66",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_spine_2",
        "castRole": "governess",
        "link": "[cosmic_horror:button_accuse#sus_spine_2]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "133",
      "w": "69",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_cast_1",
        "castRole": "housekeeper",
        "link": "[cosmic_horror:button_accuse#sus_cast_1]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "133",
      "w": "72",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_cast_2",
        "castRole": "valet",
        "link": "[cosmic_horror:button_accuse#sus_cast_2]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "133",
      "w": "104",
      "value": {
        "type": "accuse",
        "correct": true,
        "accuses": "sus_spine_1",
        "castRole": "footman",
        "link": "[cosmic_horror:button_accuse#sus_spine_1]",
        "text": "[cosmic_horror:mystery_verdict_right#sus_spine_1]",
        "prereq": {
          "evidence": 3
        },
        "dot": {
          "label": "accuse (correct)",
          "style": "bold",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "133",
      "w": "116",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_fun_den_5"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "133",
      "w": "117",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_fun_den_4"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "133",
      "w": "124",
      "value": {
        "type": "path",
        "link": "[cosmic_horror:button_passage#puzzle_2]",
        "edgeId": "e_ev_den_1",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "133",
      "w": "132",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_fun_den_2"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "91",
      "w": "133",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ev_den_1"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "93",
      "w": "133",
      "value": {
        "type": "path",
        "dot": {
          "label": "back to puzzle",
          "style": "dotted",
          "color": "gray"
        }
      }
    },
    {
      "v": "94",
      "w": "133",
      "value": {
        "type": "path",
        "dot": {
          "label": "back to puzzle",
          "style": "dotted",
          "color": "gray"
        }
      }
    },
    {
      "v": "95",
      "w": "133",
      "value": {
        "type": "path",
        "dot": {
          "label": "back to puzzle",
          "style": "dotted",
          "color": "gray"
        }
      }
    },
    {
      "v": "116",
      "w": "133",
      "value": {
        "type": "path",
        "edgeId": "e_fun_den_5",
        "link": "[cosmic_horror:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "117",
      "w": "133",
      "value": {
        "type": "path",
        "edgeId": "e_fun_den_4",
        "link": "[cosmic_horror:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "132",
      "w": "133",
      "value": {
        "type": "path",
        "edgeId": "e_fun_den_2",
        "link": "[cosmic_horror:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "134",
      "w": "133",
      "value": {
        "type": "path",
        "edgeId": "e_fun_den_3",
        "link": "[cosmic_horror:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "133",
      "w": "134",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_fun_den_3"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "135",
      "w": "132",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_5"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "132",
      "w": "135",
      "value": {
        "type": "path",
        "edgeId": "e_am_5",
        "link": "[cosmic_horror:button_passage#e_am_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "136",
      "w": "126",
      "value": {
        "type": "path",
        "edgeId": "e_ask_cast_2",
        "link": "[cosmic_horror:button_interview#sus_cast_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "136",
      "w": "133",
      "value": {
        "type": "path",
        "edgeId": "e_acc_den_1",
        "link": "[cosmic_horror:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "136",
      "w": "134",
      "value": {
        "type": "path",
        "link": "[cosmic_horror:button_passage#room_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "136",
      "w": "135",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_mb_5"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "126",
      "w": "136",
      "value": {
        "type": "testimony",
        "prereq": {
          "traversed": "e_ask_cast_2"
        },
        "text": "[cosmic_horror:mystery_testimony#sus_cast_2]",
        "dot": {
          "label": "testimony",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "133",
      "w": "136",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_acc_den_1"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "135",
      "w": "136",
      "value": {
        "type": "path",
        "edgeId": "e_mb_5",
        "link": "[cosmic_horror:button_passage#e_mb_5]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
