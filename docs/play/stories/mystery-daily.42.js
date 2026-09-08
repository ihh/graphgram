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
        "text": "[gothic_horror:mystery_secret_site#secret_spine_3]",
        "secretSiteText": "[gothic_horror:mystery_secret_site#secret_spine_3]",
        "secretText": "[gothic_horror:mystery_secret#secret_spine_3]",
        "learnText": "[gothic_horror:mystery_learn_secret#secret_spine_3]",
        "knowText": "[gothic_horror:mystery_know_secret#secret_spine_3]",
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
        "text": "[gothic_horror:mystery_secret_site#secret_cast_1]",
        "secretSiteText": "[gothic_horror:mystery_secret_site#secret_cast_1]",
        "secretText": "[gothic_horror:mystery_secret#secret_cast_1]",
        "learnText": "[gothic_horror:mystery_learn_secret#secret_cast_1]",
        "knowText": "[gothic_horror:mystery_know_secret#secret_cast_1]",
        "dot": {
          "label": "secret (secret_cast_1)",
          "shape": "diamond",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "54",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_1",
        "correct": false,
        "accuses": "sus_cast_1",
        "castRole": "housekeeper",
        "text": "[gothic_horror:mystery_verdict_wrong#sus_cast_1]",
        "dot": {
          "label": "wrong",
          "shape": "doublecircle",
          "color": "gray"
        }
      }
    },
    {
      "v": "57",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_2",
        "correct": false,
        "accuses": "sus_spine_3",
        "castRole": "housekeeper",
        "text": "[gothic_horror:mystery_verdict_wrong#sus_spine_3]",
        "dot": {
          "label": "wrong",
          "shape": "doublecircle",
          "color": "gray"
        }
      }
    },
    {
      "v": "63",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_4",
        "correct": false,
        "accuses": "sus_spine_2",
        "castRole": "governess",
        "text": "[gothic_horror:mystery_verdict_wrong#sus_spine_2]",
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
        "nodeId": "verdict_verdict_5",
        "correct": false,
        "accuses": "sus_cast_2",
        "castRole": "valet",
        "text": "[gothic_horror:mystery_verdict_wrong#sus_cast_2]",
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
        "type": "secret",
        "nodeId": "sec_spine_1",
        "pairId": "secret_spine_1",
        "evidence": 1,
        "fact": "a key cut at the ironmonger without asking",
        "about": "footman",
        "text": "[gothic_horror:mystery_secret_site#secret_spine_1]",
        "secretSiteText": "[gothic_horror:mystery_secret_site#secret_spine_1]",
        "secretText": "[gothic_horror:mystery_secret#secret_spine_1]",
        "learnText": "[gothic_horror:mystery_learn_secret#secret_spine_1]",
        "knowText": "[gothic_horror:mystery_know_secret#secret_spine_1]",
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
      "v": "78",
      "value": {
        "type": "secret",
        "nodeId": "sec_spine_2",
        "pairId": "secret_spine_2",
        "evidence": 1,
        "fact": "a debt to a bookmaker in the next town",
        "about": "governess",
        "text": "[gothic_horror:mystery_secret_site#secret_spine_2]",
        "secretSiteText": "[gothic_horror:mystery_secret_site#secret_spine_2]",
        "secretText": "[gothic_horror:mystery_secret#secret_spine_2]",
        "learnText": "[gothic_horror:mystery_learn_secret#secret_spine_2]",
        "knowText": "[gothic_horror:mystery_know_secret#secret_spine_2]",
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
      "v": "84",
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
      "v": "85",
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
      "v": "86",
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
      "v": "93",
      "value": {
        "type": "puzzle_intro",
        "nodeId": "puzzle_2",
        "text": "[gothic_horror:describe_puzzle_intro#puzzle_2]",
        "dot": {
          "label": "puzzle",
          "shape": "diamond",
          "color": "gold"
        }
      }
    },
    {
      "v": "102",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_1",
        "suspectId": "sus_spine_1",
        "castRole": "footman",
        "hiding": "a key cut at the ironmonger without asking",
        "text": "[gothic_horror:mystery_suspect_intro#sus_spine_1]",
        "dot": {
          "label": "suspect (secret_spine_1)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_spine_1",
        "evasionText": "[gothic_horror:mystery_evasion#secret_spine_1]",
        "openText": "[gothic_horror:mystery_changed_manner#secret_spine_1]",
        "chain": "spine",
        "chainDepth": 1,
        "murderer": true,
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "104",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_2",
        "suspectId": "sus_cast_2",
        "castRole": "valet",
        "hiding": "a child nobody in the house knows about",
        "text": "[gothic_horror:mystery_suspect_intro#sus_cast_2]",
        "dot": {
          "label": "suspect",
          "shape": "box",
          "color": "purple"
        },
        "testimonyText": "[gothic_horror:mystery_testimony#sus_cast_2]",
        "accused": true
      }
    },
    {
      "v": "105",
      "value": {
        "type": "scene",
        "nodeId": "deadend_1",
        "text": "[gothic_horror:describe_dead_end#deadend_1]",
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
        "text": "[gothic_horror:describe_win#win]",
        "dot": {
          "label": "win"
        }
      }
    },
    {
      "v": "107",
      "value": {
        "type": "accusation",
        "nodeId": "accusation",
        "minEvidence": 3,
        "text": "[gothic_horror:mystery_accusation#accusation]",
        "dot": {
          "label": "accusation",
          "shape": "doubleoctagon",
          "color": "red"
        }
      }
    },
    {
      "v": "108",
      "value": {
        "type": "evidence",
        "nodeId": "dossier",
        "text": "[gothic_horror:mystery_dossier#dossier]",
        "dot": {
          "label": "dossier",
          "shape": "note",
          "color": "blue"
        }
      }
    },
    {
      "v": "111",
      "value": {
        "type": "scene",
        "nodeId": "room_7",
        "text": "[gothic_horror:describe_room#room_7]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "112",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_1",
        "suspectId": "sus_cast_1",
        "castRole": "housekeeper",
        "hiding": "a brother who is not dead after all",
        "text": "[gothic_horror:mystery_suspect_intro#sus_cast_1]",
        "dot": {
          "label": "suspect (secret_cast_1)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_cast_1",
        "evasionText": "[gothic_horror:mystery_evasion#secret_cast_1]",
        "openText": "[gothic_horror:mystery_changed_manner#secret_cast_1]",
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "115",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_3",
        "suspectId": "sus_spine_3",
        "castRole": "housekeeper",
        "hiding": "a second family across the water",
        "text": "[gothic_horror:mystery_suspect_intro#sus_spine_3]",
        "dot": {
          "label": "suspect (secret_spine_3)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_spine_3",
        "evasionText": "[gothic_horror:mystery_evasion#secret_spine_3]",
        "openText": "[gothic_horror:mystery_changed_manner#secret_spine_3]",
        "chain": "spine",
        "chainDepth": 3,
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "116",
      "value": {
        "type": "scene",
        "nodeId": "deadend_2",
        "text": "[gothic_horror:describe_dead_end#deadend_2]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "118",
      "value": {
        "type": "scene",
        "nodeId": "deadend_4",
        "text": "[gothic_horror:describe_dead_end#deadend_4]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "120",
      "value": {
        "type": "scene",
        "nodeId": "room_6",
        "text": "[gothic_horror:describe_room#room_6]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "121",
      "value": {
        "type": "scene",
        "nodeId": "room_3",
        "text": "[gothic_horror:describe_room#room_3]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "123",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_2",
        "suspectId": "sus_spine_2",
        "castRole": "governess",
        "hiding": "a debt to a bookmaker in the next town",
        "text": "[gothic_horror:mystery_suspect_intro#sus_spine_2]",
        "dot": {
          "label": "suspect (secret_spine_2)",
          "shape": "box",
          "color": "purple"
        },
        "pairId": "secret_spine_2",
        "evasionText": "[gothic_horror:mystery_evasion#secret_spine_2]",
        "openText": "[gothic_horror:mystery_changed_manner#secret_spine_2]",
        "chain": "spine",
        "chainDepth": 2,
        "accused": true,
        "filed": true
      }
    },
    {
      "v": "124",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[gothic_horror:theme_intro#start]",
        "dot": {
          "label": "start"
        }
      }
    },
    {
      "v": "125",
      "value": {
        "type": "scene",
        "nodeId": "deadend_5",
        "text": "[gothic_horror:describe_dead_end#deadend_5]",
        "dot": {
          "label": "scene"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "93",
      "w": "84",
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
      "v": "93",
      "w": "85",
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
      "v": "93",
      "w": "86",
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
      "v": "105",
      "w": "102",
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
      "v": "102",
      "w": "105",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_spine_1",
        "pairId": "secret_spine_1",
        "lockedText": "[gothic_horror:mystery_locked_question#secret_spine_1]",
        "leverageText": "[gothic_horror:mystery_recognise_leverage#secret_spine_1]",
        "confrontText": "[gothic_horror:mystery_confront#secret_spine_1]",
        "prefaceText": "[gothic_horror:mystery_ask_now#secret_spine_1]",
        "noteText": "[gothic_horror:mystery_directive_note#secret_spine_1]",
        "directive": {
          "to": "footman",
          "act": "swear the car never left the yard",
          "note": "[gothic_horror:mystery_directive_note#secret_spine_1]"
        },
        "link": "[gothic_horror:mystery_confront#secret_spine_1]",
        "prereq": {
          "pairId": "secret_spine_1",
          "link": "[gothic_horror:mystery_confront#secret_spine_1]",
          "recognition": "[gothic_horror:mystery_recognise_leverage#secret_spine_1]",
          "after": "[gothic_horror:mystery_ask_now#secret_spine_1]"
        },
        "dot": {
          "label": "interview (secret_spine_1)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "107",
      "w": "54",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_cast_1",
        "castRole": "housekeeper",
        "link": "[gothic_horror:button_accuse#sus_cast_1]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "107",
      "w": "57",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_spine_3",
        "castRole": "housekeeper",
        "link": "[gothic_horror:button_accuse#sus_spine_3]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "107",
      "w": "63",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_spine_2",
        "castRole": "governess",
        "link": "[gothic_horror:button_accuse#sus_spine_2]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "107",
      "w": "66",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_cast_2",
        "castRole": "valet",
        "link": "[gothic_horror:button_accuse#sus_cast_2]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "107",
      "w": "106",
      "value": {
        "type": "accuse",
        "correct": true,
        "accuses": "sus_spine_1",
        "castRole": "footman",
        "link": "[gothic_horror:button_accuse#sus_spine_1]",
        "text": "[gothic_horror:mystery_verdict_right#sus_spine_1]",
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
      "v": "108",
      "w": "102",
      "value": {
        "type": "directive",
        "directive": {
          "to": "footman",
          "act": "swear the car never left the yard",
          "note": "[gothic_horror:mystery_directive_note#secret_spine_1]"
        },
        "noteText": "[gothic_horror:mystery_directive_note#secret_spine_1]",
        "link": "[gothic_horror:button_read_note#secret_spine_1]",
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
      "v": "108",
      "w": "107",
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
      "v": "107",
      "w": "108",
      "value": {
        "type": "path",
        "edgeId": "e_ev_den_1",
        "link": "[gothic_horror:button_read_note#dossier]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "111",
      "w": "40",
      "value": {
        "type": "leverage",
        "link": "[gothic_horror:button_passage#sec_cast_1]",
        "dot": {
          "label": "leverage",
          "style": "dotted",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "40",
      "w": "111",
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
      "v": "112",
      "w": "111",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ask_cast_1"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "108",
      "w": "112",
      "value": {
        "type": "directive",
        "directive": {
          "to": "housekeeper",
          "act": "do not mention the letter",
          "note": "[gothic_horror:mystery_directive_note#secret_cast_1]"
        },
        "noteText": "[gothic_horror:mystery_directive_note#secret_cast_1]",
        "link": "[gothic_horror:button_read_note#secret_cast_1]",
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
      "v": "111",
      "w": "112",
      "value": {
        "type": "path",
        "edgeId": "e_ask_cast_1",
        "link": "[gothic_horror:button_interview#sus_cast_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "115",
      "w": "78",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_spine_3",
        "pairId": "secret_spine_3",
        "lockedText": "[gothic_horror:mystery_locked_question#secret_spine_3]",
        "leverageText": "[gothic_horror:mystery_recognise_leverage#secret_spine_3]",
        "confrontText": "[gothic_horror:mystery_confront#secret_spine_3]",
        "prefaceText": "[gothic_horror:mystery_ask_now#secret_spine_3]",
        "noteText": "[gothic_horror:mystery_directive_note#secret_spine_3]",
        "directive": {
          "to": "housekeeper",
          "act": "put the day-book back where it was",
          "note": "[gothic_horror:mystery_directive_note#secret_spine_3]"
        },
        "link": "[gothic_horror:mystery_confront#secret_spine_3]",
        "prereq": {
          "pairId": "secret_spine_3",
          "link": "[gothic_horror:mystery_confront#secret_spine_3]",
          "recognition": "[gothic_horror:mystery_recognise_leverage#secret_spine_3]",
          "after": "[gothic_horror:mystery_ask_now#secret_spine_3]"
        },
        "dot": {
          "label": "interview (secret_spine_3)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "78",
      "w": "115",
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
      "v": "108",
      "w": "115",
      "value": {
        "type": "directive",
        "directive": {
          "to": "housekeeper",
          "act": "put the day-book back where it was",
          "note": "[gothic_horror:mystery_directive_note#secret_spine_3]"
        },
        "noteText": "[gothic_horror:mystery_directive_note#secret_spine_3]",
        "link": "[gothic_horror:button_read_note#secret_spine_3]",
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
      "v": "93",
      "w": "116",
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
      "v": "120",
      "w": "93",
      "value": {
        "type": "path",
        "link": "[gothic_horror:button_passage#puzzle_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "120",
      "w": "112",
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
      "v": "84",
      "w": "120",
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
      "v": "85",
      "w": "120",
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
      "v": "86",
      "w": "120",
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
      "v": "112",
      "w": "120",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_cast_1",
        "pairId": "secret_cast_1",
        "lockedText": "[gothic_horror:mystery_locked_question#secret_cast_1]",
        "leverageText": "[gothic_horror:mystery_recognise_leverage#secret_cast_1]",
        "confrontText": "[gothic_horror:mystery_confront#secret_cast_1]",
        "prefaceText": "[gothic_horror:mystery_ask_now#secret_cast_1]",
        "noteText": "[gothic_horror:mystery_directive_note#secret_cast_1]",
        "directive": {
          "to": "housekeeper",
          "act": "do not mention the letter",
          "note": "[gothic_horror:mystery_directive_note#secret_cast_1]"
        },
        "link": "[gothic_horror:mystery_confront#secret_cast_1]",
        "prereq": {
          "pairId": "secret_cast_1",
          "link": "[gothic_horror:mystery_confront#secret_cast_1]",
          "recognition": "[gothic_horror:mystery_recognise_leverage#secret_cast_1]",
          "after": "[gothic_horror:mystery_ask_now#secret_cast_1]"
        },
        "dot": {
          "label": "interview (secret_cast_1)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "121",
      "w": "104",
      "value": {
        "type": "path",
        "edgeId": "e_ask_cast_2",
        "link": "[gothic_horror:button_interview#sus_cast_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "121",
      "w": "107",
      "value": {
        "type": "path",
        "edgeId": "e_fun_den_2",
        "link": "[gothic_horror:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "104",
      "w": "121",
      "value": {
        "type": "testimony",
        "prereq": {
          "traversed": "e_ask_cast_2"
        },
        "text": "[gothic_horror:mystery_testimony#sus_cast_2]",
        "dot": {
          "label": "testimony",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "107",
      "w": "121",
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
      "v": "123",
      "w": "69",
      "value": {
        "type": "interview",
        "edgeId": "e_tell_spine_2",
        "pairId": "secret_spine_2",
        "lockedText": "[gothic_horror:mystery_locked_question#secret_spine_2]",
        "leverageText": "[gothic_horror:mystery_recognise_leverage#secret_spine_2]",
        "confrontText": "[gothic_horror:mystery_confront#secret_spine_2]",
        "prefaceText": "[gothic_horror:mystery_ask_now#secret_spine_2]",
        "noteText": "[gothic_horror:mystery_directive_note#secret_spine_2]",
        "directive": {
          "to": "governess",
          "act": "say nothing about the west stair",
          "note": "[gothic_horror:mystery_directive_note#secret_spine_2]"
        },
        "link": "[gothic_horror:mystery_confront#secret_spine_2]",
        "prereq": {
          "pairId": "secret_spine_2",
          "link": "[gothic_horror:mystery_confront#secret_spine_2]",
          "recognition": "[gothic_horror:mystery_recognise_leverage#secret_spine_2]",
          "after": "[gothic_horror:mystery_ask_now#secret_spine_2]"
        },
        "dot": {
          "label": "interview (secret_spine_2)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "69",
      "w": "123",
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
      "v": "108",
      "w": "123",
      "value": {
        "type": "directive",
        "directive": {
          "to": "governess",
          "act": "say nothing about the west stair",
          "note": "[gothic_horror:mystery_directive_note#secret_spine_2]"
        },
        "noteText": "[gothic_horror:mystery_directive_note#secret_spine_2]",
        "link": "[gothic_horror:button_read_note#secret_spine_2]",
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
      "v": "124",
      "w": "36",
      "value": {
        "type": "leverage",
        "link": "[gothic_horror:button_passage#sec_spine_3]",
        "dot": {
          "label": "leverage",
          "style": "dotted",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "124",
      "w": "102",
      "value": {
        "type": "path",
        "edgeId": "e_ad_1",
        "link": "[gothic_horror:button_interview#sus_spine_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "124",
      "w": "107",
      "value": {
        "type": "path",
        "edgeId": "e_acc_den_1",
        "link": "[gothic_horror:button_passage#accusation]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "124",
      "w": "111",
      "value": {
        "type": "path",
        "link": "[gothic_horror:button_passage#room_7]",
        "edgeId": "e_ad_2",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "124",
      "w": "115",
      "value": {
        "type": "path",
        "edgeId": "e_ask_spine_3",
        "link": "[gothic_horror:button_interview#sus_spine_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "124",
      "w": "116",
      "value": {
        "type": "path",
        "edgeId": "e_ad_2",
        "link": "[gothic_horror:button_passage#e_ad_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "124",
      "w": "118",
      "value": {
        "type": "path",
        "edgeId": "e_ad_4",
        "link": "[gothic_horror:button_passage#e_ad_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "124",
      "w": "120",
      "value": {
        "type": "path",
        "link": "[gothic_horror:button_passage#room_6]",
        "edgeId": "e_ad_2",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "124",
      "w": "121",
      "value": {
        "type": "path",
        "link": "[gothic_horror:button_passage#room_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "124",
      "w": "123",
      "value": {
        "type": "path",
        "edgeId": "e_ask_spine_2",
        "link": "[gothic_horror:button_interview#sus_spine_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "36",
      "w": "124",
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
      "v": "69",
      "w": "124",
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
      "w": "124",
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
      "v": "102",
      "w": "124",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_1"
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
      "w": "124",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_1"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "107",
      "w": "124",
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
      "v": "116",
      "w": "124",
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
      "v": "118",
      "w": "124",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_4"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "123",
      "w": "124",
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
      "v": "125",
      "w": "124",
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
      "v": "124",
      "w": "125",
      "value": {
        "type": "path",
        "edgeId": "e_ad_5",
        "link": "[gothic_horror:button_passage#e_ad_5]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
