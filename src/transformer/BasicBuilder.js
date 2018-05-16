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

export {BasicBuilder};