// data loader
function DataLoader(){
	if (!this instanceof DataLoader) return new DataLoader();
	return this;
};

// retrieve via xhr
DataLoader.prototype.get = function(url, fn){
	$.ajax({
		method: "GET",
		url: url,
		dataType: ((/\.json($|\?)/.test(url)) ? "json" : "text"),
		crossDomain: true,
		success: function(data, status, xhr) {
			fn(null, data);
		},
		error: function(){
			fn(true);
		}
	});
};

// get check latest version via xhr
DataLoader.prototype.check = function(url, fn){

	// sadly, xhr does not play well with etags and nginx,
	// so we have to make a head request first
	$.ajax({
		method: "HEAD",
		url: url,
		dataType: "json",
		crossDomain: true,
		success: function(data, status, xhr){
			if (xhr.status === 200 || xhr.status === 304) {
				// request was successful
				try {
					var latest = (new Date(xhr.getResponseHeader("Last-modified"))).valueOf();
				} catch (e){
					// no date
					return fn(e);
				}
				return fn(null, latest);
			} else {
				// request failed
				fn(true);
			}
		}, 
		error: function(err){
			return fn(err);
		}
	});
};

// retrieve an item from localstorage
DataLoader.prototype.retrieve = function(h, fn){
	var self = this;

	// check if localstorage is available
	if (!self.hasLocalStorage()) return fn(null);

	// try retrieving from localstorage
	try {
		var v = JSON.parse(localStorage.getItem(h));
	} catch(e){
		return fn(null);
	}

	return fn(v);

};

// get data
DataLoader.prototype.getData = function(url, hash, fn){
	var self = this;
	//var h = self.hash(url);
	var h = hash;
	self.retrieve(h, function(v){
		if (v === null || v.ts < ((new Date()).valueOf()-86400000)) {
			// data is out of date, check for new data
			self.check(url, function(err, latest){
				if (err) {
					if (v) return fn(null, v.data); // No connection, but cache? Well, use cache!
					return fn(err);
				}
				if (v === null || latest > v.ts) {
					// fetch new data
					self.get(url, function(err, data){
						if (err) return fn(err);
						// serve new data and store
						if (self.hasLocalStorage()) {
							localStorage.clear();
							localStorage.setItem(h, JSON.stringify({
								ts: ((new Date()).valueOf()),
								data: data
							}));
						}
						fn(null, data);
					});
				} else {
					// serve from localstorage
					fn(null, v.data);
				}
			});
		} else {
			// data is still within best-before, serve from localstorage
			return fn(null, v.data);
		}
	});
	return this;
};

// does the browser have localStorage?
DataLoader.prototype.hasLocalStorage = function(){
	var self = this;
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
};

// a fast hashing method
DataLoader.prototype.hash = function(str) {
	var hash = 0, i, chr, len;
	if (str.length == 0) return hash;
	for (i = 0, len = str.length; i < len; i++) { chr   = str.charCodeAt(i); hash  = ((hash << 5) - hash) + chr; hash |= 0; }
	return Math.abs(hash).toString(36);
};