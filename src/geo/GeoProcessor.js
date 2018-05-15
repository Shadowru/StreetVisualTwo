function GeoProcessor(width, height, geoOptions) {

    this.width = width;
    this.height = height;

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

}

GeoProcessor.prototype.getMetersPerPixelX = function () {
    return this.metersPerPixelX;
};

GeoProcessor.prototype.getMetersPerPixelZ = function () {
    return this.metersPerPixelZ;
};

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
        return xPos - this.width / 2;
    } catch (e) {
        console.log('Bad data : ' + longitude)
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
    return zPos - this.depth / 2;
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


export {GeoProcessor};