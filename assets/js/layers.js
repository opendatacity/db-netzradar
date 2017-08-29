function TrackLayer(map, germany, data, hispeed) {

	var gamma = Math.log(0.5)/Math.log(0.95); // Means 95% connectivity -> color value = 0.5

	var canvasLayer = new CanvasLayer(germany);

	var segments = germany.filter(function (entry) {
		return (entry[0][0] == 1) // Segment
	})

	var segmentStyle = {
		strokeStyle:'rgba(61,110,153,0.9)',
		lineWidth: 1,
		layer: 1
	}

	germany.forEach(function (entry) {
		switch (entry[0][0]) {
			case 0: // 'region'
				return entry.style = {
					strokeStyle: 'rgba(151,182,209,0.05)',
					lineWidth: 10,
					fillStyle: '#dceaf5',
					layer: 0
				}
			case 1: // 'segment'
				return entry.style = segmentStyle;
			case 2: // 'station'
				return entry.style = {
					visibilityLevel: [0,6,8,9,10,11,12][entry[0][1]],
					fillStyle: 'rgba(255,255,255,0.7)',

					label: entry[0][2],
					font: '11px "DB Office", "Helvetica"',
					fontFill: '#000',
					layer: 5
				}
		}
	})

	function setFilter(provider, no4G) {
		var filter = provider || 'a';
		if (no4G) filter += ',n4';
		
		var values  = data.values[filter];
		var qualities = data.qualities[filter];

		if (canvasLayer) map.removeLayer(canvasLayer.layer);

        provider=null; /* no color diferences */

		switch (provider) {
			case '1': var bezInterpolator = chroma.interpolate.bezier(['#222222', '#666666', '#ff0088']); break;
			case '2': var bezInterpolator = chroma.interpolate.bezier(['#222222', '#666666', '#ff0011']); break;
			case '3': var bezInterpolator = chroma.interpolate.bezier(['#222222', '#666666', '#00dd99']); break;
			case '7': var bezInterpolator = chroma.interpolate.bezier(['#222222', '#666666', '#0099ff']); break;
			default:  var bezInterpolator = chroma.interpolate.bezier(['#ee1100', '#ffaa00', '#55dd00']); break;
		}
		
		segments.forEach(function (segment, index) {
			var quality = qualities[index];

			if (quality < 1) return segment.style = segmentStyle;

			var v = Math.pow(values[index], gamma);
			var layer, lineWidth;

			if (hispeed) {
				var t = Math.round(v * 2);
				v = t / 2;
				layer = t+2;
				lineWidth = 3;
			} else {
				layer = 2;
				lineWidth = Math.min(5, Math.sqrt(quality/10)+1);
			}

			if (!segment.style || (segment.style.layer == 1)) segment.style = {};

			segment.style.strokeStyle = bezInterpolator(v).css();
			segment.style.lineWidth = lineWidth;
			segment.style.layer = layer;
			segment.style.heterogeneous = !hispeed;
		})

		map.addLayer(canvasLayer.layer, {
			async: true
		});

	}

	return {
		setFilter:setFilter,
		layer: canvasLayer.layer
	}
}
