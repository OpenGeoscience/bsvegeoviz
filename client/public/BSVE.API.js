var BSVE = BSVE || {};
(function(ns){
	/**
	 * BSVE root API object
	 * @namespace BSVE
	 */
	var ns = ns || {};

	/**
	 * Current BSVE API version number.
	 * @member {string}
	 * @memberof BSVE
	 * @alias BSVE.version
	 */
	ns.version = '0.0.1';

	// trigger auto
	window.addEventListener( "message", messageHandler, false );

	/**
	 * Initializes the BSVE api and creates a connection to the workbench. 
	 * This function MUST be called before any of the other BSVE API functions will work. Ideally your apps code would be placed inside the callback funciton.
	 * @param {initCallback} [callback=null] - An optional callback to call when the init has completed.
	 * @returns {object} BSVE root Object
	 * @memberof BSVE
	 * @alias BSVE.start
	 */
	ns.start = ns.init = function ns_init(callback, preventLoadingStyles)
	{
		if ( !_initializing )
		{
			_initializing = true;
			_initCB = callback || null;
			//window.addEventListener( "message", messageHandler, false );
			var l;

			// load app styles
			if ( !preventLoadingStyles || typeof(preventLoadingStyles) == 'undefined' ){
				l = document.createElement('link'),
				protocol = window.location.protocol;
				l.rel="stylesheet";
				l.href= protocol + "//developer.bsvecosystem.net/sdk/api/harbingerApp-1.0.css";
				document.getElementsByTagName('head')[0].appendChild(l);
			}
			// load fontawesome
			l = document.createElement('link');
			l.rel="stylesheet";
			l.href="//cdn.bsvecosystem.net/vendor/font-awesome/4.3.0/css/font-awesome.min.css";
			document.getElementsByTagName('head')[0].appendChild(l);

			// Load jquery if not loaded already
			if ( typeof( jQuery ) == 'undefined' )
			{
				var jq = document.createElement('script');
				jq.type = 'text/javascript';
				jq.src = '//ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js';
				jq.onload = jqLoaded;
				document.getElementsByTagName('head')[0].appendChild(jq);
			}
			else
			{
				jqLoaded();
			}
		}
		else
		{
			console.log('BSVE API has already been _initialized');
		}
		return ns;
	}


	/**
	 * @namespace BSVE.ui
	 * @memberof BSVE
	 */
	ns.ui = ns.ui || {};
	/**
	 * @namespace BSVE.api
	 * @memberof BSVE
	 */
	ns.api = ns.api || {};


	/**
	 * Displays a system level alert prompt
	 * the alert can be dismissed
	 * @param {String} msg - mesasge to use
	 * @param {Boolean} [dismissable=false] - Weather or not to display the dismiss checkbox.
	 * @param {alertCallback} [confirmCB=null] - An optional callback function.
	 * @returns {Object} BSVE root object
	 * @memberof BSVE.ui
	 * @alias BSVE.ui.alert
	 */
	ns.ui.alert = function(msg, dismissable, confirmCB)
	{
		sendWorkbenchMessage('alert', {msg: msg, dismissable: dismissable});
		_alertCB = confirmCB || null;
		return ns;
	}


/*********************************************
 * Searchbar
 ********************************************/
	/**
	 * @namespace BSVE.api.search
	 * @memberof BSVE.api
	 */
	ns.api.search = ns.api.search || {};

	var _hideLocations = false,
		_hideTerm = false,
		_hideDates = false;

	/**
	 * Attaches a callback for a search submit event and additionally will enable the inline searchbar. This event occurs in one of two scenarios. 
	 * 1. An inline search is performed from within this application. 
	 * 2. This app is an auto-search app: This app must have the auto-search checkbox selected in the app settings page of the developer portal.
	 * NOTE: The inline searchbar will be toggled by the button in the top right of the app and cannot be changed. 
	 * Additionally the styles for the searchbar are handled in the app.css and should not be modified.
	 * @param {searchSubmitCallback} callback - Callback for when a search has been executed by the user.
	 * View callback documentation to see search object signature. 
	 * @param {boolean} [hideTerm] - Hide the keyword term section of the searchbar.
	 * @param {boolean} [hideDates] - Hide the dates section of the searchbar.
	 * @param {boolean} [hideLocations] - Hide the loations section of the searchbar.
	 * @param {string} [searchButtonLabel] - This variable is used to override default search label
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.search
	 * @alias BSVE.api.search.submit
	 */
	ns.api.search.submit = function(callback, hideTerm, hideDates, hideLocations,searchButtonLabel )
	{
		_searchCB = callback;

		if ( hideTerm ) { $('.searchBar .keyword-holder').hide(); _hideTerm = true; } else { _hideTerm = false; }
		if ( hideDates ) { $('.searchBar .pickers').hide(); _hideDates = true; } else { _hideDates = false; }
		if ( hideLocations ) { $('.searchBar .location-section-inline').hide(); _hideLocations = true; } else { _hideLocations = false; }
		if(searchButtonLabel && searchButtonLabel.length > 0){ $('.searchBar span.submitButtonLabel').html(searchButtonLabel); }

		if ( hideTerm && hideDates && hideLocations )
		{
			// don't show the search bar at all
			$('.searchBar').css({'height': 0, 'overflow': 'hidden'});
		}

		if ( _app_launchType && _app_launchType == 'BLANK_SEARCH' )
		{
			toggleSearchbar(1);
		}
		else
		{
			toggleSearchbar(-1);
			sendWorkbenchMessage('searchbar', {state: 'closed'});
		}

		return ns;
	}

	ns.api.search.getQuery = function()
	{
		var _query = {
			term: $('#keyword').val(),
			startDate: ns.api.dates.yymmdd($("#fromDP").val()),
			endDate: ns.api.dates.yymmdd($("#toDP").val()),
			locations: _locations,
			originalTerm: _originalTerm
		};
		return _query;
	}

	/**
	 * Triggers the inline search programatically. 
	 * if a query object is passed in as a parameter the search will use the query, 
	 * otherwise it will use the current values.
	 */
	ns.api.search.trigger = function(query)
	{
		if (query)
		{
			if ( query.term && !_hideTerm ){ $('#keyword').val(query.term); }
			if ( query.startDate && !_hideDates )
			{
				$('#fromDP').val(query.startDate);
				$('#fromDP').data({date: query.startDate}).datepicker('update').children("input").val(query.startDate);
			}
			if ( query.endDate && !_hideDates )
			{
				$('#toDP').val(query.endDate);
				$('#toDP').data({date: query.endDate}).datepicker('update').children("input").val(query.endDate);
			}
			if ( query.locations && !_hideLocations ){ _locations = query.locations; updateLocations(); }

			if(query.originalTerm) { _originalTerm = query.originalTerm };
		}

		$('form#search').submit();
	}
	/**
	 * Search panel located at the top of all apps. It is toggled via a button in the top right corner of apps. Will only be displayed if a search callback has been supplied.
	 * @namespace BSVE.ui.searchbar
	 * @memberof BSVE.ui
	 */
	ns.ui.searchbar = ns.ui.searchbar || {};

	/**
	 * Hides the searchbar.
	 * NOTE: Both the hide and show methods of BSVE.ui.searchbar will only function properly if a search submit handler has been added through the {@link BSVE.api.search.submit} method.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.ui.searchbar
	 * @alias BSVE.ui.searchbar.hide
	 */
	ns.ui.searchbar.hide = function()
	{
		toggleSearchbar(-1);
		sendWorkbenchMessage('searchbar', {state: 'closed'});
		return ns;
	}

	/**
	 * Shows the searchbar. 
	 * NOTE: Both the hide and show methods of BSVE.ui.searchbar will only function properly if a search submit handler has been added through the {@link BSVE.api.search.submit} method.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.ui.searchbar
	 * @alias BSVE.ui.searchbar.show
	 */
	ns.ui.searchbar.show = function()
	{
		toggleSearchbar(1);
		sendWorkbenchMessage('searchbar', {state: 'opened'});
		return ns;
	}

	/** @private */
	function toggleSearchbar(state)
	{
		if ( state == -1 )
		{
			$('#fromDP').datepicker('hide');
			$('#toDP').datepicker('hide');
			$('.searchBar').show().animate({ top: -$('.searchBar').height() + 'px' }, 300, function(){ $('.searchBar').hide(); });
		}
		else
		{
			$('.searchBar').show().animate({ top: 0 }, 300);
		}
	}
	/** @private */
	_locations = [];
	_originalTerm = '';
	function searchbar()
	{
		var currentDate = new Date(),
			defaultFromDate = new Date(),
			_cDate = ns.api.dates.Mddyy(currentDate),
			defaultFromDate = defaultFromDate.setDate(defaultFromDate.getDate() - 6),
			_fDate = ns.api.dates.Mddyy(defaultFromDate);

		$('body').prepend('<div class="searchBar row-fluid">'+
			'<form name="search" id="search" class="bsveapi form">'+
				'<div class="row-fluid keyword-holder">'+
					'<label class="span1">Keywords</label>'+
					'<input type="text" id="keyword" placeholder="New Search" class="flat span10" />'+
					'<i class="unstyled fa fa-times-circle clearIcon"></i>'+
				'</div>'+
				'<div class="alert alert-error" style="display:none">'+
					'Search term must be a minimum of 3 characters.'+
				'</div>'+
				'<div class="pickers row-fluid">'+
					'<label>Timeframe</label>'+
					'<div class="picker">'+
						'<input id="fromDP" type="text" placeholder="Start Date" class="span12 flat" data-date-format="M dd yyyy" bs-datepicker readonly>'+
						'<i class="fa fa-calendar" data-toggle="datepicker"></i>'+
						'<i title="Clear date" class="unstyled fa fa-times-circle defaultDateIcon"></i>'+
					'</div>'+
					'<div class="picker">'+
						'<input id="toDP" type="text" placeholder="End Date" class="span12 flat" data-date-format="M dd yyyy" bs-datepicker readonly />'+
						'<i class="fa fa-calendar" data-toggle="datepicker"></i>'+
						'<i title="Clear date" class="unstyled fa fa-times-circle defaultDateIconTd"></i>'+
					'</div>'+
				'</div>'+
				'<div class="location-section-inline row-fluid">'+
					'<label>Locations</label>'+
					'<button class="btn flat inlineLocationBtn" type="button" title="Add New Location">'+
						'<i class="fa fa-plus"></i> Add Location'+
					'</button>'+
					'<div class="scroll-list" style="display:none"></div>'+
				'</div>'+
				'<div class="submitSection row-fluid">'+
					'<button type="submit" class="btn flat btn-primary"><span class="submitButtonLabel"><i class="fa fa-search"></i> Search</span></button>'+
				'</div>'+
			'</form>'+
		'</div>');

		// cap the end dates of both pickers to today
		$('#fromDP').datepicker('setEndDate', new Date());
		$('#toDP').datepicker('setEndDate', new Date());

		// cap the start of to picker to from date
		$('#fromDP').datepicker().on('changeDate', function() {
			var sd = $('#fromDP').val();
			$('#toDP').datepicker('setStartDate', sd);
		});
		// cap the start of to picker to from date
		$('#toDP').datepicker().on('changeDate', function() {
			var sd = $('#toDP').val();
			$('#fromDP').datepicker('setEndDate', sd);
		});

		$('#fromDP').val(_fDate);
		$("#toDP").val(_cDate);
		$('#fromDP').data({date: _fDate}).datepicker('update').children("input").val(_fDate);
		$('#toDP').data({date: _cDate}).datepicker('update').children("input").val(_cDate);
		$('#fromDP').datepicker('setEndDate', _cDate);
		$('#toDP').datepicker('setStartDate', _fDate);

		// submit search
		$('form#search').submit(function()
		{
			if ($("#fromDP").val().length == 0)
			{
				$('#fromDP').val(_fDate);
				$('#fromDP').data({date: _fDate}).datepicker('update').children("input").val(_fDate);
			}
			if ($("#toDP").val().length == 0)
			{
				$("#toDP").val(_cDate);
				$('#toDP').data({date: _cDate}).datepicker('update').children("input").val(_cDate);
			}

			if ( $('form#search .keyword-holder').css('display') != 'none' && $('input#keyword').val().length < 3 )
			{
				$('form .alert').fadeIn(300);
			}
			else
			{
				$('form .alert').fadeOut(300);
				_searchCB({
					term: $('#keyword').val(),
					originalTerm: _originalTerm,
					startDate: ns.api.dates.yymmdd($("#fromDP").val()),
					endDate: ns.api.dates.yymmdd($("#toDP").val()),
					locations: _locations
				});
				ns.ui.searchbar.hide();
			}

			return false;
		});

		$('.picker .fa-calendar').css('pointer-events', 'none');//click(function(){ $(this).parent().find('input').click();console.log('picker') })

		// clear pickers
		$('.picker .fa-times-circle').click(function()
		{
			if ( $(this).hasClass('defaultDateIconTd') )
			{
				setDefaultDate('to');
			}
			else
			{
				setDefaultDate('from');
			}
		});

		// need to optimize - poorly structured
		function setDefaultDate( picker )
		{
			if ( picker == 'from' )
			{
				$('#fromDP').val('');
				$('#fromDP').datepicker('remove');
				$('#fromDP')
					.datepicker()
					.on('changeDate', function(ev){
						$('#fromDP').datepicker('hide');
					});

				if ($('#toDP').val() == '')
				{
					$('#toDP').datepicker('remove');
					$('#toDP').datepicker();
					$('#toDP').datepicker('setEndDate', new Date());
					$('#fromDP').datepicker('setEndDate', new Date());
				}
				else
				{
					$('#fromDP').datepicker('setEndDate', $('#toDP').val());
				}
			}
			else
			{
				$('#toDP').val('');
				$('#toDP').datepicker('remove');
				$('#toDP')
					.datepicker()
					.on('changeDate', function(ev){
						$('#toDP').datepicker('hide');
					});

				if ($('#fromDP').val() == '')
				{
					$('#fromDP').datepicker('remove');
					$('#fromDP').datepicker();
					$('#fromDP').datepicker('setEndDate', new Date());
					$('#toDP').datepicker('setEndDate', new Date());
				}
				else
				{
					$('#toDP').datepicker('setStartDate', $('#fromDP').val());
					$('#toDP').datepicker('setEndDate', new Date());
				}
			}
		}

		// clear search term
		$('.keyword-holder .fa-times-circle').click(function(event)
		{
			event.preventDefault();
			$('#keyword').val('');
			$('form .alert').fadeOut();
			$('.keyword-holder .fa-times-circle').fadeOut();
		});
		$('#keyword').change(validateForm).keyup(validateForm);

		function validateForm()
		{
			if ( $(this).val().length ){ $('.keyword-holder .fa-times-circle').fadeIn(); } else { $('.keyword-holder .fa-times-circle').fadeOut(); }
			if ( $(this).val().length >= 3 ) { $('form .alert').fadeOut(); }
		}

		// show location modal
		$('.btn.inlineLocationBtn').click(function()
		{
			sendWorkbenchMessage('addlocationfrominline');
		});
		$('.location-section-inline').data({
			update: function(data){
				//_locations.concat( data );
				// remove dupes
				for ( var i = 0; i < data.length; i++ )
				{
					var exists = false;
					for ( var j = 0; j < _locations.length; j++ )
					{
						if ( _locations[j].location == data[i].location ) { exists = true; }
					}
					if ( !exists )
					{
						_locations.push(data[i]);
					}
				}

				updateLocations();
			}
		});
		// remove location
		$('.location-section-inline').on('click', 'span.word .word-remove', function()
		{
			var loc = $(this).parent().attr('data-location');
			for ( var i = _locations.length - 1; i >= 0; i-- )
			{
				if ( loc == _locations[i].location)
				{
					_locations.splice(i, 1);
				}
			}
			updateLocations();
		});

		function updateLocations()
		{
			var html = '';
			for ( var i = 0; i < _locations.length; i++ )
			{
				html += '<span class="word" data-location="'+_locations[i].location+'"><i class="fa fa-times-circle word-remove"></i> ' + _locations[i].locationType + ' - ' + _locations[i].location + '</span>';
			}
			$('.location-section-inline .scroll-list').html(html);
			if (_locations.length){ $('.location-section-inline .scroll-list').show(); } else { $('.location-section-inline .scroll-list').hide(); }
		}

		var sbHeight = ( $('.searchBar').height() == 0 ) ? 400 : $('.searchBar').height();
		$('.searchBar').css({top: -sbHeight + 'px'});
	}
//

/*********************************************
 * Dossier Bar & Item Tagging
 ********************************************/
	/**
	 * Dossier control
	 * @namespace BSVE.ui.dossierbar
	 * @memberof BSVE.ui
	 */
	ns.ui.dossierbar = ns.ui.dossierbar || {};

	/**
	 * Creates a new Dossier control bar. The dossier control bar will be positioned in the top left of the application. The control does not 
	 * have a set size and thus should be accounted for in your application. When a report component is selected the 4 report components will 
	 * appear to the right as 4 buttons. The total height that these take up will depend on teh width your application has given the tagger control.
	 * @param {function} onTagged - Callback to execute when an item tag has been clicked. 
	 * NOTE: this does not tag an item but, instead triggers a callback to the developer, in which the item can then be tagged.
	 * It is in this callback function that the developer should call the BSVE.api.tagItem method. The onTagged callback has one parameter, 
	 * which is the status type to pass into the {@link BSVE.api.tagItem} method.
	 * @param {boolean} hide - Weather or not to hide the control after it is created.
	 * @param {string} dom - The dom element selector of the parent element of the dossier control. If this argument is provided, 
	 * the dossier control will be added to this dom element instead of the default body element.
	 * @param {number} x - The x( left ) position of the tagger in relationship to the dom parent.
	 * @param {number} y - The y( top ) position of the tagger in relationship to the dom parent.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.ui.dossierbar
	 * @alias BSVE.ui.dossierbar.create
	 */
	ns.ui.dossierbar.create = function(onTagged, hide, dom, x, y)
	{
		var _dom = dom || $('body'),
			timeoutID = -1,
			customLayout = false;

		if (typeof(dom) != 'undefined')
		{
			_dom = $(dom);
			customLayout = true;
		}

		// remove old tagger if one exists in same dom element
		$(_dom.selector + ' .tagger').remove();

		_dom.prepend('<div class="tagger clearfix">'
			+	'<div class="mousetrap dossier-select">'
			+		'<button class="drop-toggle btn flat"><span>Select a Dossier</span> <i class="fa fa-angle-down"></i></button>'
			+		'<div class="drop-show" style="display:none;">'
			+			'<div class="new-dossier">'
			+				'<form>'
			+					'<input type="text" class="flat" placeholder="Create New Dossier" />'
			+					'<button type="submit" class="btn flat"><i class="fa fa-plus-circle"></i></button>'
			+				'</form>'
			+			'</div>'
			+			'<ul class="drop"></ul>'
			+		'</div>'
			+	'</div>'
			+	'<div class="tags" style="display:none; float: left; position:static;">'
			+		'<button type="button" class="status-btn status-IOI" title="Items of Interest" data-status="IOI"><i class="fa fa-thumbs-o-up"></i></button>'
			+		'<button type="button" class="status-btn status-WCH" title="Watch List" data-status="WCH"><i class="fa fa-eye"></i></button>'
			+		'<button type="button" class="status-btn status-DRP" title="Drop List" data-status="DRP"><i class="fa fa-thumbs-o-down"></i></button>'
			+		'<span class="status-CMP" data-status="CMP"><i class="fa fa-file-text-o" title="Report Components"></i></span>'
			+	'</div>'
			+	'<div class="mousetrap report-comps">'
			+		'<button class="drop-toggle btn flat"><span>Select Report Components</span> <i class="fa fa-angle-down"></i></button>'
			+		'<div class="drop-show" style="display:none;">'
			+			'<input type="text" placeholder="Search" />'
			+			'<i title="Clear Filter" style="display:none;" class="unstyled fa fa-times-circle clear-filter"></i>'
			+			'<label><input type="checkbox" class="all" value="all"><span>Select All</span></label>'
			+			'<div class="checks"></div>'
			//+			'<button type="button" class="btn">Show All</button>'
			+		'</div>'
			+	'</div>'
			// end dropdown
			+'</div>');

		if ( customLayout ){ $(_dom.selector + ' .tagger').addClass('custom'); }
		if ( typeof(x) ) { $(_dom.selector + ' .tagger').css('left', x + 'px'); }
		if ( typeof(y) ) { $(_dom.selector + ' .tagger').css('top', y + 'px'); }


		$(_dom.selector + ' .tagger:first .status-btn').click(function()
		{
			if ( onTagged )
			{
				// change button state here and not in the apps
				if ( $(this).hasClass('active') )
				{
					// untag
					var _id = $(this).attr('data-item-id');
					if ( _id ){ ns.api.unTagItem(_id, null, $(this).attr('data-status')); }
					$(this).removeClass('active');
				}
				else
				{
					//tag
					onTagged( $(this).attr('data-status'), $(this) );
					$(_dom.selector + ' .tagger .status-btn').removeClass('active');
					$(this).addClass('active');
					$(this).addClass('tagging');
				}
			}
		});

		$(_dom.selector + ' button.drop-toggle').click(function()
		{
			var drop = $(this).parent().find('.drop-show');
			drop.toggle();
			if ( drop.css('display') == 'block' )
			{
				$(_dom.selector + ' .tagger').css('z-index', 101);
			}
			else
			{
				$(_dom.selector + ' .tagger').css('z-index', 100);
			}
		});

		$(_dom.selector + ' .mousetrap').on({
			mouseenter: function()
			{
				clearTimeout($(this).attr('data-timeoutID'));
				$(this).removeAttr('data-timeoutID');
			},
			mouseleave: function()
			{
				var _this = $(this);
				var tID = setTimeout(function()
				{
					$(_dom.selector + ' .tagger:first').css('z-index', 100);
					_this.find('.drop-show').hide();
				}, 1000);

				$(this).attr('data-timeoutID', tID);
			}
		});

		$(_dom.selector + ' .tagger:first form input').focus(function(){ $(this).parent().parent().addClass('focus'); });
		$(_dom.selector + ' .tagger:first form input').blur(function(){ $(this).parent().parent().removeClass('focus'); });

		$(_dom.selector + ' .tagger:first form').submit(function()
		{
			var val = $(this).find('input[type="text"]').val();
			if ( val.length )
			{
				sendWorkbenchMessage('dossierCreate', {name:val});
				$(this).find('input[type="text"]').val('');
			}
			return false;
		});

		// comps
		// search
		$(_dom.selector + ' .report-comps:first input[type="text"]').on('input', function(){
			var term = $(this).val();
			if ( term == '' )
			{
				$(_dom.selector + ' .mousetrap.report-comps:first .checks label').show();
				$(_dom.selector + ' input.all').parent().show();
				$(_dom.selector + ' .clear-filter').hide();
			}
			else
			{
				$(_dom.selector + ' .mousetrap.report-comps:first .checks label').each(function()
				{
					var label = $(this).find('span').attr('title'),
						reLower = new RegExp(term.toLowerCase(), 'g'),
						reUpper = new RegExp(term.toUpperCase(), 'g');

					if ( label.toLowerCase().indexOf(term.toLowerCase()) !== -1 )
					{
						var _label = label.replace(reLower, '<strong>' + term.toLowerCase() + '</strong>')
						$(this).find('span').html(_label.replace(reUpper, '<strong>' + term.toUpperCase() + '</strong>'));
						$(this).show();
					}
					else
					{
						$(this).hide();
					}
				});
				$(_dom.selector + ' input.all').parent().hide();
				$(_dom.selector + ' .clear-filter').show();
			}
		});

		$(_dom.selector + ' .clear-filter').click(function()
		{
			$(_dom.selector + ' .report-comps:first input[type="text"]').val('').trigger('input');
			return false;
		});

		// check box functionality
		// select all
		$(_dom.selector + ' .report-comps:first').on('change', 'input.all', function()
		{
			if ( $(this).prop('checked') )
			{
				var _ids = [];
				$(this).parent().parent().find('.checks input').each(function()
				{
					if ( !$(this).hasClass('active')) { _ids.push($(this).val()); }
				});

				onTagged( _ids.join(','), $(this).parent().parent().find('.checks input') );
				
				$(this).parent().parent().find('.checks input').each(function()
				{
					if ( !$(this).hasClass('active')){ $(this).addClass('active');$(this).addClass('tagging'); }
				});

				// check all boxes
				$(this).parent().parent().find('.checks input').prop('checked', 'checked');
			}
			else
			{
				$(this).parent().parent().find('.checks input').each(function()
				{
					if ( $(this).hasClass('active') )
					{
						var _id = $(this).attr('data-item-id');
						if ( _id ){ ns.api.unTagItem(_id, null, $(this).val()); }
						$(this).removeClass('active');
					}
				});

				// uncheck all boxes
				$(this).parent().parent().find('.checks input').prop('checked', false);
			}

			updateChecks();
		});
		$(_dom.selector + ' .report-comps:first .checks').on('change', 'input', function()
		{
			var id = $(this).val();
			if ( $(this).hasClass('active') )
			{
				// untag
				var _id = $(this).attr('data-item-id');
				if ( _id ){ ns.api.unTagItem(_id, null, id); }
				$(this).removeClass('active');
				// deselect all
				$(this).parent().parent().parent().find('input.all').prop('checked', false);
			}
			else
			{
				//tag
				onTagged( $(this).val(), $(this) );
				$(this).addClass('active');
				$(this).addClass('tagging');

				if ( $(_dom.selector + ' .report-comps:first .checks input.active').length == $(_dom.selector + ' .report-comps:first .checks input').length )
				{
					$(this).parent().parent().parent().find('input.all').prop('checked', 'checked');
				}
			}

			updateChecks();
		});

		function updateChecks()
		{
			// sort
			// 		selected sorted alpha at top
			// 		unselected sorted alpha
			var checksHolder = $(_dom.selector + ' .report-comps:first .checks'),
				checks = checksHolder.children('label');
			
			checks.sort(function(a,b)
			{
				var an = $(a).find('input').val(),
					bn = $(b).find('input').val();

				if ( $(a).find('input').hasClass('active') && !$(b).find('input').hasClass('active') )
				{
					return -1
				}
				else if ( $(b).find('input').hasClass('active') && !$(a).find('input').hasClass('active') )
				{
					return 1;
				}
				else
				{
					if ( an > bn ) {
						return 1;
					}
					if ( an < bn ) {
						return -1;
					}
				}
				
				return 0;
			});
			checks.detach().appendTo(checksHolder);


			// if any selected -> set status btn to active
			var len = $(_dom.selector + ' .report-comps:first .checks').find('input.active').length;
			if ( len > 0 )
			{
				$(_dom.selector + ' .status-CMP').addClass('active');
				if ( len == 1 )
				{
					$(_dom.selector + ' .report-comps .drop-toggle span').html( $('.checks').find('input.active').parent().find('span').html() );
				}
				else
				{
					$(_dom.selector + ' .report-comps .drop-toggle span').html('Selections(' + len + ')');
				}
			}
			else
			{
				$(_dom.selector + ' .status-CMP').removeClass('active');
				$(_dom.selector + ' .report-comps .drop-toggle span').html('Select Report Components');
			}
		}

		$(_dom.selector + ' .tagger:first .dossier-select .drop').on('click', 'li', function()
		{
			var _dossier = {
				id:$(this).attr('data-id'),
				name:$(this).attr('data-name'),
				permission:$(this).attr('data-permission')
			};
			$('.drop-show').hide();
			$('.tagger .tags').hide();
			$('.dossier-select button.drop-toggle span').html(_dossier.name);
			$('.tagger .dossier-select .drop-toggle').attr('disabled', 'disabled').css('opacity', .6);
			sendWorkbenchMessage('dossierSet', {id:_dossier.id});
			$('.tagger .tags').show();
		});

		if ( dossiers ){ updateDossierbar(dossiers); }
		if ( hide ) { ns.ui.dossierbar.hide(); }

		return ns;
	}
	/**
	 * Hides dossier bar control within the application. If the argument dom is provided, only the control 
	 * in the provided dom element will be hidden, otherwise, all dossier controls will be hidden.
	 * @param {string} dom - The dom element selector of the parent element of the dossier control.
	 */
	ns.ui.dossierbar.hide = function(dom)
	{
		if ( typeof(dom) !== 'undefined' )
		{
			$(dom + ' div.tagger').hide();
		}
		else
		{
			$('div.tagger').hide();
		}
	}
	/**
	 * Shows dossier bar control within the application. If the argument dom is provided, only the control 
	 * in the provided dom element will be shown, otherwise, all dossier controls will be shown.
	 * @param {string} dom - The dom element selector of the parent element of the dossier control.
	 */
	ns.ui.dossierbar.show = function(dom)
	{
		if ( typeof(dom) !== 'undefined' )
		{
			$(dom + ' div.tagger').show();
		}
		else
		{
			$('div.tagger').show();
		}
	}

	/**
	 * Clears Dossier Bar of any tagged components. Useful when app state has changed and 
	 * previous tagged content is no longer relevant.
	 */
	ns.ui.dossierbar.clear = function()
	{
		setDossier(dossiers[curDossier]);
	}

	/** @private */
	var dossiers = [],
		curDossier = -1,
		eventComponents = [];

	// move filter functionality into this function
	// also sorting
	// may need to que this for when the dbar is built.
	/** @private */
	function updateDossierbar(data)
	{
		for ( var i = 0; i < data.length; i++ )
		{
			data[i].reportComponentTypes = eventComponents;
		}

		dossiers = data;
		if ( typeof($) != 'undefined' )
		{
			_html = '';
			for ( var i = 0; i < data.length; i++ )
			{
				var dossier = data[i];

				if ( dossier.permission !== 'View' && !dossier.archived )
				{
					_html += '<li data-name="'+ dossier.name +'" data-id="' + dossier.id + '" data-permission="' + dossier.permission + '">' + dossier.name + '</li>';
				}
			}
			$('.tagger .dossier-select .drop').html(_html);
			
		}
		else
		{
			console.log('$ undefined', data);
		}
	}
	/** @private */
	function setDossier(data, event)
	{
		var selection = false;
		var _currentSelectedDossier;
		if ( data )
		{
			// for now match the dossier to the one in the the stored list
			for ( var i = 0; i < dossiers.length; i++ )
			{
				if ( dossiers[i].id == data.id )
				{
					curDossier = i;
					data = dossiers[i];
				}
			}

			selection = ( data.archived || data.permission == 'View' ) ? false : true;
			var _data;
			for ( var i = 0; i < dossiers.length; i++ )
			{
				if ( data.id == dossiers[i].id ){
					var _dossierName = data.name; 
					_data = dossiers[i];  
					_data.name = _dossierName;
				}
			}

			// populate report components
			var _comps = '';
			for ( var i = 0; i < data.reportComponentTypes.length; i++ )
			{
				_comps += '<label><input type="checkbox" value="' + data.reportComponentTypes[i].id + '" /><span title="'+data.reportComponentTypes[i].label+'">' + data.reportComponentTypes[i].label + '</span></label>';
			}
			$('.mousetrap.report-comps .checks').html(_comps);
			$('.mousetrap.report-comps .drop-toggle span').html('Select Report Components');
			$('.mousetrap.report-comps input[type="text"]').val('');
			$('.mousetrap.report-comps input.all').removeProp('checked');
			$('.mousetrap.report-comps input.all').removeAttr('checked');
		}
		
		$('.tagger .drop-toggle').removeAttr('disabled').css('opacity', 1);
		$('.tagger .tags').hide();
		$('.mousetrap.report-comps').hide();

		$('.tagger .tags button, .tagger .tags span').removeClass('active');
		if ( selection )
		{	
			$('.dossier-select button.drop-toggle span').html(_data.name);
			$('.dossier-select button.drop-toggle').attr('title',_data.name);
			$('.tagger .tags').show();
			$('.mousetrap.report-comps').show();
			_currentSelectedDossier = {dossier: _data};
		}
		else
		{
			$('.dossier-select button.drop-toggle span').html('Select a Dossier');
			$('.mousetrap.report-comps').hide();
			_currentSelectedDossier = {dossier: null};
		}
			
		if ( _currentSelectedDossier && _currentSelectedDossierAndEventBio ){ _currentSelectedDossierAndEventBio(_currentSelectedDossier); }
	}
	
	/**
	 * @param {object} item - object to save. The object signature is as follows: {
		dataSource : name of data source used | string,
		title : item title | string,
		sourceDate : date of item source | string recommended to use - {@link BSVE.api.dates.yymmdd},
		itemDetail : {
			statusIconType: type of item from three options - Graph, Map, Text, or App | string,
			Description : 'App Item Description...' | string
		}
	 }
	 * @param {string} status - Status of item to save. This includes report component types.
	 * @param {itemTagCallback} [cb=null] - Callback to execute when item has finished being saved.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api
	 * @alias BSVE.api.tagItem
	 */
	ns.api.tagItem = function(item, status, cb)
	{
		sendWorkbenchMessage( 'item', { item: item, status: status } );
		_itemTagCB = cb || null;
		return ns;
	}
	ns.api.unTagItem = function(itemId, eventId, status, cb)
	{
		sendWorkbenchMessage( 'untagitem', { itemId: itemId, eventId: eventId, status: status } );
		_itemUnTagCB = cb || null;
		return ns;
	}
// End Dossier Bar and Item Tagging





	/**
	 * Returns the curently logged in user id.
	 * @memberof BSVE.api
	 * @alias BSVE.api.user
	 */
	ns.api.user = function()
	{
		return ( !_initialized ) ? false : _user;
	}
	/**
	 * Returns the curently logged in user Data.
	 * @memberof BSVE.api
	 * @alias BSVE.api.userData
	 */
	ns.api.userData = function()
	{
		return ( !_initialized ) ? false : _userData;
	}
	/**
	 * Returns the current App name.
	 * @memberof BSVE.api
	 * @alias BSVE.api.appName
	 */
	ns.api.appName = function()
	{
		return ( !_initialized ) ? false : _appName;
	}
	ns.api.detectApp = function()
	{
		return ( !_initialized || !_detectApp ) ? false : _detectApp;
	}
	/**
	 * Returns the curent auth ticket.
	 * @memberof BSVE.api
	 * @alias BSVE.api.authTicket
	 */
	ns.api.authTicket = function()
	{
		return ( !_initialized ) ? false : _authTicket;
	}
	/**
	 * Returns the curently logged in user tennant.
	 * @memberof BSVE.api
	 * @alias BSVE.api.tenancy
	 */
	ns.api.tenancy = function()
	{
		return ( !_initialized ) ? false : _tenancy;
	}
	/**
	 * Returns the search end point.
	 * @memberof BSVE.api
	 * @alias BSVE.api.searchAPIRoot
	 */
	ns.api.searchAPIRoot = function()
	{
		return ( !_initialized ) ? false : _searchAPIRoot;
	}
	/**
	 * Returns the workbench end point.
	 * @memberof BSVE.api
	 * @alias BSVE.api.appRoot
	 */
	ns.api.appRoot = function()
	{
		return ( !_initialized ) ? false : _appRoot;
	}
	/**
	 * Returns the statistics api end point.
	 * @memberof BSVE.api
	 * @alias BSVE.api.statisticsAPIRoot
	 */
	ns.api.statisticsAPIRoot = function()
	{
		return ( !_initialized ) ? false : _statisticsAPIRoot;
	}
	/**
	 * Returns the web socket server end point.
	 * @memberof BSVE.api
	 * @alias BSVE.api.webSocketServerRoot
	 */
	ns.api.webSocketServerRoot = function()
	{
		return ( !_initialized ) ? false : _webSocketServerRoot;
	}
	/**
	 * Returns the sdk service server end point.
	 * @memberof BSVE.api
	 * @alias BSVE.api.sdkDataServiceApiRoot
	 */
	ns.api.sdkDataServiceApiRoot = function()
	{
		return ( !_initialized ) ? false : _sdkDataApiRoot;
	}
	/**
	 * Returns the wordBank selected by user in the advancesearch.
	 * @memberof BSVE.api
	 * @alias BSVE.api.wordBank
	 */
	ns.api.wordBank = function()
	{
		return ( !_initialized ) ? false : _wordBank;
	}
	
	ns.api.twitterDefaultDays = function()
	{
		return ( !_initialized ) ? false : _twitterDefaultDays;
	}
	ns.api.twitterMaxDays = function()
	{
		return ( !_initialized ) ? false : _twitterMaxDays;
	}
	ns.api.fedDefaultDays = function()
	{
		return ( !_initialized ) ? false : _fedDefaultDays;
	}
	/**
	 * Returns the list of datasources which has access to the logined user.
	 * @memberof BSVE.api
	 * @alias BSVE.api.getTenantDatasourceList
	 */
	ns.api.tenantDatasourceList = function()
	{
		return ( !_initialized ) ? false : _tenantSpecificDataSourceList;
	}
	/**
	 * Generic Rest request function when the request is neither a data query or an analytic.
	 * @param {string} url - The rest request url. The api will prepend the necessary server url. 
	 * @param {function} callback - Function to be exectuted once server result has been received.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api
	 * @alias BSVE.api.get
	 */
	ns.api.get = function(url, callback)
	{
		$.ajax({
			url: _searchAPIRoot + url,
			data: {cache : false },
			type: 'GET',
			beforeSend: function(xhr)
			{
				xhr.setRequestHeader('harbinger-auth-ticket', _authTicket);
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				console.log(errorThrown);
			},
			success: function(data, textStatus, jqXHR)
			{
				if ( typeof(callback) == 'function' ){callback(data);}
			}
		});

		return BSVE;
	}


	/** 
	 * Data Exchange
	 * @namespace BSVE.api.exchange
	 * @memberof BSVE.api
	 */
	ns.api.exchange = ns.api.exchange || {};
	
	/**
	 * Executed when another app has exchanged( shared ) data with this app.
	 * @param {function} callback - Function to be exectuted once an exchange of data has been received.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.exchange
	 * @alias BSVE.api.exchange.receive
	 */
	ns.api.exchange.receive = function(callback)
	{
		_exchangeReceiveCB = callback;
	}
	
	/** 
	 * Get selected dossier id and event id
	 * @namespace BSVE.api.dossier
	 * @memberof BSVE.api
	 */
	ns.api.dossier = ns.api.dossier || {}
	
	/**
	 * Executed when user has made any dossier dropdown change
	 * @param {function} callback - Function to be exectuted once a dossier is selected.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.dossier
	 * @alias BSVE.api.dossier.update
	 */
	ns.api.dossier.update = function(callback)
	{
		_currentSelectedDossierAndEventBio = callback;
	}

	/**
	 * Executed when app wants to exchange( shared ) data to other app.
	 * @param {function} callback - Function to be exectuted once an exchange of data has been received.
	 * @param {object} position - object to set position of exchange button. The object signature is as follows: {
		top : The top position of the exchange button in relationship to the dom parent | number,
		left : The left position of the exchange button in relationship to the dom parent | number
	 }
	 * @param {boolean} promise -  Whether or not "callback" function is a promised callback.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.exchange
	 * @alias BSVE.api.exchange.send
	 */
	ns.api.exchange.send = function(callback, position, promise)
	{
		_exchangeSendCB = callback;
		var data = {
			BSVE_API:true, 
			sendData: null
		};
		// add button
		var buttonHTML = ''+
			'<div class="exchange-button">'+
				'<button type="button" class="status send"><i class="fa fa-exchange" title="Send Data"></i></button>'+
			'</div>';
		$('body').prepend(buttonHTML);

		if ( position )
		{
			data.position = position;
			$('.exchange-button').css({position: 'absolute', left: position.left+'px', top: position.top+'px'});
		}
		$('.exchange-button button').click(function()
		{
			if(promise){
				_exchangeSendCB().then(function(data){
					data.sendData = _sendData;
					sendWorkbenchMessage( 'appsListDialog', data );
				});
			}else{
				var _sendData = _exchangeSendCB();
				if ( _sendData )
				{
					data.sendData = _sendData;
					sendWorkbenchMessage( 'appsListDialog', data );
				}
				else
				{
					console.log('WARNING: Data Exchange attempted without providing exchange data in the BSVE.api.exchange.send() callback. Ensure that data is being returned from the exchange callback.');
				}	
			}
		});
	}
	/*Call back for select/deselect disease list
	*/
	ns.api.favoriteDiseaseUpdate = function(callback)
	{
		_diseaseListUpdate = callback;
	}
	
	/**
	 * It will open a Model popup with a list of diseases with an option to select or deselct. 
	 * Methode expect a list of diseases to show
	 * List of disease - : ['disease1','disease2']  
	 *@alias BSVE.api.openMyDiseaseList
	*/
	var tableData = [],
		rawTableData = [],
		perPage = 8,
		curPage = 0,
		numPages = 0,
		tableLimit = 0,
		tableSearchFilter = '',
		sortFieldName = 'disease',
		sortFieldReverse = true;
	
	ns.api.openMyDiseaseList = function (appDiseaseList) {

		if(!appDiseaseList && appDiseaseList.length<=0){
			console.log('This methode expect a list of diseases');
			return false;
		}
		$.ajax({
			url: _appRoot + '/api/user/favorite/disease/list',
			data: { cache: false },
			type: 'GET',
			beforeSend: function (xhr) {
				xhr.setRequestHeader('harbinger-auth-ticket', _authTicket);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(errorThrown);
			},
			success: function (data, textStatus, jqXHR) {
				var status = false;
				if (data.data && data.data.length > 0) {
					status = true;
				}
				var _appDiseaseList = getArrayOfDiseaseList(appDiseaseList, data.data, status);
				openModelWindowForFullDiseaseList(_appDiseaseList);
			}
		});
	}
	function getArrayOfDiseaseList(appDiseaseList, favorite, status) {
		var _tableData = [];
		if (appDiseaseList && appDiseaseList.length > 0) {
			if (status) {
				for (var i = 0; i < appDiseaseList.length; i++) {
					if (favorite.map(function (c) {
						return c.toLowerCase();
					}).indexOf(appDiseaseList[i].toLowerCase()) != -1) {
						_tableData.push({ selected: true, disease: appDiseaseList[i] })
					} else {
						_tableData.push({ selected: false, disease: appDiseaseList[i] })
					}
				}
			} else {
				for (var i = 0; i < appDiseaseList.length; i++) {
					_tableData.push({ selected: false, disease: appDiseaseList[i] })
				}
			}
		}
		return _tableData;
	}
	function openModelWindowForFullDiseaseList(masterDiseaseList) {
		var _dom = $('body');

		if (typeof (dom) != 'undefined') {
			_dom = $(dom);
		}

		$(_dom.selector + ' #diseaseListModel').remove();
		$(_dom.selector + ' .modal-backdrop').remove();

		_dom.prepend('<div id="diseaseListModel" class="modal fade in">'
			+ '<div class="modal-header">'
			+ '<button type="button" class="close diseaseListClose">x</button>'
			+ '<h3 id="myModalLabel">My Disease List</h3>'
			+ '</div>'
			+ '<div class="modal-body" style="overflow:hidden">'
			+ '<p>Select Diseases from the list to track them in the BSVE Disease Signals App and other apps which will help you monitor specific diseases throughout the BSVE.</p>'
			+ '<div class="diseaseListGrid"></div>'
			+ '</div>'
			+ '<div class="modal-footer">'
			+ '<button class="btn diseaseListClose">Close</button>'
			+ '</div>'
			+ '</div>');

		_dom.prepend('<div class="modal-backdrop fade in"></div>')

		prependDiseaseListGrid(masterDiseaseList);

		$('.diseaseListClose').click(function () {
			$('#diseaseListModel').hide();
			$(_dom.selector + ' .modal-backdrop').remove();
		})
	}
	function prependDiseaseListGrid(diseaseList) {
		$('.diseaseListGrid').prepend(
			'<table class="table table-bordered table-hover tr-ng-grid">'
			+ '<thead>'
			+ '<tr>'
			+ '<th width="25%">My Disease List</th>'
			+ '<th width="75%">Disease'
			+ '<div title="Sort" data-field-name="disease" class="tr-ng-sort">'
			+ '<div class="tr-ng-sort-inactive tr-ng-sort-reverse">'
			+ '<i class="fa fa-sort-down"></i>'
			+ '<i class="fa fa-sort-up"></i>'
			+ '<i class="fa fa-sort"></i>'
			+ '</div>'
			+ '</div>'
			+ '</th>'
			+ '</tr>'
			+ '</thead>'
			+ '<tfoot>'
			+ '<tr>'
			+ '<td colspan="999">'
			+ '<div class="tr-ng-grid-footer form-inline">'
			+ '<span class="pull-left form-group global-filter ng-scope">'
			+ '<input class="form-control filterInput ng-pristine ng-valid" type="text" placeholder="Filter">'
			+ '<i class="fa fa-filter filterIcon" style="margin-top:0px;"></i>'
			+ '<button class="unstyled clear-field" style="display:none;">'
			+ '<i class="fa fa-times-circle"></i>'
			+ '</button>'
			+ '</span>'
			+ '<div class="pagination ng-scope">'
			+ '<button type="button" class="btn prev" disabled="disabled">'
			+ '<i class="fa fa-chevron-left"></i>'
			+ '</button>'
			+ '<span>1 - 5 of 100 </span>'
			+ '<button type="button" class="btn next">'
			+ '<i class="fa fa-chevron-right"></i>'
			+ '</button>'
			+ '</div>'
			+ '</div>'
			+ '</td>'
			+ '</tr>'
			+ '</tfoot>'
			+ '<tbody></tbody>'
			+ '</table>'
		)
		$('.diseaseListGrid table .filterInput').val('');
		tableSearchFilter = '';
		populateTable(diseaseList);
	}

	function populateTable(data) {
		rawTableData = data;
		curPage = 0;
		sortFieldName = 'disease';
		sortFieldReverse = true;
		$('.diseaseListGrid .tr-ng-sort > div').removeClass('tr-ng-sort-active').removeClass('tr-ng-sort-reverse');
		$('.diseaseListGrid .tr-ng-sort[data-field-name="' + sortFieldName + '"] > div').addClass('tr-ng-sort-active').addClass('tr-ng-sort-reverse');
		updateTable();

		// paginators
		$('.diseaseListGrid .pagination button').unbind().bind('click', function () {
			if ($(this).hasClass('next')) { curPage++; }
			else if ($(this).hasClass('prev')) { curPage--; }
			updateTable();
			return false;
		});

		// search table
		var toID = -1;
		$('.diseaseListGrid table .filterInput').unbind().bind('change keydown paste', function (event) {
			var t = $(this);
			if (toID != -1) { clearTimeout(toID); }
			toID = setTimeout(function () {
				tableSearchFilter = t.val().toLowerCase();
				curPage = 0;
				updateTable();
				if (t.val().length) { $('.diseaseListGrid table button.clear-field').show(); }
				else { $('.diseaseListGrid table button.clear-field').hide(); }
				toID = -1;
			}, 500);
		});

		// clear search field button
		$('.diseaseListGrid table button.clear-field').unbind().bind('click', function () {
			$('.diseaseListGrid table .filterInput').val('');
			tableSearchFilter = '';
			curPage = 0;
			updateTable();
			$(this).hide();
			return false;
		});

		// sorting
		$('.diseaseListGrid .tr-ng-sort').unbind().bind('click', function () {
			var d = $(this).find('div');
			if (d.hasClass('tr-ng-sort-reverse')) {
				d.removeClass('tr-ng-sort-reverse');
			}
			else {
				d.addClass('tr-ng-sort-reverse');
			}
			sortFieldReverse = d.hasClass('tr-ng-sort-reverse');
			sortFieldName = $(this).attr('data-field-name');

			$('.diseaseListGrid .tr-ng-sort > div').removeClass('tr-ng-sort-active');
			d.addClass('tr-ng-sort-active');

			updateTable();

			return false;
		});
	}
	function updateTable() {
		filterTableData();
		var _html = '',
			start = (curPage * perPage),
			end = start + perPage;
		tableLimit = tableData.length;
		if (end > tableData.length) { end = tableData.length; }
		for (i = start; i < end; i++) {
			_html += '<tr>' +
				'<td>' +
				'<span style="padding-left:37px;"><input type="checkbox" class="diseaseCheckBox" data-disease="' + tableData[i].disease + '" data-select="' + tableData[i].selected + '"></input></span>' +
				'</td>' +
				'<td>' +
				'<span style="display:block;" class="truncate" title="' + tableData[i].disease + '">' + tableData[i].disease + '</span>' +
				'</td>' +
				'</tr>';
		}
		$('.diseaseListGrid table tbody').html(_html);

		if (curPage + 1 == numPages) { $('.diseaseListGrid .pagination button.next').attr('disabled', 'disabled'); }
		if (curPage > 0) { $('.diseaseListGrid .pagination button.prev').removeAttr('disabled'); }
		if (curPage - 1 == -1) { $('.diseaseListGrid .pagination button.prev').attr('disabled', 'disabled'); }
		if (curPage < numPages - 1) { $('.diseaseListGrid .pagination button.next').removeAttr('disabled'); }

		
		if(tableData.length <= 0){
			$('.diseaseListGrid table .pagination span').html( ( start ) + '-' + end + ' of ' + tableData.length );
			$('.diseaseListGrid .pagination button.next').attr('disabled', 'disabled');
			$('.diseaseListGrid .pagination button.prev').attr('disabled', 'disabled');
		}else{
			$('.diseaseListGrid table .pagination span').html((start + 1) + '-' + end + ' of ' + tableData.length);
		}
		
		$(".diseaseListGrid td span input[type=checkbox]").each(function () {
			if ($(this).attr('data-select') == 'true') {
				$(this).attr("checked", "checked");
			}
		});
		$('.diseaseCheckBox').change(function () {
			var _checked = $(this).is(":checked");
			var _disease = $(this).attr('data-disease');
			updateSelectedStatus(_disease,_checked);
			makeDiseaseAsFavorite(_disease, _checked);
		})
	}
	function updateSelectedStatus(disease,status)
	{
		for(var i=0;i<tableData.length;i++)
		{
			if(disease == tableData[i].disease){
				tableData[i].selected = status;
				break;
			}
		}		
	}
	function filterTableData() {

		tableData = [];

		for (var i = 0; i < rawTableData.length; i++) {
			var _disease = rawTableData[i].disease;
			if (_disease.toLowerCase().indexOf(tableSearchFilter) !== -1) {
				tableData.push(rawTableData[i])
			}
		}

		//sort
		tableData.sort(function (a, b) {
			if (b[sortFieldName] < a[sortFieldName]) return -1;
			if (a[sortFieldName] < b[sortFieldName]) return 1;
			return 0;
		});
		if (sortFieldReverse) { tableData.reverse(); }

		numPages = Math.ceil(tableData.length / perPage);
	}
	function makeDiseaseAsFavorite(disease, status) {
		var _data = {
			"authTicket": '',
			"data": {
				"disease": disease,
				"isFavorite": status
			}
		};
		$.ajax({
			url: _appRoot + "/api/user/favorite/disease/update",
			type: 'POST',
			data: JSON.stringify(_data),
			contentType: 'application/json',
			beforeSend: function (xhr) {
				xhr.setRequestHeader('harbinger-auth-ticket', _authTicket);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				if (typeof (errorCallback) == 'function') {
					errorCallback(errorThrown);
				}
			},
			success: function (data, textStatus, jqXHR) {
				var data = [{ 'disease': _data.data.disease, 'checked': _data.data.isFavorite }]
				if (_diseaseListUpdate) { _diseaseListUpdate(data) }
			}
		});

	}
	/** 
	 * Data source retrieval
	 * @namespace BSVE.api.datasource
	 * @memberof BSVE.api
	 */
	ns.api.datasource = ns.api.datasource || {};

	/**
	 * Lists all available datasources and more detailed information about each data source.
	 * @param {function} callback - Function to be exectuted once server result has been received.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.datasource
	 * @alias BSVE.api.datasource.list
	 */
	ns.api.datasource.list = function(callback)
	{
		$.ajax({
			url: _searchAPIRoot + "/api/data/list",
			data: {cache : false },
			type: 'GET',
			beforeSend: function(xhr)
			{
				xhr.setRequestHeader('harbinger-auth-ticket', _authTicket);
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				console.log(errorThrown);
			},
			success: function(data, textStatus, jqXHR)
			{
				if ( typeof(callback) == 'function' ){callback(data);}
			}
		});

		return BSVE;
	}

	/**
	 * The BSVE.api.datasource.read method is depricated and will be removed in a future release of the BSVE API. Instead use the BSVE.api.query and BSVE.api.result methods.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.datasource
	 * @alias BSVE.api.datasource.read
	 */
	ns.api.datasource.read = function()
	{
		console.log('The BSVE.api.datasource.read method is depricated and will be removed in a future release of the BSVE API. Instead use the BSVE.api.result method');
		return BSVE;
	}

	/**
	 * Query a datasource and get the result id. The result id is then used in the {@link BSVE.api.datasource.result} method to retrieve the full list of results.
	 * @param {string} dataSource - The string name of the Datasource to query.
	 * @param {string} filter - The string query to apply.
	 * @param sourceValues
	 * @param {string} orderBy - The string key to sort the results by.
	 * @param {function} completeCallback - Callback to execute once the query has been performed on the server and has sent the response. 
	 * The function will return one argument - requestId which is the id needed to retrieve the results of this query.
	 * @param {function} errorCallback - Callback to execute in the event of an error.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.datasource
	 * @alias BSVE.api.datasource.query
	 */
	ns.api.datasource.query = function(dataSource, filter, sourceValues, orderBy, completeCallback, errorCallback)
	{
		var query = '' + dataSource;
		if ( filter || sourceValues || orderBy ) { query += '?'; }
		if ( sourceValues ){ query += '$source=' + sourceValues.join(','); }
		if ( filter ){ query += '$filter=' + filter; }
		if ( orderBy ){ query += '&$orderby=' + orderBy; }

		$.ajax({
			url: _searchAPIRoot + "/api/data/query/" + query,
			type: 'GET',
			contentType : 'application/json',
			beforeSend: function(xhr)
			{
				xhr.setRequestHeader('harbinger-auth-ticket', _authTicket);
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				if ( typeof(errorCallback) == 'function' )
				{
					errorCallback(errorThrown);
				}
			},
			success: function(data, textStatus, jqXHR)
			{
				if ( typeof(completeCallback) == 'function' )
				{
					completeCallback(data.requestId);
				}
			}
		});

		return BSVE;
	}
	
	/**
	 * Retrieve the full list of results from a requestId. The object returned by this will have one of 3 status codes. 0 - in progress, 1 - complete, and -1 error. 
	 * This operation will take an indefinite amount of time and therefore will need to be called on an interval(ex. setInterval()) until the status code 1 is received.
	 * @param {string} id - The requestId to retrieve the results for.
	 * @param {function} completeCallback - Callback function to be executed when the server sends a response.
	 * @param {function} errorCallback - Callback to execute in the event of an error.
	 * @param {number} skip - The number of records to be skipped
	 * @param {number} top - The number of records to be returned
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.datasource
	 * @alias BSVE.api.datasource.result
	 */
	ns.api.datasource.result = function(id, completeCallback, errorCallback, skip, top)
	{
		var query = '';
		if (skip || top) {
			query += '?';
			if (skip) {
				query += '$skip=' + skip;
			}
			if (top) {
				if (!query.endsWith('?')) {
					query += '&';
				}
				query += '$top=' + top;
			}
		}
		
		$.ajax({
			url: _searchAPIRoot + "/api/data/result/" + id + query,
			type: 'GET',
			contentType : 'application/json',
			beforeSend: function(xhr)
			{
				xhr.setRequestHeader('harbinger-auth-ticket', _authTicket);
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				if ( typeof(errorCallback) == 'function' )
				{
					errorCallback(errorThrown);
				}
			},
			success: function(data, textStatus, jqXHR)
			{
				if ( typeof(completeCallback) == 'function' )
				{
					completeCallback(data);
				}
			}
		});

		return BSVE;
	}

	/** 
	 * IN PROGRESS: Perform BSVE analytics
	 * @namespace BSVE.api.analytics
	 * @memberof BSVE.api
	 */
	ns.api.analytics = ns.api.analytics || {};

	/**
	 * List the available system analytics.
	 * @param {function} callback - Function to be exectuted once server result has been received.
	 * @param {string} [analytic] - Optionally pass in the specific analytic to get information for rather than the full list.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.analytics
	 * @alias BSVE.api.analytics.list
	 */
	ns.api.analytics.list = function(callback, analytic)
	{
		var _analytic = '';
		if (analytic) _analytic = '/' + analytic;
		$.ajax({
			url: _searchAPIRoot + "/api/analytics/list" + _analytic,
			data: {cache : false },
			type: 'GET',
			beforeSend: function(xhr)
			{
				xhr.setRequestHeader('harbinger-auth-ticket', _authTicket);
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				console.log(errorThrown);
			},
			success: function(data, textStatus, jqXHR)
			{
				if ( typeof(callback) == 'function' ){callback(data);}
			}
		});

		return BSVE;
	}

	/**
	 * Run an analytic on the server and get the requestId for that analytic to retrieve the results.
	 * @param {string} analyticName - The string name of the analytic to run.
	 * @param {string} analyticParams - The string parameters of the analytic to run.
	 * @param {function} completeCallback - Callback function to be executed when the server sends a response.
	 * @param {function} errorCallback - Callback to execute in the event of an error.
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.analytics
	 * @alias BSVE.api.analytics.run
	 */
	ns.api.analytics.run = function(analyticName, analyticParams, completeCallabck, errorCallback)
	{
		$.ajax({
			url: _searchAPIRoot + "/api/analytics/run/" + analyticName + '?params=' + analyticParams,
			data: {cache : false },
			type: 'GET',
			beforeSend: function(xhr)
			{
				xhr.setRequestHeader('harbinger-auth-ticket', _authTicket);
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				if ( typeof(errorCallback) == 'function' ){ errorCallback(errorThrown); }
			},
			success: function(data, textStatus, jqXHR)
			{
				if ( typeof(completeCallabck) == 'function' ){ completeCallabck(data); }
			}
		});

		return BSVE;
	}


	/**
	 * Gets the result for the specified analytic. The object returned by this will have one of 3 status codes. 0 - in progress, 1 - complete, and -1 error. 
	 * This operation will take an indefinite amount of time and therefore will need to be called on an interval(ex. setInterval()) until the status code 1 is received.
	 * @param {string} id - The id of the analytic to retrieve the result for.
	 * @param {function} completeCallback - Callback function to be executed when the server sned a response.
	 * @param {function} errorCallback - Callback to execute in the event of an error.
	 * @param {number} skip - The number of records to be skipped
	 * @param {number} top - The number of records to be returned
	 * @returns {object} BSVE root object
	 * @memberof BSVE.api.analytics
	 * @alias BSVE.api.analytics.result
	 */
	ns.api.analytics.result = function(id, completeCallback, errorCallback, skip, top)
	{
		var query = '';
		if (skip || top) {
			query += '?';
			if (skip) {
				query += '$skip=' + skip;
			}
			if (top) {
				if (!query.endsWith('?')) {
					query += '&';
				}
				query += '$top=' + top;
			}
		}
		$.ajax({
			url: _searchAPIRoot + "/api/analytics/result/" + id + query,
			type: 'GET',
			contentType : 'application/json',
			beforeSend: function(xhr)
			{
				xhr.setRequestHeader('harbinger-auth-ticket', _authTicket);
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				if ( typeof(errorCallback) == 'function' )
				{
					errorCallback(errorThrown);
				}
			},
			success: function(data, textStatus, jqXHR)
			{
				if ( typeof(completeCallback) == 'function' )
				{
					completeCallback(data);
				}
			}
		});

		return BSVE;
	}


	/** 
	 * Real time social data streaming services
	 * @namespace BSVE.api.socialstream
	 * @memberof BSVE.api
	 */
	ns.api.socialstream = ns.api.socialstream || {};

	/**
	 * Twitter Social Stream
	 */
	ns.api.socialstream.tweets = function(callback)
	{
		$.ajax({
			url: 'http://nolo-tr.elasticbeanstalk.com/tweets/realtime',
			type: 'GET',
			beforeSend: function(xhr)
			{},
			error: function(jqXHR, textStatus, errorThrown)
			{
				console.log(errorThrown);
			},
			success: function(data, textStatus, jqXHR)
			{
				if ( typeof(callback) == 'function' ){callback(data);}
			}
		});

		return BSVE;
	}

	/** 
	 * Date formatters
	 * @namespace BSVE.api.dates
	 * @memberof BSVE.api
	 */
	ns.api.dates = ns.api.dates || {};

	/**
	 * Mar 02 2014 - MDY
	 * @param {string|number|object} input - The input date to transform.
	 * @returns {string} The transformed date string.
	 * @memberof BSVE.api.dates
	 * @alias BSVE.api.dates.Mddyy
	 */
	ns.api.dates.Mddyy = function(input)
	{
		var d = new Date(input);
		return d.toString().split(' ').slice(1,4).join(' ');
	}
	
	/**
	 * Mar 02 2014 - MDY
	 * @param {string|number|object} input - The input date to transform.
	 * @returns {string} The transformed UTC date string.
	 * @memberof BSVE.api.dates
	 * @alias BSVE.api.dates.UTCMddyy
	 */
	ns.api.dates.UTCMddyy = function(input)
	{
		var d = new Date(input).toUTCString();
		return d.toString().split(' ').slice(1,4).join(' ');
	}

	/**
	 * 2015-02-03 - YmD
	 * @param {string|number|object} input - The input date to transform.
	 * @returns {string} The transformed date string.
	 * @memberof BSVE.api.dates
	 * @alias BSVE.api.dates.yymmdd
	 */
	ns.api.dates.yymmdd = function(input)
	{
		var d = new Date(input);
		return d.getFullYear() + '-' + zeroPad(d.getMonth() + 1) + '-' + zeroPad(d.getDate());
	}


	/////////////////////////////////////////
	// Private Methods/Variables
	/////////////////////////////////////////
	var _initializing = false,
		_initialized = false,
		_ready = false,
		_msgs = [];

	// workbench vars
	var _id,
		_user,
		_userData,
		_tenancy,
		_authTicket,
		_appRoot,
		_appName,
		_searchAPIRoot,
		_analyticsAPIRoot,
		_statisticsAPIRoot,
		_app_id,
		_wordBank,
		_app_launchType,
		_webSocketServerRoot,
		_sdkDataApiRoot,
		_twitterDefaultDays,
		_twitterMaxDays,
		_fedDefaultDays;

	// callbacks
	var _initCB = null,
		_alertCB = null,
		_searchCB = null,
		_itemTagCB = null,
		_itemUnTagCB = null,
		_exchangeReceiveCB = null,
		_currentSelectedDossierAndEventBio = null,
		_tenantSpecificDataSourceList = null,
		_diseaseListUpdate = null;

	/** @private */
	function zeroPad(val)
	{
		if ( val < 10 ){ return '0' + val; }
		return val;
	}

	/** @private */
	function init(data)
	{
		_id = data.id;
		_user = data.user;
		_userData = data.userData;
		_tenancy = data.tenancy;
		_authTicket = data.authTicket;
		_app_id = data.app_id; // not sure about this vs id
		_appName = data.app_name; 
		_app_launchType = data.launchType;
		_initialized = true;
		_wordBank = data.wordBank;
		_appRoot = data.serviceRegistry['HARBINGER_API_WORKBENCH'];
		_searchAPIRoot = data.serviceRegistry['HARBINGER_API_SEARCH'];
		_analyticsAPIRoot = data.serviceRegistry['HARBINGER_API_ANALYTICS'];
		_statisticsAPIRoot = data.serviceRegistry['HARBINGER_API_STATISTICS'];
		_webSocketServerRoot = data.serviceRegistry['HARBINGER_WEBSOCKET_SERVER'];
		_sdkDataApiRoot = data.serviceRegistry['SDK_DATA_SERVICES_ENDPOINT'];
		_twitterDefaultDays=data.twitterDefaultDays;
		_twitterMaxDays=data.twitterMaxDays;
		_fedDefaultDays=data.fedDefaultDays;	
		_tenantSpecificDataSourceList = data.tenantSpecificDataSourceList;	

		_detectApp = data.detectApp;

		if ( _initCB ) _initCB();
	}

	/** @private */
	function jqLoaded()
	{
		// load datepicker
		$.getScript('//cdn.bsvecosystem.net/bootstrap-datepicker-1.0.js', function(){
			_ready = true;
			searchbar();
			while ( _msgs.length )
			{
				messageHandler(_msgs.shift());
			}
		});
	}

	/** @private */
	function messageHandler( event )
	{
		if ( !_ready )
		{
			_msgs.push(event);
		}
		else
		{
			var data = JSON.parse(event.data);
			switch ( data.type )
			{
				case 'init':
					init( data.value );
					break;
				case 'dossierSet':
					setDossier(data.value);
					break;
				case 'eventComponents':
					eventComponents = data.value.sort(function(a,b)
					{
						if ( a.label > b.label )
						{
							return 1;
						}
						if ( a.label < b.label )
						{
							return -1; 
						}
					});
					break;
				case 'dossierList':
					updateDossierbar(data.value);
					break;
				case 'searchBox':
					if ( _searchCB ) { toggleSearchbar(data.value ? 1 : -1); }
					break;
				case 'locationList':
					$('.location-section-inline').data().update(data.value);
					break;
				case 'alertConfirm':
					if ( _alertCB )
					{
						_alertCB(data.value);
						_alertCB = null;
					}
				case 'itemComplete':
					if ( data.value && _itemTagCB )
					{
						for ( var i = 0; i < data.value.data.length; i++ )
						{
							// need to make sure it is the right one in the case of multiple selectios
							$('.tagging').each(function()
							{
								if ( $(this).hasClass('status-btn') || data.value.data[i].status == $(this).val() )
								{
									$(this).attr('data-item-id', data.value.data[i].itemId).removeClass('tagging');
								}
							});
						}
						_itemTagCB(data.value.data[0].itemId);
					}
					break;
				case 'unTagItemComplete':
					if ( data.value && _itemUnTagCB )
					{
						_itemUnTagCB(data.value);
					}
					break;
				case 'searchAppInit':
					if ( typeof( data.value.term ) != 'undefined' )
					{
						if ( _searchCB )
						{
							$('.searchBar #keyword').val(data.value.term);
							var _fDate = ns.api.dates.Mddyy(data.value.startDate);
							var _toDate = ns.api.dates.Mddyy(data.value.endDate);
							$('#fromDP').val(_fDate);
							$("#toDP").val(_toDate);
							$('#fromDP').data({date: _fDate}).datepicker('update').children("input").val(_fDate);
							$('#toDP').data({date: _toDate}).datepicker('update').children("input").val(_toDate);
							$('#fromDP').datepicker('setEndDate', _toDate);
							$('#toDP').datepicker('setStartDate', _fDate);
							_searchCB(data.value);
						}
						else
						{
							console.log('no search cb');
						}
					}
					break;
				case 'autoSearch':
					ns.api.search.trigger({
						term: data.value.term,
						originalTerm: data.value.originalTerm,
						startDate: data.value.fromDate,
						endDate: data.value.toDate,
						rawQuery: data.value
					});
					break;
				case 'fedSearch':
					_searchCB(data.value);
					break;
				case 'exchange':
					if ( _exchangeReceiveCB ){ _exchangeReceiveCB(data.value); }
					if(data.value && data.value.fromDate && data.value.toDate){
						var _fDate = ns.api.dates.Mddyy(data.value.fromDate);
						var _toDate = ns.api.dates.Mddyy(data.value.toDate);
						$('#fromDP').val(_fDate);
						$("#toDP").val(_toDate);
						$('#fromDP').data({date: _fDate}).datepicker('update').children("input").val(_fDate);
						$('#toDP').data({date: _toDate}).datepicker('update').children("input").val(_toDate);
						$('#fromDP').datepicker('setEndDate', _toDate);
						$('#toDP').datepicker('setStartDate', _fDate);
					}
					break;
				default:
					console.log('unknown type', data);
					break;
			}
		}
	}

	/** @private */
	function sendWorkbenchMessage( type, msg )
	{
		var _json = JSON.stringify( { "id":_id, "type":type, "value":msg } );
		top.postMessage( _json, '*' );
	}

})( BSVE );


// callback documentation
/**
 * Executes when init has completed.
 * @callback initCallback
 */

/**
 * Executes when alert has been closed via the OK button.
 * @callback alertCallback
 */

/**
 * Executes when a search has been submitted via the inline searchbar or by the user executing a federated search.
 * Passes search object with the following signature: {
	term: search term - if defined | string,
	startDate: start date - if defined | string,
	endDate: end date - if defined | string,
	locations: list of locations - if defined | array[string]
 }
 * @callback searchSubmitCallback
 */

/**
 * Executes when item has been tagged and a response has been recieved from the server.
 * @callback itemTagCallback
 */
