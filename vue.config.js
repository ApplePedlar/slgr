module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/slgr/' : '/',
  devServer: {
    port: 2222,
    disableHostCheck: true
  },
  lintOnSave: false,
  outputDir: 'docs',
  assetsDir: './',
  publicPath: './'
}
