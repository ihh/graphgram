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
        "fact": "a night spent in the cells under another name",
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
      "v": "41",
      "value": {
        "type": "secret",
        "nodeId": "sec_cast_1",
        "pairId": "secret_cast_1",
        "evidence": 1,
        "fact": "a signature they have learned to copy",
        "about": "valet",
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
      "v": "58",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_2",
        "correct": false,
        "accuses": "sus_spine_2",
        "castRole": "footman",
        "text": "[gothic_horror:mystery_verdict_wrong#sus_spine_2]",
        "dot": {
          "label": "wrong",
          "shape": "doublecircle",
          "color": "gray"
        }
      }
    },
    {
      "v": "61",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_3",
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
      "v": "64",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_4",
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
      "v": "67",
      "value": {
        "type": "verdict",
        "nodeId": "verdict_verdict_5",
        "correct": false,
        "accuses": "sus_spine_3",
        "castRole": "governess",
        "text": "[gothic_horror:mystery_verdict_wrong#sus_spine_3]",
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
        "type": "secret",
        "nodeId": "sec_spine_1",
        "pairId": "secret_spine_1",
        "evidence": 1,
        "fact": "a letter they were paid not to post",
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
      "v": "79",
      "value": {
        "type": "secret",
        "nodeId": "sec_spine_2",
        "pairId": "secret_spine_2",
        "evidence": 1,
        "fact": "a page torn from the day-book and burnt",
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
      "v": "85",
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
      "v": "86",
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
      "v": "87",
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
      "v": "89",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_1",
        "suspectId": "sus_cast_1",
        "castRole": "housekeeper",
        "hiding": "a night spent in the cells under another name",
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
      "v": "94",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_2",
        "suspectId": "sus_spine_2",
        "castRole": "footman",
        "hiding": "a letter they were paid not to post",
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
      "v": "101",
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
      "v": "102",
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
      "v": "105",
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
      "v": "107",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_3",
        "suspectId": "sus_spine_3",
        "castRole": "governess",
        "hiding": "a page torn from the day-book and burnt",
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
      "v": "109",
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
      "v": "112",
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
      "v": "113",
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
      "v": "115",
      "value": {
        "type": "scene",
        "nodeId": "deadend_5",
        "text": "[gothic_horror:describe_dead_end#deadend_5]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "117",
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
        "nodeId": "room_3",
        "text": "[gothic_horror:describe_room#room_3]",
        "dot": {
          "label": "scene"
        }
      }
    },
    {
      "v": "121",
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
      "v": "122",
      "value": {
        "type": "suspect",
        "nodeId": "sus_cast_2",
        "suspectId": "sus_cast_2",
        "castRole": "valet",
        "hiding": "a signature they have learned to copy",
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
      "v": "123",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[gothic_horror:theme_intro#start]",
        "castSalt": 15,
        "dot": {
          "label": "start"
        }
      }
    },
    {
      "v": "125",
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
      "v": "126",
      "value": {
        "type": "suspect",
        "nodeId": "sus_spine_1",
        "suspectId": "sus_spine_1",
        "castRole": "butler",
        "hiding": "an affair with the mistress of the house",
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
    }
  ],
  "edges": [
    {
      "v": "94",
      "w": "73",
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
          "to": "footman",
          "act": "be seen in the pantry at nine",
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
      "v": "73",
      "w": "94",
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
      "v": "101",
      "w": "58",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_spine_2",
        "castRole": "footman",
        "link": "[gothic_horror:button_accuse#sus_spine_2]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "101",
      "w": "61",
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
      "v": "101",
      "w": "64",
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
      "v": "101",
      "w": "67",
      "value": {
        "type": "accuse",
        "correct": false,
        "accuses": "sus_spine_3",
        "castRole": "governess",
        "link": "[gothic_horror:button_accuse#sus_spine_3]",
        "dot": {
          "label": "accuse",
          "color": "gray"
        }
      }
    },
    {
      "v": "102",
      "w": "89",
      "value": {
        "type": "directive",
        "directive": {
          "to": "housekeeper",
          "act": "leave the garden door unlocked",
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
      "v": "102",
      "w": "94",
      "value": {
        "type": "directive",
        "directive": {
          "to": "footman",
          "act": "be seen in the pantry at nine",
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
      "v": "102",
      "w": "101",
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
      "v": "101",
      "w": "102",
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
      "v": "105",
      "w": "89",
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
      "v": "89",
      "w": "105",
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
          "act": "leave the garden door unlocked",
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
      "v": "107",
      "w": "79",
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
          "to": "governess",
          "act": "let the dogs out at half past",
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
      "v": "79",
      "w": "107",
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
      "v": "102",
      "w": "107",
      "value": {
        "type": "directive",
        "directive": {
          "to": "governess",
          "act": "let the dogs out at half past",
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
      "v": "109",
      "w": "85",
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
      "v": "109",
      "w": "86",
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
      "v": "109",
      "w": "87",
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
      "v": "109",
      "w": "101",
      "value": {
        "type": "choice",
        "correct": true,
        "edgeId": "e_fun_den_2",
        "dot": {
          "label": "correct",
          "color": "darkgreen"
        }
      }
    },
    {
      "v": "101",
      "w": "113",
      "value": {
        "type": "accuse",
        "correct": true,
        "accuses": "sus_spine_1",
        "castRole": "butler",
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
      "v": "120",
      "w": "101",
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
      "v": "101",
      "w": "120",
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
      "v": "121",
      "w": "41",
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
      "v": "121",
      "w": "89",
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
      "v": "41",
      "w": "121",
      "value": {
        "type": "return",
        "prereq": {
          "visited": "room_6"
        },
        "dot": {
          "label": "return",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "89",
      "w": "121",
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
      "v": "122",
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
      "v": "121",
      "w": "122",
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
      "v": "123",
      "w": "105",
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
      "v": "123",
      "w": "109",
      "value": {
        "type": "path",
        "link": "[gothic_horror:button_passage#puzzle_2]",
        "edgeId": "e_fun_den_2",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "123",
      "w": "112",
      "value": {
        "type": "path",
        "edgeId": "e_ad_1",
        "link": "[gothic_horror:button_passage#e_ad_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "123",
      "w": "115",
      "value": {
        "type": "path",
        "edgeId": "e_ad_5",
        "link": "[gothic_horror:button_passage#e_ad_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "123",
      "w": "117",
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
      "v": "123",
      "w": "120",
      "value": {
        "type": "path",
        "link": "[gothic_horror:button_passage#room_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "123",
      "w": "121",
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
      "v": "85",
      "w": "123",
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
      "w": "123",
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
      "v": "87",
      "w": "123",
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
      "v": "101",
      "w": "123",
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
      "w": "123",
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
      "v": "112",
      "w": "123",
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
      "v": "115",
      "w": "123",
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
      "v": "117",
      "w": "123",
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
      "v": "125",
      "w": "37",
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
      "v": "125",
      "w": "94",
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
      "v": "125",
      "w": "107",
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
      "v": "37",
      "w": "125",
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
      "v": "73",
      "w": "125",
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
      "v": "79",
      "w": "125",
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
      "v": "94",
      "w": "125",
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
      "v": "107",
      "w": "125",
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
      "v": "123",
      "w": "125",
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
      "v": "126",
      "w": "121",
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
          "to": "butler",
          "act": "put the day-book back where it was",
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
      "v": "126",
      "w": "125",
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
      "v": "102",
      "w": "126",
      "value": {
        "type": "directive",
        "directive": {
          "to": "butler",
          "act": "put the day-book back where it was",
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
      "v": "121",
      "w": "126",
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
      "w": "126",
      "value": {
        "type": "path",
        "edgeId": "e_ask_spine_1",
        "link": "[gothic_horror:button_interview#sus_spine_1]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
