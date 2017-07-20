/**
 * flexible.js v 1.1.0
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


    /**
     * 
     *  variables
     * 
     */


    // user defined setting
    var _setting;

    // flexible-state main container
    var _flexibleContainer;

    // is flexible-state applied to the page?
    var _isFlexibleStateApplied = false;

    // are initial tasks(creating menu, saving page original content, extracting elements and so on) done?
    var _areInitialTasksDone = false;

    // flag to know if viewport meta tag is set or not
    var _isViewPortMetaSet = false;

    // a reference to the viewport meta tag
    var _pageViewportMeta;

    // an object in which we keep elements supposed to be displayed on the same row of the page in the flexible-state
    var _pageFlexiblePriorities = {};

    // a list of elements which their content or style has been changed in the flexible-state
    var _manipulatedElements = [];

    // currnetly in use breakpoint
    var _currentBreakpoint;

    // max breakpoint width set in the setting
    var _maxBreakpoint;

    var _pageOriginalContent;

    var _pageFlexibleMenuContent;


    /**
     * 
     *  functions
     * 
     */

    function flexible(setting) {

        // if the current width of the window is greater than the max breakpoint defined in the flexible.js
        if(document.documentElement.clientWidth > _maxBreakpoint){

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
            _flexibleContainer = document.createElement("div");
            _flexibleContainer.id = "_flexibleContainer";
            _flexibleContainer.style.cssText = "position: relative; left: 0; top: 0";

            // if a menu is defined then create it and save it for later use
            if(setting.menu){
                createMenu(setting.menu);
            }

            // extract and save elements which are defined to be displayed in the flexible-state
            extractElements(setting.items);

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
        for (var i = 0; i <= items.length - 1; i++) {

            var item = items[i];

            // select all mathed elements
            var elms = [].slice.call(document.querySelectorAll(item.selector));
            
            // if only certain elements are required (specified by index)
            //  e.g pick: [0, 2, 5] which means we need first , third and sixth elements of the selector
            // then filter the elements accordingly
            if(item.pick){
                elms = elms.filter(function(e, i){
                    return item.pick.some(function(p){ return p === i});
                });
            }

            // if a different content is desired for the elements in the flexible-state
            if(item.replaceContentWith){

                for (var j = 0; j <= elms.length - 1; j++) {

                    var elm = elms[j];

                    // first save the original content in another custom attribute
                    elm.originalContent = elm.innerHTML;

                    // and change the content with the opted content;
                    elm.flexibleContent = item.replaceContentWith;

                    // to be able to switch back to the original content when necessary
                    // we keep a list of manipulated elements (content and style)
                    addToManipulatedElementsList(elm);

                }

            }

            // save extracted elements associated with the item
            item.elms = [];

            for (var j = 0; j <= elms.length - 1; j++) {

                var elm = elms[j];

                // wrap each element in a div
                var elmFlexibleContainer = document.createElement("div");
                elmFlexibleContainer.style.cssText = "display: inline-block; vertical-align: top;";
                elmFlexibleContainer.appendChild(elm);

                item.elms.push(elmFlexibleContainer);

            }

            // a list of elements owned by other items that need to be appended to this item on certain widths
            // e.g #foo{priority: [1024: 7, 860: ">#bar"]}
            // which means append #foo elements to the #bar elements when screen width is 860px
            item.guestElms = [];

            // do the same for child nodes if there are any
            if(item.childNodes){
                extractElements(item.childNodes);
            }
        }
        
    }    

    function createMenu(menuSetting){
        
        // create menu main container
        var menuContainer = document.createElement("div");
        menuContainer.id = "flexibleMenu";
        menuContainer.style.cssText = "height: 100%; position: fixed; top: 0; left: 100%; background-color: #444; z-index: 1000;";

        // create inner container which goes inside the menu main container
        var innerContainer = document.createElement("div");
        innerContainer.style.cssText = "height: 100%; width: 100%; overflow-y: scroll; overflow-x: hidden;";

        // for each item (selector) in the setting.menu
        // that is going to be a section in the menu e.g main links, ads and so on
        for(var i = 0; i <= menuSetting.items.length - 1; i++){

            var item = menuSetting.items[i];

            // if it has a title , we create a <div> and put the specified title in it.
            if(item.title){
                var menuTitle = document.createElement("div");
                menuTitle.style.cssText = "padding:10px; text-align: right; color: #AAA; font-size: 1.2em;";
                menuTitle.innerText = item.title;
                innerContainer.appendChild(menuTitle);
            }

            // if it's a content type (means it's not a set of links) like login or search sections
            if(item.type === "content"){

                var sectionContainer = document.createElement("div");
                var sectionElm = document.querySelector(item.selector);
                sectionContainer.innerHTML = sectionElm.innerHTML;
                innerContainer.appendChild(sectionContainer);

            }
            else{

                // get all the <a> that exist inside the selector
                var linksSelector = item.selector + " a";
                var links = [].slice.call(document.querySelectorAll(linksSelector));

                // then for each found link
                // add them to the links container
                // after changing some of css rules
                for(var j = 0; j <= links.length - 1; j++){

                    var link = links[j];

                    link.originalStyle = link.style;
                    link.style.cssText = link.flexibleStyle = "display: block; padding:20px; text-align: right; color: #FFF; width: 100%; float: none;";
                    innerContainer.appendChild(link);
                    addToManipulatedElementsList(link);

                }   

            }

            // add a seperator line between each two menu sections
            var seperator = document.createElement("span");
            seperator.style.cssText = "display: block; width: 60%; height: 1px; background-color: #666; margin: 1em auto;";
            innerContainer.appendChild(seperator);

        }

        // add inner container to the menu main container
        menuContainer.appendChild(innerContainer);


        // now we should create display/hide button for the menu
        var menuToggleBtn = document.createElement("div");
        menuToggleBtn.id ="menuToggleBtn";
        menuToggleBtn.className = "openFlexibleMenu";
        menuToggleBtn.style.cssText = "background-color: #444; position: absolute; top: 10px; left: -52px; cursor: pointer; padding: 10px 10px 6px 10px";

        // the common 3 horizental bars that is a link to display the hidden menu
        var menuOpenBtnBar_top = document.createElement("span");
        var menuOpenBtnBar_middle = document.createElement("span");
        var menuOpenBtnBar_bottom = document.createElement("span");
        menuOpenBtnBar_top.style.cssText = menuOpenBtnBar_middle.style.cssText = menuOpenBtnBar_bottom.style.cssText = "background-color: #FFF; display: block; width: 22px; height: 3px; margin: 0 auto 4px auto";

        // append everything to their parent container
        menuToggleBtn.appendChild(menuOpenBtnBar_top);
        menuToggleBtn.appendChild(menuOpenBtnBar_middle);
        menuToggleBtn.appendChild(menuOpenBtnBar_bottom);

        menuContainer.appendChild(menuToggleBtn);

        // and save the menu container
        _pageFlexibleMenuContent = menuContainer;
        
    }

    function SortByPriorities(items){

        // first of all empty guestElms list related to previous breakpoint
        for(var i = 0; i <= items.length - 1; i++){
            items[i].guestElms = [];
        }

        // then find items with guest elements in the current breakpoint
        // and add their elements to the host items.
        for(var i = 0; i <= items.length - 1; i++){

            var item = items[i];

            var priority = getValueForCurrentBreakpoint(item.priority);

            // if priority is ">#selector"
            if(typeof priority !== "number"){

                var hostItems = items.filter(function(e){ return priority.substring(1) === e.selector;});

                for(var j = 0; j <= hostItems.length - 1; j++){

                    var hostItem = hostItems[j];

                    for(var z = 0; z <= item.elms.length - 1; z++){
                        var elm = item.elms[z];
                        hostItem.guestElms.push(elm);
                    }

                }

            }
        }

        // finally, each item has a priority (where to append the element to the page from top to bottom)
        // e.g : priority: {1200: 1, 512: 2}
        for(var i = 0; i <= items.length - 1; i++){
            var item = items[i];

            // get item's priority based on the current breakpoint
            var priority = getValueForCurrentBreakpoint(item.priority);

            if(typeof priority !== "number"){
                continue;
            }
           
            // in which main columns should the item be placed
            var column = item.column === "header" ? "header" : getValueForCurrentBreakpoint(item.column);
            
            // get an array of elements (items own and guest elements)
            var itemElementsToAdd = getItemElms(item);

            // put item's elements in the associated priority(row) & column of _pageFlexiblePriorities object

            if(!_pageFlexiblePriorities[column]){
                _pageFlexiblePriorities[column] = {};
            }

            if(!_pageFlexiblePriorities[column][priority]){
                _pageFlexiblePriorities[column][priority] = [];
            }

            for(var j = 0; j <= itemElementsToAdd.length - 1; j++){
                var elm = itemElementsToAdd[j];
                _pageFlexiblePriorities[column][priority].push(elm);
            }
        }
    }

    function setWidths(items){

        // for each item in the setting.items
        for(var i = 0; i <= items.length - 1; i++){

            var item = items[i];

            if(item.widths){

                // get its defined width for the current width of the page
                var width = getValueForCurrentBreakpoint(item.widths);

                // then apply the width to all elements of the item
                for(var j = 0; j <= item.elms.length - 1; j++){
                    var elm = item.elms[j];
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

        // prepare main container
        _flexibleContainer.innerHTML = "";        
        _flexibleContainer.className = "flexible flexible-" + _currentBreakpoint;
        _flexibleContainer.style.cssText = "width: " + getFlexibleContainerCurrentWidth() + "; margin: auto";

        // add header section if there is one
        // column: "header"
        if(_pageFlexiblePriorities["header"]){
            addToPage("header");
        }

        // then append selected elements to the main container based on their column & priority(row) (sorted in SortByPriorities function)
        var columns = Object.keys(_pageFlexiblePriorities);

        for(var i = 0; i <= columns.length - 1; i++){

            var column = columns[i];

            if(column !== "header"){
                addToPage(column);
            }

        }

        // if there is a menu we append it to the main container too
        _flexibleContainer.appendChild(_pageFlexibleMenuContent);

        // for each element which its content or style is different in flexible-state
        // we set the defined content and style
        for(var i = 0; i <= _manipulatedElements.length - 1; i++){

            var elm = _manipulatedElements[i];

            if(elm.flexibleContent){
                elm.innerHTML = elm.flexibleContent;
            }

            if(elm.flexibleStyle){
                elm.style.cssText = elm.flexibleStyle;
            }

        }

        // then remove all the current contents of the page
        document.body.innerHTML = "";

        // and append the flexible content to the page
        document.body.appendChild(_flexibleContainer);

        // flexible content is applied to the page
        if(!_isFlexibleStateApplied)
            _isFlexibleStateApplied = true;

    }

    function switchToOriginalState(){
        
        // when page resizes to a width bigger than all the breakpoints
        // we should reset elements to their original state (content and style)
        for(var i = 0; i <= _manipulatedElements.length - 1; i++){

            var elm = _manipulatedElements[i];

            if(elm.originalContent){
                elm.innerHTML = elm.originalContent;
            }

            if(elm.originalStyle){
                elm.style.cssText = elm.originalStyle;
            }

        }

        // put original content back
        document.body.innerHTML = _pageOriginalContent;
        
        _isFlexibleStateApplied = false;
        
    }

    function setViewPortMeta(){

        // try to get the page's viewport meta tag in the head section
        _pageViewportMeta = document.head.querySelector("meta[name='viewport']");

        if(_pageViewportMeta){
            // save its original content
            _pageViewportMeta.originalContent = _pageViewportMeta.content;
        }
        else{
            _pageViewportMeta = document.createElement("meta");
            _pageViewportMeta.name = "viewport";
            document.head.appendChild(_pageViewportMeta);
        }

        _pageViewportMeta.content = "width = device-width, initial-scale = 1, maximum-scale = 1, user-scalable = no";
        _isViewPortMetaSet = true;
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
        for(var i = 0; i <= setting.items.length - 1; i++){
            var item = setting.items[i];
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
            for(var i = 0; i <= setting.menu.items.length - 1; i++){
                var item = setting.menu.items[i];
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

        // create one div for each main column defined
        var columnContainer = document.createElement("div");
        columnContainer.className = "column col-" + column;
        columnContainer.style.cssText = column === "header" ? "display: block" : "display: inline-block; vertical-align: top;";
        columnContainer.style.width = _setting.columns[_currentBreakpoint][column];

        // then inside each column we put items based on their priority in rows
        var rows = Object.keys(_pageFlexiblePriorities[column]);

        for(var i = 0; i <= rows.length - 1; i++){

            var row = _pageFlexiblePriorities[column][rows[i]];

            // we put each row in a seperate <div>
            var rowContainer = document.createElement("div");

            for(var j = 0; j <= row.length - 1; j++){
                var item = row[j];
                rowContainer.appendChild(item);
            }

            columnContainer.appendChild(rowContainer);
        }

        _flexibleContainer.appendChild(columnContainer);
    }

    function sortAsc(a, b){
        return parseInt(a) - parseInt(b);
    }

    function addToManipulatedElementsList(elm){
        if(_manipulatedElements.indexOf(elm) < 0){
            _manipulatedElements.push(elm);
        }
    }

    function getValueForCurrentBreakpoint(options){

        // get all the breakpoints for which we have defined a width or priority for the element {1200 : x, 991: y}
        var allBreakpoints = Object.keys(options);

        // filter them to the breakpoints which are greater/equal to the _currentBreakpoint
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

        var currentBreakpoint = _setting.breakpoints[0];

        var inRangeBreakpoints = _setting.breakpoints.filter((function(e){
            return document.documentElement.clientWidth <= e;
        }));

        if(inRangeBreakpoints.length > 0){
            currentBreakpoint = inRangeBreakpoints[0];
        }

        return currentBreakpoint;
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

            for(var i = 0; i <= item.guestElms.length - 1; i++){

                var guestElm = item.guestElms[i];

                for(var j = 0; j <= item.elms.length - 1; j++){

                    var hostElm = item.elms[j];

                    var wrapper = document.createElement("div");
                    wrapper.style.cssText = "display: inline-block; vertical-align: top;";
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

    window.onerror = function(msg, url, line, col, error){
        alert("line: " + line + "\nError: " + msg);
    }

    document.addEventListener('click', function(e){
        var target = e.target;

        while (target && target !== this) {

            if (target.matches(".openFlexibleMenu")) {

                e.stopPropagation();

                var menuWidth = document.getElementById("flexibleMenu").style.width;

                document.getElementById("flexibleMenu").style["left"] = (100 - parseInt(menuWidth)) + "%";
                document.getElementById("_flexibleContainer").style["left"] = -(parseInt(menuWidth)) + "%";

                target.className = "closeFlexibleMenu";
                
                return;
            }
            else if(target.matches(".closeFlexibleMenu")){

                e.stopPropagation();

                document.getElementById("flexibleMenu").style["left"] = "100%";
                document.getElementById("_flexibleContainer").style["left"] = "0";

                e.target.className = "openFlexibleMenu";

                return;
            }

            target = target.parentNode;
        }

    });

    return function(setting){

        if (!valid(setting)) {
            console.log("there are problems with your setting");
            return;
        }

        _setting = setDefaults(setting);

        if(!_isViewPortMetaSet){
            setViewPortMeta();
        }

        manageBreakpoints();

        flexible(_setting);
    };

})();
