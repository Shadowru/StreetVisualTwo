function TextureGenerator() {

    this.initGenerators();

};

TextureGenerator.prototype.initGenerators = function () {
    this.textureCache = [];

    this.textureCache['grass'] = this.grassTexture();

};

TextureGenerator.prototype.getTexture = function (key) {
    return this.textureCache[key];
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

