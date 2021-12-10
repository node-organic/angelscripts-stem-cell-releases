const util = require('util')
const path = require('path')
const fs = require('fs')
const readFile = util.promisify(fs.readFile)
const { exec } = require('child_process')
const findSkeletonRoot = require('organic-stem-skeleton-find-root')
const semver = require('semver')
const execPromise = util.promisify(exec)

module.exports = function (angel) {
  angel.on('changed', async function () {
    const result = await getChangedFiles()
    console.log(result.status)
    result.files.forEach((v) => {
      console.log('+', v)
    })
    let code = 1
    if (result.files.length > 0 || result.status === 'not released') {
      code = 0
    }
    process.exit(code)
  })
}

const getChangedFiles = async function () {
  const packagejson_path = path.join(process.cwd(), 'package.json')
  const packagejson = require(packagejson_path)
  // check/get last release commit
  const lastReleaseCommit = await getLastReleaseCommit(packagejson.name)
  if (!lastReleaseCommit) {
    return { files: [], status: 'not released' }
  }
  // check local files
  const REPO = await findSkeletonRoot()
  const cwd = process.cwd().replace(REPO + '/', '')
  const cmd = `git diff --name-only ${lastReleaseCommit} | grep ${cwd}`
  const changedFiles = (await execAndReturnOutput(cmd)).split('\n').filter(v => v)
  if (changedFiles.length !== 0) {
    return { files: changedFiles, status: 'changes detected' }
  }

  // get all changed files
  const cmdAll = `git diff --name-only ${lastReleaseCommit}`
  const changedFilesAll = (await execAndReturnOutput(cmdAll)).split('\n').filter(v => v)
  if (changedFilesAll.length === 0) {
    return { files: [], status: 'no changes detected' }
  }
  // query and build all cell dependencies as file locations
  const dependencies = await getCellFileDependencies(process.cwd(), REPO)

  // match cell deps and all changed files
  const result = []
  for (let i = 0; i < changedFilesAll.length; i++) {
    for (let k = 0; k < dependencies.length; k++) {
      if (changedFilesAll[i].indexOf(dependencies[k]) !== -1) {
        result.push(changedFilesAll[i])
      }
    }
  }
  return {
    files: result,
    status: `${result.length > 0 ? '' : 'no '}changes detected`
  }
}

const execAndReturnOutput = function (cmd) {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, {
      cwd: process.cwd(),
      env: process.env
    })
    let output = ''
    child.stdout.on('data', function (chunk) {
      output += chunk.toString()
    })
    child.on('exit', function () {
      resolve(output)
    })
  })
}

const getLastReleaseCommit = async function (cellName) {
  const cmd = `git show-ref --tags | grep refs/tags/${cellName}`
  const tagCommitPairs = (await execAndReturnOutput(cmd)).split('\n').filter(v => v)
  let highestRelease = null
  let highestReleaseCommit = null
  for (let i = 0; i < tagCommitPairs.length; i++) {
    const parts = tagCommitPairs[i].split(' ')
    const commit = parts[0]
    const iRelease = parts[1].replace('refs/tags/' + cellName + '-', '')
    try {
      if (highestRelease === null || semver.lt(highestRelease, iRelease)) {
        highestRelease = iRelease
        highestReleaseCommit = commit
      }
    } catch (e) {
      // ignore invalid releases
    }
  }
  return highestReleaseCommit
}

const getCellFileDependencies = async function (cellRoot, repoRoot) {
  let packagejson = await readFile(path.join(cellRoot, 'package.json'), 'utf-8')
  packagejson = JSON.parse(packagejson)
  const depsresult = await execPromise(`npx lerna ls --scope ${packagejson.name} --include-dependencies --a --json`, {
    cwd: repoRoot,
    env: process.env
  })
  const deps = JSON.parse(depsresult.stdout)
  const result = [cellRoot]
  for (let i = 0; i < deps.length; i++) {
    if (deps[i].name === packagejson.name) continue
    const deppath = deps[i].location.replace(repoRoot, '')
    result.push(deppath)
  }
  return result
}
