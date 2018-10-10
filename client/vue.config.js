module.exports = {
  devServer: {
    disableHostCheck: true,
    proxy: process.env.API_PROXY,
    useLocalIp: true,
    public: "minerva-beta.bsvecosystem.net"
  },
  baseUrl: process.env.NODE_ENV === 'production'
    ? '/static/external/'
    : '/',
}
