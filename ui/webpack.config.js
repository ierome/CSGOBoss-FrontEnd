'use strict'

const rucksack = require('rucksack-css')
const webpack = require('webpack')
const path = require('path')
const fs = require('fs')

const CopyWebpackPlugin = require('copy-webpack-plugin')

const ENV = process.env.NODE_ENV

const config = {
  context: path.join(__dirname, './client'),
  entry: {
    bundle: './index.js',
    adminBoss: './admin/index.js',
    adminHtml: './admin/cindex.html',
    // a: './admin/index.js',
    // html: './index.html',
    vendor: [
      'whatwg-fetch',
      'style!material-design-icons/iconfont/material-icons.css',
      'hacktimer/HackTimer.min.js',
      'hacktimer/HackTimerWorker.min.js'
    ]
  },
  output: {
    path: path.join(__dirname, './static'),
    filename: '[name].js',
  },
  module: {
    loaders: [
      {
        test: /\.html$/,
        loader: 'file?name=[name].[ext]'
      },
      {
        test: /\.css$/,
        include: /client/,
        loaders: [
          'style-loader',
          'css-loader?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]',
          'postcss-loader'
        ]
      },
      {
        test: /\.css$/,
        exclude: /client/,
        loader: 'style!css'
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        loaders: [
          'react-hot',
          'babel-loader'
        ]
      },
      {
        test: /\.(jpeg|png|gif|jpg)$/i,
        loaders: [
          'file?hash=sha512&digest=hex&name=[hash].[ext]',
          'image-webpack?bypassOnDebug&optimizationLevel=7&interlaced=false'
        ]
      },
      {
        test: /\.(eot|woff|woff2|ttf|svg|mp3|wav)$/,
        exclude: /client\/_assets/,
        loader: 'url-loader?limit=30000&name=[name]-[hash].[ext]'
      },
      {
        test: /\.less$/,
        loader: "style-loader!css-loader!less-loader?noIeCompat"
      },
      {
        test: /\.raw$/,
        loader: 'raw-loader'
      }
    ],
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    alias: {
      // 'uikit': path.resolve(__dirname, 'client', 'vendor', 'uikit', 'dist', 'js', 'uikit.js')
    },
    modulesDirectories: [
      path.join(__dirname, 'client'),
      path.join(__dirname, 'node_modules')
    ]
  },
  postcss: [
    rucksack({
      autoprefixer: true
    }),

    require('postcss-simple-vars')({
      variables() {
        return require(path.join(__dirname, './config/colors'))
      }
    })
  ],
  plugins: [
    new CopyWebpackPlugin([{ from: 'index.html', to: './index.html' }]),

    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      filename: ENV === 'production' ? 'vendor.[hash].js' : 'vendor.bundle.js',
      minChunks: function (module, count) {
        return module.resource && module.resource.indexOf(path.resolve(__dirname, 'client')) === -1;
      }
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        API_URL: JSON.stringify(process.env.API_URL || 'http://127.0.0.1:6999'),
        LIVE_ENDPOINT: JSON.stringify(process.env.LIVE_ENDPOINT || null)
      },
      API_URL: JSON.stringify(process.env.API_URL || 'http://127.0.0.1:6999'),
      'bs': 'boostrap/dist/css/boostrap.min.css'
    }),
    new webpack.ProvidePlugin({
      'jQuery': 'jquery',
      '$': 'jquery',
      'window.jQuery': 'jquery',
      'UIkit': 'uikit',
      '_': 'underscore'
    })
  ],
  devServer: {
    contentBase: './client',
    host: '0.0.0.0',
    disableHostCheck: true,
    hot: true,
    proxy: {
      '/api/*': 'http://127.0.0.1:7000',
      '/login': 'http://127.0.0.1:7000',
      '/loginResponse': 'http://127.0.0.1:7000',
      '/rpc': 'http://127.0.0.1:7000',
      '/socket.io/*': 'http://127.0.0.1:7000'
    }
  }
}

config.plugins.push(new CopyWebpackPlugin([{
  from: 'assets/image/logo_icon.png',
  to: './logo.png'
}]))

if(ENV === 'production') {
  config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false
    }
  }))

  config.plugins.push(function() {
    this.plugin('done', stats => {
      const index = path.join(__dirname, 'static', 'index.html')
      const admin = path.join(__dirname, 'static', 'cindex.html')
      const assets = stats.toJson().assetsByChunkName
      let html = fs.readFileSync(index).toString()

      const indexHtml = html
        .replace('vendor.bundle.js', assets.vendor)
        .replace('bundle.js', assets.bundle)
      fs.writeFileSync(index, indexHtml)

      const adminHtml = html
        .replace('vendor.bundle.js', assets.vendor)
        .replace('bundle.js', assets.adminBoss)
      fs.writeFileSync(admin, adminHtml)
    })
  })

  config.output.filename = '[name].[hash].js'
} else {
  config.entry.adminHtml = './admin/cindex.html'
}

module.exports = config
