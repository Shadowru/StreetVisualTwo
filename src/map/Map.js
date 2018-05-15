import {GeoProcessor} from '../geo/GeoProcessor.js';
import {BuildingBuilder} from '../transformer/BuildingBuilder.js';
import {TextureGenerator} from '../texture/TextureGenerator';

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

    this.builders.push(new BuildingBuilder(this.geoProcessor));

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

export {Map}