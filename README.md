# angelscripts-stem-cell-release

[organic-stem-skeleton v3](https://github.com/node-organic/organic-stem-skeleton) based release helpers:

* version a cell/package via semver within the monorepo

  Increase, commit and tag as `${packagejson.name}-${packagejson.version}`

* check does a cell/package needs to be released

  Compares with previously versioned cell/package

## setup

```
cd cells/myCell
npm i angelscripts-stem-cell-release --save-dev
```

## usage


### version a cell/package

Supports versioning using [semver](https://github.com/npm/node-semver) release types such as:

* `patch`
* `minor`
* `major`

```
$ cd cells/myCell
$ npx angel version patch
```

### changes

#### see detected changes

Exits with code 0 if there are changes to be released, otherwise 1.

```
$ cd cells/myCell
$ npx angel changed
+ cells/myCell/package.json
```

## combined usage

```
// package.json
{
  "scripts": {
    "release-patch": "npx angel changed && npx angel version patch"
  }
}
```