window.addEventListener("load",function(){
  var ozm = {};

  ozm.IframeActions = {
    scrollToElement: function(actionData){
      var target = $("#" + actionData.scrollTargetID);
      var duration = actionData.duration || 0;
      ozm.IframeUtil.scrollBy(target.offset().top - 20,{
        duration: duration
      })
    },
    scrollBy: function(actionData){
      ozm.IframeUtil.scrollBy(actionData.scrollTop,{
        duration: actionData.duration,
      });
    },
  };

  ozm.IframeUtil = {
    postMessage: function(message){
      // FIXME: specify targetOrigin for security
      if(window.opener){
        window.opener.postMessage(JSON.stringify(message),'*');
      }
      else if(parent !== window){
        parent.postMessage(JSON.stringify(message),'*');
      }else{
        console.warn("no parent window or found on send message",message);
      }
    },
    scrollBy: function(offset,options){
      $('body,html').animate({
        scrollTop: offset,
      },options)
    },
    rgbToHex: function(rgb){
      if(!rgb){
        return '#FFFFFF'
      }
      var hex_rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      var hex = function(x){return ("0" + parseInt(x).toString(16)).slice(-2) }
      if(hex_rgb){
        return "#" + hex(hex_rgb[1]) + hex(hex_rgb[2]) + hex(hex_rgb[3])
      }
      else{
        return rgb
      }
    },
    allTagsClosed: function(aceValue){
      result = $.html_tag_checker.check(aceValue.join("\n"))
      if(result.status == false)
        console.log("[HtmlTagChecker] " + result.err_str)
      return result.status
    },
    hasStyleList: function(selector,cssObject,aceValue){
      var result = {allCorrect:true};
      var lineStr = aceValue.join("\n");
      var that = this;
      $.each(cssObject,function(key,value){
        var rg = that._makeRg(selector,key,value);
        var keyResult = rg.test(lineStr);
        result[key] = keyResult;
        if(keyResult == false)
          result.allCorrect = false;
      })
      return result;
    },
    hasStyle: function(selector,attrName,value,lines){
      var rg = this._makeRg(selector,attrName,value);
      return rg.test(lines.join("\n"));
    },
    _makeRg: function(selector,attrName,value){
      return new RegExp(selector + "[^{]*{[^}]*" + attrName + '\\s*:\\s*' + value + '[^}]*}');
    },
    loadScript: function(path,callback){
      var script = document.createElement('script');
      script.src = path;
      document.getElementsByTagName('head')[0].appendChild(script);
      script.onload = callback;
    }

  };

  if(window.$){
    init();
  }else{
    ozm.IframeUtil.loadScript("/iframes/common/jquery-1.11.2.min.js",function(){
      init()
    })
  }

  function init(){
    var $head = $("head");
    window.addEventListener("message", receiveMessage, false);
    function receiveMessage(event){
      var data = JSON.parse(event.data);
      if(!data.funcName){
        console.error("no funcName provided in postMessage!");
        return
      }
      if(data.actionData){
        $("body").trigger(data.actionData.actionName,data.actionData)
      }
      handler[data.funcName](data,event);
    };

    $(window).bind("beforeunload", function(event){
      ozm.IframeUtil.postMessage({
        eventName: "iframeUnloading"
      });
      return;
    })

    var handler = {
      loadTestScript: function(data){
        eval(data.testCode);
        if(!ozm.testData){
          console.error("test data script loaded but fail to load object");
          return;
        }
      },

      sendMessage: function(data){
        return;
      },

      manipulateIframe: function(data){
        if(!data.actionData){
          console.error("no actionData provided");
          return;
        }
        ozm.IframeActions[data.actionData.actionName](data.actionData);
      },

      getIframeData: function(data){
        ozm.IframeUtil.postMessage({
          eventName: "iframeDataArrived",
          scrollTop: $(window).scrollTop,
        });
      },

      appendData: function(data){
        var mode = data.mode;
        var doc = data.doc;
        var $targetTag;
        if(mode == "css"){
          $targetTag = $("<style/>");
          $head.append($targetTag);
        }
        else if(mode == "javascript"){
          $targetTag = $("<script/>")
          $targetTag.attr({type:"text/javascript"})
          $head.append($targetTag)
        }
        else if(mode == "html"){
          $targetTag = $("body")
        }
        else{
          console.error("invalid data mode :" + mode);
        }
        $targetTag.append(doc);
        ozm.IframeUtil.postMessage({
          eventName: "docAppendedToIframe",
          mode: mode,
        })
      },

      executeTest: function(data,event){
        var executeActionLabel;
        $.each(ozm.testData,function(actionLabel,testFn){
          if(executeActionLabel)
            return;
          try {
            if(testFn($,data.aceValueList) == true){
              executeActionLabel = actionLabel;
            }
          }catch(e){
            console.error("[Iframe] test raised error: ",e)
            return;
          }
        });
        ozm.IframeUtil.postMessage({
          eventName: "testActionChosen",
          executeActionLabel: executeActionLabel,
        });
      }
    }
    // console.log("iframe initialization finished!!");
    if($.html_tag_checker){
      ozm.IframeUtil.postMessage({
        eventName: "iframeInitComplete",
      });
    }else{
      ozm.IframeUtil.loadScript("/iframes/common/HtmlTagChecker.js",function(){
        ozm.IframeUtil.postMessage({
          eventName: "iframeInitComplete",
        });
      })
    }
  }

  window.ozm = {
    execCustomAction: function(refName){
      ozm.IframeUtil.postMessage({
        eventName: "executeCustomAction",
        refName: refName
      })
    }
  };
})

