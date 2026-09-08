window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "35",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_4",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_4]"
      }
    },
    {
      "v": "39",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_2",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_2]"
      }
    },
    {
      "v": "43",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_1",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_1]"
      }
    },
    {
      "v": "47",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "[dark_fairy_tale:describe_win#win]"
      }
    },
    {
      "v": "48",
      "value": {
        "type": "room",
        "nodeId": "approach_3",
        "text": "[dark_fairy_tale:describe_room#approach_3]"
      }
    },
    {
      "v": "49",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_5",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_5]"
      }
    },
    {
      "v": "50",
      "value": {
        "type": "room",
        "nodeId": "approach_4",
        "text": "[dark_fairy_tale:describe_room#approach_4]"
      }
    },
    {
      "v": "51",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_3",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_3]"
      }
    },
    {
      "v": "52",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[dark_fairy_tale:theme_intro#start]"
      }
    },
    {
      "v": "53",
      "value": {
        "type": "dead_end",
        "nodeId": "deadend_6",
        "text": "[dark_fairy_tale:describe_dead_end#deadend_6]"
      }
    },
    {
      "v": "54",
      "value": {
        "type": "room",
        "nodeId": "approach_1",
        "text": "[dark_fairy_tale:describe_room#approach_1]"
      }
    },
    {
      "v": "55",
      "value": {
        "type": "room",
        "nodeId": "approach_2",
        "text": "[dark_fairy_tale:describe_room#approach_2]"
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
      "v": "48",
      "w": "49",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_5",
        "link": "[dark_fairy_tale:button_passage#e_ad_5]"
      }
    },
    {
      "v": "50",
      "w": "35",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_4",
        "link": "[dark_fairy_tale:button_passage#e_ad_4]"
      }
    },
    {
      "v": "50",
      "w": "39",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_2",
        "link": "[dark_fairy_tale:button_passage#e_ad_2]"
      }
    },
    {
      "v": "50",
      "w": "47",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_mw_4",
        "link": "[dark_fairy_tale:button_passage#e_approach_mw_4]"
      }
    },
    {
      "v": "50",
      "w": "48",
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
      "v": "35",
      "w": "50",
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
      "v": "39",
      "w": "50",
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
      "v": "48",
      "w": "50",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_4",
        "link": "[dark_fairy_tale:button_passage#approach_4]"
      }
    },
    {
      "v": "51",
      "w": "50",
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
      "v": "50",
      "w": "51",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_3",
        "link": "[dark_fairy_tale:button_passage#e_ad_3]"
      }
    },
    {
      "v": "52",
      "w": "43",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_1",
        "link": "[dark_fairy_tale:button_passage#e_ad_1]"
      }
    },
    {
      "v": "43",
      "w": "52",
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
      "v": "53",
      "w": "52",
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
      "v": "52",
      "w": "53",
      "value": {
        "type": "passage",
        "edgeId": "e_ad_6",
        "link": "[dark_fairy_tale:button_passage#e_ad_6]"
      }
    },
    {
      "v": "54",
      "w": "52",
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
      "v": "52",
      "w": "54",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_1",
        "link": "[dark_fairy_tale:button_passage#approach_1]"
      }
    },
    {
      "v": "55",
      "w": "48",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_3",
        "link": "[dark_fairy_tale:button_passage#approach_3]"
      }
    },
    {
      "v": "55",
      "w": "54",
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
      "v": "48",
      "w": "55",
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
      "v": "54",
      "w": "55",
      "value": {
        "type": "passage",
        "edgeId": "e_approach_am_2",
        "link": "[dark_fairy_tale:button_passage#approach_2]"
      }
    }
  ]
};
