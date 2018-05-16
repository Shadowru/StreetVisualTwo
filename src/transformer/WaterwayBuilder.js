import {BasicBuilder} from "./BasicBuilder";

function WaterwayBuilder(geoProcessor, textureGenerator) {
    BasicBuilder.call(this, geoProcessor);

    this.textureGenerator = textureGenerator;

    this.material = new THREE.MeshBasicMaterial({
        map: this.textureGenerator.getTexture('river')
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

    if (featureJSON.geometry.type !== "MultiPolygon") {
        return false;
    }

    return true;
};

WaterwayBuilder.prototype.generateRiverbedGeometry = function (coordinates) {
    try {
        let geometry = new THREE.Geometry();

        const recalcPolygon = this.geoProcessor.recalcCoordinatesArray(coordinates);

        let outerRing = earcut.flatten(recalcPolygon[0]);
        let innerRing = earcut.flatten(recalcPolygon[1]);

        let riverbedTriangles = earcut(outerRing.vertices);//, innerRing.holes, 2);//, data.holes, data.dimensions);

        const riverbedTrianglesLength = riverbedTriangles.length;

        for (const vertex of outerRing.vertices) {
            geometry.vertices.push(
                new THREE.Vector3(vertex[0], this.getYPos(), vertex[1])
            );
        }

        const facesCnt = riverbedTrianglesLength / 3;

        let normal = new THREE.Vector3(0, 1, 0); //optional

        for (let faceIdx = 0; faceIdx < facesCnt; faceIdx++) {

            const faceIndexBase = faceIdx * 3;
            // CCW rotate
            geometry.faces.push(
                new THREE.Face3(
                    riverbedTriangles[faceIndexBase + 2],
                    riverbedTriangles[faceIndexBase + 1],
                    riverbedTriangles[faceIndexBase + 0],
                    normal
                )
            );
        }

        return geometry;

    } catch (e) {
        console.log('Exception : ' + e);
        console.log(coordinates);
    }
    return undefined;
};

WaterwayBuilder.prototype.build = function (featureJSON) {

    const geometry = this.generateRiverbedGeometry(featureJSON.geometry.coordinates);

    if (geometry !== undefined) {
        const riverbed = new THREE.Mesh(geometry, this.material);
        return [riverbed];
    }

    return undefined;
};

export {WaterwayBuilder}