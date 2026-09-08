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
        "text": "[high_fantasy:mystery_secret_site#secret_spine_3]",
        "secretSiteText": "[high_fantasy:mystery_secret_site#secret_spine_3]",
        "secretText": "[high_fantasy:mystery_secret#secret_spine_3]",
        "learnText": "[high_fantasy:mystery_learn_secret#secret_spine_3]",
        "knowText": "[high_fantasy:mystery_know_secret#secret_spine_3]",
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
        "text": "[high_fantasy:mystery_secret_site#secret_cast_1]",
        "secretSiteText": "[high_fantasy:mystery_secret_site#secret_cast_1]",
        "secretText": "[high_fantasy:mystery_secret#secret_cast_1]",
        "learnText": "[high_fantasy:mystery_learn_secret#secret_cast_1]",
        "knowText": "[high_fantasy:mystery_know_secret#secret_cast_1]",
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
        "nodeId": "verdict_verdict_2",
        "correct": false,
        "accuses": "sus_spine_2",
        "castRole": "governess",
        "text": "[high_fantasy:mystery_verdict_wrong#sus_spine_2]",
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
        "nodeId": "verdict_verdict_3",
        "correct": false,
        "accuses": "sus_cast_2",
        "castRole": "valet",
        "text": "[high_fantasy:mystery_verdict_wrong#sus_cast_2]",
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
        "nodeId": "verdict_verdict_4",
        "correct": false,
        "accuses": "sus_spine_3",
        "castRole": "housekeeper",
        "text": "[high_fantasy:mystery_verdict_wrong#sus_spine_3]",
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
        "nodeId": "verdict_verdict_5",
        "correct": false,
        "accuses": "sus_cast_1",
        "castRole": "housekeeper",
        "text": "[high_fantasy:mystery_verdict_wrong#sus_cast_1]",
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
        "nodeId": "sec_spine_2",
        "pairId": "secret_spine_2",
        "evidence": 1,
        "fact": "a debt to a bookmaker in the next town",
        "about": "governess",
        "text": "[high_fantasy:mystery_secret_site#secret_spine_2]",
        "secretSiteText": "[high_fantasy:mystery_secret_site#secret_spine_2]",
        "secretText": "[high_fantasy:mystery_secret#secret_spine_2]",
        "learnText": "[high_fantasy:mystery_learn_secret#secret_spine_2]",
        "knowText": "[high_fantasy:mystery_know_secret#secret_spine_2]",
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
      "v": "81",
      "value": {
        "type": "secret",
        "nodeId": "sec_spine_1",
        "pairId": "secret_spine_1",
        "evidence": 1,
        "fact": "a key cut at the ironmonger without asking",
        "about": "footman",
        "text": "[high_fantasy:mystery_secret_site#secret_spine_1]",
        "secretSiteText": "[high_fantasy:mystery_secret_site#secret_spine_1]",
        "secretText": "[high_fantasy:mystery_secret#secret_spine_1]",
        "learnText": "[high_fantasy:mystery_learn_secret#secret_spine_1]",
        "knowText": "[high_fantasy:mystery_know_secret#secret_spine_1]",
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
      "v": "84",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_1",
        "suspectId": "sus_spine_1",
        "castRole": "footman",
        "hiding": "a key cut at the ironmonger without asking",
        "text": "[high_fantasy:mystery_suspect_intro#sus_spine_1]",
        "dot": {
          "label": "suspect (secret_spine_1)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_spine_1",
        "evasionText": "[high_fantasy:mystery_evasion#secret_spine_1]",
        "openText": "[high_fantasy:mystery_changed_manner#secret_spine_1]",
        "chain": "spine",
        "chainDepth": 1,
        "murderer": true,
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "90",
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
      "v": "91",
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
      "v": "92",
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
      "v": "105",
      "value": {
        "type": "scene",
        "nodeId": "room_4",
        "text": "[high_fantasy:describe_room#room_4]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "106",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "[high_fantasy:describe_win#win]",
        "dot": {
          "label": "win"
        }
      }
    },
    {
      "v": "108",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_2",
        "suspectId": "sus_cast_2",
        "castRole": "valet",
        "hiding": "a child nobody in the house knows about",
        "text": "[high_fantasy:mystery_suspect_intro#sus_cast_2]",
        "dot": {
          "label": "suspect",
          "shape": "box",
          "color": "purple"
        },
        "testimonyText": "[high_fantasy:mystery_testimony#sus_cast_2]",
        "accused": true
      }
    },
    {
      "v": "111",
      "value": {
        "type": "puzzle_intro",
        "nodeId": "puzzle_2",
        "text": "[high_fantasy:describe_puzzle_intro#puzzle_2]",
        "dot": {
          "label": "puzzle",
          "shape": "diamond",
          "color": "gold"
        }
      }
    },
    {
      "v": "116",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_2",
        "suspectId": "sus_spine_2",
        "castRole": "governess",
        "hiding": "a debt to a bookmaker in the next town",
        "text": "[high_fantasy:mystery_suspect_intro#sus_spine_2]",
        "dot": {
          "label": "suspect (secret_spine_2)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_spine_2",
        "evasionText": "[high_fantasy:mystery_evasion#secret_spine_2]",
        "openText": "[high_fantasy:mystery_changed_manner#secret_spine_2]",
        "chain": "spine",
        "chainDepth": 2,
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "117",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[high_fantasy:theme_intro#start]",
        "dot": {
          "label": "start"
        }
      }
    },
    {
      "v": "123",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_1",
        "suspectId": "sus_cast_1",
        "castRole": "housekeeper",
        "hiding": "a brother who is not dead after all",
        "text": "[high_fantasy:mystery_suspect_intro#sus_cast_1]",
        "dot": {
          "label": "suspect (secret_cast_1)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_cast_1",
        "evasionText": "[high_fantasy:mystery_evasion#secret_cast_1]",
        "openText": "[high_fantasy:mystery_changed_manner#secret_cast_1]",
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "126",
      "value": {
        "type": "scene",
        "nodeId": "room_2",
        "text": "[high_fantasy:describe_room#room_2]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "128",
      "value": {
        "type": "scene",
        "nodeId": "room_5",
        "text": "[high_fantasy:describe_room#room_5]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "129",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_3",
        "suspectId": "sus_spine_3",
        "castRole": "housekeeper",
        "hiding": "a second family across the water",
        "text": "[high_fantasy:mystery_suspect_intro#sus_spine_3]",
        "dot": {
          "label": "suspect (secret_spine_3)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_spine_3",
        "evasionText": "[high_fantasy:mystery_evasion#secret_spine_3]",
        "openText": "[high_fantasy:mystery_changed_manner#secret_spine_3]",
        "chain": "spine",
        "chainDepth": 3,
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "130",
      "value": {
        "type": "scene",
        "nodeId": "room_7",
        "text": "[high_fantasy:describe_room#room_7]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "131",
      "value": {
        "type": "scene",
        "nodeId": "room_6",
        "text": "[high_fantasy:describe_room#room_6]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "132",
      "value": {
        "type": "accusation",
        "nodeId": "accusation",
        "minEvidence": 3,
        "text": "[high_fantasy:mystery_accusation#accusation]",
        "dot": {
          "label": "accusation",
          "shape": "doubleoctagon",
          "color": "red"
        }
      }
    },
    {
      "v": "133",
      "value": {
        "type": "evidence",
        "nodeId": "dossier",
        "text": "[high_fantasy:mystery_dossier#dossier]",
        "dot": {
          "label": "dossier",
          "shape": "note",
          "color": "blue"
        }
      }
    },
    {
      "v": "134",
      "value": {
        "type": "scene",
        "nodeId": "room_1",
        "text": "[high_fantasy:describe_room#room_1]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "135",
      "value": {
        "type": "scene",
        "nodeId": "deadend_3",
        "text": "[high_fantasy:describe_dead_end#deadend_3]",
        "dot": {
          "label": "scene"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "111",
      "w": "90",
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
      "v": "111",
      "w": "91",
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
      "v": "111",
      "w": "92",
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
      "v": "116",
      "w": "81",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_spine_2",
        "pairId": "secret_spine_2",
        "lockedText": "[high_fantasy:mystery_locked_question#secret_spine_2]",
        "leverageText": "[high_fantasy:mystery_recognise_leverage#secret_spine_2]",
        "confrontText": "[high_fantasy:mystery_confront#secret_spine_2]",
        "prefaceText": "[high_fantasy:mystery_ask_now#secret_spine_2]",
        "noteText": "[high_fantasy:mystery_directive_note#secret_spine_2]",
        "directive": {
          "to": "governess",
          "act": "say nothing about the west stair",
          "note": "[high_fantasy:mystery_directive_note#secret_spine_2]"
        },
        "link": "[high_fantasy:mystery_confront#secret_spine_2]",
        "prereq": {
          "pairId": "secret_spine_2",
          "link": "[high_fantasy:mystery_confront#secret_spine_2]",
          "recognition": "[high_fantasy:mystery_recognise_leverage#secret_spine_2]",
          "after": "[high_fantasy:mystery_ask_now#secret_spine_2]"
        },
        "dot": {
          "label": "interview (secret_spine_2)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "81",
      "w": "116",
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
      "v": "117",
      "w": "105",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#room_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "123",
      "w": "84",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_cast_1",
        "pairId": "secret_cast_1",
        "lockedText": "[high_fantasy:mystery_locked_question#secret_cast_1]",
        "leverageText": "[high_fantasy:mystery_recognise_leverage#secret_cast_1]",
        "confrontText": "[high_fantasy:mystery_confront#secret_cast_1]",
        "prefaceText": "[high_fantasy:mystery_ask_now#secret_cast_1]",
        "noteText": "[high_fantasy:mystery_directive_note#secret_cast_1]",
        "directive": {
          "to": "housekeeper",
          "act": "do not mention the letter",
          "note": "[high_fantasy:mystery_directive_note#secret_cast_1]"
        },
        "link": "[high_fantasy:mystery_confront#secret_cast_1]",
        "prereq": {
          "pairId": "secret_cast_1",
          "link": "[high_fantasy:mystery_confront#secret_cast_1]",
          "recognition": "[high_fantasy:mystery_recognise_leverage#secret_cast_1]",
          "after": "[high_fantasy:mystery_ask_now#secret_cast_1]"
        },
        "dot": {
          "label": "interview (secret_cast_1)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "84",
      "w": "123",
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
      "v": "117",
      "w": "126",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#room_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "128",
      "w": "36",
      "value": {
        "type": "leverage",
        "link": "[high_fantasy:button_passage#sec_spine_3]",
        "dot": {
          "label": "leverage",
          "style": "dotted",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "128",
      "w": "40",
      "value": {
        "type": "leverage",
        "link": "[high_fantasy:button_passage#sec_cast_1]",
        "dot": {
          "label": "leverage",
          "style": "dotted",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "128",
      "w": "116",
      "value": {
        "type": "path",
        "edgeId": "e_ask_spine_2",
        "link": "[high_fantasy:button_interview#sus_spine_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "128",
      "w": "123",
      "value": {
        "type": "path",
        "edgeId": "e_am_7",
        "link": "[high_fantasy:button_interview#sus_cast_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "36",
      "w": "128",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "room_5"
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
      "w": "128",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "room_5"
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
      "w": "128",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "room_5"
        },
        "dot": {
          "label": "return",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "81",
      "w": "128",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "room_5"
        },
        "dot": {
          "label": "return",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "84",
      "w": "128",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_7"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "116",
      "w": "128",
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
      "v": "117",
      "w": "128",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#room_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "123",
      "w": "128",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_7"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "129",
      "w": "78",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_spine_3",
        "pairId": "secret_spine_3",
        "lockedText": "[high_fantasy:mystery_locked_question#secret_spine_3]",
        "leverageText": "[high_fantasy:mystery_recognise_leverage#secret_spine_3]",
        "confrontText": "[high_fantasy:mystery_confront#secret_spine_3]",
        "prefaceText": "[high_fantasy:mystery_ask_now#secret_spine_3]",
        "noteText": "[high_fantasy:mystery_directive_note#secret_spine_3]",
        "directive": {
          "to": "housekeeper",
          "act": "put the day-book back where it was",
          "note": "[high_fantasy:mystery_directive_note#secret_spine_3]"
        },
        "link": "[high_fantasy:mystery_confront#secret_spine_3]",
        "prereq": {
          "pairId": "secret_spine_3",
          "link": "[high_fantasy:mystery_confront#secret_spine_3]",
          "recognition": "[high_fantasy:mystery_recognise_leverage#secret_spine_3]",
          "after": "[high_fantasy:mystery_ask_now#secret_spine_3]"
        },
        "dot": {
          "label": "interview (secret_spine_3)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "129",
      "w": "128",
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
      "v": "78",
      "w": "129",
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
      "v": "128",
      "w": "129",
      "value": {
        "type": "path",
        "edgeId": "e_ask_spine_3",
        "link": "[high_fantasy:button_interview#sus_spine_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "130",
      "w": "84",
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
      "v": "130",
      "w": "128",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_7"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "84",
      "w": "130",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_spine_1",
        "pairId": "secret_spine_1",
        "lockedText": "[high_fantasy:mystery_locked_question#secret_spine_1]",
        "leverageText": "[high_fantasy:mystery_recognise_leverage#secret_spine_1]",
        "confrontText": "[high_fantasy:mystery_confront#secret_spine_1]",
        "prefaceText": "[high_fantasy:mystery_ask_now#secret_spine_1]",
        "noteText": "[high_fantasy:mystery_directive_note#secret_spine_1]",
        "directive": {
          "to": "footman",
          "act": "swear the car never left the yard",
          "note": "[high_fantasy:mystery_directive_note#secret_spine_1]"
        },
        "link": "[high_fantasy:mystery_confront#secret_spine_1]",
        "prereq": {
          "pairId": "secret_spine_1",
          "link": "[high_fantasy:mystery_confront#secret_spine_1]",
          "recognition": "[high_fantasy:mystery_recognise_leverage#secret_spine_1]",
          "after": "[high_fantasy:mystery_ask_now#secret_spine_1]"
        },
        "dot": {
          "label": "interview (secret_spine_1)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "131",
      "w": "111",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#puzzle_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "131",
      "w": "130",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_mb_7"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "90",
      "w": "131",
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
      "v": "91",
      "w": "131",
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
      "v": "92",
      "w": "131",
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
      "v": "130",
      "w": "131",
      "value": {
        "type": "path",
        "edgeId": "e_mb_7",
        "link": "[high_fantasy:button_passage#e_mb_7]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "132",
      "w": "63",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_spine_2",
        "castRole": "governess",
        "link": "[high_fantasy:button_accuse#sus_spine_2]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "132",
      "w": "66",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_cast_2",
        "castRole": "valet",
        "link": "[high_fantasy:button_accuse#sus_cast_2]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "132",
      "w": "69",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_spine_3",
        "castRole": "housekeeper",
        "link": "[high_fantasy:button_accuse#sus_spine_3]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "132",
      "w": "72",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_cast_1",
        "castRole": "housekeeper",
        "link": "[high_fantasy:button_accuse#sus_cast_1]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "132",
      "w": "105",
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
      "v": "132",
      "w": "106",
      "value": {
        "type": "accuse",
        "correct": true,
        "accuses": "sus_spine_1",
        "castRole": "footman",
        "link": "[high_fantasy:button_accuse#sus_spine_1]",
        "text": "[high_fantasy:mystery_verdict_right#sus_spine_1]",
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
      "v": "132",
      "w": "117",
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
      "v": "132",
      "w": "126",
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
      "v": "105",
      "w": "132",
      "value": {
        "type": "path",
        "edgeId": "e_fun_den_3",
        "link": "[high_fantasy:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "117",
      "w": "132",
      "value": {
        "type": "path",
        "edgeId": "e_acc_den_1",
        "link": "[high_fantasy:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "126",
      "w": "132",
      "value": {
        "type": "path",
        "edgeId": "e_fun_den_2",
        "link": "[high_fantasy:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "133",
      "w": "84",
      "value": {
        "type": "directive",
        "directive": {
          "to": "footman",
          "act": "swear the car never left the yard",
          "note": "[high_fantasy:mystery_directive_note#secret_spine_1]"
        },
        "noteText": "[high_fantasy:mystery_directive_note#secret_spine_1]",
        "link": "[high_fantasy:button_read_note#secret_spine_1]",
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
      "v": "133",
      "w": "116",
      "value": {
        "type": "directive",
        "directive": {
          "to": "governess",
          "act": "say nothing about the west stair",
          "note": "[high_fantasy:mystery_directive_note#secret_spine_2]"
        },
        "noteText": "[high_fantasy:mystery_directive_note#secret_spine_2]",
        "link": "[high_fantasy:button_read_note#secret_spine_2]",
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
      "v": "133",
      "w": "123",
      "value": {
        "type": "directive",
        "directive": {
          "to": "housekeeper",
          "act": "do not mention the letter",
          "note": "[high_fantasy:mystery_directive_note#secret_cast_1]"
        },
        "noteText": "[high_fantasy:mystery_directive_note#secret_cast_1]",
        "link": "[high_fantasy:button_read_note#secret_cast_1]",
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
      "v": "133",
      "w": "129",
      "value": {
        "type": "directive",
        "directive": {
          "to": "housekeeper",
          "act": "put the day-book back where it was",
          "note": "[high_fantasy:mystery_directive_note#secret_spine_3]"
        },
        "noteText": "[high_fantasy:mystery_directive_note#secret_spine_3]",
        "link": "[high_fantasy:button_read_note#secret_spine_3]",
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
      "v": "133",
      "w": "132",
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
      "v": "132",
      "w": "133",
      "value": {
        "type": "path",
        "edgeId": "e_ev_den_1",
        "link": "[high_fantasy:button_read_note#dossier]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "134",
      "w": "108",
      "value": {
        "type": "path",
        "edgeId": "e_ask_cast_2",
        "link": "[high_fantasy:button_interview#sus_cast_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "134",
      "w": "132",
      "value": {
        "type": "path",
        "edgeId": "e_fun_den_4",
        "link": "[high_fantasy:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "108",
      "w": "134",
      "value": {
        "type": "testimony",
        "prereq": {
          "traversed": "e_ask_cast_2"
        },
        "text": "[high_fantasy:mystery_testimony#sus_cast_2]",
        "dot": {
          "label": "testimony",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "111",
      "w": "134",
      "value": {
        "type": "choice",
        "correct": true,
        "dot": {
          "label": "correct",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "117",
      "w": "134",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#room_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "128",
      "w": "134",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#e_pp_mb_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "132",
      "w": "134",
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
      "v": "135",
      "w": "134",
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
      "v": "134",
      "w": "135",
      "value": {
        "type": "path",
        "edgeId": "e_ad_3",
        "link": "[high_fantasy:button_passage#e_ad_3]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
