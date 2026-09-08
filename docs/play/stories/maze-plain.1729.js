window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "49",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_5",
        "text": "[high_fantasy:describe_dead_end#deadend_5]"
      }
    },
    {
      "v": "55",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_4",
        "text": "[high_fantasy:describe_dead_end#deadend_4]"
      }
    },
    {
      "v": "57",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_9",
        "text": "[high_fantasy:describe_dead_end#deadend_9]"
      }
    },
    {
      "v": "58",
      "value": {
        "type": "room",
        "nodeId": "room_6",
        "text": "[high_fantasy:describe_room#room_6]"
      }
    },
    {
      "v": "60",
      "value": {
        "type": "room",
        "nodeId": "room_10",
        "text": "[high_fantasy:describe_room#room_10]"
      }
    },
    {
      "v": "61",
      "value": {
        "type": "room",
        "nodeId": "room_7",
        "text": "[high_fantasy:describe_room#room_7]"
      }
    },
    {
      "v": "62",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[high_fantasy:theme_intro#start]"
      }
    },
    {
      "v": "63",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "[high_fantasy:describe_win#win]"
      }
    },
    {
      "v": "64",
      "value": {
        "type": "room",
        "nodeId": "room_1",
        "text": "[high_fantasy:describe_room#room_1]"
      }
    },
    {
      "v": "65",
      "value": {
        "type": "room",
        "nodeId": "room_3",
        "text": "[high_fantasy:describe_room#room_3]"
      }
    },
    {
      "v": "66",
      "value": {
        "type": "room",
        "nodeId": "room_2",
        "text": "[high_fantasy:describe_room#room_2]"
      }
    },
    {
      "v": "67",
      "value": {
        "type": "room",
        "nodeId": "room_8",
        "text": "[high_fantasy:describe_room#room_8]"
      }
    }
  ],
  "edges": [
    {
      "v": "58",
      "w": "60",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#room_10]",
        "edgeId": "e_am_7"
      }
    },
    {
      "v": "61",
      "w": "58",
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
      "v": "58",
      "w": "61",
      "value": {
        "type": "passage",
        "edgeId": "e_am_7",
        "link": "[high_fantasy:button_passage#e_am_7]"
      }
    },
    {
      "v": "60",
      "w": "61",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#e_pp_mb_10]"
      }
    },
    {
      "v": "62",
      "w": "63",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#e_bare_1]"
      }
    },
    {
      "v": "64",
      "w": "49",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_5",
        "link": "[high_fantasy:button_passage#e_ad_5]"
      }
    },
    {
      "v": "64",
      "w": "55",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_4",
        "link": "[high_fantasy:button_passage#e_ad_4]"
      }
    },
    {
      "v": "64",
      "w": "61",
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
      "v": "64",
      "w": "63",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#e_pp_mb_1]"
      }
    },
    {
      "v": "49",
      "w": "64",
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
      "v": "55",
      "w": "64",
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
      "v": "61",
      "w": "64",
      "value": {
        "type": "passage",
        "edgeId": "e_mb_7",
        "link": "[high_fantasy:button_passage#e_mb_7]"
      }
    },
    {
      "v": "65",
      "w": "63",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#e_pp_mb_3]"
      }
    },
    {
      "v": "64",
      "w": "65",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#room_3]"
      }
    },
    {
      "v": "66",
      "w": "57",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_9",
        "link": "[high_fantasy:button_passage#e_ad_9]"
      }
    },
    {
      "v": "66",
      "w": "58",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#room_6]",
        "edgeId": "e_mb_2"
      }
    },
    {
      "v": "66",
      "w": "62",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_2"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "66",
      "w": "64",
      "value": {
        "type": "passage",
        "edgeId": "e_mb_2",
        "link": "[high_fantasy:button_passage#e_mb_2]"
      }
    },
    {
      "v": "57",
      "w": "66",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_9"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "62",
      "w": "66",
      "value": {
        "type": "passage",
        "edgeId": "e_am_2",
        "link": "[high_fantasy:button_passage#e_am_2]"
      }
    },
    {
      "v": "64",
      "w": "66",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_mb_2"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "67",
      "w": "58",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#e_pp_mb_8]"
      }
    },
    {
      "v": "66",
      "w": "67",
      "value": {
        "type": "passage",
        "link": "[high_fantasy:button_passage#room_8]",
        "edgeId": "e_mb_2"
      }
    }
  ]
};
