# Colla Editor

> Collaborative coding editor base on [monaco](https://microsoft.github.io/monaco-editor/index.html) and [OT algorithm](https://en.wikipedia.org/wiki/Operational_transformation)

## Try it out

[https://colla-editor.herokuapp.com/](https://colla-editor.herokuapp.com/)

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

This codebase is just for fun and learning OT algorithm. **DO NOT USE ANY CODE IN PRODUCTION ENVIRONMENT.**

## Install

```bash
yarn install

cd web && yarn install

cd server && yarn install
```

## Run the app

```base
yarn build

yarn start

# server is running at http://localhost:3123
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
