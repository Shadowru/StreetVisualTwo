import {BasicBuilder} from './BasicBuilder.js';

function HighwayBuilder(geoProcessor, textureGenerator) {
    BasicBuilder.call(this, geoProcessor);

    this.textureGenerator = textureGenerator;

    this.DEFAULT_LANE_WIDTH = 2.5;

    this.material = new THREE.MeshBasicMaterial({
        color: 0x0000ff
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

export {HighwayBuilder};