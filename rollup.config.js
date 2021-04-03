import svelte from 'rollup-plugin-svelte'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import livereload from 'rollup-plugin-livereload'
import { terser } from 'rollup-plugin-terser'
import css from 'rollup-plugin-css-only'
import sveltePreprocess from 'svelte-preprocess'
import pkg from './package.json'
import json from 'rollup-plugin-json'
import alias from '@rollup/plugin-alias'
import path from 'path'
import nodePolyfills from 'rollup-plugin-node-polyfills'
import builtins from 'rollup-plugin-node-builtins'
import globals from 'rollup-plugin-node-globals'

const name = pkg.name
  .replace(/^(@\S+\/)?(svelte-)?(\S+)/, '$3')
  .replace(/^\w/, m => m.toUpperCase())
  .replace(/-\w/g, m => m[1].toUpperCase())

const projectRootDir = path.resolve(__dirname)

const preprocess = sveltePreprocess({
  scss: {
    includePaths: ['theme']
  }
})

const production = !process.env.ROLLUP_WATCH

function serve () {
  let server

  function toExit () {
    if (server) server.kill(0)
  }

  return {
    writeBundle () {
      if (server) return
      server = require('child_process').spawn('npm', [
        'run',
        'start',
        '--',
        '--dev'
      ], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true
      })

      process.on('SIGTERM', toExit)
      process.on('exit', toExit)
    }
  }
}

export default [
  /**
   * Component Export
   */
  {
    input: 'src/index.js',
    output: [
      {
        dir: 'dist/es',
        format: 'es'
      },
      {
        dir: 'dist/umd',
        format: 'umd',
        name,
        inlineDynamicImports: true
      }
    ],
    plugins: [
      svelte({
        preprocess,
        emitCss: false // should budle css into js,
      }),
      nodeResolve()
    ]
  },
  /**
   * Application Bundle
   */
  {
    input: 'src/main.js',
    output: {
      sourcemap: true,
      format: 'iife',
      name: 'app',
      file: 'public/build/bundle.js',
      inlineDynamicImports: true
    },
    // external: ['crypto'],
    plugins: [
      json(),
      alias({
        entries: [
          { find: 'crypto', replacement: path.resolve(projectRootDir, 'node_modules/crypto-browserify') }
        ]
      }),
      svelte({
        compilerOptions: {
          // enable run-time checks when not in production
          dev: !production
        },
        preprocess
      }),
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css({ output: 'bundle.css' }),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      nodeResolve({
        browser: true,
        dedupe: ['svelte'],
        preferBuiltins: false
      }),
      commonjs(),
      nodePolyfills({ crypto: true, buffer: true, process: true, stream: true }),
      globals(),
      builtins({ crypto: false }),
      // In dev mode, call `npm run start` once
      // the bundle has been generated
      !production && serve(),

      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload('public'),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser()
    ],
    watch: {
      clearScreen: false
    }
  }
]
