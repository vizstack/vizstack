import typescript from '@wessberg/rollup-plugin-ts'
import scss from 'rollup-plugin-scss'
import copy from 'rollup-plugin-copy'

import pkg from './package.json'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.module,
      format: 'es',
    },
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [ 
    typescript(),
    scss(),
    copy({
      targets: [
        { src: 'src/files/material-outlined.woff2', dest: 'dist/files' }
      ]
    }),
  ],
}