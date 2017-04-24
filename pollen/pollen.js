/*global L*/
var metoffice = {
	map: null,
	day: null,
	loaded: false,
	mapDefaults: {
		backgroundTileService: "http://www.metoffice.gov.uk/public/tiles/nswws/v1/{z}/{x}/{y}.png",
		centre: [50.4138, -4.120],
		zoom: {
			max: 12,
			min: 5,
			start: 6
		}
	}

};


//
function initialiseMap() {
	"use strict";
	metoffice.map = L.map("map", {
		zoomControl: false,
		attributionControl: false,
		trackResize: true
	}).setView(metoffice.mapDefaults.centre, metoffice.mapDefaults.zoom.start, {
		animation: false
	});
	new L.Control.Zoom({
		position: "bottomright"
	}).addTo(metoffice.map);
	// Set background map layer

	L.tileLayer(metoffice.mapDefaults.backgroundTileService, {
		maxZoom: metoffice.mapDefaults.zoom.max,
		minZoom: metoffice.mapDefaults.zoom.min
	}).addTo(metoffice.map);


}

function load(file, callback) {
	"use strict";
	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open("GET", file, true); // Replace 'my_data' with the path to your file
	xobj.onreadystatechange = function () {
		//if (xobj.readyState == 4 && xobj.status == "200") {
		if (xobj.readyState === 4 && xobj.status === 200) {
			// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
			callback(xobj.responseText);
		}
	};
	xobj.send(null);
}

function setRegionStyle(feature) {
	"use strict";
	var regStyle, level = {
		"Low": "green",
		"Moderate": "orange",
		"High": "red",
		"Vhigh": "purple"
	};
	regStyle = {
		"color": level[feature.properties.pollenDays[metoffice.day].level],
		"weight": 0,
		"opacity": 0.95
	};
	return regStyle;
}

function drawRegionLayer(model) {
	"use strict";
	metoffice.pollenLayer = L.geoJSON(model, {
			style: setRegionStyle
		})
		.bindTooltip(function (layer) {
				return layer.feature.properties.region; //merely sets the tooltip text
			}, {
				className: "pollenTooltip"
			} //then add your options
		);
	metoffice.pollenLayer.addTo(metoffice.map);
	if (!metoffice.loaded) {
		metoffice.map.fitBounds(metoffice.pollenLayer.getBounds());
		metoffice.loaded = true;
	}
}

function changeDay(day) {
	"use strict";
	metoffice.day = day;
	metoffice.map.removeLayer(metoffice.pollenLayer);
	metoffice.map.removeLayer(metoffice.labelsLayer);
	drawRegionLayer(metoffice.pollenModel);
	drawLabelsLayer(metoffice.pollenModel);
}

function configureDaySlider(dayLength) {
	"use strict";
	var slider = document.getElementById("daySlider");
	slider.setAttribute("max", dayLength - 1);
	slider.disabled = false;
	metoffice.day = 0;
	//slider.onchange = changeDay;
}

function createPollenMarker(feature) {
	console.log(feature)
	var point = (turf.center(feature)).geometry.coordinates.reverse();
	var labelText = {
		"Low": "L",
		"Moderate": "M",
		"High": "H",
		"Vhigh": "V"
	}
	console.info("point", point)
	marker = new L.Marker(point, {
		icon: new L.DivIcon({
			className: "pollen" + feature.properties.pollenDays[metoffice.day].level,
			html: "<div class='pollenLabel pollen" + feature.properties.pollenDays[metoffice.day].level + "'>" + labelText[feature.properties.pollenDays[metoffice.day].level] + "</div>"
		})
	});
	return marker;
}

function drawLabelsLayer(model) {
	"use strict";
	var f, flen, markers = [],
		labels;
	for (f = 0, flen = model.features.length; f < flen; f += 1) {
		markers.push(createPollenMarker(model.features[f]));
	}
	metoffice.labelsLayer = L.layerGroup(markers);
	metoffice.labelsLayer.addTo(metoffice.map);
}

function drawPollen(data) {
	"use strict";
	var region, r, p, pollenData;
	metoffice.pollenModel = JSON.parse(data);
	load("pollen.json", function (pollen) {
		pollen = JSON.parse(pollen);
		region = metoffice.pollenModel.features;
		r = region.length;
		pollenData = pollen.document.report.region;
		while (r--) {
			p = pollenData.length;
			while (p--) {
				if (metoffice.pollenModel.features[r].properties.id.toLowerCase() === pollenData[p].id.toLowerCase())  {
					metoffice.pollenModel.features[r].properties.pollenDays = pollen.document.report.region[p].day;
				}
			}
		}
		configureDaySlider(metoffice.pollenModel.features[0].properties.pollenDays.length);
		drawRegionLayer(metoffice.pollenModel);
		drawLabelsLayer(metoffice.pollenModel);

	});
}


initialiseMap();
load("all.geojson", function (regions) {
	"use strict";
	drawPollen(regions);
});
