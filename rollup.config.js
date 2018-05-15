export default {
    input: 'src/Map3D.js',
    output: [
        {
            format: 'umd',
            name: 'MAP3D',
            file: 'js/Map3D.js',
            indent: '\t'
        },
        {
            format: 'es',
            file: 'js/Map3D.module.js',
            indent: '\t'
        }
    ]
};