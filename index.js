'use strict'

/**
 * @whale-craft/mc-data-beyond
 *
 * mineflayer 生态里的「版本数据包」：把 minecraft-data 还没有收录的 Minecraft 版本
 * 以纯数据的形式带进来。它不依赖、也不修改 minecraft-data —— 注册是使用方的事
 * （见 @whale-craft/mineflayer-beyond 的 install()）。
 */
const packs = require('./lib/packs')

module.exports = {
  schema: packs.schema,
  versions: packs.versions,
  packs: packs.packs,
  pack: packs.pack,
  latest: packs.latest,
  manifest: packs.manifest
}