window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "33",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_2",
        "text": "[dark_fairy_tale:describe_room#dag_fork1_2]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "41",
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
      "v": "44",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_2",
        "text": "[dark_fairy_tale:describe_room#dag_fork2_2]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "46",
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
      "v": "49",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_1",
        "text": "[dark_fairy_tale:describe_room#dag_fork1_1]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "51",
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
      "v": "52",
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
      "v": "53",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_1",
        "text": "[dark_fairy_tale:describe_room#dag_fork2_1]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "54",
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
      "v": "55",
      "value": {
        "type": "start",
        "nodeId": "start",
        "text": "[dark_fairy_tale:theme_intro#start]",
        "dot": {
          "label": "start"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "44",
      "w": "46",
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
      "v": "41",
      "w": "49",
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
      "v": "44",
      "w": "51",
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
      "v": "51",
      "w": "52",
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
      "v": "33",
      "w": "53",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_2",
        "link": "[dark_fairy_tale:button_passage#e_dag_1b_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "46",
      "w": "53",
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
      "v": "52",
      "w": "53",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_3",
        "link": "[dark_fairy_tale:button_passage#e_dag_1b_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "49",
      "w": "54",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_1",
        "link": "[dark_fairy_tale:button_passage#e_dag_1b_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "53",
      "w": "54",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_1",
        "link": "[dark_fairy_tale:button_passage#e_dag_2b_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "55",
      "w": "33",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_2",
        "link": "[dark_fairy_tale:button_passage#e_dag_a1_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "55",
      "w": "41",
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
      "v": "55",
      "w": "44",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a2_2",
        "link": "[dark_fairy_tale:button_passage#e_dag_a2_2]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
