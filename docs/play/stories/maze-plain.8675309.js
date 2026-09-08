window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "43",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_7",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_7]"
      }
    },
    {
      "v": "45",
      "value": {
        "type": "room",
        "nodeId": "room_3",
        "text": "[dark_fairy_tale:describe_room#room_3]"
      }
    },
    {
      "v": "48",
      "value": {
        "type": "room",
        "nodeId": "room_2",
        "text": "[dark_fairy_tale:describe_room#room_2]"
      }
    },
    {
      "v": "49",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_6",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_6]"
      }
    },
    {
      "v": "54",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[dark_fairy_tale:theme_intro#start]"
      }
    },
    {
      "v": "55",
      "value": {
        "type": "room",
        "nodeId": "room_9",
        "text": "[dark_fairy_tale:describe_room#room_9]"
      }
    },
    {
      "v": "57",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "[dark_fairy_tale:describe_win#win]"
      }
    },
    {
      "v": "58",
      "value": {
        "type": "room",
        "nodeId": "room_5",
        "text": "[dark_fairy_tale:describe_room#room_5]"
      }
    },
    {
      "v": "60",
      "value": {
        "type": "room",
        "nodeId": "room_1",
        "text": "[dark_fairy_tale:describe_room#room_1]"
      }
    },
    {
      "v": "61",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_10",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_10]"
      }
    },
    {
      "v": "62",
      "value": {
        "type": "room",
        "nodeId": "room_4",
        "text": "[dark_fairy_tale:describe_room#room_4]"
      }
    },
    {
      "v": "63",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_8",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_8]"
      }
    }
  ],
  "edges": [
    {
      "v": "49",
      "w": "48",
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
      "v": "48",
      "w": "49",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_6",
        "link": "[dark_fairy_tale:button_passage#e_ad_6]"
      }
    },
    {
      "v": "55",
      "w": "48",
      "value": {
        "type": "passage",
        "edgeId": "e_mb_9",
        "link": "[dark_fairy_tale:button_passage#e_mb_9]"
      }
    },
    {
      "v": "55",
      "w": "54",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_am_9"
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
      "w": "55",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_mb_9"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "54",
      "w": "55",
      "value": {
        "type": "passage",
        "edgeId": "e_am_9",
        "link": "[dark_fairy_tale:button_passage#e_am_9]"
      }
    },
    {
      "v": "45",
      "w": "57",
      "value": {
        "type": "passage",
        "link": "[dark_fairy_tale:button_passage#e_pp_mb_3]"
      }
    },
    {
      "v": "48",
      "w": "57",
      "value": {
        "type": "passage",
        "link": "[dark_fairy_tale:button_passage#e_pp_mb_2]"
      }
    },
    {
      "v": "54",
      "w": "57",
      "value": {
        "type": "passage",
        "link": "[dark_fairy_tale:button_passage#e_bare_1]"
      }
    },
    {
      "v": "58",
      "w": "43",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_7",
        "link": "[dark_fairy_tale:button_passage#e_ad_7]"
      }
    },
    {
      "v": "58",
      "w": "54",
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
      "v": "43",
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
      "v": "54",
      "w": "58",
      "value": {
        "type": "passage",
        "edgeId": "e_am_5",
        "link": "[dark_fairy_tale:button_passage#e_am_5]"
      }
    },
    {
      "v": "60",
      "w": "57",
      "value": {
        "type": "passage",
        "link": "[dark_fairy_tale:button_passage#e_pp_mb_1]"
      }
    },
    {
      "v": "60",
      "w": "58",
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
      "v": "58",
      "w": "60",
      "value": {
        "type": "passage",
        "edgeId": "e_mb_5",
        "link": "[dark_fairy_tale:button_passage#e_mb_5]"
      }
    },
    {
      "v": "61",
      "w": "60",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_10"
        },
        "dot": {
          "label": "backtrack",
          "style": "dashed",
          "color": "gray"
        }
      }
    },
    {
      "v": "60",
      "w": "61",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_10",
        "link": "[dark_fairy_tale:button_passage#e_ad_10]"
      }
    },
    {
      "v": "62",
      "w": "45",
      "value": {
        "type": "passage",
        "edgeId": "e_mb_4",
        "link": "[dark_fairy_tale:button_passage#e_mb_4]"
      }
    },
    {
      "v": "62",
      "w": "48",
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
      "v": "45",
      "w": "62",
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
      "v": "48",
      "w": "62",
      "value": {
        "type": "passage",
        "edgeId": "e_am_4",
        "link": "[dark_fairy_tale:button_passage#e_am_4]"
      }
    },
    {
      "v": "63",
      "w": "62",
      "value": {
        "type": "backtrack",
        "prereq": {
          "traversed": "e_ad_8"
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
        "edgeId": "e_ad_8",
        "link": "[dark_fairy_tale:button_passage#e_ad_8]"
      }
    }
  ]
};
