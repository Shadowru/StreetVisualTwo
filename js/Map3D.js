(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.MAP3D = {})));
}(this, (function (exports) { 'use strict';

	function GeoProcessor(width, height, geoOptions) {

	    this.width = width;
	    this.height = height;

	    this.halfWidth = this.width / 2;
	    this.halfHeight = this.height / 2;

	    this.geoOptions = geoOptions;

	    const from = turf.point(this.geoOptions.upperLeft);
	    const longitudeTo = turf.point([this.geoOptions.downRight[0], this.geoOptions.upperLeft[1]]);
	    const latitudeTo = turf.point([this.geoOptions.upperLeft[0], this.geoOptions.downRight[1]]);

	    let longitudeDelta = turf.distance(from, longitudeTo);
	    let latitudeDelta = turf.distance(from, latitudeTo);

	    //meters conversion

	    this.longitudeDelta = longitudeDelta * 1000;
	    this.latitudeDelta = latitudeDelta * 1000;

	    console.log('longitudeDelta : ' + longitudeDelta);
	    console.log('latitudeDelta : ' + latitudeDelta);

	    this.zeroPoint = from;

	    this.metersPerPixelX = this.longitudeDelta / this.width;
	    this.metersPerPixelZ = this.latitudeDelta / this.height;

	    console.log('metersPerPixelX : ' + this.metersPerPixelX);
	    console.log('metersPerPixelZ : ' + this.metersPerPixelZ);

	}

	GeoProcessor.prototype.loadJSON = function () {

	    THREE.Cache.enabled = true;

	    let loadPromise = new Promise(function (resolve, reject) {

	        const loader = new THREE.FileLoader();

	        loader.load(
	            'assets/1.json',
	            function (text) {
	                const json = JSON.parse(text);

	                resolve(json);
	            }
	        );
	    });

	    return loadPromise;
	};

	GeoProcessor.prototype.convertLongitude = function (longitude) {

	    try {
	        const point = turf.point([longitude, this.geoOptions.upperLeft[1]]);

	        //Convert to meters
	        //TODO: simplify
	        const longitudeDistance = turf.distance(this.zeroPoint, point) * 1000;
	        const xPos = longitudeDistance / this.metersPerPixelX;
	        //console.log('xPos = ' + xPos);
	        return xPos - this.halfWidth;
	    } catch (e) {
	        console.log('Bad data : ' + longitude);
	    }
	};

	GeoProcessor.prototype.convertLatitude = function (latitude) {
	    const point = turf.point([this.geoOptions.upperLeft[0], latitude]);

	    //Convert to meters
	    //TODO: simplify
	    const latitudeDistance = turf.distance(this.zeroPoint, point) * 1000;
	    //console.log('latitudeDinstance = ' + latitudeDinstance);
	    const zPos = latitudeDistance / this.metersPerPixelZ;
	    //console.log('zPos = ' + zPos);
	    return zPos - this.halfHeight;
	};

	GeoProcessor.prototype.convertGeoToPixel = function (coords) //[longitude, latitude]
	{
	    let longitude = coords[0];
	    let latitude = coords[1];

	    let mapWidth = this.width; // in pixels
	    let mapHeight = this.depth; // in pixels
	    let mapLonLeft = this.geoOptions.upperLeft[0]; // in degrees
	    let mapLonDelta = this.geoOptions.downRight[0] - this.geoOptions.upperLeft[0]; // in degrees (mapLonRight - mapLonLeft);
	    let mapLatBottom = this.geoOptions.downRight[1]; // in degrees
	    let mapLatBottomDegree = mapLatBottom * Math.PI / 180;// in Radians

	    var x = (longitude - mapLonLeft) * (mapWidth / mapLonDelta);

	    latitude = latitude * Math.PI / 180;
	    var worldMapWidth = ((mapWidth / mapLonDelta) * 360) / (2 * Math.PI);
	    var mapOffsetY = (worldMapWidth / 2 * Math.log((1 + Math.sin(mapLatBottomDegree)) / (1 - Math.sin(mapLatBottomDegree))));
	    var y = mapHeight - ((worldMapWidth / 2 * Math.log((1 + Math.sin(latitude)) / (1 - Math.sin(latitude)))) - mapOffsetY);

	    x = x - this.width / 2;

	    y = y - this.depth / 2;

	    return [x, y];
	};

	function BasicBuilder(geoProcessor) {
	    this.geoProcessor = geoProcessor;
	}

	BasicBuilder.prototype.generateEdges = function (contourCoordinates) {

	    const edges = [];

	    let prevEdge = undefined;

	    for (const contourCoordinate of contourCoordinates) {

	        if (prevEdge === undefined) {

	            const x = this.geoProcessor.convertLongitude(contourCoordinate[0]);
	            const y = this.geoProcessor.convertLatitude(contourCoordinate[1]);

	            prevEdge = {
	                x2: x,
	                y2: y
	            };

	        } else {

	            const x = this.geoProcessor.convertLongitude(contourCoordinate[0]);
	            const y = this.geoProcessor.convertLatitude(contourCoordinate[1]);

	            const edge = {
	                x1: prevEdge.x2,
	                y1: prevEdge.y2,
	                x2: x,
	                y2: y,
	            };

	            edges.push(edge);

	            prevEdge = edge;
	        }
	    }

	    for (const edge of edges) {
	        edge.distance = Math.hypot(edge.x1 - edge.x2, edge.y1 - edge.y2);
	        edge.angle = Math.atan2(edge.x2 - edge.x1, edge.y2 - edge.y1);
	    }

	    return edges;
	};


	BasicBuilder.prototype.generateEdgesFromJSON = function (featureJSON) {

	    const geometryType = featureJSON.geometry.type;

	    switch (geometryType) {
	        case 'LineString':
	            return this.generateEdges(
	                featureJSON.geometry.coordinates);
	        case 'Polygon':
	            return this.generateEdges(
	                featureJSON.geometry.coordinates[0]);
	        default:
	            console.log('Unknown type : ' + geometryType);
	    }
	    return undefined;
	};


	BasicBuilder.prototype.isYourFeature = function (featureJSON) {
	    if (featureJSON === undefined) {
	        return false
	    }

	    if (featureJSON.properties === undefined) {
	        return false;
	    }
	    if (featureJSON.geometry === undefined) {
	        return false;
	    }
	    return true;
	};

	BasicBuilder.prototype.build = function (featureJSON) {
	    return undefined;
	};

	function BuildingBuilder(geoProcessor, textureGenerator) {
	    BasicBuilder.call(this, geoProcessor);

	    this.textureGenerator = textureGenerator;

	    // Meters
	    this.DEFAULT_ZOCCOLE_HEIGHT = 0.6;
	    this.DEFAULT_FLOOR_HEIGHT = 2.6;

	    this.DEFAULT_BUILDING_HEIGHT = this.DEFAULT_FLOOR_HEIGHT + this.DEFAULT_ZOCCOLE_HEIGHT;
	    this.DEFAULT_ROOF_HEIGHT = 1.6;

	    //Textures
	    this.material = new THREE.MeshBasicMaterial({
	        map: this.textureGenerator.generateDefaultBuildingTexture(this.DEFAULT_BUILDING_HEIGHT),
	    });

	    this.roofMaterial = new THREE.MeshBasicMaterial({
	        color: 'white',
	    });

	}

	BuildingBuilder.prototype = Object.create(BasicBuilder.prototype);
	BuildingBuilder.prototype.constructor = BuildingBuilder;

	BuildingBuilder.prototype.isYourFeature = function (featureJSON) {

	    let filter = BasicBuilder.prototype.isYourFeature.call(this, featureJSON);

	    if (filter === false) {
	        return false;
	    }

	    if (featureJSON.properties.tags['building'] === undefined) {
	        return false;
	    }

	    if (featureJSON.geometry.type !== "Polygon") {
	        return false;
	    }

	    return true;
	};

	BuildingBuilder.prototype.calcBuildingHeight = function (tags) {
	    let floors = tags['building:levels'];

	    //zoccolo
	    let height = this.DEFAULT_BUILDING_HEIGHT + this.DEFAULT_ROOF_HEIGHT;

	    if (floors > 1) {
	        floors = floors - 1;
	        height = height + (floors * this.DEFAULT_FLOOR_HEIGHT);
	    }

	    return height;
	};

	BuildingBuilder.prototype.generateBuildingGeometry = function (edges, buildingHeight) {

	    let geometry = new THREE.Geometry();

	    const yPos = 1.0;

	    const firstEdge = edges[0];

	    geometry.vertices.push(
	        new THREE.Vector3(firstEdge.x1, yPos, firstEdge.y1),
	        new THREE.Vector3(firstEdge.x1, buildingHeight, firstEdge.y1)
	    );

	    let vertexIndex = 2;

	    geometry.faceVertexUvs = [[]];

	    for (const edge of edges) {
	        geometry.vertices.push(
	            new THREE.Vector3(edge.x2, yPos, edge.y2),
	            new THREE.Vector3(edge.x2, buildingHeight, edge.y2)
	        );

	        geometry.faces.push(
	            new THREE.Face3(vertexIndex - 2, vertexIndex + 1, vertexIndex - 1),
	            new THREE.Face3(vertexIndex - 2, vertexIndex + 0, vertexIndex + 1),
	        );

	        let proportionsX = edge.distance / 2;
	        let proportionsY = buildingHeight / this.DEFAULT_BUILDING_HEIGHT;

	        geometry.faceVertexUvs[0].push(
	            [
	                new THREE.Vector2(0, 0),
	                new THREE.Vector2(proportionsX, proportionsY),
	                new THREE.Vector2(0, proportionsY)
	            ]
	        );

	        geometry.faceVertexUvs[0].push(
	            [
	                new THREE.Vector2(0, 0),
	                new THREE.Vector2(proportionsX, 0),
	                new THREE.Vector2(proportionsX, proportionsY)
	            ]
	        );

	        vertexIndex = vertexIndex + 2;

	    }


	    geometry.computeBoundingSphere();

	    return geometry;

	};

	BuildingBuilder.prototype.generateRoofGeometry = function (edges, height) {
	    try {
	        let geometry = new THREE.Geometry();

	        const roofCoords = [];

	        function addRoofVertex(edge) {
	            geometry.vertices.push(
	                new THREE.Vector3(edge.x2, height, edge.y2),
	            );

	            roofCoords.push(edge.x2, edge.y2);
	        }

	        // first roof vertex
	        let firstEdge = edges[0];

	        const speculateEdge = {
	            x1: undefined,
	            y1: undefined,
	            x2: firstEdge.x1,
	            y2: firstEdge.y1
	        };

	        addRoofVertex(speculateEdge);

	        for (const edge of edges) {
	            addRoofVertex(edge);
	        }

	        let roofTriangles = earcut(roofCoords);

	        const roofTrianglesLength = roofTriangles.length;

	        const facesCnt = roofTrianglesLength / 3;

	        let normal = new THREE.Vector3(0, 1, 0); //optional


	        for (let faceIdx = 0; faceIdx < facesCnt; faceIdx++) {

	            const faceIndexBase = faceIdx * 3;
	            // CCW rotate
	            geometry.faces.push(
	                new THREE.Face3(
	                    roofTriangles[faceIndexBase + 2],
	                    roofTriangles[faceIndexBase + 1],
	                    roofTriangles[faceIndexBase + 0],
	                    normal
	                )
	            );
	        }

	        return geometry;
	    } catch (e) {
	        console.log(edges);
	    }
	    return undefined;
	};

	BuildingBuilder.prototype.getBuildingMaterial = function (properties) {

	    if (properties === undefined) {
	        return this.material;
	    }

	    if (properties.tags === undefined) {
	        return this.material;
	    }

	    let cladding = properties.tags['building:cladding'];
	    let color = properties.tags['building:colour'];
	    let floors = properties.tags['building:levels'];

	    let options = {
	        material: cladding,
	        color: color,
	        floors: floors,
	        floorHeight: this.DEFAULT_FLOOR_HEIGHT,
	        zoccoleHeight: this.DEFAULT_ZOCCOLE_HEIGHT,
	        roofHeight: this.DEFAULT_ROOF_HEIGHT
	    };

	    let texture = this.textureGenerator.generateBuildingTexture(options);

	    if (texture !== undefined) {
	        return new THREE.MeshBasicMaterial({
	            map: texture,
	        });
	    }

	    return this.material;
	};


	BuildingBuilder.prototype.build = function (featureJSON) {
	    try {
	        const instance = this;

	        let buildingHeight = this.DEFAULT_BUILDING_HEIGHT;

	        try {
	            buildingHeight = this.calcBuildingHeight(featureJSON.properties.tags);
	        } catch (e) {

	        }

	        const edges = this.generateEdgesFromJSON(featureJSON);

	        const geometry = instance.generateBuildingGeometry(edges, buildingHeight);

	        if (geometry !== undefined) {

	            let building = new THREE.Mesh(geometry, this.getBuildingMaterial(featureJSON.properties));

	            let roofGeometry = this.generateRoofGeometry(edges, buildingHeight);

	            if (roofGeometry !== undefined) {
	                let roof = new THREE.Mesh(roofGeometry, this.roofMaterial);

	                return [building, roof];

	                // let singleGeometry = new THREE.Geometry();
	                //
	                // singleGeometry.merge(building.geometry, building.matrix);
	                //
	                // singleGeometry.merge(roof.geometry, roof.matrix);
	                //
	                // let singleObject = new THREE.Mesh(singleGeometry, this.material);
	                //
	                // building = singleObject;
	            }


	            return [building];
	        }
	    } catch (e) {
	        console.log('Exception :' + e);
	        console.log('Feature JSON' + JSON.stringify(featureJSON));
	    }
	    return undefined;
	};

	function BuildingTextureFabric() {
	    this.DEFAULT_TEXTURE_SIZE = 256;
	}
	BuildingTextureFabric.prototype.getColor = function (color) {
	    let color2 = new THREE.Color(color);

	    return color2;
	};

	BuildingTextureFabric.prototype.buildTexture = function (color, material, floorCount) {

	    let width = this.DEFAULT_TEXTURE_SIZE;

	    let height = this.DEFAULT_TEXTURE_SIZE * floorCount;

	    let size = width * height;

	    let textureRGB = new Uint8Array(size * 3);

	    let realColor = this.getColor(color);
	    //Color
	    for (let i = 0; i < size; i++) {
	        textureRGB[i * 3] = realColor.r * 0xff;
	        textureRGB[i * 3 + 1] = realColor.g * 0xff;
	        textureRGB[i * 3 + 2] = realColor.b * 0xff;
	    }

	    let dummyDataTex = new THREE.DataTexture(textureRGB, width, height, THREE.RGBFormat);
	    dummyDataTex.needsUpdate = true;

	    return dummyDataTex;

	};

	function TextureGenerator() {

	    this.DEFAULT_COLOR = 'gray';
	    this.DEFAULT_MATERIAL = 'panel';

	    this.initGenerators();

	}

	TextureGenerator.prototype.initGenerators = function () {
	    this.textureCache = [];

	    this.textureCache['grass'] = this.simpleTexture('assets/textures/grasslight-small.jpg');

	    this.textureCache['road'] = this.simpleTexture('assets/textures/road_road_0016_01_tiled_s.jpg');

	    this.buildingTextureFabric = new BuildingTextureFabric();

	};

	TextureGenerator.prototype.getTexture = function (key) {
	    return this.textureCache[key];
	};

	TextureGenerator.prototype.generateBuildingTexture = function (options) {

	    let color = options.color;
	    if (color === undefined) {
	        color = this.DEFAULT_COLOR;
	    }
	    let material = options.material;
	    if (material === undefined) {
	        material = this.DEFAULT_MATERIAL;
	    }
	    let floors = options.floors;
	    if (floors === undefined) {
	        floors = 1;
	    }

	    let texture = this.buildingTextureFabric.buildTexture(
	        color, material, floors
	    );

	    return texture;
	};

	TextureGenerator.prototype.generateDefaultBuildingTexture = function (buildingHeight) {
	    const texture = new THREE.TextureLoader().load('assets/textures/TexturesCom_HighRiseResidential0083_1_seamless_S.jpg');
	    texture.anisotropy = 4;

	    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

	    this.textureCache['defaultBuildingTexture'] = texture;
	    return texture;
	};

	TextureGenerator.prototype.simpleTexture = function (path) {

	    const texture = new THREE.TextureLoader().load(path);
	    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	    texture.anisotropy = 4;

	    return texture;

	};

	function HighwayBuilder(geoProcessor, textureGenerator) {
	    BasicBuilder.call(this, geoProcessor);

	    this.textureGenerator = textureGenerator;

	    this.DEFAULT_LANE_WIDTH = 2.5;

	    this.material = new THREE.MeshBasicMaterial({
	        map: textureGenerator.getTexture('road')
	    });

	    this.highwayFilter = [];
	    this.highwayFilter['motorway'] = true;
	    this.highwayFilter['trunk'] = true;
	    this.highwayFilter['primary'] = true;
	    this.highwayFilter['secondary'] = true;
	    this.highwayFilter['tertiary'] = true;
	    this.highwayFilter['residential'] = true;
	    this.highwayFilter['living_street'] = true;

	}

	HighwayBuilder.prototype = Object.create(BasicBuilder.prototype);
	HighwayBuilder.prototype.constructor = HighwayBuilder;

	HighwayBuilder.prototype.isYourFeature = function (featureJSON) {

	    let filter = BasicBuilder.prototype.isYourFeature.call(this, featureJSON);

	    if (filter === false) {
	        return false;
	    }

	    if (featureJSON.properties.tags['highway'] === undefined) {
	        return false;
	    }

	    if (featureJSON.geometry.type !== "LineString") {
	        return false;
	    }

	    let highwayType = featureJSON.properties.tags['highway'];

	    return this.highwayFilter[highwayType];

	};

	HighwayBuilder.prototype.generateVertices = function (x, y, angle, width) {
	    const coangle = Math.PI / 2 - angle;

	    const dx = Math.sin(coangle) * width;
	    const dy = Math.cos(coangle) * width;

	    return {
	        x2: x + dx,
	        x1: x - dx,
	        y2: y - dy,
	        y1: y + dy
	    };
	};

	HighwayBuilder.prototype.buildHighwayGeometry = function (edges) {
	    var geometry = new THREE.Geometry();

	    const yPos = 1.0;

	    const firstEdge = edges[0];

	    let pairOfVertices = this.generateVertices(firstEdge.x1, firstEdge.y1, firstEdge.angle, this.DEFAULT_LANE_WIDTH);


	    geometry.vertices.push(
	        new THREE.Vector3(pairOfVertices.x1, yPos, pairOfVertices.y1),
	        new THREE.Vector3(pairOfVertices.x2, yPos, pairOfVertices.y2)
	    );

	    let verticesIdx = 2;
	    geometry.faceVertexUvs = [[]];

	    for (const edge of edges) {
	        pairOfVertices = this.generateVertices(edge.x2, edge.y2, edge.angle, this.DEFAULT_LANE_WIDTH);
	        geometry.vertices.push(
	            new THREE.Vector3(pairOfVertices.x1, yPos, pairOfVertices.y1),
	            new THREE.Vector3(pairOfVertices.x2, yPos, pairOfVertices.y2)
	        );

	        geometry.faces.push(
	            new THREE.Face3(verticesIdx - 2, verticesIdx + 1, verticesIdx - 1),
	            new THREE.Face3(verticesIdx - 2, verticesIdx + 0, verticesIdx + 1)
	        );

	        let proportionsX = edge.distance / 4;

	        geometry.faceVertexUvs[0].push(
	            [
	                new THREE.Vector2(0, 0),
	                new THREE.Vector2(proportionsX, 1),
	                new THREE.Vector2(0, 1)
	            ]
	        );

	        geometry.faceVertexUvs[0].push(
	            [
	                new THREE.Vector2(0, 0),
	                new THREE.Vector2(proportionsX, 0),
	                new THREE.Vector2(proportionsX, 1)
	            ]
	        );

	        verticesIdx = verticesIdx + 2;
	    }

	    return geometry;
	};

	HighwayBuilder.prototype.build = function (featureJSON) {

	    const edges = this.generateEdgesFromJSON(featureJSON);

	    let geometry = this.buildHighwayGeometry(edges);

	    let line = new THREE.Mesh(geometry, this.material);

	    return [line];
	};

	function Map(width, depth, geoOptions) {
	    this.width = width;
	    this.depth = depth;

	    if (geoOptions !== undefined) {
	        this.geoOptions = geoOptions;
	    }

	    this.geoProcessor = new GeoProcessor(this.width, this.depth, this.geoOptions);

	    this.textureGenerator = new TextureGenerator();

	    this.baseObject = new THREE.Object3D();

	    this.initBuilders();

	}

	Map.prototype.initBuilders = function () {

	    this.builders = [];

	    this.builders.push(new BuildingBuilder(this.geoProcessor, this.textureGenerator));
	    this.builders.push(new HighwayBuilder(this.geoProcessor, this.textureGenerator));

	};

	Map.prototype.addFeature = function (feature3D) {
	    this.baseObject.add(feature3D);
	};

	Map.prototype.buildFromFeature = function (featureJSON) {

	    const instance = this;

	    this.builders.forEach(function (builder) {
	        if (builder.isYourFeature(featureJSON)) {

	            const feature3Ds = builder.build(
	                featureJSON
	            );

	            if (feature3Ds !== undefined) {
	                if (Array.isArray(feature3Ds)) {
	                    feature3Ds.forEach(function (feature3D) {
	                        instance.addFeature(feature3D);
	                    });
	                } else {
	                    instance.addFeature(feature3D);
	                }
	            }
	        }
	    });

	};

	Map.prototype.loadGeo = function () {

	    const instance = this;

	    const geoJSONPromise = this.geoProcessor.loadJSON();
	    geoJSONPromise.then(
	        json => {
	            json.features.forEach(function (featureJSON) {

	                instance.buildFromFeature(featureJSON);

	            });

	        }
	    );

	};


	Map.prototype.getObject3D = function () {

	    const base = new THREE.BoxGeometry(this.width, 0, this.depth);

	    const material = new THREE.MeshBasicMaterial({
	        map: this.textureGenerator.getTexture('grass')
	    });

	    const baseMesh = new THREE.Mesh(base, material);

	    this.baseObject.add(baseMesh);

	    return this.baseObject;
	};


	Map.prototype.constructor = Map;

	exports.Map = Map;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
