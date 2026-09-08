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
        "text": "[gothic_horror:describe_loss#dag_loss_1]",
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
        "text": "[gothic_horror:describe_loss#dag_loss_2]",
        "dot": {
          "label": "loss",
          "shape": "octagon",
          "color": "red"
        }
      }
    },
    {
      "v": "46",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_4",
        "text": "[gothic_horror:describe_room#dag_fork2_4]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "52",
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
      "v": "56",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_4",
        "text": "[gothic_horror:describe_room#dag_fork1_4]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "59",
      "value": {
        "type": "room",
        "nodeId": "dag_room_7",
        "text": "[gothic_horror:describe_room#dag_room_7]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "60",
      "value": {
        "type": "room",
        "nodeId": "dag_skip_1",
        "text": "[gothic_horror:describe_room#dag_skip_1]",
        "dot": {
          "label": "room",
          "shape": "box"
        }
      }
    },
    {
      "v": "61",
      "value": {
        "type": "key",
        "pairId": "pair_2",
        "nodeId": "dag_key_2",
        "text": "[gothic_horror:describe_key#dag_key_2]",
        "dot": {
          "label": "key (pair_2)",
          "shape": "diamond"
        }
      }
    },
    {
      "v": "62",
      "value": {
        "type": "room",
        "nodeId": "dag_room_3",
        "text": "[gothic_horror:describe_room#dag_room_3]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "63",
      "value": {
        "type": "room",
        "nodeId": "dag_room_6",
        "text": "[gothic_horror:describe_room#dag_room_6]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "65",
      "value": {
        "type": "door",
        "pairId": "pair_1",
        "nodeId": "dag_join_1",
        "text": "[gothic_horror:describe_door#dag_join_1]",
        "dot": {
          "label": "door (pair_1)",
          "shape": "house"
        }
      }
    },
    {
      "v": "66",
      "value": {
        "type": "room",
        "nodeId": "dag_skip_2",
        "text": "[gothic_horror:describe_room#dag_skip_2]",
        "dot": {
          "label": "room",
          "shape": "box"
        }
      }
    },
    {
      "v": "67",
      "value": {
        "type": "door",
        "pairId": "pair_2",
        "nodeId": "dag_join_2",
        "text": "[gothic_horror:describe_door#dag_join_2]",
        "dot": {
          "label": "door (pair_2)",
          "shape": "house"
        }
      }
    },
    {
      "v": "69",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_5",
        "text": "[gothic_horror:describe_room#dag_fork2_5]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "71",
      "value": {
        "type": "key",
        "pairId": "pair_1",
        "nodeId": "dag_key_1",
        "text": "[gothic_horror:describe_key#dag_key_1]",
        "dot": {
          "label": "key (pair_1)",
          "shape": "diamond"
        }
      }
    },
    {
      "v": "72",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[gothic_horror:theme_intro#start]",
        "dot": {
          "label": "start"
        }
      }
    },
    {
      "v": "73",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_5",
        "text": "[gothic_horror:describe_room#dag_fork1_5]",
        "dot": {
          "label": "room"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "59",
      "w": "60",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_7",
        "link": "[gothic_horror:button_passage#e_dag_mb_7]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "61",
      "w": "46",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_4",
        "link": "[gothic_horror:button_passage#e_dag_a2_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "61",
      "w": "56",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_4",
        "link": "[gothic_horror:button_passage#e_dag_a1_4]",
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
        "edgeId": "e_dag_ak_2",
        "link": "[gothic_horror:button_passage#e_dag_ak_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "62",
      "w": "59",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_7",
        "link": "[gothic_horror:button_passage#e_dag_am_7]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "63",
      "w": "62",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_6",
        "link": "[gothic_horror:button_passage#e_dag_mb_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "65",
      "w": "9",
      "value": {
        "type": "consolation",
        "edgeId": "e_dag_jf_1",
        "link": "[gothic_horror:button_retreat#e_dag_jf_1]",
        "dot": {
          "label": "consolation",
          "style": "dashed",
          "color": "firebrick"
        }
      }
    },
    {
      "v": "65",
      "w": "52",
      "value": {
        "type": "path",
        "edgeId": "e_dag_jb_1",
        "link": "[gothic_horror:describe_unlock#dag_join_1]",
        "closedText": "[gothic_horror:describe_door#dag_join_1]",
        "prereq": {
          "pairId": "pair_1",
          "link": "[gothic_horror:describe_unlock#dag_join_1]",
          "after": "[gothic_horror:describe_after_unlock#dag_join_1]"
        },
        "dot": {
          "label": "locked (pair_1)",
          "style": "bold",
          "color": "red"
        }
      }
    },
    {
      "v": "60",
      "w": "66",
      "value": {
        "type": "path",
        "edgeId": "e_dag_as_2",
        "link": "[gothic_horror:button_passage#e_dag_as_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "67",
      "w": "15",
      "value": {
        "type": "consolation",
        "edgeId": "e_dag_jf_2",
        "link": "[gothic_horror:button_retreat#e_dag_jf_2]",
        "dot": {
          "label": "consolation",
          "style": "dashed",
          "color": "firebrick"
        }
      }
    },
    {
      "v": "67",
      "w": "65",
      "value": {
        "type": "path",
        "edgeId": "e_dag_jb_2",
        "link": "[gothic_horror:describe_unlock#dag_join_2]",
        "closedText": "[gothic_horror:describe_door#dag_join_2]",
        "prereq": {
          "pairId": "pair_2",
          "link": "[gothic_horror:describe_unlock#dag_join_2]",
          "after": "[gothic_horror:describe_after_unlock#dag_join_2]"
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
      "w": "67",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_4",
        "link": "[gothic_horror:button_passage#e_dag_2b_4]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "56",
      "w": "67",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_4",
        "link": "[gothic_horror:button_passage#e_dag_1b_4]",
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
        "edgeId": "e_dag_sj_2",
        "link": "[gothic_horror:button_passage#e_dag_sj_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "69",
      "w": "62",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_5",
        "link": "[gothic_horror:button_passage#e_dag_2b_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "71",
      "w": "65",
      "value": {
        "type": "path",
        "edgeId": "e_dag_kj_1",
        "link": "[gothic_horror:button_passage#e_dag_kj_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "72",
      "w": "69",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_5",
        "link": "[gothic_horror:button_passage#e_dag_a2_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "72",
      "w": "71",
      "value": {
        "type": "path",
        "edgeId": "e_dag_ak_1",
        "link": "[gothic_horror:button_passage#e_dag_ak_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "73",
      "w": "63",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_6",
        "link": "[gothic_horror:button_passage#e_dag_am_6]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "72",
      "w": "73",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_5",
        "link": "[gothic_horror:button_passage#e_dag_a1_5]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
