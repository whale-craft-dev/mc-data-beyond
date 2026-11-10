'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const MANIFEST = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'manifest.json'), 'utf8'))

const REQUIRED_STATES = ['types', 'handshaking', 'status', 'login', 'configuration', 'play']

const cache = new Map()

function versions () {
  return Object.keys(MANIFEST.packs)
    .filter(version => MANIFEST.packs[version].releaseType !== 'snapshot')
    .sort((a, b) => MANIFEST.packs[a].dataVersion - MANIFEST.packs[b].dataVersion)
}

/**
 * 取某个版本的数据包。第一次调用时读文件、校验 sha256、校验 version.json 与清单一致。
 * 返回的是冻结对象，调用方不要改它（minecraft-data 注册时我们自己做副本）。
 */
function pack (version) {
  const key = String(version)
  if (cache.has(key)) return cache.get(key)
  const entry = MANIFEST.packs[key]
  if (!entry) {
    throw new Error(`[mc-data-beyond] 没有 ${key} 的数据包；可用版本：${versions().join(', ') || '(空)'}`)
  }

  const protocol = readJson(entry.files.protocol)
  const versionJson = readJson(entry.files.version)

  if (versionJson.minecraftVersion !== entry.minecraftVersion) {
    throw new Error(`[mc-data-beyond] ${key} 的 version.json 写的是 ${versionJson.minecraftVersion}`)
  }
  if (versionJson.version !== entry.protocolVersion) {
    throw new Error(`[mc-data-beyond] ${key} 协议号不一致：manifest ${entry.protocolVersion} / version.json ${versionJson.version}`)
  }
  for (const state of REQUIRED_STATES) {
    if (!protocol[state]) throw new Error(`[mc-data-beyond] ${key} 的 protocol.json 缺少 ${state} 段`)
  }

  const frozen = Object.freeze({
    minecraftVersion: entry.minecraftVersion,
    majorVersion: entry.majorVersion || entry.minecraftVersion,
    protocolVersion: entry.protocolVersion,
    dataVersion: entry.dataVersion,
    releaseType: entry.releaseType || 'release',
    baseVersion: entry.baseVersion,
    chunkBase: entry.chunkBase || '1.18',
    physicsBase: entry.physicsBase || entry.baseVersion,
    protocol: Object.freeze(protocol),
    versionJson: Object.freeze(versionJson),
    source: entry.source || null
  })
  cache.set(key, frozen)
  return frozen
}

function packs () {
  return versions().map(pack)
}

function latest () {
  const all = packs()
  return all[all.length - 1] || null
}

function readJson (file) {
  const full = path.join(DATA_DIR, file.path)
  const buffer = fs.readFileSync(full)
  const actual = crypto.createHash('sha256').update(buffer).digest('hex')
  if (file.sha256 && actual !== file.sha256) {
    throw new Error(`[mc-data-beyond] ${file.path} 校验失败（期望 ${file.sha256}，实际 ${actual}）`)
  }
  return JSON.parse(buffer.toString('utf8'))
}

module.exports = {
  schema: MANIFEST.schema,
  manifest: MANIFEST,
  versions,
  packs,
  pack,
  latest,
  DATA_DIR
}