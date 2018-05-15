import {BasicBuilder} from './BasicBuilder.js';

function BuildingBuilder(geoProcessor) {
    BasicBuilder.call(this, geoProcessor);

    // Meters
    this.DEFAULT_BUILDING_HEIGHT = 3.5;
    this.DEFAULT_FLOOR_HEIGHT = 2.6;
    this.DEFAULT_ROOF_HEIGHT = 1.6;

    //Textures
    this.material = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
    });

    this.roofMaterial = new THREE.MeshBasicMaterial({
        color: 'white',
        //TODO: Fix normals
        side: THREE.DoubleSide
    });
    //this.material = new THREE.MeshPhongMaterial({color: 0x001111, flatShading: THREE.SmoothShading});

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

    let vertexIndex = 0;

    for (const edge of edges) {
        geometry.vertices.push(
            new THREE.Vector3(edge.x1, yPos, edge.y1),
            new THREE.Vector3(edge.x1, buildingHeight, edge.y1),
            new THREE.Vector3(edge.x2, yPos, edge.y2),
            new THREE.Vector3(edge.x2, buildingHeight, edge.y2)
        );

        geometry.faces.push(
            new THREE.Face3(vertexIndex, vertexIndex + 3, vertexIndex + 1),
            new THREE.Face3(vertexIndex, vertexIndex + 2, vertexIndex + 3),
        );

        vertexIndex = vertexIndex + 4;
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

                let singleGeometry = new THREE.Geometry();

                singleGeometry.merge(building.geometry, building.matrix);

                singleGeometry.merge(roof.geometry, roof.matrix);

                let singleObject = new THREE.Mesh(singleGeometry, this.material);

                building = singleObject;
            }


            return building;
        }
    } catch (e) {
        console.log('Exception :' + e);
        console.log('Feature JSON' + JSON.stringify(featureJSON));
    }
    return undefined;
};


export {BuildingBuilder};