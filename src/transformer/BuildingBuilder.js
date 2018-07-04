import {BasicBuilder} from './BasicBuilder.js';

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

    if (featureJSON.geometry.type === "Polygon") {
        return true;
    }

    return false;
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

    // let texture = this.textureGenerator.generateBuildingTexture(options);
    //
    // if (texture !== undefined) {
    //     return new THREE.MeshBasicMaterial({
    //         map: texture,
    //     });
    // }

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


export {BuildingBuilder};