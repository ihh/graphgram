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
        "text": "[high_fantasy:describe_loss#dag_loss_1]",
        "dot": {
          "label": "loss",
          "shape": "octagon",
          "color": "red"
        }
      }
    },
    {
      "v": "18",
      "value": {
        "type": "loss",
        "nodeId": "dag_loss_3",
        "text": "[high_fantasy:describe_loss#dag_loss_3]",
        "dot": {
          "label": "loss",
          "shape": "octagon",
          "color": "red"
        }
      }
    },
    {
      "v": "43",
      "value": {
        "type": "room",
        "nodeId": "dag_room_5",
        "text": "[high_fantasy:describe_room#dag_room_5]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "44",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_6",
        "text": "[high_fantasy:describe_room#dag_fork2_6]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "46",
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
      "v": "47",
      "value": {
        "type": "key",
        "pairId": "pair_1",
        "nodeId": "dag_key_1",
        "text": "[high_fantasy:describe_key#dag_key_1]",
        "dot": {
          "label": "key (pair_1)",
          "shape": "diamond"
        }
      }
    },
    {
      "v": "48",
      "value": {
        "type": "room",
        "nodeId": "dag_room_7",
        "text": "[high_fantasy:describe_room#dag_room_7]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "49",
      "value": {
        "type": "room",
        "nodeId": "dag_room_4",
        "text": "[high_fantasy:describe_room#dag_room_4]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "58",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_6",
        "text": "[high_fantasy:describe_room#dag_fork1_6]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "60",
      "value": {
        "type": "key",
        "pairId": "pair_3",
        "nodeId": "dag_key_3",
        "text": "[high_fantasy:describe_key#dag_key_3]",
        "dot": {
          "label": "key (pair_3)",
          "shape": "diamond"
        }
      }
    },
    {
      "v": "61",
      "value": {
        "type": "door",
        "pairId": "pair_3",
        "nodeId": "dag_join_3",
        "text": "[high_fantasy:describe_door#dag_join_3]",
        "dot": {
          "label": "door (pair_3)",
          "shape": "house"
        }
      }
    },
    {
      "v": "62",
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
      "v": "63",
      "value": {
        "type": "room",
        "nodeId": "dag_skip_3",
        "text": "[high_fantasy:describe_room#dag_skip_3]",
        "dot": {
          "label": "room",
          "shape": "box"
        }
      }
    },
    {
      "v": "64",
      "value": {
        "type": "room",
        "nodeId": "dag_skip_1",
        "text": "[high_fantasy:describe_room#dag_skip_1]",
        "dot": {
          "label": "room",
          "shape": "box"
        }
      }
    },
    {
      "v": "66",
      "value": {
        "type": "room",
        "nodeId": "dag_room_2",
        "text": "[high_fantasy:describe_room#dag_room_2]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "67",
      "value": {
        "type": "door",
        "pairId": "pair_1",
        "nodeId": "dag_join_1",
        "text": "[high_fantasy:describe_door#dag_join_1]",
        "dot": {
          "label": "door (pair_1)",
          "shape": "house"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "48",
      "w": "43",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_7",
        "link": "[high_fantasy:button_passage#e_dag_mb_7]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "47",
      "w": "48",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_7",
        "link": "[high_fantasy:button_passage#e_dag_am_7]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "43",
      "w": "49",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_5",
        "link": "[high_fantasy:button_passage#e_dag_mb_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "61",
      "w": "18",
      "value": {
        "type": "consolation",
        "edgeId": "e_dag_jf_3",
        "link": "[high_fantasy:button_retreat#e_dag_jf_3]",
        "dot": {
          "label": "consolation",
          "style": "dashed",
          "color": "firebrick"
        }
      }
    },
    {
      "v": "61",
      "w": "47",
      "value": {
        "type": "path",
        "edgeId": "e_dag_jb_3",
        "link": "[high_fantasy:describe_unlock#dag_join_3]",
        "closedText": "[high_fantasy:describe_door#dag_join_3]",
        "prereq": {
          "pairId": "pair_3",
          "link": "[high_fantasy:describe_unlock#dag_join_3]",
          "after": "[high_fantasy:describe_after_unlock#dag_join_3]"
        },
        "dot": {
          "label": "locked (pair_3)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "60",
      "w": "61",
      "value": {
        "type": "path",
        "edgeId": "e_dag_kj_3",
        "link": "[high_fantasy:button_passage#e_dag_kj_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "62",
      "w": "44",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_6",
        "link": "[high_fantasy:button_passage#e_dag_a2_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "62",
      "w": "58",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_6",
        "link": "[high_fantasy:button_passage#e_dag_a1_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "62",
      "w": "60",
      "value": {
        "type": "path",
        "edgeId": "e_dag_ak_3",
        "link": "[high_fantasy:button_passage#e_dag_ak_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "63",
      "w": "61",
      "value": {
        "type": "path",
        "edgeId": "e_dag_sj_3",
        "link": "[high_fantasy:button_passage#e_dag_sj_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "62",
      "w": "63",
      "value": {
        "type": "path",
        "edgeId": "e_dag_as_3",
        "link": "[high_fantasy:button_passage#e_dag_as_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "44",
      "w": "64",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_6",
        "link": "[high_fantasy:button_passage#e_dag_2b_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "58",
      "w": "64",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_6",
        "link": "[high_fantasy:button_passage#e_dag_1b_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "49",
      "w": "66",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_4",
        "link": "[high_fantasy:button_passage#e_dag_mb_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "67",
      "w": "9",
      "value": {
        "type": "consolation",
        "edgeId": "e_dag_jf_1",
        "link": "[high_fantasy:button_retreat#e_dag_jf_1]",
        "dot": {
          "label": "consolation",
          "style": "dashed",
          "color": "firebrick"
        }
      }
    },
    {
      "v": "67",
      "w": "46",
      "value": {
        "type": "path",
        "edgeId": "e_dag_jb_1",
        "link": "[high_fantasy:describe_unlock#dag_join_1]",
        "closedText": "[high_fantasy:describe_door#dag_join_1]",
        "prereq": {
          "pairId": "pair_1",
          "link": "[high_fantasy:describe_unlock#dag_join_1]",
          "after": "[high_fantasy:describe_after_unlock#dag_join_1]"
        },
        "dot": {
          "label": "locked (pair_1)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "64",
      "w": "67",
      "value": {
        "type": "path",
        "edgeId": "e_dag_sj_1",
        "link": "[high_fantasy:button_passage#e_dag_sj_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "66",
      "w": "67",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_2",
        "link": "[high_fantasy:button_passage#e_dag_mb_2]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
