window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "37",
      "value": {
        "type": "secret",
        "nodeId": "sec_spine_3",
        "pairId": "secret_spine_3",
        "evidence": 1,
        "fact": "a signature they have learned to copy",
        "about": "valet",
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
      "v": "44",
      "value": {
        "type": "secret",
        "nodeId": "sec_cast_2",
        "pairId": "secret_cast_2",
        "evidence": 1,
        "fact": "a bottle kept behind the flour in the pantry",
        "about": "cook",
        "text": "[high_fantasy:mystery_secret_site#secret_cast_2]",
        "secretSiteText": "[high_fantasy:mystery_secret_site#secret_cast_2]",
        "secretText": "[high_fantasy:mystery_secret#secret_cast_2]",
        "learnText": "[high_fantasy:mystery_learn_secret#secret_cast_2]",
        "knowText": "[high_fantasy:mystery_know_secret#secret_cast_2]",
        "dot": {
          "label": "secret (secret_cast_2)",
          "shape": "diamond",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "61",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_1",
        "correct": false,
        "accuses": "sus_cast_1",
        "castRole": "valet",
        "text": "[high_fantasy:mystery_verdict_wrong#sus_cast_1]",
        "dot": {
          "label": "wrong",
          "shape": "doublecircle",
          "color": "gray"
        }
      }
    },
    {
      "v": "64",
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
      "v": "67",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_3",
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
      "v": "73",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_5",
        "correct": false,
        "accuses": "sus_cast_2",
        "castRole": "gardener",
        "text": "[high_fantasy:mystery_verdict_wrong#sus_cast_2]",
        "dot": {
          "label": "wrong",
          "shape": "doublecircle",
          "color": "gray"
        }
      }
    },
    {
      "v": "76",
      "value": {
        "type": "secret",
        "nodeId": "sec_spine_2",
        "pairId": "secret_spine_2",
        "evidence": 1,
        "fact": "a night spent in the cells under another name",
        "about": "housekeeper",
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
      "v": "85",
      "value": {
        "type": "secret",
        "nodeId": "sec_spine_1",
        "pairId": "secret_spine_1",
        "evidence": 1,
        "fact": "a page torn from the day-book and burnt",
        "about": "governess",
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
      "v": "91",
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
      "v": "92",
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
      "v": "93",
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
      "v": "104",
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
      "v": "106",
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
      "v": "111",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_3",
        "suspectId": "sus_spine_3",
        "castRole": "housekeeper",
        "hiding": "a night spent in the cells under another name",
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
      "v": "114",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_1",
        "suspectId": "sus_cast_1",
        "castRole": "valet",
        "hiding": "a signature they have learned to copy",
        "text": "[high_fantasy:mystery_suspect_intro#sus_cast_1]",
        "dot": {
          "label": "suspect",
          "shape": "box",
          "color": "purple"
        },
        "testimonyText": "[high_fantasy:mystery_testimony#sus_cast_1]",
        "accused": true
      }
    },
    {
      "v": "115",
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
      "v": "118",
      "value": {
        "type": "scene",
        "nodeId": "deadend_3",
        "text": "[high_fantasy:describe_dead_end#deadend_3]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "119",
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
      "v": "124",
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
      "v": "125",
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
      "v": "126",
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
      "v": "127",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_2",
        "suspectId": "sus_cast_2",
        "castRole": "gardener",
        "hiding": "a forged reference from a house that never employed them",
        "text": "[high_fantasy:mystery_suspect_intro#sus_cast_2]",
        "dot": {
          "label": "suspect (secret_cast_2)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_cast_2",
        "evasionText": "[high_fantasy:mystery_evasion#secret_cast_2]",
        "openText": "[high_fantasy:mystery_changed_manner#secret_cast_2]",
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "129",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_2",
        "suspectId": "sus_spine_2",
        "castRole": "governess",
        "hiding": "a page torn from the day-book and burnt",
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
      "v": "130",
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
        "type": "scene",
        "nodeId": "room_5",
        "text": "[high_fantasy:describe_room#room_5]",
        "dot": {
          "label": "scene"
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
        "type": "start",
        "nodeId": "start",
        "text": "[high_fantasy:theme_intro#start]",
        "castSalt": 16,
        "dot": {
          "label": "start"
        }
      }
    },
    {
      "v": "136",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_1",
        "suspectId": "sus_spine_1",
        "castRole": "footman",
        "hiding": "a letter they were paid not to post",
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
    }
  ],
  "edges": [
    {
      "v": "106",
      "w": "91",
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
      "v": "106",
      "w": "92",
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
      "v": "106",
      "w": "93",
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
      "v": "111",
      "w": "76",
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
          "act": "leave the garden door unlocked",
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
      "v": "76",
      "w": "111",
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
      "v": "124",
      "w": "61",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_cast_1",
        "castRole": "valet",
        "link": "[high_fantasy:button_accuse#sus_cast_1]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "124",
      "w": "64",
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
      "v": "124",
      "w": "67",
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
      "v": "124",
      "w": "73",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_cast_2",
        "castRole": "gardener",
        "link": "[high_fantasy:button_accuse#sus_cast_2]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "124",
      "w": "104",
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
      "v": "124",
      "w": "115",
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
      "v": "124",
      "w": "119",
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
      "v": "115",
      "w": "124",
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
      "v": "119",
      "w": "124",
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
      "v": "125",
      "w": "111",
      "value": {
        "type": "directive",
        "directive": {
          "to": "housekeeper",
          "act": "leave the garden door unlocked",
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
      "v": "125",
      "w": "124",
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
      "v": "124",
      "w": "125",
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
      "v": "126",
      "w": "44",
      "value": {
        "type": "leverage",
        "link": "[high_fantasy:button_passage#sec_cast_2]",
        "dot": {
          "label": "leverage",
          "style": "dotted",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "44",
      "w": "126",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "room_7"
        },
        "dot": {
          "label": "return",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "106",
      "w": "126",
      "value": {
        "type": "choice",
        "correct": true,
        "edgeId": "e_am_7",
        "dot": {
          "label": "correct",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "127",
      "w": "126",
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
      "v": "125",
      "w": "127",
      "value": {
        "type": "directive",
        "directive": {
          "to": "gardener",
          "act": "forget the sound on the landing",
          "note": "[high_fantasy:mystery_directive_note#secret_cast_2]"
        },
        "noteText": "[high_fantasy:mystery_directive_note#secret_cast_2]",
        "link": "[high_fantasy:button_read_note#secret_cast_2]",
        "prereq": {
          "pairId": "secret_cast_2"
        },
        "dot": {
          "label": "note",
          "style": "dotted",
          "color": "blue"
        }
      }
    },
    {
      "v": "126",
      "w": "127",
      "value": {
        "type": "path",
        "edgeId": "e_mb_7",
        "link": "[high_fantasy:button_interview#sus_cast_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "129",
      "w": "85",
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
          "act": "let the dogs out at half past",
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
      "v": "85",
      "w": "129",
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
      "v": "125",
      "w": "129",
      "value": {
        "type": "directive",
        "directive": {
          "to": "governess",
          "act": "let the dogs out at half past",
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
      "v": "130",
      "w": "126",
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
      "v": "130",
      "w": "127",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_tell_cast_2"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "127",
      "w": "130",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_cast_2",
        "pairId": "secret_cast_2",
        "lockedText": "[high_fantasy:mystery_locked_question#secret_cast_2]",
        "leverageText": "[high_fantasy:mystery_recognise_leverage#secret_cast_2]",
        "confrontText": "[high_fantasy:mystery_confront#secret_cast_2]",
        "prefaceText": "[high_fantasy:mystery_ask_now#secret_cast_2]",
        "noteText": "[high_fantasy:mystery_directive_note#secret_cast_2]",
        "directive": {
          "to": "gardener",
          "act": "forget the sound on the landing",
          "note": "[high_fantasy:mystery_directive_note#secret_cast_2]"
        },
        "link": "[high_fantasy:mystery_confront#secret_cast_2]",
        "prereq": {
          "pairId": "secret_cast_2",
          "link": "[high_fantasy:mystery_confront#secret_cast_2]",
          "recognition": "[high_fantasy:mystery_recognise_leverage#secret_cast_2]",
          "after": "[high_fantasy:mystery_ask_now#secret_cast_2]"
        },
        "dot": {
          "label": "interview (secret_cast_2)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "132",
      "w": "106",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#puzzle_2]",
        "edgeId": "e_am_7",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "91",
      "w": "132",
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
      "w": "132",
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
      "v": "93",
      "w": "132",
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
      "v": "126",
      "w": "132",
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
      "v": "134",
      "w": "114",
      "value": {
        "type": "path",
        "edgeId": "e_ask_cast_1",
        "link": "[high_fantasy:button_interview#sus_cast_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "134",
      "w": "118",
      "value": {
        "type": "path",
        "edgeId": "e_ad_3",
        "link": "[high_fantasy:button_passage#e_ad_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "134",
      "w": "124",
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
      "v": "114",
      "w": "134",
      "value": {
        "type": "testimony",
        "prereq": {
          "traversed": "e_ask_cast_1"
        },
        "text": "[high_fantasy:mystery_testimony#sus_cast_1]",
        "dot": {
          "label": "testimony",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "118",
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
      "v": "124",
      "w": "134",
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
      "v": "130",
      "w": "134",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#e_pp_mb_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "132",
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
      "v": "135",
      "w": "37",
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
      "v": "135",
      "w": "111",
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
      "v": "135",
      "w": "115",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#room_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "135",
      "w": "124",
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
      "v": "135",
      "w": "129",
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
      "v": "135",
      "w": "132",
      "value": {
        "type": "path",
        "link": "[high_fantasy:button_passage#room_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "135",
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
      "v": "37",
      "w": "135",
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
      "v": "76",
      "w": "135",
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
      "v": "85",
      "w": "135",
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
      "v": "111",
      "w": "135",
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
      "v": "124",
      "w": "135",
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
      "v": "129",
      "w": "135",
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
      "v": "136",
      "w": "119",
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
          "act": "be seen in the pantry at nine",
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
      "v": "136",
      "w": "135",
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
      "v": "119",
      "w": "136",
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
      "v": "125",
      "w": "136",
      "value": {
        "type": "directive",
        "directive": {
          "to": "footman",
          "act": "be seen in the pantry at nine",
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
      "v": "135",
      "w": "136",
      "value": {
        "type": "path",
        "edgeId": "e_ask_spine_1",
        "link": "[high_fantasy:button_interview#sus_spine_1]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
