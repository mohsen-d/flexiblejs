/**
 * flexible.js v 1.0.0
 *
 * a javascript library to convert a none-responsive website into a responsive one
 *
 * Copyright 2017, Mohsen Dorparasti <dorparasti@gmail.com>
 * http://dorparasti.ir
 *
 *
 * Released under the MIT Licence
 * http://opensource.org/licenses/MIT
 *
 * Github: https://github.com/mohsen-d/flexiblejs
 */
window.flexible = (function(){
    'use strict';

    // user defined setting
    var _setting;

    // flexible-state main container
    var flexContainer;

    // is flexible-state applied to the page?
    var _isFlexibleStateApplied = false;

    // are initial tasks(creating menu, saving page original content, extracting elements and so on) done?
    var _areInitialTasksDone = false;

    // does the page has a viewport meta-data of its own?
    var _hasViewPortMeta = false;

    var _pageOriginalContent;

    var _pageFlexibleMenuContent;

    // an object in which we keep elements that are supposed to be displayed on the same row of the page in the flexible-state
    var _pageFlexiblePriorities = {};

    // a list of elements which their content or style has changed in the flexible-state
    var _manipulatedElements = [];

    // a reference to the viewport meta tag
    var _pageViewportMeta;

    // currnetly in use breakpoint
    var _currentBreakpoint;

    // max breakpoint width set in the setting
    var _maxBreakpoint;

    var _itemsToAppend = [];


    function flexible(setting) {

        // if the current width of the window is greater than the max breakpoint defined in the flexible.js
        if(window.innerWidth > _maxBreakpoint)
        {
            // if the page is already manipulated by the flexible.js
            // then we should reset the page to its original state
            if(_isFlexibleStateApplied){
                switchToOriginalState();
            }

            // else do nothing (and wait for a resize)
            return;
        }

        // if we reach here it means that window's current width is small enough to run flexible.js

        // there are some tasks that should be done only once with the first run of flexible.js
        if(!_areInitialTasksDone){

            // save the original content of the page
            _pageOriginalContent = document.body.innerHTML;

            // create flexible-state main container
            flexContainer = document.createElement("div");
            flexContainer.id = "flexContainer";
            flexContainer.style = "position: relative; left: 0; top: 0";

            // if a menu is defined then create it and save it for later use
            if(setting.menu){
                createMenu(setting.menu);
            }

            // extract and save elements which are defined to be displayed in the flexible-state
            extractElements(setting.items);

            // check if the page has a viewPort meta tag and create one if it does not
            getViewPortMeta();

            // tasks are done
            _areInitialTasksDone = true;
        }

        // set elements' widths based on the page's current width
        setWidths(setting.items);

        // sort flexible-state selected elements (already extracted and saved)
        // based on their priority setting (where to append them to the page from top to bottom)
        SortByPriorities(setting.items);

        // if there is a menu, set its width too
        if(setting.menu){
            setMenuWidth();
        }
        
        // finally switch to flexible-state
        switchToFlexibleState();
    }

    function extractElements(items){

        // for each item in the setting.items
        // we extract all the elements that match the specified selector and other options
        for (var item of items) {

            // select all mathed elements
            var elms = [].slice.call(document.querySelectorAll(item.selector));

            // if only certain elements are required (specified by index)
            //  e.g pick: [0, 2, 5] which means we need first , third and sixth elements of the selector
            // then filter the elements accordingly
            if(item.pick){
                elms = elms.filter(function(e, i){
                    return item.pick.some(p => p === i);
                });
            }

            // if a different content is desired for the elements in the flexible-state
            if(item.replaceContentWith){
                for (var elm of elms) {
                    // first save the original content in another custom attribute
                    elm.originalContent = elm.innerHTML;
                    // and change the content with the opted content;
                    elm.flexibleContent = item.replaceContentWith;
                    // to be able to switch to the original content when necessary
                    // we keep a list of manipulated elements (content and style)
                    addToManipulatedElementsList(elm);
                }
            }

            // save extracted elements associated with the item
            item.elms = [];
            item.guestElms = [];
            for (var elm of elms) {
                var elmFlexibleContainer = document.createElement("div");
                elmFlexibleContainer.style = "display: inline-block; vertical-align: top;";
                elmFlexibleContainer.appendChild(elm);
                item.elms.push(elmFlexibleContainer);
            }

            // do the same for child nodes if there are any
            if(item.childNodes){
                extractElements(item.childNodes);
            }
        }
    }

    function SortByPriorities(items){

        for(var item of items){
            item.guestElms = [];
        }

        for(var item of items){
            var priority = getValueForCurrentBreakpoint(item.priority);

            if(typeof priority !== "number"){
                var hostItems = items.filter(function(e){ return priority.substring(1) === e.selector});
                for(var hostItem of hostItems){
                    for(var elm of item.elms){
                        hostItem.guestElms.push(elm);
                    }
                }
            }
        }

        // each item has a priority (where to append the element to the page from top to bottom)
        // e.g : priority: {1200: 1, 512: 2}
        for(var item of items){
            // get item's priority based on the current width of the page
            var priority = getValueForCurrentBreakpoint(item.priority);

            if(typeof priority !== "number"){
                continue;
            }
           
            var column = item.column === "header" ? "header" : getValueForCurrentBreakpoint(item.column);
            
            var itemsToAdd = getItemElms(item);

            // put item's elements in the associated priority of _pageFlexiblePriorities object
            if(!_pageFlexiblePriorities[column]){
                _pageFlexiblePriorities[column] = {};
            }

            if(!_pageFlexiblePriorities[column][priority]){
                _pageFlexiblePriorities[column][priority] = [];
            }

            for(var elm of itemsToAdd){
                _pageFlexiblePriorities[column][priority].push(elm);
            }
        }

        for(var item of items){
            console.log(item.selector + " : " + item.elms.length + " : " + item.guestElms.length );
            //if(item.elms.length > 1)
                console.log(item.elms);
        }
    }

    function setWidths(items){
        // for each item in the setting.items
        for(var item of items){
            if(item.widths){
                // get its defined width for the current width of the page
                var width = getValueForCurrentBreakpoint(item.widths);
                // then apply the width to all elements of the item
                for(var elm of item.elms){
                    elm.style.width = width;
                }
            }

            // do the same for child items
            if(item.childNodes){
                setWidths(item.childNodes);
            }
        }
    }

    function setMenuWidth(){
        if(_setting.menu.widths){
            var width = getValueForCurrentBreakpoint(_setting.menu.widths);
            _pageFlexibleMenuContent.style.width = width;
        }
    }

    function switchToFlexibleState(){
        
        flexContainer.innerHTML = "";        
        flexContainer.className = "flexible flexible-" + _currentBreakpoint;
        flexContainer.style = "width: " + getFlexibleContainerCurrentWidth() + "; margin: auto";

        if(_pageFlexiblePriorities["header"]){
            addToPage("header");
        }

        // then append selected elements to the main container based on their priority (sorted in SortByPriorities function)
        for(var column in _pageFlexiblePriorities){
            if(column !== "header"){
                addToPage(column);
            }
        }

        // if there is a menu we append it to the main container too
        flexContainer.appendChild(_pageFlexibleMenuContent);

        // set viewport meta
        _pageViewportMeta.content = _pageViewportMeta.flexibleContent;
        if(!_hasViewPortMeta){
            document.head.appendChild(_pageViewportMeta);
        }

        // for each element which its content or style is different in flexible-state
        // we set the defined content and style
        for(var elm of _manipulatedElements){
            if(elm.flexibleContent){
                elm.innerHTML = elm.flexibleContent;
            }
            if(elm.flexibleStyle){
                elm.style = elm.flexibleStyle;
            }
        }

        // then remove all the current contents of the page
        document.body.innerHTML = "";

        // and append the flexible content to the page
        document.body.appendChild(flexContainer);

        // flexible content is applied to the page
        if(!_isFlexibleStateApplied)
            _isFlexibleStateApplied = true;
    }

    function createMenu(menuSetting){

        // create menu main container
        var menuContainer = document.createElement("div");
        menuContainer.id = "flexibleMenu";
        menuContainer.style = "height: 100%; position: fixed; top: 0; left: 100%; background-color: #444; z-index: 1000;";

        // create inner container which goes inside the menu main container
        var innerContainer = document.createElement("div");
        innerContainer.style = "height: 100%; width: 100%; overflow-y: scroll; overflow-x: hidden;"

        // for each item (selector) in the setting.menu
        // that is going to be a section in the menu e.g main links, ads and so on
        for(var item of menuSetting.items){

            // if it has a title , we create a <div> and put the specified title in it.
            if(item.title){
                var menuTitle = document.createElement("div");
                menuTitle.style = "padding:10px; text-align: right; color: #AAA; font-size: 1.2em;";
                menuTitle.innerText = item.title;
                innerContainer.appendChild(menuTitle);
            }

            if(item.type === "content"){
                var sectionContainer = document.createElement("div");
                var sectionElm = document.querySelector(item.selector);
                sectionContainer.innerHTML = sectionElm.innerHTML;
                innerContainer.appendChild(sectionContainer);
            }
            else{
                // get all the links that exist inside the selector
                var linksSelector = item.selector + " a";
                var links = [].slice.call(document.querySelectorAll(linksSelector));

                // then for each found link
                // add them to the links container
                // after changing some of css rules
                for(var link of links){
                    link.originalStyle = link.style;
                    link.style = link.flexibleStyle = "display: block; padding:20px; text-align: right; color: #FFF; width: 100%; float: none;";
                    innerContainer.appendChild(link);
                    addToManipulatedElementsList(link);
                }   
            }

            // add a seperator line between each two menu sections
            var seperator = document.createElement("span");
            seperator.style = "display: block; width: 60%; height: 1px; background-color: #666; margin: 1em auto;";
            innerContainer.appendChild(seperator);
        }

        // add inner container to the menu main container
        menuContainer.appendChild(innerContainer);

        // now we should create display/hide button for the menu
        var menuControlBtn = document.createElement("div");
        menuControlBtn.id ="menuControlBtn";
        menuControlBtn.className = "openFlexibleMenu";
        menuControlBtn.style = "background-color: #444; position: absolute; top: 10px; left: -52px; cursor: pointer; padding: 10px 10px 6px 10px";

        // the common 3 horizental bars that is a link to display the hidden menu
        var menuOpenBtnBar_top = document.createElement("span");
        var menuOpenBtnBar_middle = document.createElement("span");
        var menuOpenBtnBar_bottom = document.createElement("span");
        menuOpenBtnBar_top.style = menuOpenBtnBar_middle.style = menuOpenBtnBar_bottom.style = "background-color: #FFF; display: block; width: 22px; height: 3px; margin: 0 auto 4px auto";

        // append everything to their parent container
        menuControlBtn.appendChild(menuOpenBtnBar_top);
        menuControlBtn.appendChild(menuOpenBtnBar_middle);
        menuControlBtn.appendChild(menuOpenBtnBar_bottom);

        menuContainer.appendChild(menuControlBtn);

        // and save the menu container
        _pageFlexibleMenuContent = menuContainer;
    }

    function getViewPortMeta(){
        // try to get the page's viewport meta tag in the head section
        _pageViewportMeta = document.head.querySelector("meta[name='viewport']");

        // if there is a viewport meta tag
        if(_pageViewportMeta){
            // save its original content
            _pageViewportMeta.originalContent = _pageViewportMeta.content;
            // remember that the page already has a viewport meta tag
            _hasViewPortMeta = true;
        }
        else{
            // create a meta tag
            _pageViewportMeta = document.createElement("meta");
            _pageViewportMeta.name = "viewport";
            // and append it to the page
            document.head.appendChild(_pageViewportMeta);
        }

        _pageViewportMeta.flexibleContent = "width = device-width, initial-scale = 1, maximum-scale = 1, user-scalable = no";
    }

    function valid(setting){
        // if there is no setting or it is an empty object {}
        if(isEmpty(setting) || Object.keys(setting).length === 0)
        {
            console.log("no setting is provided");
            return false;
        }

        // if no item is defined to be used in the flexible-state
        if(!Array.isArray(setting.items) || setting.items.length === 0){
            console.log("define at least one item to display in the flexible-state");
            return false;
        }

        // if there are items then each of them should have :
        for(var item of setting.items){
            // selector : "#elementName"
            if(!item.selector){
                console.log("all items should have a selector e.g 'selector': '#elementId'");
                return false;
            }
            // priority : {1200: 1, 512: 2}
            if(!item.priority){
                console.log("all items should have at least one priority e.g 'priority': {'1200': 1}");
                return false;
            }
            // widths : {1200: 50, 512: 100}
            if(!item.widths){
                console.log("all items should have at least one width e.g 'widths': {'1200': 50}");
                return false;
            }
        }

        //  if a menu is defined then
        if(setting.menu){
            // it should have items
            if(!Array.isArray(setting.menu.items) || setting.menu.items.length === 0){
                console.log("define at least one menu to display in flexible menu");
                return false;
            }
            // and each item should have a selector
            for(var item of setting.menu.items){
                if(!item.selector){
                    console.log("all menu items should have a selector e.g 'selector': '#elementId'");
                    return false;
                }
            }
        }

        return true;
    }

    function setDefaults(setting){

        if(isEmpty(setting.breakpoints)){
            setting.breakpoints = [1200, 991, 768];
        }

        if(setting.menu && !setting.menu.widths){
            setting.menu.widths = {"1200": "40%", "991": "50%", "768": "80%"};
        }

        return setting;
    }

    function manageBreakpoints(){
        _setting.breakpoints.sort(sortAsc);
        _maxBreakpoint = _setting.breakpoints[_setting.breakpoints.length - 1];
        _currentBreakpoint = getCurrentBreakpoint();
    }

    function addToPage(column){
        var columnContainer = document.createElement("div");
        columnContainer.className = "column col-" + column;
        columnContainer.style = column === "header" ? "display: block" : "display: inline-block; vertical-align: top;";
        columnContainer.style.width = _setting.columns[_currentBreakpoint][column];

        for(var row in _pageFlexiblePriorities[column]){
            // we put each level in a seperate <div>
            var rowContainer = document.createElement("div");
            for(var item of _pageFlexiblePriorities[column][row]){
                rowContainer.appendChild(item);
            }

            columnContainer.appendChild(rowContainer);
        }
        flexContainer.appendChild(columnContainer);
    }

    function sortAsc(a, b){
        return parseInt(a) - parseInt(b);
    }

    function sortDesc(a, b){
        return parseInt(b) - parseInt(a);
    }

    function addToManipulatedElementsList(elm){
        if(_manipulatedElements.indexOf(elm) < 0){
            _manipulatedElements.push(elm);
        }
    }

    function switchToOriginalState(){
        // when page resizes to a width bigger than all the breakpoints
        // we should reset elements to their original state (content and style)
        for(var elm of _manipulatedElements){
            if(elm.originalContent){
                elm.innerHTML = elm.originalContent;
            }
            if(elm.originalStyle){
                elm.style = elm.originalStyle;
            }
        }

        // reset viewport meta tag to its original content
        if(_hasViewPortMeta){
            _pageViewportMeta.content = _pageViewportMeta.originalContent;
        }
        // or remove it if original page does not have it
        else{
            document.head.removeChild(_pageViewportMeta);
        }

        // put original content back
        document.body.innerHTML = _pageOriginalContent;
        
        _isFlexibleStateApplied = false;
    }

    function getValueForCurrentBreakpoint(options){
        // get all the breakpoints for which we have defined a width or priority for the element {1200 : x, 991: y}
        var allBreakpoints = Object.keys(options);

        // filter them to the breakpoints which are greater/equal to the window's current width
        var inRangeBreakpoints = allBreakpoints.filter((function(e){return _currentBreakpoint <= parseInt(e);}));

        if(inRangeBreakpoints){
            // and take the smallest one
            inRangeBreakpoints.sort(sortAsc);
            var matchedBreakpoint = inRangeBreakpoints[0];
            // and return the value (priority, width or ...) defined for that breakpoint e.g x or y
            return options[matchedBreakpoint];
        }
    }

    function isEmpty(item){
        return item === undefined || item === null;
    }

    function getCurrentBreakpoint(){
        var inRangeBreakpoints = _setting.breakpoints.filter((function(e){return window.innerWidth <= e;}));

        if(inRangeBreakpoints){
            return inRangeBreakpoints[0];
        }
        else{
            return 0;
        }
    }

    function getFlexibleContainerCurrentWidth(){
        return _setting.columns[_currentBreakpoint][0];
    }

    function getItemElms(item){
        if(item.guestElms.length === 0){
            return item.elms;
        }
        else{
            var elms = [];
            for(var guestElm of item.guestElms){
                for(var hostElm of item.elms){
                    var wrapper = document.createElement("div");
                    wrapper.style = "display: inline-block; vertical-align: top;";
                    wrapper.style.width = hostElm.style.width;
                    hostElm.style.width = "100%";
                    guestElm.style.width = "100%";
                    wrapper.appendChild(hostElm);
                    wrapper.appendChild(guestElm);
                    elms.push(wrapper);
                }
            }
            return elms;
        }
    }

    window.onresize = function(){
        if(_currentBreakpoint !== getCurrentBreakpoint()){
            _currentBreakpoint = getCurrentBreakpoint();
            _pageFlexiblePriorities = {};
            flexible(_setting);
        }
    }

    document.addEventListener('click', function(e){
        var target = e.target;

        while (target && target !== this) {
            if (target.matches(".openFlexibleMenu")) {
                e.stopPropagation();
                var menuWidth = document.getElementById("flexibleMenu").style.width;
                document.getElementById("flexibleMenu").style["left"] = (100 - parseInt(menuWidth)) + "%";
                document.getElementById("flexContainer").style["left"] = -(parseInt(menuWidth)) + "%";
                target.className = "closeFlexibleMenu";
                return;
            }
            else if(target.matches(".closeFlexibleMenu")){
                e.stopPropagation();
                document.getElementById("flexibleMenu").style["left"] = "100%";
                document.getElementById("flexContainer").style["left"] = "0";
                e.target.className = "openFlexibleMenu";
                return;
            }
            target = target.parentNode;
        }


        /* display the menu by changing its style.left rule
        if(e.target && (e.target.className === 'openFlexibleMenu')){
            
            return;
        }
        // hide the menu
        if(e.target && e.target.className === 'closeFlexibleMenu'){
            
        }*/
    });

    function showMenu(){
        alert("df");
    }

    return function(setting){

        if (!valid(setting)) {
            console.log("there are problems with your setting");
            return;
        }

        _setting = setDefaults(setting);

        manageBreakpoints();

        flexible(_setting);
    };

})();
