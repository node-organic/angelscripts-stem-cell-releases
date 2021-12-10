module.exports = function (angel) {
  require('./src/changed')(angel)
  require('./src/version')(angel)
}
