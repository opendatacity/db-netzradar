$(document).ready(function(){
	"use strict";

	var dataPath = 'http://netzradar.deutschebahn.com/assets/data/';
	var zoomAnimation = false;

	// Find optimal data resolution
	var filename = function () {
		var agent = navigator.userAgent.toLowerCase();

		if (
			(agent.indexOf('windows nt')   >= 0) ||
			(agent.indexOf('macintosh')    >= 0) ||
			(agent.indexOf('linux x86_64') >= 0)) {
			zoomAnimation = true;
			return '1000';
		}

		if ((agent.indexOf('iphone') >= 0) || (agent.indexOf('ipad') >= 0)) {
			try { if (parseFloat(agent.match(/OS ([0-9]+)/i)[1]) >= 6) return '2000'; } catch (e) { }
			return '2000';
		}

		if (agent.indexOf('android') >= 0) {
			try { if (parseFloat(agent.match(/Android ([0-9]+)/i)[1]) > 4) return '2000'; } catch (e) { }
			return '4000';
		}

		return '4000';
	}();

	// hispeed means reduced drawing complexity and is used in layers.js
	var hispeed = (parseFloat(filename) > 2000);

	filename = 'data'+filename+'.json';
	if (('_filename' in window) && (_filename != undefined)) {
		filename = _filename;
		hispeed = true;
	}

	// check browser capability - note that this is es4 on purpose
	var capabilities = ["js","canvas","canvastext","backgroundsize","localstorage","cors","bgsizecover"];
	var capc = 0;
	var $doc = $('html');
	$doc.addClass('js').removeClass('nojs');
	for (var i=0; i < capabilities.length; i++) { if ($doc.hasClass(capabilities[i])) { capc++; }}
	if (capc < capabilities.length) { $doc.addClass("please-upgrade"); return; }

	// show system loader if interface is available
	if (window.hasOwnProperty("P3JsInterface") && window.P3JsInterface.hasOwnProperty("showLoader") && (typeof window.P3JsInterface.showLoader === "function")) window.P3JsInterface.showLoader();
	if ($('#spinner').length === 1) $doc.addClass('wait');

	// get instance of dataloader
	var dl = new DataLoader();

	var germany, values, trackLayer;
	
	// initial map state
	var state = { provider: "a", lte: true };
	
	// check for injected data from app
	if (window.hasOwnProperty("insInfo") && typeof window.insInfo.netop === "string" && window.insInfo.netop !== ""){
		switch (window.insInfo.netop.toString()) {
			case "26201": state.provider = "1"; break;
			case "26202": state.provider = "2"; break;
			case "26203": state.provider = "3"; break;
			case "26207": state.provider = "7"; break;
		}
		state.lte = (window.insInfo.nettype.toLowerCase() === "lte");
		$('body').addClass("provider-"+state.provider);
	};
	
	// germany bounding box
	var map_bounds = L.latLngBounds(L.latLng(46, 5), L.latLng(56, 17	));
	
	// determine inital zoom
	var zoom = function () {
		var width = $(window).width();
		var height = $(window).height();
		if (width < 540) return 5;
		if (height < 550) return 5;
		if (width < 960) return 6;
		if (height < 960) return 6;
		if (width < 1920) return 7;
		if (height < 1920) return 7;
		return 8;
	}();
	
	// initialize map
	var map = L.map('map', {
		zoomAnimation: zoomAnimation,
		minZoom: zoom,
		maxZoom: 12,
		maxBounds: map_bounds,
		zoomControl: false,
		attributionControl: false
	});

	// restrict map to bounding box and set initial zoom
	map.fitBounds(map_bounds);
	map.setZoom(zoom);
		
	// map init: add tracklayer when data is loaded
	var initialized = false;
	function init() {
		if (!germany || !values) return;
		if (initialized) return;

		trackLayer = new TrackLayer(map, germany, values, hispeed); 
		trackLayer.layer.once('load', function(){
			if (window.hasOwnProperty("P3JsInterface") && window.P3JsInterface.hasOwnProperty("hideLoader") && (typeof window.P3JsInterface.hideLoader === "function")) window.P3JsInterface.hideLoader();
			if ($('#spinner').length === 1) $doc.removeClass('wait');
		});
		
		update();

		initialized = true;
	};
	

	dl.getData(dataPath + filename, 'data', function (err, data){
		if (err) {
			try {
				data = _data;
			} catch (e) {

			}
		}
		germany = data.geo;
		values = data.values;
		init();
	});

	// map state update
	function update() {
		if (trackLayer) runImmediately(function() {
			trackLayer.setFilter(state.provider, !state.lte);
		});
	};
	
	// handle zoom events
	var $minzoom = map.getMinZoom();
	var $maxzoom = map.getMaxZoom();
	var $zoomin  = $('a.zoom-in',  '#sidebar');
	var $zoomout = $('a.zoom-out', '#sidebar');

	// activate zoom buttons
	$zoomin.click(function(evt){
		evt.preventDefault();
		map.zoomIn();
	});

	$zoomout.click(function(evt){
		evt.preventDefault();
		map.zoomOut();
	});

	// change zoom button status on zoom event
	map.on("zoomend", function(){
		$zoomin.removeAttr("disabled");
		$zoomout.removeAttr("disabled"); 
		switch (map.getZoom()) {
			case $minzoom: $zoomout.attr("disabled", "disabled"); break;
			case $maxzoom: $zoomin.attr("disabled", "disabled"); break;
		}
	}).fire("zoomend");

	// handle providers
	var $providers = $('.provider-list a', '#providers');
	$providers.each(function(idx,e){
		var $provider = $(e);
		$provider.click(function(evt){
			evt.preventDefault();
			// bur element
			$(this).blur()
			// check for provider change
			if (state.provider === $provider.attr("data-provider")) return;
			// update style
			$providers.removeClass('active');
			$provider.addClass('active').blur();
			// update state
			state.provider = $provider.attr("data-provider");
			// change legend
			$('body').removeClass(function(index, css) {
				return (css.match(/(^|\s)provider-\S+/g) || []).join(' ');
			}).addClass("provider-"+state.provider);
			// update map
			update();
		});
	});

	// handle lte button
	var $ltetoggle = $('a.lte-toggle', '#lteswitch');
	$ltetoggle.click(function(evt){
		evt.preventDefault();
		$ltetoggle.toggleClass('active').blur();
		state.lte = $ltetoggle.hasClass('active');
		// update map
		update();
	});
	
	// handle locate button
	var $locatetoggle = $('a.locate', '#locate');
	var $locatemarker = null;
	var $locateaccuracy = null;
	var $locatetracker = null;
	var $locatepos = null;
	var $locateacc = null;
	$locatetoggle.click(function(evt){
		evt.preventDefault();
		$locatetoggle.blur();
		if (!navigator.geolocation) return;
		$locatetoggle.toggleClass('active');
		if ($locatetoggle.hasClass('active')) {
			// jic: if marker is present, remove it.
			if ($locatemarker !== null) map.removeLayer($locatemarker);
			// start tracking, add marker
			var _track = function(pos){
				// position and accuracy
				$locatepos = L.latLng(pos.coords.latitude, pos.coords.longitude);
				if (!map_bounds.contains($locatepos)) {
					// FIXME: feedback on out of bounds
					return;
				}
				$locateacc = parseInt(pos.coords.accuracy,10);
				// handle accuracy
				if (!isNaN($locateacc) && $locateacc > 1000) {
					if (!$locateaccuracy && !isNaN($locateacc)) {
						$locateaccuracy = L.circle($locatepos, $locateacc, {
							stroke: false,
							fill: "rgba(0,135,255,0.1)",
							clickable: false
						}).addTo(map);
					} else {
						$locateaccuracy.setLatLng($locatepos);
						$locateaccuracy.setRadius($locateacc);
					}
				} else if ($locateaccuracy) {
					map.removeLayer($locateaccuracy);
					$locateaccuracy = null;
				}
				if ($locatemarker === null) {
					// create new marker
					$locatemarker = L.marker($locatepos, {
						clickable: false,
						icon: L.icon({
							iconUrl: 'assets/images/locationmarker-foreground.png',
							iconRetinaUrl: 'assets/images/locationmarker-foreground.png',
							iconSize: [50,50],
							iconAnchor: [9,9],
							popupAnchor: [-3, -76],
							shadowUrl: 'assets/images/locationmarker-shadow.png',
							shadowRetinaUrl: 'assets/images/locationmarker-shadow.png',
							shadowSize: [50,50],
							shadowAnchor: [9,9]
						})
					}).addTo(map);
					// update position
					$locatemarker.setLatLng($locatepos);
					map.setView($locatepos,12);
				}
			};
			// if tracker is not disabled, request position from geolocation api
			if (!window.hasOwnProperty("insInfo") || !window.insInfo.hasOwnProperty("disableTracking") || (window.insInfo.disableTracking !== true && window.insInfo.disableTracking !== "true")) {
				$locatetracker = navigator.geolocation.watchPosition(_track, function(){}, {
					enableHighAccuracy: true,
					maximumAge: 60000
				});
			};
			// check for initial position from app, check for bbox
			if (window.hasOwnProperty("insInfo") && window.insInfo.hasOwnProperty("lng") && !window.insInfo.hasOwnProperty("lon")) window.insInfo.lon = window.insInfo.lng;
			if (window.hasOwnProperty("insInfo") && window.insInfo.hasOwnProperty("lat") && parseFloat(window.insInfo.lat) !== 0 && parseFloat(window.insInfo.lon) !== 0 && map_bounds.contains(L.latLng(parseFloat(window.insInfo.lat), parseFloat(window.insInfo.lon)))) _track({ coords: { latitude: parseFloat(window.insInfo.lat), longitude: parseFloat(window.insInfo.lon), accuracy: window.insInfo.acc}});
		} else {
			// stop tracking
			if (!window.hasOwnProperty("insInfo") || !window.insInfo.hasOwnProperty("disableTracking") || (window.insInfo.disableTracking !== true && window.insInfo.disableTracking !== "true")) {
				navigator.geolocation.clearWatch($locatetracker);
			};
			map.removeLayer($locatemarker);
			if ($locateaccuracy !== null) map.removeLayer($locateaccuracy);
			$locatetracker = null;
			$locatemarker = null;
			$locateaccuracy = null;
		}
	});
	
	// hide tracking button
	if (window.hasOwnProperty("insInfo") && window.insInfo.hasOwnProperty("enableTracking") && (window.insInfo.enableTracking !== true || window.insInfo.enableTracking !== "true")) $(".show-geolocation","#container").hide();
	
	// global locate button trigger, regardless of state
	window.enableGps = function(action){
		$locatetoggle.removeClass('active');
		if (!action) $locatetoggle.addClass('active');
		$locatetoggle.trigger('click');
	};
	
	/** standalone-specific code **/
	if ($('body').hasClass('standalone')) {
	
		// close buttons
		$('.nav-content .close', '#container').click(function(evt){
			evt.preventDefault();
			var $parent = $(this).closest('.nav-content');
			$parent.fadeOut('fast');
			$('header nav a').removeClass('active');
		});
	
		// menu items
		$('header nav a').each(function(idx,e){
			var $nav = $(e);
			var $target = $($nav.attr("data-show"));
			$nav.click(function(evt){
				evt.preventDefault();
				$nav.blur();
				if ($nav.hasClass('active')) {
					$target.fadeOut('fast');
					$nav.removeClass('active');
				} else {
					$('header nav a').removeClass('active');
					$('.nav-content', '#container').each(function(idx, e){
						$(e).fadeOut('fast');
					});
					$nav.addClass('active');
					$target.fadeIn('fast');
				}
			});
		});
		
	}
	
	/** mobile-specific code **/

	if ($('body').hasClass('mobile')) {

		// slide nav
		$('#providers .provider-list').slick({
			prevArrow: '#providers .provider-prev',
			nextArrow: '#providers .provider-next',
			initialSlide: (function(){
				if (state.provider === "a") return 0;
				return $('#providers .provider-list a[data-provider='+state.provider+']').index();
			})()
		}).on('afterChange', function(evt, slick, slide){
			// find provider
			var $provider = $('.provider-list .slick-active', '#providers');
			// check for provider change
			if (state.provider === $provider.attr("data-provider")) return;
			// update style
			$providers.removeClass('active');
			$provider.addClass('active');
			// update state
			state.provider = $provider.attr("data-provider");
			// change legend
			$('body').removeClass(function(index, css) {
				return (css.match(/(^|\s)provider-\S+/g) || []).join(' ');
			}).addClass("provider-"+state.provider);
			// update map
			update();
		});
		
		// zoom buttons
		if (!window.hasOwnProperty("insInfo") || !window.insInfo.hasOwnProperty("zoom") || window.insInfo.zoom !== false) $doc.addClass("zoom");
		
	}
	
	// set initial lte button state
	$ltetoggle.removeClass('active');
	if (state.lte) $ltetoggle.addClass('active');
	
	// blur slide nav on click
	$('a', '#providers').click(function(evt){
		$(this).blur();
	});

	function runImmediately(func) {
		if (window.requestAnimationFrame) {
			window.requestAnimationFrame(func);
		} else if (window.setImmediate) {
			window.setImmediate(func);
		} else {
			window.setTimeout(func, 0);
		}
	}
});
