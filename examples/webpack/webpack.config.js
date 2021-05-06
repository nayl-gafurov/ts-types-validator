const transformer = require('ts-types-validator').transformer;

module.exports =
{
  mode: 'development',
  entry: './index.ts',
  output: {
    filename: `bundle.js`,
    path: __dirname
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
          getCustomTransformers: program => ({
            before: [
              transformer(program)
            ]
          })
        }
      }
    ]
  }
};
