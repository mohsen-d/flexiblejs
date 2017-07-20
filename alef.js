var setting = {
          "breakpoints": [990, 840, 560],
          "columns": {"990": ["840px", "555px", "285px"], "840": ["560px", "560px"], "560": ["100%", "100%"]},
          "menu": {"items":
                      [
                        {"selector": "#head_div4", "type": "links", "title": "منوی اصلی"}, 
                        {"selector": "#stcmenu10", "type": "links", "title": "لینک های کمکی"},
                        {"selector": "#footDiv2", "type": "content"}
                      ]},
          "items": [
            {"selector": "#header", "priority": {"990" : 0}, "column": "header", "widths": {"990": "100%"}, "replaceContentWith": '<a href="http://alef.ir/" class="headlglnk" target="_blank"><img src="logo.jpg" /></a>'},
            {"selector": "#mainDiv1", "priority": {"990": 1}, "column": {"990": 1}, "widths": {"990": "100%"}},
            {"selector": "#snbox2", "priority": {"990": 2}, "column": {"990": 1}, "widths": {"990": "100%"}},
            {"selector": "#mainBoth-1", "priority": {"990": 3, "840": 4, "560": 6}, "column": {"990": 1}, "widths": {"990": "35%", "840": "40%", "560": "100%"}},
            {"selector": "#mainBoth-2", "priority": {"990": 3, "840": 4, "560": 5}, "column": {"990": 1}, "widths": {"990": "65%", "840": "60%", "560": "100%"}},
            {"selector": "#mainDiv6A", "priority": {"990": 1, "840": 3}, "column": {"990": 2, "840": 1}, "widths": {"990": "100%", "840": "50%", "560": "100%"}},
            {"selector": "#cartoon1", "priority": {"990": 2, "840": 3, "560": 4}, "column": {"990": 2, "840": 1}, "widths": {"990": "100%", "840": "50%", "560": "100%"}},
            {"selector": "#mainDiv8Main", "priority": {"990": 3, "840": ">#mainBoth-1", "560": 7}, "column": {"990": 2, "840": 1}, "widths": {"990": "100%", "840": "100%", "560": "100%"}}
            ]
      };
          
flexible(setting);