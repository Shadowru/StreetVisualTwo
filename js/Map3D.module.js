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
    }

    return edges;
};


BasicBuilder.prototype.generateEdgesFromJSON = function (featureJSON) {

    const edges = this.generateEdges(featureJSON.geometry.coordinates[0]);

    return edges;
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
    this.DEFAULT_BUILDING_HEIGHT = 3.5;
    this.DEFAULT_FLOOR_HEIGHT = 2.6;
    this.DEFAULT_ROOF_HEIGHT = 1.6;

    //Textures
    this.material =
        this.roofMaterial = new THREE.MeshBasicMaterial({
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

    if (featureJSON.properties.tags['building'] !== 'yes') {
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
            let building = new THREE.Mesh(geometry, this.material);

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

function TextureGenerator() {

    this.initGenerators();

}
TextureGenerator.prototype.initGenerators = function () {
    this.textureCache = [];

    this.textureCache['grass'] = this.grassTexture();

};

TextureGenerator.prototype.getTexture = function (key) {
    return this.textureCache[key];
};

TextureGenerator.prototype.generateDefaultBuildingTexture = function (buildingHeight) {
    const texture = new THREE.TextureLoader().load('assets/textures/TexturesCom_HighRiseResidential0083_1_seamless_S.jpg');
    texture.anisotropy = 4;

    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

    this.textureCache['defultBuildingTexture'] = texture;
    return texture;
};

TextureGenerator.prototype.grassTexture = function () {

    // const width = 2048;
    // const height = 2048;
    //
    // let dummyRGBA = new Uint8Array(width * height * 4);
    // for (var i = 0; i < width * height; i++) {
    //     // RGB from 0 to 255
    //     dummyRGBA[4 * i] = dummyRGBA[4 * i + 1] = dummyRGBA[4 * i + 2] = 0x55;
    //     // OPACITY
    //     dummyRGBA[4 * i + 3] = 0xff;
    // }
    //
    // let dummyDataTex = new THREE.DataTexture(dummyRGBA, width, height, THREE.RGBAFormat);
    // dummyDataTex.needsUpdate = true;
    //
    // return dummyDataTex;

    const texture = new THREE.TextureLoader().load('assets/textures/grasslight-small.jpg');
    texture.anisotropy = 4;

    return texture;

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

};


Map.prototype.buildFromFeature = function (featureJSON) {

    const instance = this;

    this.builders.forEach(function (builder) {
        if (builder.isYourFeature(featureJSON)) {

            const feature3Ds = builder.build(
                featureJSON
            );

            if (feature3Ds !== undefined) {
                feature3Ds.forEach(function (feature3D) {
                    instance.baseObject.add(feature3D);
                });
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

export { Map };
