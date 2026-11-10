'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const data = require('..')

test('清单里列出的版本按 dataVersion 升序', () => {
  assert.deepEqual(data.versions(), ['26.2'])
})

test('每个 pack 的 version.json 与清单一致', () => {
  for (const version of data.versions()) {
    const pack = data.pack(version)
    assert.equal(pack.minecraftVersion, version)
    assert.equal(pack.versionJson.minecraftVersion, version)
    assert.equal(pack.versionJson.version, pack.protocolVersion)
    assert.ok(pack.dataVersion > 0)
    assert.match(pack.baseVersion, /^\d+\.\d+/)
  }
})

test('协议号与已知发布版本对得上', () => {
  assert.equal(data.pack('26.2').protocolVersion, 776)
  assert.deepEqual(data.pack('26.2').versionJson, {
    version: 776,
    minecraftVersion: '26.2',
    majorVersion: '26.2',
    releaseType: 'release'
  })
})

test('protocol.json 含全部状态段', () => {
  for (const version of data.versions()) {
    const protocol = data.pack(version).protocol
    for (const state of ['types', 'handshaking', 'status', 'login', 'configuration', 'play']) {
      assert.ok(protocol[state], `${version} 缺少 ${state}`)
    }
    const playPackets = protocol.play.toClient.types.packet
    assert.ok(Array.isArray(playPackets), `${version} 的 play.toClient 没有 packet 定义`)
  }
})

test('26.2 的 login_success 带 sessionId（和正式服一致）', () => {
  const fields = data.pack('26.2').protocol.login.toClient.types.packet_success[1]
  assert.ok(fields.some(field => field.name === 'sessionId'))
})

test('latest() 返回 dataVersion 最大的版本', () => {
  assert.equal(data.latest().minecraftVersion, '26.2')
})

test('未知版本给出生错误信息', () => {
  assert.throws(() => data.pack('26.9'), /没有 26\.9 的数据包/)
  assert.throws(() => data.pack('26.3'), /没有 26\.3 的数据包/)
})

test('pack 是冻结的，调用方改不动', () => {
  const pack = data.pack('26.2')
  assert.ok(Object.isFrozen(pack))
  assert.ok(Object.isFrozen(pack.versionJson))
})

test('数据来源可追溯', () => {
  const pack = data.pack('26.2')
  assert.match(pack.source.commit, /^[0-9a-f]{40}$/)
  assert.equal(pack.source.branch, 'pc_26_2')
})