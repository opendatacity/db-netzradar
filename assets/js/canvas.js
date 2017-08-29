function CanvasLayer (geoData) {
	if (!geoData) geoData = [];

	var geoDataCache = {};

	var tileSize = 256;
	if (L.Browser.retina) tileSize *= 2;

	var canvasLayer = L.tileLayer.canvas({async:true, tileSize: 256});

	var lastEntry = [];
	geoData.forEach(function (entry, index) {
		switch (entry[1][0]) {
			case 0: entry.geoType = 'line';     break;
			case 1: entry.geoType = 'polygon';  break;
			case 2: entry.geoType = 'mpolygon'; break;
			case 3: entry.geoType = 'point';    break;
			case 4: entry.geoType = 'bezierq';  break;
			case 5: entry.geoType = 'bezierc';  break;
			default: throw new Error(entry.geometry.type);
		}

		var c = entry[1][1];

		if (entry.geoType == 'bezierq') {
			// Quadratic Bezier Curve
			if ((c[0] == 0) && (c[1] == 0)) {
				c[0] = lastEntry[4];
				c[1] = lastEntry[5];
			}
			c[2] += c[0];
			c[3] += c[1];
			c[4] += c[2];
			c[5] += c[3];
			lastEntry = c;
		}

		if (entry.geoType == 'bezierc') {
			// Cubic Bezier Curve
			if ((c[0] == 0) && (c[1] == 0)) {
				c[0] = lastEntry[6];
				c[1] = lastEntry[7];
			}
			c[2] += c[0];
			c[3] += c[1];
			c[4] += c[2];
			c[5] += c[3];
			c[6] += c[4];
			c[7] += c[5];

			lastEntry = c;
		}

		entry.coordinates = c;
	});

	geoData.forEach(function (entry, index) {
		entry.box = calcBoundingbox(entry.coordinates);
		if (entry.geoType == 'point') entry.box.padding = 200;
		if (!entry.style) entry.style = {};
	});

	function calcBoundingbox(value) {
		if (Array.isArray(value[0])) {

			var x0 =  1e100;
			var y0 =  1e100;
			var x1 = -1e100;
			var y1 = -1e100;

			value.forEach(function (entry) {
				var box = calcBoundingbox(entry);
				if (x0 > box.x0) x0 = box.x0;
				if (y0 > box.y0) y0 = box.y0;
				if (x1 < box.x1) x1 = box.x1;
				if (y1 < box.y1) y1 = box.y1;
			})

			return { x0:x0, y0:y0, x1:x1, y1:y1, padding:0 }
		}

		var x0 =  1e100;
		var y0 =  1e100;
		var x1 = -1e100;
		var y1 = -1e100;

		for (var i = 0; i < value.length; i += 2) {
			var x = value[i+0]/1e6 + 0.527917;
			var y = value[i+1]/1e6 + 0.333428;
			value[i+0] = x;
			value[i+1] = y;
			if (x < x0) x0 = x;
			if (x > x1) x1 = x;
			if (y < y0) y0 = y;
			if (y > y1) y1 = y;
		}

		return { x0:x0, y0:y0, x1:x1, y1:y1, padding:0 }
	}

	canvasLayer.drawTile = function (canvas, tilePoint, zoom) {
		if (L.Browser.retina) {
			canvas.width = tileSize;
			canvas.height = tileSize;
			canvas.style.width = '256px';
			canvas.style.height = '256px';
		}

		var ctx = canvas.getContext('2d');
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		var scale = Math.pow(2, zoom+8);
		var x0 = tilePoint.x * 256/scale;
		var y0 = tilePoint.y * 256/scale;

		function getGeoData(x, y, zoom) {
			if (zoom < 5) return geoData;

			var id = [zoom, x, y].join('_');
			if (!geoDataCache[id]) {
				var data = getGeoData(Math.floor(x/2), Math.floor(y/2), zoom-1);
				var scale = Math.pow(2, zoom+8);

				var pad = 5;
				var x0 =  x    * 256/scale - pad/scale;
				var y0 =  y    * 256/scale - pad/scale;
				var x1 = (x+1) * 256/scale + pad/scale;
				var y1 = (y+1) * 256/scale + pad/scale;

				geoDataCache[id] = data.filter(function (obj) {
					var p = obj.box.padding/scale;
					if (obj.box.x0 > x1 + p) return false;
					if (obj.box.x1 < x0 - p) return false;
					if (obj.box.y0 > y1 + p) return false;
					if (obj.box.y1 < y0 - p) return false;
					return true;
				})
			}

			return geoDataCache[id];
		}


		function drawTile () {
			ctx.clearRect(0,0,tileSize,tileSize);

			if (L.Browser.retina) ctx.setTransform(2, 0, 0, 2, 0, 0);

			var data = getGeoData(tilePoint.x, tilePoint.y, zoom);

			var drawingFunctions = [];

			data.forEach(function (obj, index) {
				if (!obj.style) return;

				var level = (obj.style.layer || 0)*5;

				switch (obj.geoType) {
					case 'line':
						if (!obj.style.strokeStyle) return

						if (obj.style.heterogeneous) {
							addDrawingFunction(level + 3, function () { 
								ctx.beginPath();
								drawPolyline(obj.coordinates);
								stroke(obj.style);
							})
						} else {
							setDrawingFunction(level + 0, function () { ctx.beginPath() })
							addDrawingFunction(level + 1, function () { drawPolyline(obj.coordinates) })
							setDrawingFunction(level + 2, function () { stroke(obj.style) })
						}
					case 'bezierq':
						if (!obj.style.strokeStyle) return

						if (obj.style.heterogeneous) {
							addDrawingFunction(level + 3, function () { 
								ctx.beginPath();
								drawBezierQ(obj.coordinates);
								stroke(obj.style);
							})
						} else {
							setDrawingFunction(level + 0, function () { ctx.beginPath() })
							addDrawingFunction(level + 1, function () { drawBezierQ(obj.coordinates) })
							setDrawingFunction(level + 2, function () { stroke(obj.style) })
						}
					break;
					case 'bezierc':
						if (!obj.style.strokeStyle) return

						if (obj.style.heterogeneous) {
							addDrawingFunction(level + 3, function () { 
								ctx.beginPath();
								drawBezierC(obj.coordinates);
								stroke(obj.style);
							})
						} else {
							setDrawingFunction(level + 0, function () { ctx.beginPath() })
							addDrawingFunction(level + 1, function () { drawBezierC(obj.coordinates) })
							setDrawingFunction(level + 2, function () { stroke(obj.style) })
						}
					break;
					case 'polygon':

						addDrawingFunction(level + 0, function () {
							ctx.beginPath();
							obj.coordinates.forEach(drawPolygon);
							fill(obj.style);
							stroke(obj.style);
						})
					break;
					case 'mpolygon':
						if (obj.properties.resolution !== 'xs') return;

						addDrawingFunction(level + 0, function () {
							ctx.beginPath();
							obj.coordinates.forEach(function (c) { c.forEach(drawPolygon) });
							fill(obj.style);
							stroke(obj.style);
						})
					break;
					case 'point':
						if (obj.style.visibilityLevel && (obj.style.visibilityLevel > zoom)) return;
						if (!obj.style.label) return;
						
						var x = (obj.coordinates[0] - x0)*scale;
						var y = (obj.coordinates[1] - y0)*scale;

						insertDrawingFunction(level, function () {
							ctx.font = obj.style.font;

							var w = ctx.measureText(obj.style.label).width;
							var h = 11;
							var px = 5;
							var py = 3;

							ctx.beginPath();
							ctx.moveTo(x,y);
							ctx.lineTo(x-2,y-3);
							ctx.lineTo(x-12,y-3);
							ctx.lineTo(x-12,y-3-h-2*py);
							ctx.lineTo(x-12+w+2*px,y-3-h-2*py);
							ctx.lineTo(x-12+w+2*px,y-3);
							ctx.lineTo(x+2,y-3);
							ctx.closePath();

							ctx.fillStyle = obj.style.fillStyle;
							ctx.shadowColor = 'rgba(0,0,0,0.3)';
							ctx.shadowBlur = 5;
							ctx.shadowOffsetX = 1;
							ctx.shadowOffsetY = 1;
							ctx.fill();

							ctx.shadowColor = 'rgba(0,0,0,0)';
							ctx.fillStyle = obj.style.fontFill;
							ctx.fillText(obj.style.label, x-12+px, y-3-py-h*0.15);
						})
					break;
				}
			})

			drawingFunctions.forEach(function (funcList) {
				if (funcList) funcList.forEach(function (func) { func() });
			})

			function addDrawingFunction (level, func) {
				if (!drawingFunctions[level]) drawingFunctions[level] = [];
				drawingFunctions[level].push(func);
			}

			function insertDrawingFunction (level, func) {
				if (!drawingFunctions[level]) drawingFunctions[level] = [];
				drawingFunctions[level].unshift(func);
			}

			function setDrawingFunction (level, func) {
				drawingFunctions[level] = [func];
			}

			function drawPolyline(values) {
				values.forEach(function (point, index) {
					var x = (point[0] - x0)*scale;
					var y = (point[1] - y0)*scale;
					if (index == 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
				})
			}

			function drawBezierQ(values) {
				var xa = (values[0] - x0)*scale;
				var ya = (values[1] - y0)*scale;
				var xb = (values[2] - x0)*scale;
				var yb = (values[3] - y0)*scale;
				var xc = (values[4] - x0)*scale;
				var yc = (values[5] - y0)*scale;

				ctx.moveTo(xa, ya);
				ctx.quadraticCurveTo(xb, yb, xc, yc);
			}

			function drawBezierC(values) {
				var xa = (values[0] - x0)*scale;
				var ya = (values[1] - y0)*scale;
				var xb = (values[2] - x0)*scale;
				var yb = (values[3] - y0)*scale;
				var xc = (values[4] - x0)*scale;
				var yc = (values[5] - y0)*scale;
				var xd = (values[6] - x0)*scale;
				var yd = (values[7] - y0)*scale;

				ctx.moveTo(xa, ya);
				ctx.bezierCurveTo(xb, yb, xc, yc, xd, yd);
			}

			function drawPolygon(values) {
				for (var i = 0; i < values.length; i += 2) {
					var x = (values[i+0] - x0)*scale;
					var y = (values[i+1] - y0)*scale;
					if (i == 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
				}
				var x = (values[0] - x0)*scale;
				var y = (values[1] - y0)*scale;
				ctx.lineTo(x,y);
			}

			function stroke(style) {
				if (style.strokeStyle) {
					ctx.lineWidth = style.lineWidth || 1.0;
					ctx.strokeStyle = style.strokeStyle;
					ctx.stroke();
				}
			}

			function fill(style) {
				if (style.fillStyle) {
					ctx.fillStyle = style.fillStyle;
					ctx.fill();
				}
			}
		}

		drawTile();
		canvasLayer.tileDrawn(canvas);
	}

	return {
		layer:canvasLayer
	}
}

