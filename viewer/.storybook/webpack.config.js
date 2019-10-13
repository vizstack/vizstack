// const WorkerPlugin = require('worker-plugin');

module.exports = ({ config }) => {
    config.module.rules.push({
        test: /\.(ts|tsx)$/,
        use: [
            { loader: require.resolve('ts-loader') },
            // Optional
            { loader: require.resolve('react-docgen-typescript-loader') },
        ]
    });
    // config.module.rules.push({
    //     test: /\.js$/,
    //     exclude: /(node_modules)/,
    //     use: {
    //         loader: 'babel-loader',
    //         options: {
    //           presets: ['@babel/preset-env']
    //         }
    //       }
    // })
    // config.module.rules.push({
    //     test: /worker\.js$/,
    //     use: { loader: 'worker-loader' },
    // })
    // config.plugins.push(new WorkerPlugin());
    config.resolve.extensions.push('.ts', '.tsx');
    return config;
};