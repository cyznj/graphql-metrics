#!/usr/bin/env bash

set -e

# Compile to ES5 with Babel
npm run build

# Run Standard Version
npm run tag-release

# Push to Master
git push --follow-tags origin master;

# Assemble module, move over important files
cp package.json lib/package.json
cp .npmignore lib/.npmignore

cd lib

# publish module
npm publish
