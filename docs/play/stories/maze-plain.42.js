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
        "type": "dead_end",
        "nodeId": "deadend_7",
        "text": "[gothic_horror:describe_dead_end#deadend_7]"
      }
    },
    {
      "v": "53",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "[gothic_horror:describe_win#win]"
      }
    },
    {
      "v": "55",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_9",
        "text": "[gothic_horror:describe_dead_end#deadend_9]"
      }
    },
    {
      "v": "56",
      "value": {
        "type": "room",
        "nodeId": "room_3",
        "text": "[gothic_horror:describe_room#room_3]"
      }
    },
    {
      "v": "58",
      "value": {
        "type": "room",
        "nodeId": "room_1",
        "text": "[gothic_horror:describe_room#room_1]"
      }
    },
    {
      "v": "59",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_6",
        "text": "[gothic_horror:describe_dead_end#deadend_6]"
      }
    },
    {
      "v": "60",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[gothic_horror:theme_intro#start]"
      }
    },
    {
      "v": "61",
      "value": {
        "type": "room",
        "nodeId": "room_4",
        "text": "[gothic_horror:describe_room#room_4]"
      }
    },
    {
      "v": "62",
      "value": {
        "type": "room",
        "nodeId": "room_10",
        "text": "[gothic_horror:describe_room#room_10]"
      }
    },
    {
      "v": "63",
      "value": {
        "type": "room",
        "nodeId": "room_2",
        "text": "[gothic_horror:describe_room#room_2]"
      }
    },
    {
      "v": "64",
      "value": {
        "type": "room",
        "nodeId": "room_5",
        "text": "[gothic_horror:describe_room#room_5]"
      }
    },
    {
      "v": "65",
      "value": {
        "type": "room",
        "nodeId": "room_8",
        "text": "[gothic_horror:describe_room#room_8]"
      }
    }
  ],
  "edges": [
    {
      "v": "58",
      "w": "37",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_7",
        "link": "[gothic_horror:button_passage#e_ad_7]"
      }
    },
    {
      "v": "58",
      "w": "53",
      "value": {
        "type": "passage",
        "link": "[gothic_horror:button_passage#e_pp_mb_1]"
      }
    },
    {
      "v": "58",
      "w": "55",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_9",
        "link": "[gothic_horror:button_passage#e_ad_9]"
      }
    },
    {
      "v": "58",
      "w": "56",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_mb_3"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "37",
      "w": "58",
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
      "v": "55",
      "w": "58",
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
      "v": "56",
      "w": "58",
      "value": {
        "type": "passage",
        "edgeId": "e_mb_3",
        "link": "[gothic_horror:button_passage#e_mb_3]"
      }
    },
    {
      "v": "59",
      "w": "58",
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
      "v": "58",
      "w": "59",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_6",
        "link": "[gothic_horror:button_passage#e_ad_6]"
      }
    },
    {
      "v": "60",
      "w": "53",
      "value": {
        "type": "passage",
        "link": "[gothic_horror:button_passage#e_bare_1]"
      }
    },
    {
      "v": "60",
      "w": "56",
      "value": {
        "type": "passage",
        "edgeId": "e_am_3",
        "link": "[gothic_horror:button_passage#e_am_3]"
      }
    },
    {
      "v": "56",
      "w": "60",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_3"
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
      "w": "53",
      "value": {
        "type": "passage",
        "link": "[gothic_horror:button_passage#e_pp_mb_4]"
      }
    },
    {
      "v": "60",
      "w": "61",
      "value": {
        "type": "passage",
        "link": "[gothic_horror:button_passage#room_4]"
      }
    },
    {
      "v": "62",
      "w": "58",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_10"
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
      "w": "62",
      "value": {
        "type": "passage",
        "edgeId": "e_am_10",
        "link": "[gothic_horror:button_passage#e_am_10]"
      }
    },
    {
      "v": "63",
      "w": "53",
      "value": {
        "type": "passage",
        "link": "[gothic_horror:button_passage#e_pp_mb_2]"
      }
    },
    {
      "v": "63",
      "w": "62",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_mb_10"
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
      "w": "63",
      "value": {
        "type": "passage",
        "edgeId": "e_mb_10",
        "link": "[gothic_horror:button_passage#e_mb_10]"
      }
    },
    {
      "v": "56",
      "w": "64",
      "value": {
        "type": "passage",
        "link": "[gothic_horror:button_passage#room_5]",
        "edgeId": "e_mb_3"
      }
    },
    {
      "v": "65",
      "w": "58",
      "value": {
        "type": "passage",
        "edgeId": "e_mb_8",
        "link": "[gothic_horror:button_passage#e_mb_8]"
      }
    },
    {
      "v": "65",
      "w": "64",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_8"
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
      "w": "65",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_mb_8"
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
      "w": "65",
      "value": {
        "type": "passage",
        "edgeId": "e_am_8",
        "link": "[gothic_horror:button_passage#e_am_8]"
      }
    }
  ]
};
