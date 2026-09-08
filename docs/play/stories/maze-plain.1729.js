window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "39",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_5",
        "text": "[high_fantasy:describe_dead_end#deadend_5]"
      }
    },
    {
      "v": "43",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "[high_fantasy:describe_win#win]"
      }
    },
    {
      "v": "45",
      "value": {
        "type": "room",
        "nodeId": "room_2",
        "text": "[high_fantasy:describe_room#room_2]"
      }
    },
    {
      "v": "47",
      "value": {
        "type": "room",
        "nodeId": "room_4",
        "text": "[high_fantasy:describe_room#room_4]"
      }
    },
    {
      "v": "49",
      "value": {
        "type": "room",
        "nodeId": "approach_2",
        "text": "[high_fantasy:describe_room#approach_2]"
      }
    },
    {
      "v": "55",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_1",
        "text": "[high_fantasy:describe_dead_end#deadend_1]"
      }
    },
    {
      "v": "56",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[high_fantasy:theme_intro#start]"
      }
    },
    {
      "v": "57",
      "value": {
        "type": "room",
        "nodeId": "approach_1",
        "text": "[high_fantasy:describe_room#approach_1]"
      }
    },
    {
      "v": "58",
      "value": {
        "type": "room",
        "nodeId": "approach_3",
        "text": "[high_fantasy:describe_room#approach_3]"
      }
    },
    {
      "v": "59",
      "value": {
        "type": "room",
        "nodeId": "approach_4",
        "text": "[high_fantasy:describe_room#approach_4]"
      }
    },
    {
      "v": "60",
      "value": {
        "type": "room",
        "nodeId": "room_6",
        "text": "[high_fantasy:describe_room#room_6]"
      }
    },
    {
      "v": "61",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_3",
        "text": "[high_fantasy:describe_dead_end#deadend_3]"
      }
    }
  ],
  "edges": [
    {
      "v": "49",
      "w": "39",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_5",
        "link": "[high_fantasy:button_passage#e_ad_5]"
      }
    },
    {
      "v": "49",
      "w": "45",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#room_2]",
        "edgeId": "e_approach_am_3"
      }
    },
    {
      "v": "49",
      "w": "47",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#room_4]",
        "edgeId": "e_approach_am_3"
      }
    },
    {
      "v": "39",
      "w": "49",
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
      "v": "57",
      "w": "49",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_2",
        "link": "[high_fantasy:button_passage#approach_2]"
      }
    },
    {
      "v": "57",
      "w": "56",
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
      "v": "49",
      "w": "57",
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
      "v": "56",
      "w": "57",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_1",
        "link": "[high_fantasy:button_passage#approach_1]"
      }
    },
    {
      "v": "58",
      "w": "49",
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
      "v": "45",
      "w": "58",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#e_pp_mb_2]"
      }
    },
    {
      "v": "47",
      "w": "58",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#e_pp_mb_4]"
      }
    },
    {
      "v": "49",
      "w": "58",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_3",
        "link": "[high_fantasy:button_passage#approach_3]"
      }
    },
    {
      "v": "59",
      "w": "43",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_mw_4",
        "link": "[high_fantasy:button_passage#e_approach_mw_4]"
      }
    },
    {
      "v": "59",
      "w": "55",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_1",
        "link": "[high_fantasy:button_passage#e_ad_1]"
      }
    },
    {
      "v": "59",
      "w": "58",
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
      "w": "59",
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
      "v": "58",
      "w": "59",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_4",
        "link": "[high_fantasy:button_passage#approach_4]"
      }
    },
    {
      "v": "56",
      "w": "60",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#room_6]",
        "edgeId": "e_ad_3"
      }
    },
    {
      "v": "61",
      "w": "56",
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
      "v": "56",
      "w": "61",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_3",
        "link": "[high_fantasy:button_passage#e_ad_3]"
      }
    },
    {
      "v": "60",
      "w": "61",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#e_pp_mb_6]"
      }
    }
  ]
};
