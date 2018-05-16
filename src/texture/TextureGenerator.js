import {BuildingTextureFabric} from "./BuildingTextureFabric.js";

function TextureGenerator() {

    this.DEFAULT_COLOR = 'gray';
    this.DEFAULT_MATERIAL = 'panel';

    this.initGenerators();

}

TextureGenerator.prototype.initGenerators = function () {
    this.textureCache = [];

    this.textureCache['grass'] = this.simpleTexture('assets/textures/grasslight-small.jpg');

    this.textureCache['road'] = this.simpleTexture('assets/textures/road_road_0016_01_tiled_s.jpg');
    this.textureCache['river'] = this.simpleTexture('assets/textures/TexturesCom_WaterPlain0040_1_M.jpg');

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



export {TextureGenerator};

