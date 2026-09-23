const path = require('node:path')

const resources = path.join(__dirname, '..', 'backend', 'target', 'desktop-package')

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'InternshipHub',
    extraResource: [
      path.join(resources, 'runtime'),
      path.join(resources, 'backend.jar'),
    ],
    ignore: [
      /^\/src(?:\/|$)/,
      /^\/scripts(?:\/|$)/,
      /^\/out(?:\/|$)/,
      /\.test\.cjs$/,
    ],
  },
  makers: [{
    name: '@electron-forge/maker-squirrel',
    config: {
      name: 'InternshipHub',
      setupExe: 'InternshipHubSetup.exe',
    },
  }],
}
