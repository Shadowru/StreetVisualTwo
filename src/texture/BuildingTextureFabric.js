function BuildingTextureFabric() {
    this.DEFAULT_TEXTURE_SIZE = 256;
};

BuildingTextureFabric.prototype.getColor = function (color) {
    let color2 = new THREE.Color(color);

    return color2;
};

BuildingTextureFabric.prototype.buildTexture = function (color, material, floorCount) {

    let width = this.DEFAULT_TEXTURE_SIZE;

    let height = this.DEFAULT_TEXTURE_SIZE * floorCount;

    let size = width * height;

    let textureRGB = new Uint8Array(size * 3);

    let realColor = this.getColor(color);
    //Color
    for (let i = 0; i < size; i++) {
        textureRGB[i * 3] = realColor.r * 0xff;
        textureRGB[i * 3 + 1] = realColor.g * 0xff;
        textureRGB[i * 3 + 2] = realColor.b * 0xff;
    }

    let dummyDataTex = new THREE.DataTexture(textureRGB, width, height, THREE.RGBFormat);
    dummyDataTex.needsUpdate = true;

    return dummyDataTex;

};

export {BuildingTextureFabric}