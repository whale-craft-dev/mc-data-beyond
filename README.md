# @whale-craft/mc-data-beyond

mineflayer 生态的**版本数据包**：把 `minecraft-data` 还没收录的 Minecraft 版本（协议定义、版本号、数据基线）以纯数据的形式独立带进来。

它不依赖、也不修改 `minecraft-data`。把数据注册进 `minecraft-data` 是使用方的事 —— 见 [`@whale-craft/mineflayer-beyond`](https://github.com/whale-craft/mineflayer-beyond)。

## 为什么需要它

`minecraft-data` 的版本数据跟着上游 PR 走，合并和发布都有延迟。截至本包发布时：

- Mojang 最新正式版是 **26.3**，最新快照是 **26.4-snapshot-7**；
- `minecraft-data@3.119.0`（npm 最新）和它的 `master` 分支都只到 **26.1**；
- 26.2 的数据只存在于未合并的分支 `pc_26_2` 里。

`mineflayer` 的 `testedVersions` 同样停在 26.1，于是新版本连「被认识」都做不到。这个包只负责一件事：**把缺的那部分数据准备好**，怎么接进去由插件决定。

## 内容

```
data/
  manifest.json          # 版本清单：协议号、dataVersion、数据基线、来源 commit、文件 sha256
  pc/26.2/protocol.json  # 协议编解码定义（约 330 KB）
  pc/26.2/version.json   # 协议号 776
```

每个版本只带 `protocol.json` 和 `version.json`。方块 / 物品 / 实体等静态数据不在这里 —— 26.2 的注册表和 26.1 完全一致，上游 `dataPaths.json` 里也是这么写的（全部指向 `pc/26.1`），所以 `manifest.json` 用 `baseVersion` 声明复用 26.1。

## 用法

```js
const data = require('@whale-craft/mc-data-beyond')

data.versions()        // ['26.2']
data.pack('26.2')      // { minecraftVersion, protocolVersion: 776, dataVersion, baseVersion, protocol, versionJson, source }
data.latest()          // 26.2 的 pack
```

`pack()` 第一次读取时会做三件事：校验文件 sha256、校验 `version.json` 与清单一致、确认 `protocol.json` 含全部状态段。任何一项不对都会直接抛错，避免把坏数据接进游戏。

## 加一个新版本

1. 拿到该版本的 `protocol.json` / `version.json`（上游分支或自己用 `minecraft-data` 的工具生成）；
2. **用真实服务端验证过**再放进来 —— 上游分支不等于正式版，见下面的「26.3 为什么不在」；
3. 放到 `data/pc/<version>/`；
4. 在 `data/manifest.json` 里加一条：`protocolVersion`、`dataVersion`（上游 `protocolVersions.json` 里的值）、`baseVersion`（静态数据复用谁）、`chunkBase` / `physicsBase`（行为等价于哪个老版本）、`source`（仓库 / 分支 / commit）、两个文件的 `sha256`；
5. `npm test` —— 清单与文件的一致性由测试和运行时双重校验。

## 26.3 为什么不在

上游分支 `pc_26_3` 的数据**和 26.3 正式版对不上**，实测（起 26.3 原版服务端 + 真实登录）至少有三处：

| 报文 | 正式服实际 | `pc_26_3` 分支 |
| --- | --- | --- |
| `login_success` | 带 16 字节 `sessionId` | 没有该字段 |
| `custom_report_details` | 末尾多一个字符串（服务器版本 `26.3`） | 没有 |
| `tags` | 结构变了，按分支定义解析会读越界 | 旧结构 |

用 26.2 的协议定义去连 26.3 同样过不去（`custom_report_details` / `tags` 不一致）。把分支数据接进去的结果是：客户端能算出 26.3 / 777，但配置阶段解析错位，永远进不到 `play`。

所以这个包只收录**验证过的**版本。26.3 需要重新生成一份协议数据（`minecraft-data` 的生成器不在 npm 包里，要用仓库的 `tools/` + 服务端 jar），属于下一步工作。

## 数据来源与许可

| 版本 | 来源 | commit |
| --- | --- | --- |
| 26.2 | `PrismarineJS/minecraft-data` 分支 `pc_26_2` | `282f19b06c7cc98f055c39787acf93904b9587fa` |

`minecraft-data` 以 MIT 许可发布；本包沿用 MIT（见 `LICENSE`）。协议数据描述的是 Mojang 的网络协议格式，不含游戏代码或素材。

上游合并后，对应版本可以从这里删掉，插件会优先使用 `minecraft-data` 自带的数据。

## 边界

- 只支持**正式版**，且只收录用真实服务端验证过的版本。
- 快照（如 26.4-snapshot-7）协议号是 `1073742xxx` 且每两周变一次，没有稳定来源，暂不收录。
- 只解决「数据缺失」，不解决行为差异。新版本若有包结构变化导致 `mineflayer` 解析出错，需要在插件侧写兼容层。