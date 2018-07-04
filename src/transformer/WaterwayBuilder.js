import {BasicBuilder} from "./BasicBuilder";

function WaterwayBuilder(geoProcessor, textureGenerator) {
    BasicBuilder.call(this, geoProcessor);

    this.textureGenerator = textureGenerator;

    this.material = new THREE.MeshBasicMaterial({
        map: this.textureGenerator.getTexture('river'),
        side: THREE.DoubleSide
    });

}

WaterwayBuilder.prototype = Object.create(BasicBuilder.prototype);
WaterwayBuilder.prototype.constructor = BasicBuilder;

WaterwayBuilder.prototype.getYPos = function () {
    return 0.8;
};


WaterwayBuilder.prototype.isYourFeature = function (featureJSON) {

    let filter = BasicBuilder.prototype.isYourFeature.call(this, featureJSON);

    if (filter === false) {
        return false;
    }

    if (featureJSON.properties.tags['waterway'] === undefined) {
        return false;
    }

    if (featureJSON.properties.tags['waterway'] !== "riverbank") {
        return false;
    }

    if (featureJSON.geometry.type === "MultiPolygon") {
        return true;
    }

    if (featureJSON.geometry.type === "Polygon") {
        return true;
    }

    return false;
};

WaterwayBuilder.prototype.generateRiverbedGeometry = function (coordinates) {
    try {


        var poly = turf.polygon(coordinates);
        var triangles = turf.tesselate(poly);

        console.log(triangles);

        var riverbedGeometry = new THREE.Geometry();

        let vertexIndex = 0;

        const normal = new THREE.Vector3(0, 1, 0); //optional

        riverbedGeometry.faceVertexUvs = [[]];

        for (const triangle of triangles.features) {

            const coordinate = triangle.geometry.coordinates;

            riverbedGeometry.vertices.push(
                new THREE.Vector3(coordinate[0][0][0], this.getYPos(), coordinate[0][0][1]),
                new THREE.Vector3(coordinate[0][1][0], this.getYPos(), coordinate[0][1][1]),
                new THREE.Vector3(coordinate[0][2][0], this.getYPos(), coordinate[0][2][1]),
                new THREE.Vector3(coordinate[0][3][0], this.getYPos(), coordinate[0][3][1])
            );
            riverbedGeometry.faces.push(
                new THREE.Face3(
                    vertexIndex, vertexIndex+1, vertexIndex+2, normal
                ),
                new THREE.Face3(
                    vertexIndex, vertexIndex+2, vertexIndex+3, normal
                )
            );

            const proportionsX = 1;
            const proportionsY = 1;

            riverbedGeometry.faceVertexUvs[0].push(
                [
                    new THREE.Vector2(0, 0),
                    new THREE.Vector2(proportionsX, proportionsY),
                    new THREE.Vector2(0, proportionsY)
                ]
            );

            riverbedGeometry.faceVertexUvs[0].push(
                [
                    new THREE.Vector2(0, 0),
                    new THREE.Vector2(proportionsX, 0),
                    new THREE.Vector2(proportionsX, proportionsY)
                ]
            );

            vertexIndex += 4;
        }

        return riverbedGeometry;

        /*
        var data = earcut.flatten(coordinates);

        var riverbedTriangleIndex = earcut(data.vertices, data.holes, data.dimensions);

        if (riverbedTriangleIndex.length > 0) {

            var riverbedGeometry = new THREE.Geometry();

            let coordIdx = 0;
            while (coordIdx < data.vertices.length) {
                riverbedGeometry.vertices.push(
                    new THREE.Vector3(data.vertices[coordIdx], this.getYPos(), data.vertices[coordIdx + 1])
                );
                coordIdx += 2;
            }

            let triangleIdx = 0;

            while (triangleIdx < coordinates.length) {
                riverbedGeometry.faces.push(
                    new THREE.Face3(
                        riverbedTriangleIndex[triangleIdx],
                        riverbedTriangleIndex[triangleIdx + 1],
                        riverbedTriangleIndex[triangleIdx + 2]
                    )
                );
                triangleIdx += 3;
            }

            return riverbedGeometry;
        }
            */
    } catch (e) {
        console.log('Exception : ' + e);
        console.log(coordinates);
    }
    return undefined;
};

WaterwayBuilder.prototype.build = function (featureJSON) {

    console.log('Build waterway');
    console.log(featureJSON);

    let riverbedPolygon = this.geoProcessor.recalcCoordinatesArray(featureJSON.geometry.coordinates);

    if (featureJSON.geometry.type === "MultiPolygon") {
        console.log('MultiPolygon');
    }

    const geometry = this.generateRiverbedGeometry(riverbedPolygon);

    if (geometry !== undefined) {
        const riverbed = new THREE.Mesh(geometry, this.material);

        return [riverbed];
    }

    return undefined;
};

export {WaterwayBuilder}