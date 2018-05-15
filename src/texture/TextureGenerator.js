import {BuildingTextureFabric} from "./BuildingTextureFabric.js";

function TextureGenerator() {

    this.DEFAULT_COLOR = 'gray';
    this.DEFAULT_MATERIAL = 'panel';

    this.initGenerators();

}

TextureGenerator.prototype.initGenerators = function () {
    this.textureCache = [];

    this.textureCache['grass'] = this.grassTexture();

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


export {TextureGenerator};

