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
        "text": "[dark_fairy_tale:describe_loss#dag_loss_1]",
        "dot": {
          "label": "loss",
          "shape": "octagon",
          "color": "red"
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
      "v": "51",
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
      "v": "54",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_6",
        "text": "[dark_fairy_tale:describe_room#dag_fork2_6]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "61",
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
      "v": "63",
      "value": {
        "type": "room",
        "nodeId": "approach_1",
        "text": "[dark_fairy_tale:describe_room#approach_1]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "66",
      "value": {
        "type": "room",
        "nodeId": "dag_room_7",
        "text": "[dark_fairy_tale:describe_room#dag_room_7]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "69",
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
      "v": "70",
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
      "v": "71",
      "value": {
        "type": "room",
        "nodeId": "dag_room_3",
        "text": "[dark_fairy_tale:describe_room#dag_room_3]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "74",
      "value": {
        "type": "room",
        "nodeId": "dag_room_8",
        "text": "[dark_fairy_tale:describe_room#dag_room_8]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "75",
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
      "v": "76",
      "value": {
        "type": "room",
        "nodeId": "dag_room_2",
        "text": "[dark_fairy_tale:describe_room#dag_room_2]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "77",
      "value": {
        "type": "room",
        "nodeId": "approach_2",
        "text": "[dark_fairy_tale:describe_room#approach_2]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "78",
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
      "v": "79",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_6",
        "text": "[dark_fairy_tale:describe_room#dag_fork1_6]",
        "dot": {
          "label": "room"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "51",
      "w": "15",
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
      "v": "51",
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
      "v": "61",
      "w": "51",
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
      "v": "54",
      "w": "63",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_6",
        "link": "[dark_fairy_tale:button_passage#e_dag_2b_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "66",
      "w": "51",
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
      "v": "63",
      "w": "69",
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
      "v": "69",
      "w": "70",
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
      "v": "70",
      "w": "71",
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
      "v": "74",
      "w": "61",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_8",
        "link": "[dark_fairy_tale:button_passage#e_dag_mb_8]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "76",
      "w": "66",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_7",
        "link": "[dark_fairy_tale:button_passage#e_dag_am_7]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "75",
      "w": "76",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_2",
        "link": "[dark_fairy_tale:button_passage#e_dag_am_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "77",
      "w": "74",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_8",
        "link": "[dark_fairy_tale:button_passage#e_dag_am_8]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "77",
      "w": "75",
      "value": {
        "type": "path",
        "edgeId": "e_dag_as_1",
        "link": "[dark_fairy_tale:button_passage#e_dag_as_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "71",
      "w": "77",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_3",
        "link": "[dark_fairy_tale:button_passage#e_dag_mb_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "78",
      "w": "54",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_6",
        "link": "[dark_fairy_tale:button_passage#e_dag_a2_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "79",
      "w": "63",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_6",
        "link": "[dark_fairy_tale:button_passage#e_dag_1b_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "78",
      "w": "79",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_6",
        "link": "[dark_fairy_tale:button_passage#e_dag_a1_6]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
