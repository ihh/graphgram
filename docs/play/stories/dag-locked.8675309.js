window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "9",
      "value": {
        "type": "loss",
        "nodeId": "dag_loss_1",
        "text": "[dark_fairy_tale:describe_loss#dag_loss_1]",
        "dot": {
          "label": "loss",
          "shape": "octagon",
          "color": "red"
        }
      }
    },
    {
      "v": "15",
      "value": {
        "type": "loss",
        "nodeId": "dag_loss_2",
        "text": "[dark_fairy_tale:describe_loss#dag_loss_2]",
        "dot": {
          "label": "loss",
          "shape": "octagon",
          "color": "red"
        }
      }
    },
    {
      "v": "32",
      "value": {
        "type": "room",
        "nodeId": "dag_skip_1",
        "text": "[dark_fairy_tale:describe_room#dag_skip_1]",
        "dot": {
          "label": "room",
          "shape": "box"
        }
      }
    },
    {
      "v": "41",
      "value": {
        "type": "door",
        "pairId": "pair_1",
        "nodeId": "dag_join_1",
        "text": "[dark_fairy_tale:describe_door#dag_join_1]",
        "dot": {
          "label": "door (pair_1)",
          "shape": "house"
        }
      }
    },
    {
      "v": "44",
      "value": {
        "type": "win",
        "nodeId": "win",
        "text": "[dark_fairy_tale:describe_win#win]",
        "dot": {
          "label": "win"
        }
      }
    },
    {
      "v": "46",
      "value": {
        "type": "room",
        "nodeId": "dag_room_4",
        "text": "[dark_fairy_tale:describe_room#dag_room_4]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "55",
      "value": {
        "type": "key",
        "pairId": "pair_1",
        "nodeId": "dag_key_1",
        "text": "[dark_fairy_tale:describe_key#dag_key_1]",
        "dot": {
          "label": "key (pair_1)",
          "shape": "diamond"
        }
      }
    },
    {
      "v": "58",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_3",
        "text": "[dark_fairy_tale:describe_room#dag_fork2_3]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "59",
      "value": {
        "type": "door",
        "pairId": "pair_2",
        "nodeId": "dag_join_2",
        "text": "[dark_fairy_tale:describe_door#dag_join_2]",
        "dot": {
          "label": "door (pair_2)",
          "shape": "house"
        }
      }
    },
    {
      "v": "60",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_3",
        "text": "[dark_fairy_tale:describe_room#dag_fork1_3]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "61",
      "value": {
        "type": "room",
        "nodeId": "dag_room_6",
        "text": "[dark_fairy_tale:describe_room#dag_room_6]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "63",
      "value": {
        "type": "key",
        "pairId": "pair_2",
        "nodeId": "dag_key_2",
        "text": "[dark_fairy_tale:describe_key#dag_key_2]",
        "dot": {
          "label": "key (pair_2)",
          "shape": "diamond"
        }
      }
    },
    {
      "v": "64",
      "value": {
        "type": "room",
        "nodeId": "dag_room_5",
        "text": "[dark_fairy_tale:describe_room#dag_room_5]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "65",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[dark_fairy_tale:theme_intro#start]",
        "dot": {
          "label": "start"
        }
      }
    },
    {
      "v": "66",
      "value": {
        "type": "room",
        "nodeId": "dag_skip_2",
        "text": "[dark_fairy_tale:describe_room#dag_skip_2]",
        "dot": {
          "label": "room",
          "shape": "box"
        }
      }
    },
    {
      "v": "67",
      "value": {
        "type": "room",
        "nodeId": "dag_room_7",
        "text": "[dark_fairy_tale:describe_room#dag_room_7]",
        "dot": {
          "label": "room"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "41",
      "w": "9",
      "value": {
        "type": "consolation",
        "edgeId": "e_dag_jf_1",
        "link": "[dark_fairy_tale:button_retreat#e_dag_jf_1]",
        "dot": {
          "label": "consolation",
          "style": "dashed",
          "color": "firebrick"
        }
      }
    },
    {
      "v": "32",
      "w": "41",
      "value": {
        "type": "path",
        "edgeId": "e_dag_sj_1",
        "link": "[dark_fairy_tale:button_passage#e_dag_sj_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "41",
      "w": "44",
      "value": {
        "type": "path",
        "edgeId": "e_dag_jb_1",
        "link": "[dark_fairy_tale:describe_unlock#dag_join_1]",
        "closedText": "[dark_fairy_tale:describe_door#dag_join_1]",
        "prereq": {
          "pairId": "pair_1",
          "link": "[dark_fairy_tale:describe_unlock#dag_join_1]",
          "after": "[dark_fairy_tale:describe_after_unlock#dag_join_1]"
        },
        "dot": {
          "label": "locked (pair_1)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "55",
      "w": "41",
      "value": {
        "type": "path",
        "edgeId": "e_dag_kj_1",
        "link": "[dark_fairy_tale:button_passage#e_dag_kj_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "59",
      "w": "15",
      "value": {
        "type": "consolation",
        "edgeId": "e_dag_jf_2",
        "link": "[dark_fairy_tale:button_retreat#e_dag_jf_2]",
        "dot": {
          "label": "consolation",
          "style": "dashed",
          "color": "firebrick"
        }
      }
    },
    {
      "v": "59",
      "w": "32",
      "value": {
        "type": "path",
        "edgeId": "e_dag_jb_2",
        "link": "[dark_fairy_tale:describe_unlock#dag_join_2]",
        "closedText": "[dark_fairy_tale:describe_door#dag_join_2]",
        "prereq": {
          "pairId": "pair_2",
          "link": "[dark_fairy_tale:describe_unlock#dag_join_2]",
          "after": "[dark_fairy_tale:describe_after_unlock#dag_join_2]"
        },
        "dot": {
          "label": "locked (pair_2)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "46",
      "w": "59",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_4",
        "link": "[dark_fairy_tale:button_passage#e_dag_mb_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "58",
      "w": "59",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_3",
        "link": "[dark_fairy_tale:button_passage#e_dag_2b_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "61",
      "w": "59",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_6",
        "link": "[dark_fairy_tale:button_passage#e_dag_mb_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "60",
      "w": "61",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_6",
        "link": "[dark_fairy_tale:button_passage#e_dag_am_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "63",
      "w": "46",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_4",
        "link": "[dark_fairy_tale:button_passage#e_dag_am_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "64",
      "w": "55",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_5",
        "link": "[dark_fairy_tale:button_passage#e_dag_mb_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "65",
      "w": "64",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_5",
        "link": "[dark_fairy_tale:button_passage#e_dag_am_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "66",
      "w": "58",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_3",
        "link": "[dark_fairy_tale:button_passage#e_dag_a2_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "66",
      "w": "60",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_3",
        "link": "[dark_fairy_tale:button_passage#e_dag_a1_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "65",
      "w": "66",
      "value": {
        "type": "path",
        "edgeId": "e_dag_as_2",
        "link": "[dark_fairy_tale:button_passage#e_dag_as_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "67",
      "w": "63",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_7",
        "link": "[dark_fairy_tale:button_passage#e_dag_mb_7]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "65",
      "w": "67",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_7",
        "link": "[dark_fairy_tale:button_passage#e_dag_am_7]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
