# Colla Editor

[![codecov](https://codecov.io/gh/BaffinLee/colla-editor/branch/main/graph/badge.svg?token=FboFvXhrVG)](https://codecov.io/gh/BaffinLee/colla-editor)
[![GitHub issues](https://img.shields.io/github/issues/BaffinLee/colla-editor.svg)](https://github.com/BaffinLee/colla-editor/issues)
[![license](https://img.shields.io/github/license/baffinlee/colla-editor.svg)](https://github.com/baffinlee/colla-editor)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FBaffinLee%2Fcolla-editor.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FBaffinLee%2Fcolla-editor?ref=badge_shield)

> Collaborative coding editor base on [Monaco Editor](https://microsoft.github.io/monaco-editor/index.html) and [OT algorithm](https://en.wikipedia.org/wiki/Operational_transformation)

## Try it out

[https://colla-editor.herokuapp.com/](https://colla-editor.herokuapp.com/)

![Screen Shot](https://raw.githubusercontent.com/BaffinLee/colla-editor/main/web/src/static/image/screenshot.gif)

## Features

- Collaborative coding with all the conflicts auto merged.
- Undo/redo with OT enabled.
- Offline editing.
- Frontend and backend code all in one codebase with simple architecture.
- History list and preview, revert to any version as you wanted.
- Realtime edit with WebSocket.
- Show members in the same collaborate room on the top.
- Supports multiple document with different people.

## Tips

This codebase is just for fun and learning OT algorithm. **BE CAREFUL WHEN USING IN PRODUCTION ENVIRONMENT.**

## Install

```bash
yarn install

cd web && yarn install

cd server && yarn install
```

## Run the app

```bash
# build frontend asserts
yarn build

# start backend server and host frontend asserts
# http://localhost:3123
yarn start
```

## Develop

```bash
# http://localhost:3123
yarn dev:server

# http://localhost:3124
yarn dev:web
```

## Test

```bash
yarn test
```


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FBaffinLee%2Fcolla-editor.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FBaffinLee%2Fcolla-editor?ref=badge_large)