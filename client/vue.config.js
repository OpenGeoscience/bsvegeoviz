module.exports = {
  devServer: {
    proxy: process.env.API_PROXY,
    useLocalIp: true,
    public: "localhost:8080"
  }
}
