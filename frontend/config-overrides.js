const { inspect } = require('util')
const { override, addWebpackPlugin, addWebpackModuleRule } = require('customize-cra')
const WorkerPlugin = require('worker-plugin')

const disableCss = (config, env) => {
  config.module.rules = config.module.rules.map((rule) => {
    if (!rule.oneOf) {
      return rule
    }
    rule.oneOf = rule.oneOf.reduce((arr, rule) => {
      if (
        rule.test &&
        ['/\\.css$/', '/\\.module\\.css$/', '/\\.(scss|sass)$/', '/\\.module\\.(scss|sass)$/'].some(
          (r) => r === rule.test.toString(),
        )
      ) {
        return arr
      }

      if (rule.loader.indexOf('file-loader') !== -1) {
        rule.exclude.push(/.css$/)
      }

      arr.push(rule)
      return arr
    }, [])
    return rule
  })
  return config
}

const ignoreStories = (config, env) => {
  config.module.rules = config.module.rules.map((rule) => {
    if (!rule.oneOf) {
      return rule
    }

    rule.oneOf = rule.oneOf.reduce((arr, rule) => {
      if (!rule.test) {
        arr.push(rule)
        return arr
      }

      if (rule.test.toString() !== '/\\.(js|mjs|jsx|ts|tsx)$/') {
        arr.push(rule)
        return arr
      }

      rule.exclude = /\.stories\.(js|mjs|jsx|ts|tsx)$/

      arr.push(rule)
      return arr
    }, [])
    return rule
  })
  return config
}

const printModuleRules = (config, env) => {
  config.module.rules
    .find(({ oneOf }) => !!oneOf)
    .oneOf.forEach((rule) => console.log(inspect(rule, false, null, true)))
  return config
}

module.exports = {
  webpack: override(
    disableCss,
    ignoreStories,
    addWebpackPlugin(new WorkerPlugin()),
    addWebpackModuleRule({
      test: /\.css$/,
      use: 'raw-loader',
    }),
    printModuleRules,
  ),
}
