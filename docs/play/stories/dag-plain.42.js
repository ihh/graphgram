window.GRAPH = {
  "options": {
    "directed": true,
    "multigraph": false,
    "compound": false
  },
  "nodes": [
    {
      "v": "49",
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
      "v": "51",
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
      "v": "52",
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
      "v": "53",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_1",
        "text": "[gothic_horror:describe_room#dag_fork1_1]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "54",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_5",
        "text": "[gothic_horror:describe_room#dag_fork1_5]",
        "dot": {
          "label": "room"
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
      "v": "57",
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
      "v": "58",
      "value": {
        "type": "room",
        "nodeId": "dag_fork1_2",
        "text": "[gothic_horror:describe_room#dag_fork1_2]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "59",
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
      "v": "60",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_1",
        "text": "[gothic_horror:describe_room#dag_fork2_1]",
        "dot": {
          "label": "room"
        }
      }
    },
    {
      "v": "61",
      "value": {
        "type": "room",
        "nodeId": "dag_fork2_2",
        "text": "[gothic_horror:describe_room#dag_fork2_2]",
        "dot": {
          "label": "room"
        }
      }
    }
  ],
  "edges": [
    {
      "v": "49",
      "w": "51",
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
      "v": "52",
      "w": "49",
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
      "v": "52",
      "w": "53",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_1",
        "link": "[gothic_horror:button_passage#e_dag_a1_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "54",
      "w": "51",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_5",
        "link": "[gothic_horror:button_passage#e_dag_1b_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "52",
      "w": "54",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_5",
        "link": "[gothic_horror:button_passage#e_dag_a1_5]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "53",
      "w": "57",
      "value": {
        "type": "path",
        "edgeId": "e_dag_1b_1",
        "link": "[gothic_horror:button_passage#e_dag_1b_1]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "56",
      "w": "57",
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
      "v": "58",
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
      "v": "59",
      "w": "57",
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
      "v": "58",
      "w": "59",
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
      "v": "60",
      "w": "58",
      "value": {
        "type": "path",
        "edgeId": "e_dag_a1_2",
        "link": "[gothic_horror:button_passage#e_dag_a1_2]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "51",
      "w": "60",
      "value": {
        "type": "path",
        "edgeId": "e_dag_mb_3",
        "link": "[gothic_horror:button_passage#e_dag_mb_3]",
        "dot": {
          "label": "path"
        }
      }
    },
    {
      "v": "61",
      "w": "57",
      "value": {
        "type": "path",
        "edgeId": "e_dag_2b_2",
        "link": "[gothic_horror:button_passage#e_dag_2b_2]",
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
        "edgeId": "e_dag_a2_2",
        "link": "[gothic_horror:button_passage#e_dag_a2_2]",
        "dot": {
          "label": "path"
        }
      }
    }
  ]
};
