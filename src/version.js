const { exec } = require('child_process')
const util = require('util')
const path = require('path')
const fs = require('fs')
const writeFile = util.promisify(fs.writeFile)
const semver = require('semver')

module.exports = function (angel) {
  angel.on(/version (.*)/, async function (a) {
    const packagejson_path = path.join(process.cwd(), 'package.json')
    const packagejson = require(packagejson_path)
    const newVersion = semver.inc(packagejson.version, a.cmdData[1])
    packagejson.version = newVersion
    await writeFile(packagejson_path, JSON.stringify(packagejson, null, 2), 'utf-8')
    const cmd = [
      'git add package.json',
      `git commit -m '${packagejson.name}-${packagejson.version}'`,
      `git tag -a ${packagejson.name}-${packagejson.version} -m '${packagejson.name}-${packagejson.version}'`,
      'git push --tags',
      'git push'
    ]
    const child = exec(cmd.join(' && '))
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
    child.on('exit', (code) => {
      if (code === 0) {
        console.info(`+ ${packagejson.name}-${packagejson.version}`)
      } else {
        process.exit(code)
      }
    })
  })
}
