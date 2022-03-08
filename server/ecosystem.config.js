let interpreter;
if (process.platform === "win32") {
  interpreter = "./node_modules/.bin/ts-node.cmd";
} else {
  interpreter = "./node_modules/.bin/ts-node";
}

module.exports = {
  apps: [
    {
      name: 'colla-editor-server',
      interpreter,
      script: 'src/index.ts',
      instances: 1,
      autorestart: true,
      watch: true,
      max_memory_restart: '4G'
    }
  ]
};
