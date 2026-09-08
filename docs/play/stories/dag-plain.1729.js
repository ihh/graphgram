window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "25",
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
      "v": "36",
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
      "v": "40",
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
      "v": "43",
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
      "v": "45",
      "value": {
        "type": "room",
        "nodeId": "approach_3",
        "text": "[high_fantasy:describe_room#approach_3]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "46",
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
      "v": "47",
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
      "v": "48",
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
      "v": "49",
      "value": {
        "type": "room",
        "nodeId": "dag_room_1",
        "text": "[high_fantasy:describe_room#dag_room_1]",
        "dot": {
          "label": "room"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "36",
      "w": "25",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_2",
        "link": "[high_fantasy:button_passage#e_dag_mb_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "43",
      "w": "40",
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
      "v": "45",
      "w": "36",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_2",
        "link": "[high_fantasy:button_passage#e_dag_am_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "46",
      "w": "43",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_3",
        "link": "[high_fantasy:button_passage#e_dag_a1_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "47",
      "w": "40",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_3",
        "link": "[high_fantasy:button_passage#e_dag_2b_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "46",
      "w": "47",
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
      "v": "40",
      "w": "48",
      "value": {
        "type": "path",
        "edgeId": "e_approach_am_2",
        "link": "[high_fantasy:button_passage#approach_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "49",
      "w": "45",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_1",
        "link": "[high_fantasy:button_passage#e_dag_mb_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "48",
      "w": "49",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_1",
        "link": "[high_fantasy:button_passage#e_dag_am_1]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
