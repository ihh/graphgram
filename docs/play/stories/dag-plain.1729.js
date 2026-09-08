window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "30",
      "value": {
        "type": "room",
        "nodeId": "dag_room_1",
        "text": "[high_fantasy:describe_room#dag_room_1]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "34",
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
      "v": "38",
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
      "v": "39",
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
      "v": "40",
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
      "v": "41",
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
      "v": "42",
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
      "v": "43",
      "value": {
        "type": "room",
        "nodeId": "dag_room_4",
        "text": "[high_fantasy:describe_room#dag_room_4]",
        "dot": {
          "label": "room"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "30",
      "w": "34",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_5",
        "link": "[high_fantasy:button_passage#e_dag_am_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "39",
      "w": "38",
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
      "v": "39",
      "w": "40",
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
      "v": "34",
      "w": "41",
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
      "v": "38",
      "w": "42",
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
      "v": "40",
      "w": "42",
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
      "v": "43",
      "w": "30",
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
      "v": "42",
      "w": "43",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_4",
        "link": "[high_fantasy:button_passage#e_dag_am_4]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
