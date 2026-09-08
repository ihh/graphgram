window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "31",
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
      "v": "35",
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
      "v": "36",
      "value": {
        "type": "room",
        "nodeId": "dag_room_1",
        "text": "[dark_fairy_tale:describe_room#dag_room_1]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "38",
      "value": {
        "type": "room",
        "nodeId": "approach_3",
        "text": "[dark_fairy_tale:describe_room#approach_3]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "40",
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
      "v": "41",
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
      "v": "42",
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
      "v": "43",
      "value": {
        "type": "room",
        "nodeId": "approach_1",
        "text": "[dark_fairy_tale:describe_room#approach_1]",
        "dot": {
          "label": "room"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "31",
      "w": "36",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_1",
        "link": "[dark_fairy_tale:button_passage#e_dag_am_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "36",
      "w": "38",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_1",
        "link": "[dark_fairy_tale:button_passage#e_dag_mb_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "38",
      "w": "40",
      "value": {
        "type": "path",
        "edgeId": "e_dag_am_3",
        "link": "[dark_fairy_tale:button_passage#e_dag_am_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "40",
      "w": "41",
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
      "v": "35",
      "w": "42",
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
      "v": "43",
      "w": "31",
      "value": {
        "type": "path",
        "edgeId": "e_approach_am_2",
        "link": "[dark_fairy_tale:button_passage#approach_2]",
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
        "edgeId": "e_dag_mb_2",
        "link": "[dark_fairy_tale:button_passage#e_dag_mb_2]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
