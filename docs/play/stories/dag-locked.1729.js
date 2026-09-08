window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "15",
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
      "v": "29",
      "value": {
        "type": "loss",
        "nodeId": "dag_loss_4",
        "text": "[high_fantasy:describe_loss#dag_loss_4]",
        "dot": {
          "label": "loss",
          "shape": "octagon",
          "color": "red"
        }
      }
    },
    {
      "v": "70",
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
      "v": "78",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_3",
        "text": "[high_fantasy:describe_room#dag_fork1_3]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "79",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_2",
        "text": "[high_fantasy:describe_room#dag_fork2_2]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "81",
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
      "v": "83",
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
    },
    {
      "v": "85",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_8",
        "text": "[high_fantasy:describe_room#dag_fork1_8]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "86",
      "value": {
        "type": "room",
        "nodeId": "approach_2",
        "text": "[high_fantasy:describe_room#approach_2]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "87",
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
      "v": "88",
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
      "v": "89",
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
      "v": "91",
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
      "v": "93",
      "value": {
        "type": "room",
        "nodeId": "approach_1",
        "text": "[high_fantasy:describe_room#approach_1]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "95",
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
      "v": "96",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_8",
        "text": "[high_fantasy:describe_room#dag_fork2_8]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "97",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_2",
        "text": "[high_fantasy:describe_room#dag_fork1_2]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "98",
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
      "v": "99",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_3",
        "text": "[high_fantasy:describe_room#dag_fork2_3]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "100",
      "value": {
        "type": "room",
        "nodeId": "dag_skip_4",
        "text": "[high_fantasy:describe_room#dag_skip_4]",
        "dot": {
          "label": "room",
          "shape": "box"
        }
      }
    },
    {
      "v": "102",
      "value": {
        "type": "key",
        "pairId": "pair_4",
        "nodeId": "dag_key_4",
        "text": "[high_fantasy:describe_key#dag_key_4]",
        "dot": {
          "label": "key (pair_4)",
          "shape": "diamond"
        }
      }
    },
    {
      "v": "103",
      "value": {
        "type": "door",
        "pairId": "pair_4",
        "nodeId": "dag_join_4",
        "text": "[high_fantasy:describe_door#dag_join_4]",
        "dot": {
          "label": "door (pair_4)",
          "shape": "house"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "81",
      "w": "78",
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
      "v": "83",
      "w": "15",
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
      "v": "70",
      "w": "83",
      "value": {
        "type": "path",
        "edgeId": "e_dag_kj_1",
        "link": "[high_fantasy:button_passage#e_dag_kj_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "83",
      "w": "86",
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
      "v": "86",
      "w": "87",
      "value": {
        "type": "path",
        "edgeId": "e_approach_mw_2",
        "link": "[high_fantasy:button_passage#e_approach_mw_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "89",
      "w": "83",
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
      "v": "88",
      "w": "89",
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
      "v": "91",
      "w": "81",
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
      "v": "93",
      "w": "88",
      "value": {
        "type": "path",
        "edgeId": "e_dag_as_1",
        "link": "[high_fantasy:button_passage#e_dag_as_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "79",
      "w": "93",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_2",
        "link": "[high_fantasy:button_passage#e_dag_2b_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "95",
      "w": "83",
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
      "v": "88",
      "w": "95",
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
      "v": "97",
      "w": "93",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_2",
        "link": "[high_fantasy:button_passage#e_dag_1b_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "78",
      "w": "97",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_3",
        "link": "[high_fantasy:button_passage#e_dag_1b_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "85",
      "w": "97",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_8",
        "link": "[high_fantasy:button_passage#e_dag_1b_8]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "96",
      "w": "97",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_8",
        "link": "[high_fantasy:button_passage#e_dag_2b_8]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "98",
      "w": "79",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_2",
        "link": "[high_fantasy:button_passage#e_dag_a2_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "98",
      "w": "91",
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
      "v": "99",
      "w": "85",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_8",
        "link": "[high_fantasy:button_passage#e_dag_a1_8]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "99",
      "w": "96",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_8",
        "link": "[high_fantasy:button_passage#e_dag_a2_8]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "98",
      "w": "99",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_3",
        "link": "[high_fantasy:button_passage#e_dag_a2_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "93",
      "w": "100",
      "value": {
        "type": "path",
        "edgeId": "e_dag_as_4",
        "link": "[high_fantasy:button_passage#e_dag_as_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "93",
      "w": "102",
      "value": {
        "type": "path",
        "edgeId": "e_dag_ak_4",
        "link": "[high_fantasy:button_passage#e_dag_ak_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "103",
      "w": "29",
      "value": {
        "type": "consolation",
        "edgeId": "e_dag_jf_4",
        "link": "[high_fantasy:button_retreat#e_dag_jf_4]",
        "dot": {
          "label": "consolation",
          "style": "dashed",
          "color": "firebrick"
        }
      }
    },
    {
      "v": "103",
      "w": "70",
      "value": {
        "type": "path",
        "edgeId": "e_dag_jb_4",
        "link": "[high_fantasy:describe_unlock#dag_join_4]",
        "closedText": "[high_fantasy:describe_door#dag_join_4]",
        "prereq": {
          "pairId": "pair_4",
          "link": "[high_fantasy:describe_unlock#dag_join_4]",
          "after": "[high_fantasy:describe_after_unlock#dag_join_4]"
        },
        "dot": {
          "label": "locked (pair_4)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "100",
      "w": "103",
      "value": {
        "type": "path",
        "edgeId": "e_dag_sj_4",
        "link": "[high_fantasy:button_passage#e_dag_sj_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "102",
      "w": "103",
      "value": {
        "type": "path",
        "edgeId": "e_dag_kj_4",
        "link": "[high_fantasy:button_passage#e_dag_kj_4]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
