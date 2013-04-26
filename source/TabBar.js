﻿/**
enyo.TabBar is a scrolled set of radio buttons that is used by TabPanels. This bar may
be used by other kinds to provide a similar layout


Here's an example:


	enyo.kind({
		  name: "myStuff"
	});

	enyo.kind({
		name: "App",
		fit: true,
		components: [
			{name:"bar",kind: "TabBar"},
			{kind: "MyStuff"}
		],

		events: {
			onTabChanged: "switchStuff"
		},

		create: function() {
			this.$.bar.addTab(
				{
					'caption': 'greetings',
					'data' : { 'msg': 'Hello World !' } // arbitrary user data
				}
			) ;
		},

		switchStuff: function(inSender,inEvent) {
			this.log("Tapped tab with caption "+ inEvent.caption
					 + " and message " + inEvent.data.msg );
		}
	});

*/

enyo.kind (
	{
		name: 'onyx.TabBar',
		kind: "FittableColumns",
		isPanel: true,

		events: {
			/**
			 Fired when a tab different from the one currently selected is tapped.
			 inEvent contains :

			{
				'index': 3, // index of tab in tab bar
				'userId': 1234, // unique id in tab managed by user
				'caption': 'bar.js', // tab label
				'data': { 'lang': 'javascript' },
				'next': callback // call with error message if problem
			}

			 */
			onTabChanged: "",

			/**
			 * Fired when a tab is about to be removed. inEvent
			 * contains the same data as onTabChanged.
			 *
			 * if (removeOk) { inEvent.next() ;}
			 * else ( inEvent.next('not now') ;}
			 *
			 */
			onTabRemoveRequested: "",

			/**
			 * Fired when a tab is removed. inEvent contains the same
			 * data as onTabChanged (minus the next callback)
			 */
			onTabRemoved: ""
		},

		components: [
			{
				name: "scroller",
				kind: "Scroller",
				fit:true,
				maxHeight: "100px",

				// FIXME: may need to be revisited for desktop
				// activate calls scrollIntoView, which call strategy.scroll
				// this method is implemented *only* in TransitionScrollStrategy
				// which may be an enyo bug (2303)
				strategyKind: "TransitionScrollStrategy",
				//strategyKind: "TranslateScrollStrategy",

				thumb: false,
				vertical: "hidden",
				horizontal: "auto",
				classes: "onyx-tab-panel-scroller",
				components: [
					{
						name: "tabs",
						kind: "onyx.RadioGroup",
						defaultKind: "onyx.TabBar.Item",
						style: "text-align: left; white-space: nowrap;",
						onTabActivated: 'switchTab'
					}
				],
				onScrollStop: 'showBoundaries'
			},
			{
				kind: "onyx.MenuDecorator",
				components: [
					{
						kind: "onyx.Button",
						content: "\\/" // FIXME: is ugly
					},
					{
						name: "picker",
						kind: "onyx.ContextualPopup",
						actionButtons: [
							{content:"Button 1", classes: "onyx-button-warning"},
							{content:"Button 2"}
						]
					}
				]
			}
		],

		debug: false,

		showBoundaries: function(inSender, inEvent) {
			var snode = this.$.scroller.hasNode();
			this.log("boundaries width", snode.clientWidth ," outer ", snode.scrollWidth ) ;
		},

		// lastIndex is required to avoid duplicate index in the tab bar.
		lastIndex: 0,

		//* @protected
		clientTransitionStart: function(inSender, inEvent) {
			var i = inEvent.toIndex;
			var t = this.$.tabs.getClientControls()[i];
			if (t && t.hasNode()) {
				this.$.tabs.setActive(t);
				var tn = t.node;
				var tl = tn.offsetLeft;
				var tr = tl + tn.offsetWidth;
				var sb = this.$.scroller.getScrollBounds();
				if (tr < sb.left || tr > sb.left + sb.clientWidth) {
					this.$.scroller.scrollToControl(t);
				}
			}
			return true;
		},

		//* @public
		/**
		 *
		 * Append a new tab to the tab bar. inControl is an object
		 * with optional caption and data attributes. When not
		 * specified the tab will have a generated caption like
		 * 'Tab 0', 'Tab 1'. etc... data is an arbitrary object that will
		 * be given back with onTabChanged events
		 *
		 */
		addTab: function(inControl) {
			var c = inControl.caption || ("Tab " + this.lastIndex);
			var t = this.$.tabs.createComponent(
				{
					content:  c,
					userData: inControl.data || { },
					userId:   inControl.userId, // may be null
					tabIndex: this.lastIndex++
				}
			);
			this.debug && this.log("addControl add tab " + c);
			if (this.hasNode()) {
				t.render();
			}
			return t;
		},

		//* @public
		/**
		 *
		 * Remove a tab from the tab bar. target is an object with
		 * either a caption attribute or an index. The tab(s) matching
		 * the caption will be destroyed or the tab with matching
		 * index will be destroyed.
		 *
		 * Example:

			myTab.remove({'index':0}); // remove the leftmost tab
			myTab.remove({'caption':'foo.js'});

		 */

		removeTab: function(target) {
			var tab = this.resolveTab(target,'removeTab');
			tab && tab.destroy();
			this.doTabRemoved(
				{
					index:   tab.tabIndex,
					caption: tab.content,
					userId:  tab.userId,
					data:    tab.userData
				}
			);
		},

		//* @public
		/**
		 *
		 * Request to remove a tab from the tab bar. This is a bit
		 * like removeTab, except that a onTabRemoveRequested event is
		 * fired to let the application the possibility to cancel the
		 * request.
		 *
		 */

		requestRemoveTab: function(target) {
			var tab = this.resolveTab(target,'removeTab');
			var that = this ;
			if (tab) {
				target.next = function(err) {
					if (err) { throw new Error(err);   }
					else     { that.removeTab(target); }
				} ;
				this.doTabRemoveRequested( target ) ;
			}
		},

		//* @protected
		resolveTab: function(target,action_name){
			var targetTab ;
			if (target.userId) {
				enyo.forEach(
					this.$.tabs.controls,
					function(tab){
						if (tab.userId === target.userId) {
							targetTab = tab;
						}
					}
				);
			}
			else if (target.caption) {
				enyo.forEach(
					this.$.tabs.controls,
					function(tab){
						if (tab.content === target.caption) {
							targetTab = tab;
						}
					}
				);
			}
			else if (typeof target.index !== 'undefined') {
				targetTab = this.$.tabs.controls[target.index];
			}
			else {
				throw new Error("internal: " + action_name+ " called without index or caption");
			}
			return targetTab ;
		},

		//* @public
		/**
		 *
		 * Activate a tab in the tab bar. target is an object with
		 * either a caption attribute or an index. The tab(s) matching
		 * the caption will be activated or the tab with matching
		 * index will be activated
		 *
		 * Example:

			myTab.activate({'index':0}); // activate the leftmost tab
			myTab.activate({'caption':'foo.js'});

		 * Note that tabActivated event will be fired.
		 *
		 */
		activate: function(target) {
			var tab = this.resolveTab(target,'activate');
			this.debug && this.log("activate called on tab", target) ;
			if (tab) {
				tab.setActive(true) ;
				this.$.scroller.scrollIntoView(tab);
			}
		},

		//* @protected
		switchTab: function(inSender, inEvent) {
			var oldIndex = this.selectedId || 0 ;
			this.selectedId = inEvent.index;
			this.debug && this.log("switchTab called on index " , inEvent, inSender ) ;
			this.doTabChanged(
				{
					index:   inEvent.index,
					caption: inEvent.content,
					data:    inEvent.userData,
					userId:  inEvent.userId,
					next:    enyo.bind(this,'undoSwitchOnError', oldIndex)
				}
			);
			this.showBoundaries();
			return true ;
		},

		//* @protected
		undoSwitchOnError: function(oldIndex, err) {
			if (err) {
				this.log("app requested to activate back tab index "+ oldIndex + " because ",err);
				this.activate({ 'index': oldIndex } ) ;
			}
		},

		// resize stuff:
		// use scroller's getScrollBounds to get scroll boundaries
		resizeHandler: function() {
			this.inherited(arguments);
			this.showBoundaries() ;
		},

	}
);

