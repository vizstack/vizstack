const WorkerPlugin = require('worker-plugin');

module.exports = ({ config }) => {
    config.module.rules.push({
        test: /\.(ts|tsx)$/,
        use: [
            { loader: require.resolve('ts-loader') },
            // Optional
            { loader: require.resolve('react-docgen-typescript-loader') },
        ]
    });
    config.plugins.push(new WorkerPlugin());
    config.resolve.extensions.push('.ts', '.tsx');
    return config;
};