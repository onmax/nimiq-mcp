import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  type: 'lib',
  ignores: [
    'examples/**/*.py',
    'wrangler.toml',
  ],
})
