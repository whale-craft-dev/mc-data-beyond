# @whale-craft/mc-data-beyond

mineflayer 生态的**版本数据包**：把 `minecraft-data` 还没收录的 Minecraft 版本（协议定义、版本号、数据基线）以纯数据的形式独立带进来。

它不依赖、也不修改 `minecraft-data`。把数据注册进 `minecraft-data` 是使用方的事 —— 见 [`@whale-craft/mineflayer-beyond`](https://github.com/whale-craft-dev/mineflayer-beyond)。

## 为什么需要它

`minecraft-data` 的版本数据跟着上游 PR 走，合并和发布都有延迟。截至本包发布时：

- Mojang 最新正式版是 **26.3**，最新快照是 **26.4-snapshot-7**；
- `minecraft-data@3.119.0`（npm 最新）和它的 `master` 分支都只到 **26.1**；
- 26.2 / 26.3 的数据只存在于未合并的分支里。

`mineflayer` 的 `testedVersions` 同样停在 26.1，于是新版本连「被认识」都做不到。这个包只负责一件事：**把缺的那部分数据准备好**，怎么接进去由插件决定。

## 内容

```
data/
  manifest.json          # 版本清单：协议号、dataVersion、数据基线、原生类型、来源 commit、文件 sha256
  pc/26.2/protocol.json  # 协议编解码定义（约 330 KB）
  pc/26.2/version.json   # 协议号 776
  pc/26.3/protocol.json  # 协议号 777（含 entityDelta 原生类型声明）
  pc/26.3/version.json
```

每个版本只带 `protocol.json` 和 `version.json`。方块 / 物品 / 实体等静态数据不在这里 —— 26.2、26.3 的注册表和 26.1 一致，上游 `dataPaths.json` 里也是这么写的（全部指向 `pc/26.1`），所以清单用 `baseVersion` 声明复用 26.1。

## 用法

```js
const data = require('@whale-craft/mc-data-beyond')

data.versions()        // ['26.2', '26.3']
data.pack('26.3')      // { minecraftVersion, protocolVersion: 777, dataVersion, baseVersion, nativeTypes, protocol, versionJson, source }
data.latest()          // 26.3 的 pack
```

`pack()` 第一次读取时会做三件事：校验文件 sha256、校验 `version.json` 与清单一致、确认 `protocol.json` 含全部状态段。任何一项不对都会直接抛错，避免把坏数据接进游戏。

## 小版本（26.3.1 这种）

补丁版本通常沿用 major 版本的协议号。自动探测按协议号反查，所以**服务器是 26.3.1 也会被识别成 26.3 并正常连接**；显式写 `version: '26.3.1'` 时，插件会把它折成 `26.3`。

只有当补丁版本改了协议号时才需要新数据 —— 那种情况会体现为新的 `protocolVersion`，加一个 pack 即可。

## 加一个新版本

1. 拿到该版本的 `protocol.json` / `version.json`（上游分支/PR，或自己用 `minecraft-data` 的工具生成）；
2. **用真实服务端验证过**再放进来 —— 上游分支不等于正式版，26.3 就踩过这个坑；
3. 放到 `data/pc/<version>/`；
4. 在 `data/manifest.json` 里加一条：`protocolVersion`、`dataVersion`、`baseVersion`、`chunkBase` / `physicsBase`、`nativeTypes`（协议里声明为 `native` 但当前 nmp 没实现的类型）、`source`、两个文件的 `sha256`；
5. `npm test` —— 清单与文件的一致性由测试和运行时双重校验。

## 26.3 数据来源

26.3 的正式版协议和上游 `pc_26_3` 分支**对不上**（分支是 26.3 快照时期的布局：包 id 整体偏移、`login_success` 少 `sessionId`、实体移动还按旧的扁平 delta 编码）。实际可用的数据来自上游 PR：

| 内容 | 来源 | commit |
| --- | --- | --- |
| 26.2 协议数据 | `PrismarineJS/minecraft-data` 分支 `pc_26_2` | `282f19b0` |
| 26.3 协议数据 | `suisarbre/minecraft-data` 分支 `port-26.3`（PR #1345，stacked on #1301） | `312f3cad` |

26.3 的协议声明了原生类型 `entityDelta`（新的分级实体移动编码），当前 `minecraft-protocol@1.68.0` 还没有实现（上游 PR #1538 / #1553）。清单里的 `nativeTypes` 就是在告诉插件「这个版本需要运行时补这个类型」。

这些数据都用 26.3 原版服务端实连验证过：登录 → 配置阶段 → spawn → 区块读取全部通过。

## 数据来源与许可

`minecraft-data` 以 MIT 许可发布；本包沿用 MIT（见 `LICENSE`）。协议数据描述的是 Mojang 的网络协议格式，不含游戏代码或素材。

上游合并后，对应版本可以从这里删掉，插件会优先使用 `minecraft-data` 自带的数据。

## 边界

- 只支持**正式版**，且只收录用真实服务端验证过的版本。
- 快照（如 26.4-snapshot-7）协议号是 `1073742xxx` 且每两周变一次，没有稳定来源，暂不收录。
- 只解决「数据缺失」，不解决行为差异；行为差异（如 26.3 的 `entityDelta`、mineflayer 的字段名）由插件侧的兼容层处理。