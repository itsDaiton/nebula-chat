# Changelog

## [5.15.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.14.1...nebula-chat-v5.15.0) (2026-10-31)


### Features

* **server:** NEB-540 Admin reads the User list and a User's details ([#697](https://github.com/itsDaiton/nebula-chat/issues/697)) ([838729a](https://github.com/itsDaiton/nebula-chat/commit/838729a572dcd8bde13cd94ee1f5949b1842e441))
* **server:** NEB-544 Account deletion starts a 30-day Pending deletion ([#699](https://github.com/itsDaiton/nebula-chat/issues/699)) ([cbf636b](https://github.com/itsDaiton/nebula-chat/commit/cbf636b24371eb59794459f1c20494898e4479d2))

## [5.14.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.14.0...nebula-chat-v5.14.1) (2026-10-31)


### Bug Fixes

* **agents:** NEB-689 split server and client AGENTS.md into path-scoped rules ([#698](https://github.com/itsDaiton/nebula-chat/issues/698)) ([7281fc5](https://github.com/itsDaiton/nebula-chat/commit/7281fc540d88afb2a3dc81a3995d2742b7fb038e))

## [5.14.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.13.0...nebula-chat-v5.14.0) (2026-10-31)


### Features

* **server:** NEB-539 admin gate, Audit log and Operator admin routes ([#695](https://github.com/itsDaiton/nebula-chat/issues/695)) ([e044c81](https://github.com/itsDaiton/nebula-chat/commit/e044c818fbaf52095e2b9bda952d77c48eafb918)), closes [#539](https://github.com/itsDaiton/nebula-chat/issues/539)

## [5.13.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.12.3...nebula-chat-v5.13.0) (2026-10-31)


### Features

* **auth:** NEB-538 enable the admin and two-factor plugins with the Audit log table ([#691](https://github.com/itsDaiton/nebula-chat/issues/691)) ([abff13c](https://github.com/itsDaiton/nebula-chat/commit/abff13c83f31d750867fd44082e7770af45059cf))

## [5.12.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.12.2...nebula-chat-v5.12.3) (2026-10-31)


### Bug Fixes

* **deps:** override vulnerable transitive deps, ignore deepmerge ([#692](https://github.com/itsDaiton/nebula-chat/issues/692)) ([1e7cfa3](https://github.com/itsDaiton/nebula-chat/commit/1e7cfa32be2c0b912ad10083ad15d37e6eae5ff6))

## [5.12.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.12.1...nebula-chat-v5.12.2) (2026-10-30)


### Bug Fixes

* Claude Code harness, skills update and GLOSSARY.md ([#688](https://github.com/itsDaiton/nebula-chat/issues/688)) ([17abd54](https://github.com/itsDaiton/nebula-chat/commit/17abd5450d4020b267c8e8b07579f23da90bb2e5))

## [5.12.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.12.0...nebula-chat-v5.12.1) (2026-10-29)


### Bug Fixes

* **worker:** NEB-671 omit unsupported sampling parameters per Model ([#684](https://github.com/itsDaiton/nebula-chat/issues/684)) ([ab86f47](https://github.com/itsDaiton/nebula-chat/commit/ab86f477b348d02040601e0227918db399ee8475))

## [5.12.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.11.0...nebula-chat-v5.12.0) (2026-10-28)


### Features

* **server:** Session search matches Message content and returns a snippet ([#680](https://github.com/itsDaiton/nebula-chat/issues/680)) ([367cf88](https://github.com/itsDaiton/nebula-chat/commit/367cf8835471ce9b00ac8d79e9fc28fd3f1753ac))

## [5.11.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.10.1...nebula-chat-v5.11.0) (2026-10-27)


### Features

* **server:** NEB-543 Users archive and restore their Sessions ([#673](https://github.com/itsDaiton/nebula-chat/issues/673)) ([64e909a](https://github.com/itsDaiton/nebula-chat/commit/64e909a9a1a86167abb26766ccc69569ad771abe))

## [5.10.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.10.0...nebula-chat-v5.10.1) (2026-10-27)


### Bug Fixes

* add the redesign design rules and review decisions for agents ([#667](https://github.com/itsDaiton/nebula-chat/issues/667)) ([60fdcb9](https://github.com/itsDaiton/nebula-chat/commit/60fdcb9ff5f9ea1ae2085de9f4d20f2eb3ea5bb3))

## [5.10.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.9.1...nebula-chat-v5.10.0) (2026-10-26)


### Features

* **worker:** NEB-361 resume Runs from their checkpoint and enforce failure end states ([#663](https://github.com/itsDaiton/nebula-chat/issues/663)) ([7b89c2f](https://github.com/itsDaiton/nebula-chat/commit/7b89c2fa48d978b4badc2bf7210fbc9c91b0d829))

## [5.9.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.9.0...nebula-chat-v5.9.1) (2026-10-26)


### Bug Fixes

* **ci:** stop cancelled main builds failing build-result ([#660](https://github.com/itsDaiton/nebula-chat/issues/660)) ([7cc29f2](https://github.com/itsDaiton/nebula-chat/commit/7cc29f2f2d4372a95b28169161de6e44194ce94f))

## [5.9.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.8.1...nebula-chat-v5.9.0) (2026-10-26)


### Features

* **worker:** NEB-360 Orchestrator tool-calling loop with delegate Agents and Run budget ([#656](https://github.com/itsDaiton/nebula-chat/issues/656)) ([273a3ba](https://github.com/itsDaiton/nebula-chat/commit/273a3bac5dd566f996862e0d0f4075bcc5c9cbf5))

## [5.8.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.8.0...nebula-chat-v5.8.1) (2026-10-26)


### Bug Fixes

* allowlist MCP servers and keep file edits as diffs ([5fce3f9](https://github.com/itsDaiton/nebula-chat/commit/5fce3f961da0e40e45fe13bd0af38216a24afd71))

## [5.8.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.7.0...nebula-chat-v5.8.0) (2026-10-26)


### Features

* **worker:** NEB-359 Runs with Intake Agents, Brief and Output Agent ([#651](https://github.com/itsDaiton/nebula-chat/issues/651)) ([d74c64e](https://github.com/itsDaiton/nebula-chat/commit/d74c64edb494ba93bb6cb76236dafb268c83f905)), closes [#359](https://github.com/itsDaiton/nebula-chat/issues/359)

## [5.7.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.6.1...nebula-chat-v5.7.0) (2026-10-25)


### Features

* **worker:** NEB-567 Model call ledger for Direct replies ([#646](https://github.com/itsDaiton/nebula-chat/issues/646)) ([75f4522](https://github.com/itsDaiton/nebula-chat/commit/75f452203e59f60f7c75d3b5d007d5f296a8dd03))

## [5.6.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.6.0...nebula-chat-v5.6.1) (2026-10-25)


### Bug Fixes

* **ci:** NEB-581 reject angle brackets in issue and PR titles so Release Please tags every release ([#645](https://github.com/itsDaiton/nebula-chat/issues/645)) ([2d8d026](https://github.com/itsDaiton/nebula-chat/commit/2d8d026ea584474ffcae6b64b58154c2f3bf1f4f))

## [5.6.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.5.1...nebula-chat-v5.6.0) (2026-10-25)


### Features

* **contracts:** NEB-565 model catalog, GET /api/models and prices ([#643](https://github.com/itsDaiton/nebula-chat/issues/643)) ([60856ed](https://github.com/itsDaiton/nebula-chat/commit/60856ed5f08c2fb8b93726617128a1a3f69c0458))

## [5.5.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.5.0...nebula-chat-v5.5.1) (2026-10-25)


### Bug Fixes

* **worker:** NEB-358 dissolve @nebula-chat/langchain into the worker app ([#640](https://github.com/itsDaiton/nebula-chat/issues/640)) ([bd2919f](https://github.com/itsDaiton/nebula-chat/commit/bd2919f913fbfd7ebd52fcb7c82bd9cd398450ab))

## [5.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.4.0...nebula-chat-v5.5.0) (2026-10-25)


### Features

* **worker:** NEB-357 propagate one OTel trace across server, queue and worker ([#637](https://github.com/itsDaiton/nebula-chat/issues/637)) ([7046d62](https://github.com/itsDaiton/nebula-chat/commit/7046d624d9e9c7440e469e2c89b00eca9201ad99))

## [5.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.3.0...nebula-chat-v5.4.0) (2026-10-25)


### Features

* **worker:** NEB-356 cache Direct replies in the worker ([#635](https://github.com/itsDaiton/nebula-chat/issues/635)) ([0eed2a0](https://github.com/itsDaiton/nebula-chat/commit/0eed2a04199e74d979b818cc2299b25814d56109))

## [5.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.2.2...nebula-chat-v5.3.0) (2026-10-24)


### Features

* **client:** NEB-537 serve the chat routes through TanStack Router and remove react-router and AuthGate ([#631](https://github.com/itsDaiton/nebula-chat/issues/631)) ([cfcb628](https://github.com/itsDaiton/nebula-chat/commit/cfcb628530007c11144f5b4ec98687bc28066c83))

## [5.2.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.2.1...nebula-chat-v5.2.2) (2026-10-24)


### Bug Fixes

* **config:** trim Prettier config to non-default options ([#629](https://github.com/itsDaiton/nebula-chat/issues/629)) ([aa36c79](https://github.com/itsDaiton/nebula-chat/commit/aa36c7913e328b88a77d0d52e5ad33b25bdbe9af))

## [5.2.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.2.0...nebula-chat-v5.2.1) (2026-10-24)


### Bug Fixes

* **agents:** slim agent docs, drop home-grown skills, trim heavy comments ([#627](https://github.com/itsDaiton/nebula-chat/issues/627)) ([acf7b7c](https://github.com/itsDaiton/nebula-chat/commit/acf7b7cb6c96b0103eb27382a77043d4133a615c))

## [5.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.1.0...nebula-chat-v5.2.0) (2026-10-24)


### Features

* **worker:** NEB-355 make reply streams resumable and cancellable ([#621](https://github.com/itsDaiton/nebula-chat/issues/621)) ([75c9975](https://github.com/itsDaiton/nebula-chat/commit/75c99750070d7806cd96ccf71731b501d0eb7e23))

## [5.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.0.7...nebula-chat-v5.1.0) (2026-10-24)


### Features

* **client:** NEB-536 serve the auth routes through TanStack Router with typed search params ([#620](https://github.com/itsDaiton/nebula-chat/issues/620)) ([6bfe66d](https://github.com/itsDaiton/nebula-chat/commit/6bfe66d06b02e9f72aa3594b6ab0971cdf99bae2))

## [5.0.7](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.0.6...nebula-chat-v5.0.7) (2026-10-24)


### Bug Fixes

* **deps:** patch fast-uri, undici, zod and markdown-it advisories ([#622](https://github.com/itsDaiton/nebula-chat/issues/622)) ([5270c3a](https://github.com/itsDaiton/nebula-chat/commit/5270c3a124352617005bb13cf02eeebb428db551))

## [5.0.6](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.0.5...nebula-chat-v5.0.6) (2026-10-24)


### Bug Fixes

* **server:** NEB-618 rename the [@backend](https://github.com/backend) path alias to [@server](https://github.com/server) ([#619](https://github.com/itsDaiton/nebula-chat/issues/619)) ([7c26a6c](https://github.com/itsDaiton/nebula-chat/commit/7c26a6c502683720c7e3d923d9b65ac86317752c))

## [5.0.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.0.4...nebula-chat-v5.0.5) (2026-10-23)


### Bug Fixes

* **server:** NEB-609 delete the stored Profile image when an account is deleted ([#616](https://github.com/itsDaiton/nebula-chat/issues/616)) ([cd1eeda](https://github.com/itsDaiton/nebula-chat/commit/cd1eeda0d084c7463f96cfab4ebc9062a99863c2))

## [5.0.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.0.3...nebula-chat-v5.0.4) (2026-10-23)


### Bug Fixes

* **ci:** skip the build matrix on Release Please PRs ([#614](https://github.com/itsDaiton/nebula-chat/issues/614)) ([a7c9fac](https://github.com/itsDaiton/nebula-chat/commit/a7c9fac18cf6f4b1d0db034fd47ff2a6e5fb9db2))

## [5.0.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.0.2...nebula-chat-v5.0.3) (2026-10-23)


### Bug Fixes

* **ci:** NEB-608 redeploy the server and client on every workspace library they are built from ([#612](https://github.com/itsDaiton/nebula-chat/issues/612)) ([3ed97f6](https://github.com/itsDaiton/nebula-chat/commit/3ed97f6dcb7660052797abe6cf906befad9e3957))

## [5.0.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.0.1...nebula-chat-v5.0.2) (2026-10-23)


### Bug Fixes

* **deps:** patch the Node.js October 2026 security release and vulnerable deps ([#610](https://github.com/itsDaiton/nebula-chat/issues/610)) ([c86fd52](https://github.com/itsDaiton/nebula-chat/commit/c86fd52eb8fd982c81135b3d81ed1df5efb7fdab))

## [5.0.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v5.0.0...nebula-chat-v5.0.1) (2026-10-20)


### Bug Fixes

* **deploy:** pin the server and worker to Frankfurt in render.yaml ([#605](https://github.com/itsDaiton/nebula-chat/issues/605)) ([2745157](https://github.com/itsDaiton/nebula-chat/commit/27451571e77aa23a2c444440c484c082e52df489))

## [5.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v4.0.0...nebula-chat-v5.0.0) (2026-10-20)


### ⚠ BREAKING CHANGES

* NEB-354 release the worker split as breaking for server and openapi ([#603](https://github.com/itsDaiton/nebula-chat/issues/603))

### Features

* NEB-354 release the worker split as breaking for server and openapi ([#603](https://github.com/itsDaiton/nebula-chat/issues/603)) ([fd6d395](https://github.com/itsDaiton/nebula-chat/commit/fd6d39590a6e17ff62bc3a47366ae93b88120050))
* **worker:** NEB-354 produce Direct replies in a dedicated worker app via BullMQ and Redis Streams ([#601](https://github.com/itsDaiton/nebula-chat/issues/601)) ([69ac0b4](https://github.com/itsDaiton/nebula-chat/commit/69ac0b43aba769dcbfccbb61ef7fa66cd8d571d4))

## [4.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v3.2.0...nebula-chat-v4.0.0) (2026-10-19)


### ⚠ BREAKING CHANGES

* **messages:** NEB-353 remove the unused system role from Message ([#599](https://github.com/itsDaiton/nebula-chat/issues/599))

### Features

* **client:** NEB-535 boot TanStack Router with file-based routes and serve Settings and not-found through it ([#598](https://github.com/itsDaiton/nebula-chat/issues/598)) ([bcfebf1](https://github.com/itsDaiton/nebula-chat/commit/bcfebf118c49cbbab15cd0bce4fbe865c6ec9b94))


### Bug Fixes

* **messages:** NEB-353 remove the unused system role from Message ([#599](https://github.com/itsDaiton/nebula-chat/issues/599)) ([80ff6ac](https://github.com/itsDaiton/nebula-chat/commit/80ff6ac1869cd0237a4f0ba451c5e085244f17ff))

## [3.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v3.1.0...nebula-chat-v3.2.0) (2026-10-19)


### Features

* **cli:** add nebula log-level get, reading levels from every server instance ([#592](https://github.com/itsDaiton/nebula-chat/issues/592)) ([b64556e](https://github.com/itsDaiton/nebula-chat/commit/b64556eca2538515a32edd5b472151fe8e187835))

## [3.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v3.0.1...nebula-chat-v3.1.0) (2026-10-19)


### Features

* **cli:** NEB-561 scaffold apps/cli with profiles, JSON output and log-level commands ([#587](https://github.com/itsDaiton/nebula-chat/issues/587)) ([a7202ae](https://github.com/itsDaiton/nebula-chat/commit/a7202ae008f75e1860912901d77ee90f85984d16))

## [3.0.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v3.0.0...nebula-chat-v3.0.1) (2026-10-19)


### Bug Fixes

* **ci:** run Build and MegaLinter on pull requests into any branch ([#593](https://github.com/itsDaiton/nebula-chat/issues/593)) ([44d6e54](https://github.com/itsDaiton/nebula-chat/commit/44d6e547f5e7ba20518eb73f4beb1187d2fd29b1))

## [3.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.18.0...nebula-chat-v3.0.0) (2026-10-19)


### ⚠ BREAKING CHANGES

* the domain Conversation is now a Session ([#588](https://github.com/itsDaiton/nebula-chat/issues/588)). @nebula-chat/auth exports `claimSessions` and `ClaimSessionsParams` in place of `claimConversations` and `ClaimConversationsParams`. The OpenAPI contract serves `/api/sessions*` in place of `/api/conversations*`, with `Session`/`SessionPage` schemas and `sessionId` in place of `conversationId`.

### Features

* NEB-352 release the Session rename as breaking for auth and openapi ([#590](https://github.com/itsDaiton/nebula-chat/issues/590)) ([bc85d0f](https://github.com/itsDaiton/nebula-chat/commit/bc85d0f5c2fa2d800d87904b393d008bfc3c0175))

## [2.18.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.9...nebula-chat-v2.18.0) (2026-10-19)


### Features

* **sessions:** NEB-352 rename Conversation to Session end to end ([#588](https://github.com/itsDaiton/nebula-chat/issues/588)) ([4d8e9c5](https://github.com/itsDaiton/nebula-chat/commit/4d8e9c58949d573ba641f476095f920645fdec74))

## [2.17.9](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.8...nebula-chat-v2.17.9) (2026-10-18)


### Bug Fixes

* **docs:** glossary and ADR for LangGraph Runs and the Clarifying question ([#584](https://github.com/itsDaiton/nebula-chat/issues/584)) ([fe15183](https://github.com/itsDaiton/nebula-chat/commit/fe15183d9b5c622dfbc019243b9ece9f8b7cde54))

## [2.17.8](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.7...nebula-chat-v2.17.8) (2026-10-18)


### Bug Fixes

* **client:** regenerate the API client and drop the spec version from its headers ([#582](https://github.com/itsDaiton/nebula-chat/issues/582)) ([d983e60](https://github.com/itsDaiton/nebula-chat/commit/d983e60efdf965535a7c3f85ceb39e4146b42711))

## [2.17.7](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.6...nebula-chat-v2.17.7) (2026-10-18)


### Bug Fixes

* **repo:** NEB-526 rename apps to apps/client and apps/server as @nebula-chat/&lt;app&gt; ([#577](https://github.com/itsDaiton/nebula-chat/issues/577)) ([fe5ab0a](https://github.com/itsDaiton/nebula-chat/commit/fe5ab0aa5fedb1a769a22d7cf7433d2c4e45921d)), closes [#526](https://github.com/itsDaiton/nebula-chat/issues/526)

## [2.17.6](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.5...nebula-chat-v2.17.6) (2026-10-18)


### Bug Fixes

* **ci:** NEB-573 upload Grafana dashboards to Grafana Cloud when the JSON changes ([#576](https://github.com/itsDaiton/nebula-chat/issues/576)) ([d027c17](https://github.com/itsDaiton/nebula-chat/commit/d027c17d58cfb6eca07855105262ecc82b120a6d))

## [2.17.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.4...nebula-chat-v2.17.5) (2026-10-18)


### Bug Fixes

* **auth:** rate-limit per client IP from CF-Connecting-IP ([#574](https://github.com/itsDaiton/nebula-chat/issues/574)) ([cc67f75](https://github.com/itsDaiton/nebula-chat/commit/cc67f75da9eb86cbfe11dfdab88c624fda430307))

## [2.17.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.3...nebula-chat-v2.17.4) (2026-10-18)


### Bug Fixes

* **repo:** project MCP servers for agents and an AGENTS.md guide to them ([#571](https://github.com/itsDaiton/nebula-chat/issues/571)) ([0cebdc1](https://github.com/itsDaiton/nebula-chat/commit/0cebdc1a808c76a7bd84ed70389276fb89215f1b))

## [2.17.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.2...nebula-chat-v2.17.3) (2026-10-18)


### Bug Fixes

* **docs:** glossary and ADRs for roles, admin dashboard, redesign, CLI and usage ([#525](https://github.com/itsDaiton/nebula-chat/issues/525)) ([1d13294](https://github.com/itsDaiton/nebula-chat/commit/1d13294c60ab5a91715d4c6eb278a6cfa6015be9))

## [2.17.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.1...nebula-chat-v2.17.2) (2026-10-18)


### Bug Fixes

* **auth:** NEB-490 explain how to link a social provider to an unverified email account ([#522](https://github.com/itsDaiton/nebula-chat/issues/522)) ([b89af90](https://github.com/itsDaiton/nebula-chat/commit/b89af9067f6b4a4e5f3ef2f4b966db76c11f447f))

## [2.17.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.17.0...nebula-chat-v2.17.1) (2026-10-18)


### Bug Fixes

* **client:** align the allowance counter's action and tidy its docs ([#520](https://github.com/itsDaiton/nebula-chat/issues/520)) ([5499fb7](https://github.com/itsDaiton/nebula-chat/commit/5499fb71b26102d23dfd7b3b7a4d86b6a3ced807))

## [2.17.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.16.0...nebula-chat-v2.17.0) (2026-10-18)


### Features

* **client:** NEB-463 show the message allowance above the chat input ([#517](https://github.com/itsDaiton/nebula-chat/issues/517)) ([1c4a9a8](https://github.com/itsDaiton/nebula-chat/commit/1c4a9a8e5ccf38b73ca1ec002e6a316530087328))

## [2.16.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.15.1...nebula-chat-v2.16.0) (2026-10-17)


### Features

* **otel:** NEB-371 export logs over OTLP to Grafana Loki ([#513](https://github.com/itsDaiton/nebula-chat/issues/513)) ([aa17553](https://github.com/itsDaiton/nebula-chat/commit/aa17553081239abfd33b9bb9bc82a4bd379ca7e8))

## [2.15.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.15.0...nebula-chat-v2.15.1) (2026-10-16)


### Bug Fixes

* **db:** log and survive idle Postgres connection errors ([#512](https://github.com/itsDaiton/nebula-chat/issues/512)) ([32e170f](https://github.com/itsDaiton/nebula-chat/commit/32e170f5c7a44cc3bb52a7dff3b4de3a4db5af3a))

## [2.15.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.14.1...nebula-chat-v2.15.0) (2026-10-11)


### Features

* **server:** NEB-462 expose the message allowance as a read endpoint ([#509](https://github.com/itsDaiton/nebula-chat/issues/509)) ([3177464](https://github.com/itsDaiton/nebula-chat/commit/3177464f5f8abd7f61382e6d2d87a3ea6cb581b9))

## [2.14.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.14.0...nebula-chat-v2.14.1) (2026-10-11)


### Bug Fixes

* **client:** NEB-461 generate the chat stream request through Orval ([#507](https://github.com/itsDaiton/nebula-chat/issues/507)) ([197642f](https://github.com/itsDaiton/nebula-chat/commit/197642f29f23dc83bab2a688be90598216e42d12))

## [2.14.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.13.0...nebula-chat-v2.14.0) (2026-10-11)


### Features

* **auth:** NEB-471 NEB-472 NEB-473 Profile images ([#502](https://github.com/itsDaiton/nebula-chat/issues/502)) ([f6c1da5](https://github.com/itsDaiton/nebula-chat/commit/f6c1da596344946fd4c3cb5f93db38ac3df23046))

## [2.13.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.12.0...nebula-chat-v2.13.0) (2026-10-10)


### Features

* **auth:** NEB-460 password change from a new Settings area ([#492](https://github.com/itsDaiton/nebula-chat/issues/492)) ([22b57ed](https://github.com/itsDaiton/nebula-chat/commit/22b57ed38737d9af2540c5ebb37cdd37a40dcc75))

## [2.12.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.11.1...nebula-chat-v2.12.0) (2026-10-10)


### Features

* **repo:** add build:libs script for workspace libs ([#497](https://github.com/itsDaiton/nebula-chat/issues/497)) ([b9bb3ca](https://github.com/itsDaiton/nebula-chat/commit/b9bb3cad5af18d0ff07f1cddb5d263ff8bd01f25))


### Bug Fixes

* **client:** clean better-auth atoms before jsdom teardown ([#498](https://github.com/itsDaiton/nebula-chat/issues/498)) ([01b283f](https://github.com/itsDaiton/nebula-chat/commit/01b283f4f8d599533539c5e5892db6ed23699303))

## [2.11.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.11.0...nebula-chat-v2.11.1) (2026-10-10)


### Bug Fixes

* **server:** restart dev server on .env changes via nodemon ([#493](https://github.com/itsDaiton/nebula-chat/issues/493)) ([2b90ee8](https://github.com/itsDaiton/nebula-chat/commit/2b90ee82358628eafa51882ad70bafceb929cb6b))

## [2.11.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.10.5...nebula-chat-v2.11.0) (2026-10-10)


### Features

* **client:** NEB-466 user menu and Settings area ([#489](https://github.com/itsDaiton/nebula-chat/issues/489)) ([4d9d239](https://github.com/itsDaiton/nebula-chat/commit/4d9d2397452eb40d5515aaaeee0d878569b36b93))

## [2.10.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.10.4...nebula-chat-v2.10.5) (2026-10-09)


### Bug Fixes

* **client:** drop unused export of AuthAlertStatus ([#487](https://github.com/itsDaiton/nebula-chat/issues/487)) ([90f8b87](https://github.com/itsDaiton/nebula-chat/commit/90f8b873e36544d14d1449af4710a220675f0aa9))

## [2.10.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.10.3...nebula-chat-v2.10.4) (2026-10-09)


### Bug Fixes

* **deps:** NEB-481 bump smol-toml to 1.9.0 ([#485](https://github.com/itsDaiton/nebula-chat/issues/485)) ([f21415c](https://github.com/itsDaiton/nebula-chat/commit/f21415c5b132031572df83d045722533155ca8ac))

## [2.10.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.10.2...nebula-chat-v2.10.3) (2026-10-09)


### Bug Fixes

* **server:** NEB-447 redact the password-reset token from request logs ([#483](https://github.com/itsDaiton/nebula-chat/issues/483)) ([fd85730](https://github.com/itsDaiton/nebula-chat/commit/fd85730290bee58b8ee512aedf23c1b78a5bcaa1))

## [2.10.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.10.1...nebula-chat-v2.10.2) (2026-10-09)


### Bug Fixes

* **auth:** NEB-469 replace deprecated @react-email/components with react-email ([#480](https://github.com/itsDaiton/nebula-chat/issues/480)) ([a9b99f3](https://github.com/itsDaiton/nebula-chat/commit/a9b99f3a15804aa613918b081b433872228e5b52))

## [2.10.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.10.0...nebula-chat-v2.10.1) (2026-10-06)


### Bug Fixes

* **server:** exit promptly on shutdown so dev reloads are not stalled ([#478](https://github.com/itsDaiton/nebula-chat/issues/478)) ([520c0a7](https://github.com/itsDaiton/nebula-chat/commit/520c0a7d6954e934e4cfc5532ce03c25fbe5344b))

## [2.10.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.9.5...nebula-chat-v2.10.0) (2026-10-06)


### Features

* **auth:** NEB-342 add Google and GitHub social sign-in ([#475](https://github.com/itsDaiton/nebula-chat/issues/475)) ([de3bdd8](https://github.com/itsDaiton/nebula-chat/commit/de3bdd8d2a01730b76ad51ab3e4a874439af9c36))

## [2.9.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.9.4...nebula-chat-v2.9.5) (2026-10-06)


### Bug Fixes

* **deps:** override undici under @scalar/json-magic to clear grype advisories ([#474](https://github.com/itsDaiton/nebula-chat/issues/474)) ([f2b9855](https://github.com/itsDaiton/nebula-chat/commit/f2b98553e6222e60558518c639c746106656371c))
* **docs:** add Avatar and Profile image to the glossary ([#468](https://github.com/itsDaiton/nebula-chat/issues/468)) ([90f1217](https://github.com/itsDaiton/nebula-chat/commit/90f12178a1a1c2663bdbd190b883947d4a50ed9f))

## [2.9.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.9.3...nebula-chat-v2.9.4) (2026-10-05)


### Bug Fixes

* **docs:** add Metered user to the glossary and tighten Message allowance ([#456](https://github.com/itsDaiton/nebula-chat/issues/456)) ([7356d75](https://github.com/itsDaiton/nebula-chat/commit/7356d75e10f34e0a135ac2091d8b7408aa9b4848))
* **docs:** define password change and password reset in the glossary ([#455](https://github.com/itsDaiton/nebula-chat/issues/455)) ([d42f07d](https://github.com/itsDaiton/nebula-chat/commit/d42f07d68494573071b46b39796f7dcace821923))

## [2.9.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.9.2...nebula-chat-v2.9.3) (2026-10-05)


### Bug Fixes

* **dev:** drop password segment from example DB URLs for secretlint ([#457](https://github.com/itsDaiton/nebula-chat/issues/457)) ([2c398f4](https://github.com/itsDaiton/nebula-chat/commit/2c398f457a7001566418326fccb54b56be3d245b))

## [2.9.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.9.1...nebula-chat-v2.9.2) (2026-10-05)


### Bug Fixes

* **dev:** move docker-compose.yml to the repo root ([#451](https://github.com/itsDaiton/nebula-chat/issues/451)) ([e50a462](https://github.com/itsDaiton/nebula-chat/commit/e50a46230f9795908782ae59c6d31bc43d0b90e6))

## [2.9.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.9.0...nebula-chat-v2.9.1) (2026-10-04)


### Bug Fixes

* point the API at api.nebula-chat.cz and document the same-site cookie rule ([#449](https://github.com/itsDaiton/nebula-chat/issues/449)) ([17af975](https://github.com/itsDaiton/nebula-chat/commit/17af975c468e6c85bf4ccf173f413b2d6bd0edbc))

## [2.9.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.8.0...nebula-chat-v2.9.0) (2026-10-04)


### Features

* **auth:** NEB-341 add email verification and password reset via Resend ([#445](https://github.com/itsDaiton/nebula-chat/issues/445)) ([2314bb8](https://github.com/itsDaiton/nebula-chat/commit/2314bb881fd672457e65a7ebf56e780d6a91e7e8))

## [2.8.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.7.0...nebula-chat-v2.8.0) (2026-10-04)


### Features

* **client:** NEB-340 prompt registration when a Guest hits the message allowance ([#441](https://github.com/itsDaiton/nebula-chat/issues/441)) ([be16e63](https://github.com/itsDaiton/nebula-chat/commit/be16e63da2e6bafa529aa159b5fc09e1f9671deb))

## [2.7.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.6.1...nebula-chat-v2.7.0) (2026-10-04)


### Features

* **client:** NEB-339 add sign-up, sign-in and sign-out on a dedicated auth page ([#438](https://github.com/itsDaiton/nebula-chat/issues/438)) ([a757005](https://github.com/itsDaiton/nebula-chat/commit/a757005c87d5d99c02069e0169bd635d6e8c2cdf))


### Bug Fixes

* **server:** grant redis DAC_OVERRIDE so the entrypoint can traverse appendonlydir ([#442](https://github.com/itsDaiton/nebula-chat/issues/442)) ([df5d437](https://github.com/itsDaiton/nebula-chat/commit/df5d43703b3ed5dcfa01531a19d3595e6871d7d1))

## [2.6.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.6.0...nebula-chat-v2.6.1) (2026-10-03)


### Bug Fixes

* move zod to the pnpm catalog ([#439](https://github.com/itsDaiton/nebula-chat/issues/439)) ([7ce238d](https://github.com/itsDaiton/nebula-chat/commit/7ce238d413bd2097adff9af911dbb997de87f9eb))

## [2.6.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.5.7...nebula-chat-v2.6.0) (2026-10-03)


### Features

* **client:** NEB-338 wire better-auth client and bootstrap a Guest session on load ([#435](https://github.com/itsDaiton/nebula-chat/issues/435)) ([c7e70bb](https://github.com/itsDaiton/nebula-chat/commit/c7e70bb43926d2d1654f15bc2ea6aa7c0c69a89d))


### Bug Fixes

* **server:** validate CLIENT_URL and SERVER_URL as http(s) origins ([#436](https://github.com/itsDaiton/nebula-chat/issues/436)) ([c81a461](https://github.com/itsDaiton/nebula-chat/commit/c81a4617ec2cb44ae84f725c5bd7c6a9a8de0eaa))

## [2.5.7](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.5.6...nebula-chat-v2.5.7) (2026-10-03)


### Bug Fixes

* **server:** keep the capabilities postgres and redis need to start ([#433](https://github.com/itsDaiton/nebula-chat/issues/433)) ([e7974e8](https://github.com/itsDaiton/nebula-chat/commit/e7974e89a4cb7c367a24a450fb5d81e04b6c1ee2))
* **server:** treat an empty OPERATOR_TOKEN as unset ([#432](https://github.com/itsDaiton/nebula-chat/issues/432)) ([6d480d4](https://github.com/itsDaiton/nebula-chat/commit/6d480d4eb0767bb1a99a629fa1a14024933ed2bc))

## [2.5.6](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.5.5...nebula-chat-v2.5.6) (2026-10-03)


### Bug Fixes

* **ci:** enable Dependabot for docker-compose images ([#428](https://github.com/itsDaiton/nebula-chat/issues/428)) ([745e619](https://github.com/itsDaiton/nebula-chat/commit/745e619abf4b899bffb355c593bdfa5e16bc7f88))

## [2.5.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.5.4...nebula-chat-v2.5.5) (2026-10-02)


### Bug Fixes

* **ci:** disable MegaLinter's markdown-table-formatter, which contradicts Prettier ([#426](https://github.com/itsDaiton/nebula-chat/issues/426)) ([14c7f68](https://github.com/itsDaiton/nebula-chat/commit/14c7f68766b0920b2e19fde2c68af3502153f8eb))

## [2.5.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.5.3...nebula-chat-v2.5.4) (2026-10-02)


### Bug Fixes

* **ci:** unblock MegaLinter's grype and trivy scans ([#421](https://github.com/itsDaiton/nebula-chat/issues/421)) ([b7fc2d0](https://github.com/itsDaiton/nebula-chat/commit/b7fc2d005b0a1a1d4eadf133d5255094ea868a74))
* **server:** NEB-415 add CORS headers to /api/auth/* responses ([#424](https://github.com/itsDaiton/nebula-chat/issues/424)) ([3a6aef8](https://github.com/itsDaiton/nebula-chat/commit/3a6aef868d8f4adff6ee0f8a7ed1a60619916bb8))
* **server:** NEB-423 forward @fastify/cors headers onto the chat stream ([#425](https://github.com/itsDaiton/nebula-chat/issues/425)) ([fe75351](https://github.com/itsDaiton/nebula-chat/commit/fe753515f13b242238c0d8d67a29aeb415ae1275))

## [2.5.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.5.2...nebula-chat-v2.5.3) (2026-10-02)


### Bug Fixes

* **redis:** open the connection before the first authStore command ([#410](https://github.com/itsDaiton/nebula-chat/issues/410)) ([c5366dc](https://github.com/itsDaiton/nebula-chat/commit/c5366dcc54ec62c84fe7d3813b25daa36340e704))
* **server:** tighten the auth catch-all failure comments and status ([#418](https://github.com/itsDaiton/nebula-chat/issues/418)) ([b7d15bd](https://github.com/itsDaiton/nebula-chat/commit/b7d15bd8a8a53c94776e1da1d874869a9d887c7d))

## [2.5.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.5.1...nebula-chat-v2.5.2) (2026-10-02)


### Bug Fixes

* **redis:** log connection errors through the injected logger ([#412](https://github.com/itsDaiton/nebula-chat/issues/412)) ([54b4be2](https://github.com/itsDaiton/nebula-chat/commit/54b4be2744ca7ab5739050a632562b4fc537fd47))

## [2.5.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.5.0...nebula-chat-v2.5.1) (2026-10-02)


### Bug Fixes

* **server:** answer the auth catch-all with a 500 when better-auth throws ([#414](https://github.com/itsDaiton/nebula-chat/issues/414)) ([e34721a](https://github.com/itsDaiton/nebula-chat/commit/e34721af33f67ae21f594e824e506e77f4f46367))

## [2.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.4.3...nebula-chat-v2.5.0) (2026-10-02)


### Features

* **otel:** NEB-370 change log levels at runtime without a restart ([#408](https://github.com/itsDaiton/nebula-chat/issues/408)) ([399cee0](https://github.com/itsDaiton/nebula-chat/commit/399cee03a0992cbd64bef6ace59fda931bd5f00b))

## [2.4.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.4.2...nebula-chat-v2.4.3) (2026-10-02)


### Bug Fixes

* **deps:** bump fastify, grpc-js, brace-expansion, fast-uri for CVEs ([#409](https://github.com/itsDaiton/nebula-chat/issues/409)) ([ef619c0](https://github.com/itsDaiton/nebula-chat/commit/ef619c03ee268b16b04d0c884ffe363e4991db03))

## [2.4.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.4.1...nebula-chat-v2.4.2) (2026-09-29)


### Bug Fixes

* **ci:** NEB-404 make pnpm knip pass and keep it green ([#406](https://github.com/itsDaiton/nebula-chat/issues/406)) ([052f360](https://github.com/itsDaiton/nebula-chat/commit/052f360423092be0e66bd108739bf1484de47edd))

## [2.4.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.4.0...nebula-chat-v2.4.1) (2026-09-29)


### Bug Fixes

* **server:** NEB-388 load env files with dotenvx in package scripts ([#403](https://github.com/itsDaiton/nebula-chat/issues/403)) ([23792d3](https://github.com/itsDaiton/nebula-chat/commit/23792d342af65a151c9e30d26462c3efe237ec5a))

## [2.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.3.4...nebula-chat-v2.4.0) (2026-09-29)


### Features

* **server:** NEB-385 switch OpenAPI generation to fastify-zod-openapi with named response schemas ([#401](https://github.com/itsDaiton/nebula-chat/issues/401)) ([f63d4fa](https://github.com/itsDaiton/nebula-chat/commit/f63d4fa7506af733c1cc6c138e13f538f6d40e53))

## [2.3.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.3.3...nebula-chat-v2.3.4) (2026-09-28)


### Bug Fixes

* **deps:** NEB-398 migrate lib builds from tsup to tsdown ([#399](https://github.com/itsDaiton/nebula-chat/issues/399)) ([678284f](https://github.com/itsDaiton/nebula-chat/commit/678284fd43a580450dda1586802bd27eac1c06c0))

## [2.3.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.3.2...nebula-chat-v2.3.3) (2026-09-28)


### Bug Fixes

* **server:** NEB-391 drop TS 6 deprecated tsconfig options ([#396](https://github.com/itsDaiton/nebula-chat/issues/396)) ([01f9b9c](https://github.com/itsDaiton/nebula-chat/commit/01f9b9c145c248ba9f6b677a835b0ca971a8b7a2))

## [2.3.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.3.1...nebula-chat-v2.3.2) (2026-09-27)


### Bug Fixes

* **ci:** ignore typescript major bumps until typescript-eslint supports TS 7 ([#393](https://github.com/itsDaiton/nebula-chat/issues/393)) ([01113ee](https://github.com/itsDaiton/nebula-chat/commit/01113eeee6a028e827f9f4b4bc8e565cb60f4996))

## [2.3.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.3.0...nebula-chat-v2.3.1) (2026-09-27)


### Bug Fixes

* **server:** NEB-388 record ADR-0019 for dotenvx env loading ([#389](https://github.com/itsDaiton/nebula-chat/issues/389)) ([d581621](https://github.com/itsDaiton/nebula-chat/commit/d581621920c2b5a02b0f02b771b3327bb43ce9a7))

## [2.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.2.1...nebula-chat-v2.3.0) (2026-09-27)


### Features

* **server:** NEB-385 switch OpenAPI generation to fastify-zod-openapi with named response schemas ([#386](https://github.com/itsDaiton/nebula-chat/issues/386)) ([693278d](https://github.com/itsDaiton/nebula-chat/commit/693278dc6615a21eec120e0d719760f0ec263ee7))

## [2.2.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.2.0...nebula-chat-v2.2.1) (2026-09-27)


### Bug Fixes

* **server:** honour OPENAPI_* env stand-ins in generate:openapi ([#383](https://github.com/itsDaiton/nebula-chat/issues/383)) ([d5ffcae](https://github.com/itsDaiton/nebula-chat/commit/d5ffcae27d796655529207fe01a8e5c4a0984876))

## [2.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.1.0...nebula-chat-v2.2.0) (2026-09-27)


### Features

* **server:** NEB-377 list one conversation's messages via GET /api/messages?conversationId ([#381](https://github.com/itsDaiton/nebula-chat/issues/381)) ([189091b](https://github.com/itsDaiton/nebula-chat/commit/189091b6cb513a23fafd99c70ac92114b6b1a305))

## [2.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.0.1...nebula-chat-v2.1.0) (2026-09-27)


### Features

* **client:** NEB-307 adopt TanStack Query for server state ([#376](https://github.com/itsDaiton/nebula-chat/issues/376)) ([aa6f40c](https://github.com/itsDaiton/nebula-chat/commit/aa6f40c20ac19c4b2d78f9bc3738522802997514))

## [2.0.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v2.0.0...nebula-chat-v2.0.1) (2026-09-27)


### Bug Fixes

* **agents:** keep code comments to a line or two ([#378](https://github.com/itsDaiton/nebula-chat/issues/378)) ([c23e4f9](https://github.com/itsDaiton/nebula-chat/commit/c23e4f9f7e91c4b5aa22cc52e8679cc823901129))

## [2.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.25.8...nebula-chat-v2.0.0) (2026-09-25)


### ⚠ BREAKING CHANGES

* **otel:** NEB-369 structured logging conventions across server and libs ([#372](https://github.com/itsDaiton/nebula-chat/issues/372))

### Features

* **otel:** NEB-369 structured logging conventions across server and libs ([#372](https://github.com/itsDaiton/nebula-chat/issues/372)) ([d276ddf](https://github.com/itsDaiton/nebula-chat/commit/d276ddf6711db0ff715efe2c2f3afe67275a3a32))

## [1.25.8](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.25.7...nebula-chat-v1.25.8) (2026-09-24)


### Bug Fixes

* **agents:** add ADR-0017 structured logging conventions ([#366](https://github.com/itsDaiton/nebula-chat/issues/366)) ([5294672](https://github.com/itsDaiton/nebula-chat/commit/5294672da9063368ca5a7d62f1c1e0d30ae9bb29))

## [1.25.7](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.25.6...nebula-chat-v1.25.7) (2026-09-24)


### Bug Fixes

* **errors:** NEB-323 shared error library and unified error envelope across both apps ([#364](https://github.com/itsDaiton/nebula-chat/issues/364)) ([dcca70b](https://github.com/itsDaiton/nebula-chat/commit/dcca70b450381c2918708937aa24557dfd393a88))

## [1.25.6](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.25.5...nebula-chat-v1.25.6) (2026-09-22)


### Bug Fixes

* **agents:** add ADRs 0013-0016 and orchestration glossary for nebula-chat 2.0 ([#350](https://github.com/itsDaiton/nebula-chat/issues/350)) ([fc87893](https://github.com/itsDaiton/nebula-chat/commit/fc87893e465e9fae096ac73d74ab1a640f599c4f))

## [1.25.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.25.4...nebula-chat-v1.25.5) (2026-09-22)


### Bug Fixes

* **agents:** document native issue dependency graph as the ticket blocking convention ([#347](https://github.com/itsDaiton/nebula-chat/issues/347)) ([810315e](https://github.com/itsDaiton/nebula-chat/commit/810315e490913f59c5dc3ad7976cadd3b2afe94a))

## [1.25.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.25.3...nebula-chat-v1.25.4) (2026-09-22)


### Bug Fixes

* **agents:** add ADRs for shared error lib (NEB-323) and TanStack Query adoption (NEB-307) ([#345](https://github.com/itsDaiton/nebula-chat/issues/345)) ([1b25700](https://github.com/itsDaiton/nebula-chat/commit/1b2570067cd27326bd85ceee4ade6c27087eff78))

## [1.25.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.25.2...nebula-chat-v1.25.3) (2026-09-22)


### Bug Fixes

* **ci:** validate-ticket skips backlog/epic tracking issues ([#343](https://github.com/itsDaiton/nebula-chat/issues/343)) ([6103d47](https://github.com/itsDaiton/nebula-chat/commit/6103d47ee1354edd6c47e61529ae0406633afdd6))

## [1.25.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.25.1...nebula-chat-v1.25.2) (2026-09-22)


### Bug Fixes

* **workspace:** retire new-backend migration and custom agents; adopt GitHub Issues tickets ([#329](https://github.com/itsDaiton/nebula-chat/issues/329)) ([96cb556](https://github.com/itsDaiton/nebula-chat/commit/96cb5563ee2675dbe33e10d4f97d0d00bec5569c))

## [1.25.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.25.0...nebula-chat-v1.25.1) (2026-09-22)


### Bug Fixes

* **ci:** cancel superseded build.yml runs to cut Actions minutes usage ([#327](https://github.com/itsDaiton/nebula-chat/issues/327)) ([09d69c6](https://github.com/itsDaiton/nebula-chat/commit/09d69c6d7074827545f0b1b084826ffb4be1e8fd))

## [1.25.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.24.1...nebula-chat-v1.25.0) (2026-09-22)


### Features

* **auth:** add @nebula-chat/auth better-auth substrate (M-6) ([#322](https://github.com/itsDaiton/nebula-chat/issues/322)) ([a4ba239](https://github.com/itsDaiton/nebula-chat/commit/a4ba2392f879b97966a92978288cd64d1dc55b8d))

## [1.24.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.24.0...nebula-chat-v1.24.1) (2026-09-19)


### Bug Fixes

* **openapi:** resolve Checkov CKV_OPENAPI_4/5/21 failures ([#319](https://github.com/itsDaiton/nebula-chat/issues/319)) ([6de7935](https://github.com/itsDaiton/nebula-chat/commit/6de79358062a5c22135a8586a9b6349b3d7003fa))

## [1.24.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.23.2...nebula-chat-v1.24.0) (2026-09-18)


### Features

* **redis:** add @nebula-chat/redis lib ([#312](https://github.com/itsDaiton/nebula-chat/issues/312)) ([3c6f77f](https://github.com/itsDaiton/nebula-chat/commit/3c6f77ff7a197a879c794029407671ca45d475ae))

## [1.23.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.23.1...nebula-chat-v1.23.2) (2026-09-18)


### Bug Fixes

* **ci:** exempt remeda from pnpm minimumReleaseAge so Dependabot resolves ([#314](https://github.com/itsDaiton/nebula-chat/issues/314)) ([c0a7b39](https://github.com/itsDaiton/nebula-chat/commit/c0a7b39ab35592d56c24462bdb82d95804dcf876))

## [1.23.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.23.0...nebula-chat-v1.23.1) (2026-09-16)


### Bug Fixes

* **ci:** validate render.yaml as JSON to dodge the js-yaml 4 override ([#309](https://github.com/itsDaiton/nebula-chat/issues/309)) ([0715660](https://github.com/itsDaiton/nebula-chat/commit/07156608e3e57bdff06ecb4904d51790355da7cb))

## [1.23.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.22.0...nebula-chat-v1.23.0) (2026-09-16)


### Features

* **test:** add Vitest unit testing across server, client and libs ([#305](https://github.com/itsDaiton/nebula-chat/issues/305)) ([e8c09ee](https://github.com/itsDaiton/nebula-chat/commit/e8c09eec1385c11ab1d6744ae7a75b79713b47fd))

## [1.22.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.21.0...nebula-chat-v1.22.0) (2026-09-14)


### Features

* **otel:** add @nebula-chat/otel logger factory and OTel tracing ([#299](https://github.com/itsDaiton/nebula-chat/issues/299)) ([357fec3](https://github.com/itsDaiton/nebula-chat/commit/357fec3de84a2f1328af647268e83c58fe2d26c9))

## [1.21.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.20.5...nebula-chat-v1.21.0) (2026-09-13)


### Features

* **skills:** vendor the engineering skill set into the repo ([#302](https://github.com/itsDaiton/nebula-chat/issues/302)) ([17db477](https://github.com/itsDaiton/nebula-chat/commit/17db477bd9b4f6f72bd35240575000d692b9d0d1))

## [1.20.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.20.4...nebula-chat-v1.20.5) (2026-09-13)


### Bug Fixes

* **server:** clear four dependency security advisories ([#300](https://github.com/itsDaiton/nebula-chat/issues/300)) ([4600a63](https://github.com/itsDaiton/nebula-chat/commit/4600a63a62cb3abfc4546004a58b2e3afa37b408))

## [1.20.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.20.3...nebula-chat-v1.20.4) (2026-09-12)


### Bug Fixes

* **ci:** remove the Claude Code GitHub workflow ([#297](https://github.com/itsDaiton/nebula-chat/issues/297)) ([88f16bd](https://github.com/itsDaiton/nebula-chat/commit/88f16bdeb870c772dbba372b5f0b5fe160abc8bc))

## [1.20.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.20.2...nebula-chat-v1.20.3) (2026-09-12)


### Bug Fixes

* **ci:** deploy the server when its libraries are released ([#295](https://github.com/itsDaiton/nebula-chat/issues/295)) ([8c68245](https://github.com/itsDaiton/nebula-chat/commit/8c68245a306305570db1c1eb4877776868782e75))

## [1.20.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.20.1...nebula-chat-v1.20.2) (2026-09-12)


### Bug Fixes

* **db:** surface migration errors and add a journal baseline ([#293](https://github.com/itsDaiton/nebula-chat/issues/293)) ([26b60b8](https://github.com/itsDaiton/nebula-chat/commit/26b60b8160ea3ae03ae51f340d9b45449bb830ae))

## [1.20.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.20.0...nebula-chat-v1.20.1) (2026-09-12)


### Bug Fixes

* **server,client:** correct stale README docs in both apps ([#291](https://github.com/itsDaiton/nebula-chat/issues/291)) ([f3423d6](https://github.com/itsDaiton/nebula-chat/commit/f3423d63f6e89c43b44b6ae02fc0e42d823bb668))

## [1.20.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.19.1...nebula-chat-v1.20.0) (2026-09-12)


### Features

* **agents:** restrict commit types to feat and fix ([#287](https://github.com/itsDaiton/nebula-chat/issues/287)) ([d4b5c1d](https://github.com/itsDaiton/nebula-chat/commit/d4b5c1d29ca6f1ec6c9af1b57359970a93c7a227))

## [1.19.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.19.0...nebula-chat-v1.19.1) (2026-09-12)


### Bug Fixes

* **ci:** always run Build so build-result can report ([#288](https://github.com/itsDaiton/nebula-chat/issues/288)) ([4ec8770](https://github.com/itsDaiton/nebula-chat/commit/4ec877098c39d61a852126e612f0a68495dcb4a8))

## [1.19.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.18.5...nebula-chat-v1.19.0) (2026-09-12)


### Features

* **agents:** overhaul the agentic workspace ([#284](https://github.com/itsDaiton/nebula-chat/issues/284)) ([c3c95c8](https://github.com/itsDaiton/nebula-chat/commit/c3c95c8bee4e936d43732ffc34b9a6c836661334))

## [1.18.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.18.4...nebula-chat-v1.18.5) (2026-09-11)


### Bug Fixes

* **ci:** consolidate per-package builds into one pluggable matrix pipeline ([#258](https://github.com/itsDaiton/nebula-chat/issues/258)) ([f1b1ba1](https://github.com/itsDaiton/nebula-chat/commit/f1b1ba1bb82c5a21f88e38396f19cebc63ae2cb9))

## [1.18.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.18.3...nebula-chat-v1.18.4) (2026-06-20)


### Bug Fixes

* **deps:** raise Hono override to 4.12.25 to remediate 2026 CVEs ([#255](https://github.com/itsDaiton/nebula-chat/issues/255)) ([9a0b674](https://github.com/itsDaiton/nebula-chat/commit/9a0b67473ddfba17d58f194bbc2280be62463339))

## [1.18.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.18.2...nebula-chat-v1.18.3) (2026-05-03)


### Bug Fixes

* **ci:** migrate monorepo builds to Turborepo ([#239](https://github.com/itsDaiton/nebula-chat/issues/239)) ([1a03d6f](https://github.com/itsDaiton/nebula-chat/commit/1a03d6fdbdb4c003abffa502cb3abe15802173cb))

## [1.18.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.18.1...nebula-chat-v1.18.2) (2026-05-03)


### Bug Fixes

* bump deps ([#236](https://github.com/itsDaiton/nebula-chat/issues/236)) ([7a3c49d](https://github.com/itsDaiton/nebula-chat/commit/7a3c49d9af36556bd1f427ec68df07c48573cfee))

## [1.18.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.18.0...nebula-chat-v1.18.1) (2026-05-03)


### Bug Fixes

* **security:** override esbuild version ([#233](https://github.com/itsDaiton/nebula-chat/issues/233)) ([a16d1e5](https://github.com/itsDaiton/nebula-chat/commit/a16d1e5f7a1fbf2a57b6802e2bd8835790b45f74))

## [1.18.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.17.4...nebula-chat-v1.18.0) (2026-05-03)


### Features

* **langchain:** implement @nebula-chat/langchain lib and wire into server ([#229](https://github.com/itsDaiton/nebula-chat/issues/229)) ([c883085](https://github.com/itsDaiton/nebula-chat/commit/c883085c3fcf21cbcbe7e42feef1a03c9347e002))

## [1.17.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.17.3...nebula-chat-v1.17.4) (2026-05-02)


### Bug Fixes

* delete .jscpd.json ([#227](https://github.com/itsDaiton/nebula-chat/issues/227)) ([c6ddcbc](https://github.com/itsDaiton/nebula-chat/commit/c6ddcbc71c85617791802128f51d9d015562678f))

## [1.17.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.17.2...nebula-chat-v1.17.3) (2026-05-02)


### Bug Fixes

* refine m3 ticket ([85f0786](https://github.com/itsDaiton/nebula-chat/commit/85f0786a1f0fbc567c90c4e6865d74511e5b7d5f))

## [1.17.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.17.1...nebula-chat-v1.17.2) (2026-05-01)


### Bug Fixes

* **deps:** update @typescript-eslint/parser, knip, and prettier versions ([#221](https://github.com/itsDaiton/nebula-chat/issues/221)) ([74befdb](https://github.com/itsDaiton/nebula-chat/commit/74befdbb4a45ea489b37795c8175deaccb4068d5))

## [1.17.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.17.0...nebula-chat-v1.17.1) (2026-05-01)


### Bug Fixes

* update build script to include database ([#219](https://github.com/itsDaiton/nebula-chat/issues/219)) ([fd25b51](https://github.com/itsDaiton/nebula-chat/commit/fd25b51cd568e8653c37eb751d9b59f2394e5814))

## [1.17.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.16.2...nebula-chat-v1.17.0) (2026-05-01)


### Features

* **db:** migrate from Prisma to Drizzle ORM ([#214](https://github.com/itsDaiton/nebula-chat/issues/214)) ([c6c543a](https://github.com/itsDaiton/nebula-chat/commit/c6c543a9ea85c7742083ff37e58739d5f391c715))

## [1.16.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.16.1...nebula-chat-v1.16.2) (2026-04-26)


### Bug Fixes

* **render:** sync-up render blueprint ([#212](https://github.com/itsDaiton/nebula-chat/issues/212)) ([09f8787](https://github.com/itsDaiton/nebula-chat/commit/09f8787acb2a1a78c13582578dc7ca83de40681d))

## [1.16.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.16.0...nebula-chat-v1.16.1) (2026-04-26)


### Bug Fixes

* **render:** add configuration for render deploy ([#210](https://github.com/itsDaiton/nebula-chat/issues/210)) ([f239885](https://github.com/itsDaiton/nebula-chat/commit/f239885417fb8cbd6487e463667d3dae5abeee2a))

## [1.16.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.15.0...nebula-chat-v1.16.0) (2026-04-25)


### Features

* **server:** migrate to fastify from express ([#196](https://github.com/itsDaiton/nebula-chat/issues/196)) ([9790324](https://github.com/itsDaiton/nebula-chat/commit/97903247f0c8c093cb2dc470ebb566a955182529))

## [1.15.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.14.5...nebula-chat-v1.15.0) (2026-04-25)


### Features

* **ci:** move sonar to app-based scans ([#197](https://github.com/itsDaiton/nebula-chat/issues/197)) ([623ce31](https://github.com/itsDaiton/nebula-chat/commit/623ce314aa54a2759c2e03504871ab18c1044293))

## [1.14.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.14.4...nebula-chat-v1.14.5) (2026-04-25)


### Bug Fixes

* **release:** exclude apps paths from root release package ([#201](https://github.com/itsDaiton/nebula-chat/issues/201)) ([c9f8ad3](https://github.com/itsDaiton/nebula-chat/commit/c9f8ad38d692ea59fa49d7f74450bffe8f791d67))

## [1.14.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.14.3...nebula-chat-v1.14.4) (2026-04-25)


### Bug Fixes

* **client:** reset conversations search state on dialog close ([#199](https://github.com/itsDaiton/nebula-chat/issues/199)) ([8798ab3](https://github.com/itsDaiton/nebula-chat/commit/8798ab30b0cf440b6c87e448cc527c5845d8b52a))

## [1.14.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.14.2...nebula-chat-v1.14.3) (2026-04-19)


### Bug Fixes

* **deps:** patch @hono/node-server to 1.19.13 ([#191](https://github.com/itsDaiton/nebula-chat/issues/191)) ([5a8d10b](https://github.com/itsDaiton/nebula-chat/commit/5a8d10beaa0214d3585870a7958db7eadd83593e))

## [1.14.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.14.1...nebula-chat-v1.14.2) (2026-04-19)


### Bug Fixes

* **security:** force lodash to 4.18.1 to remediate template CVE ([#192](https://github.com/itsDaiton/nebula-chat/issues/192)) ([3d29de4](https://github.com/itsDaiton/nebula-chat/commit/3d29de4ba5f878b8705ab03e04314d4af78b0522))

## [1.14.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.14.0...nebula-chat-v1.14.1) (2026-04-19)


### Bug Fixes

* **security:** patch hono CVE with pinned override ([#190](https://github.com/itsDaiton/nebula-chat/issues/190)) ([114e35c](https://github.com/itsDaiton/nebula-chat/commit/114e35c4050f8dcbb657ff12e3c5bb604ffa5925))

## [1.14.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.13.2...nebula-chat-v1.14.0) (2026-04-19)


### Features

* **claude:** setup agentic workspace ([#185](https://github.com/itsDaiton/nebula-chat/issues/185)) ([24f8866](https://github.com/itsDaiton/nebula-chat/commit/24f8866773f0bec284887f38f0778f9decc70eab))

## [1.13.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.13.1...nebula-chat-v1.13.2) (2026-04-19)


### Bug Fixes

* **ci:** set explicit repo context for release-please auto-merge ([#186](https://github.com/itsDaiton/nebula-chat/issues/186)) ([e56c532](https://github.com/itsDaiton/nebula-chat/commit/e56c532015c3bd9fc31a86ae348e3f8ca3db3555))

## [1.13.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.13.0...nebula-chat-v1.13.1) (2026-04-19)


### Bug Fixes

* **ci:** enable release-please auto-merge in manifest mode ([#180](https://github.com/itsDaiton/nebula-chat/issues/180)) ([d5e14d4](https://github.com/itsDaiton/nebula-chat/commit/d5e14d4cffa906536859501a9cd981e9897f6a2d))

## [1.13.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.12.0...nebula-chat-v1.13.0) (2026-04-19)


### Features

* Add Claude Code GitHub Workflow ([#181](https://github.com/itsDaiton/nebula-chat/issues/181)) ([997c9e3](https://github.com/itsDaiton/nebula-chat/commit/997c9e37f0483bce70788cb590292a6b42ecfee0))


### Bug Fixes

* **deps:** remediate Trivy lockfile CVEs by pinning path-to-regexp to 8.4.0 ([#182](https://github.com/itsDaiton/nebula-chat/issues/182)) ([ef35436](https://github.com/itsDaiton/nebula-chat/commit/ef354367720268af49521135ff3ca1b7876dd547))

## [1.12.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.11.0...nebula-chat-v1.12.0) (2026-04-19)


### Features

* add docs for new backend migration ([#178](https://github.com/itsDaiton/nebula-chat/issues/178)) ([1f5e4fd](https://github.com/itsDaiton/nebula-chat/commit/1f5e4fd73af4a950f3d2bbbfeb022d45bd7d4c99))

## [1.11.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.10.0...nebula-chat-v1.11.0) (2026-04-19)


### Features

* update workflow names for clarity ([#171](https://github.com/itsDaiton/nebula-chat/issues/171)) ([964e193](https://github.com/itsDaiton/nebula-chat/commit/964e1939797db0e7556cf66a5fda87229457c029))

## [1.10.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.9.0...nebula-chat-v1.10.0) (2026-04-19)


### Features

* **api:** api layer lib ([#166](https://github.com/itsDaiton/nebula-chat/issues/166)) ([c776fc9](https://github.com/itsDaiton/nebula-chat/commit/c776fc9cb4c2d9aba9730291eceb394d8ad433a4))

## [1.9.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.8.1...nebula-chat-v1.9.0) (2026-03-29)


### Features

* **backend:** add generate:openapi script ([#151](https://github.com/itsDaiton/nebula-chat/issues/151)) ([d525167](https://github.com/itsDaiton/nebula-chat/commit/d52516785ce575328616ad8fdf266c26dca13d99))

## [1.8.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.8.0...nebula-chat-v1.8.1) (2026-03-29)


### Bug Fixes

* update dependabot configuration for npm packages ([#145](https://github.com/itsDaiton/nebula-chat/issues/145)) ([c4ccea1](https://github.com/itsDaiton/nebula-chat/commit/c4ccea1790722c96e17bc3905dfebba88e435d51))

## [1.8.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.7.0...nebula-chat-v1.8.0) (2026-03-22)


### Features

* **client:** sidebar enhancements ([#130](https://github.com/itsDaiton/nebula-chat/issues/130)) ([eba434e](https://github.com/itsDaiton/nebula-chat/commit/eba434e35fbfe4fa6976ccbc767901513884b582))

## [1.7.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.6.0...nebula-chat-v1.7.0) (2026-03-22)


### Features

* add knip package ([#127](https://github.com/itsDaiton/nebula-chat/issues/127)) ([49b5114](https://github.com/itsDaiton/nebula-chat/commit/49b511417e38daeffbabf739578f5321d6ba8c25))


### Bug Fixes

* knip code cleanup ([#129](https://github.com/itsDaiton/nebula-chat/issues/129)) ([e8f3a8a](https://github.com/itsDaiton/nebula-chat/commit/e8f3a8a5fecb69242ce107eea4cdfa9ba765fd55))

## [1.6.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.5.1...nebula-chat-v1.6.0) (2026-03-22)


### Features

* **client:** add versioning plugin to generate public/version.json ([#125](https://github.com/itsDaiton/nebula-chat/issues/125)) ([40b53b3](https://github.com/itsDaiton/nebula-chat/commit/40b53b3e82523e39267c254eeb89b41212d69f6f))


### Bug Fixes

* **server:** backend code cleanup ([#123](https://github.com/itsDaiton/nebula-chat/issues/123)) ([f4a47fc](https://github.com/itsDaiton/nebula-chat/commit/f4a47fce73e7be496cd51f37cfb79851faf07b70))

## [1.5.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.5.0...nebula-chat-v1.5.1) (2026-03-21)


### Bug Fixes

* **backend:** harden Express trust proxy config for IP rate limiting ([#112](https://github.com/itsDaiton/nebula-chat/issues/112)) ([fc9f015](https://github.com/itsDaiton/nebula-chat/commit/fc9f01510ab33c45636448a55f0e0e422c630dce))

## [1.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.4.1...nebula-chat-v1.5.0) (2026-03-21)


### Features

* **client:** add zustand state management ([#110](https://github.com/itsDaiton/nebula-chat/issues/110)) ([5e708bc](https://github.com/itsDaiton/nebula-chat/commit/5e708bc3e50d97791808b2f1b8325e6fb0e17597))

## [1.4.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.4.0...nebula-chat-v1.4.1) (2026-03-15)


### Bug Fixes

* **server:** enable trust proxy setting for express app ([#107](https://github.com/itsDaiton/nebula-chat/issues/107)) ([0ce6bce](https://github.com/itsDaiton/nebula-chat/commit/0ce6bce7002bb9e06830477b9cc54e48efc367bf))

## [1.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.3.1...nebula-chat-v1.4.0) (2026-03-15)


### Features

* add deployment workflows ([#105](https://github.com/itsDaiton/nebula-chat/issues/105)) ([0345ad8](https://github.com/itsDaiton/nebula-chat/commit/0345ad89bcab419c5bf5e49eb094c706ffbf33e1))
* make deploy workflows manually runnable ([ec7d02a](https://github.com/itsDaiton/nebula-chat/commit/ec7d02ae0a4969102637728308142d79dfa4e271))

## [1.3.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.3.0...nebula-chat-v1.3.1) (2026-03-15)


### Bug Fixes

* **frontend:** improve URL safety with URL API parser ([75e2e4d](https://github.com/itsDaiton/nebula-chat/commit/75e2e4d9e6dfe1170eaf9e0149896dd7e78b8c63))

## [1.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.2.2...nebula-chat-v1.3.0) (2026-03-14)


### Features

* **ci:** add sonar and fix issues ([#101](https://github.com/itsDaiton/nebula-chat/issues/101)) ([5e138b4](https://github.com/itsDaiton/nebula-chat/commit/5e138b4bf06b16681e6caf163e02e0a0c1fcf7b3))

## [1.2.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.2.1...nebula-chat-v1.2.2) (2026-03-14)


### Bug Fixes

* prisma config and bump vite to v8 ([#92](https://github.com/itsDaiton/nebula-chat/issues/92)) ([50cbde9](https://github.com/itsDaiton/nebula-chat/commit/50cbde97c9aac1952d623070b986b9d03ee045bb))

## [1.2.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.2.0...nebula-chat-v1.2.1) (2026-03-14)


### Bug Fixes

* prisma config pipeline error ([#90](https://github.com/itsDaiton/nebula-chat/issues/90)) ([c2895a7](https://github.com/itsDaiton/nebula-chat/commit/c2895a712a2fd2255b8e63df33da015441faa473))

## [1.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-v1.1.0...nebula-chat-v1.2.0) (2026-03-14)


### Features

* add basic chat ui + redesign FE structure ([789afc8](https://github.com/itsDaiton/nebula-chat/commit/789afc89ba1e21a632437ec7e9c34d9230070402))
* add basic frontend ([413be47](https://github.com/itsDaiton/nebula-chat/commit/413be474e222e47a621da7e2f446bed4759cae34))
* add chakra ui ([b631f62](https://github.com/itsDaiton/nebula-chat/commit/b631f628009d79766f3dec901db4bdb94f12ba76))
* add layout components and routing ([4f49c80](https://github.com/itsDaiton/nebula-chat/commit/4f49c80e0a4a690759d3597ba5efc481a72a20df))
* add MegaLinter ([#84](https://github.com/itsDaiton/nebula-chat/issues/84)) ([8d51698](https://github.com/itsDaiton/nebula-chat/commit/8d51698dca699812068b05ee1e915c74edd8bfed))
* add release please pipeline ([#78](https://github.com/itsDaiton/nebula-chat/issues/78)) ([dff2b7d](https://github.com/itsDaiton/nebula-chat/commit/dff2b7d43384c4f8659d0a4c98bd0fe4c9fb9121))
* add sample dark mode ([e40c773](https://github.com/itsDaiton/nebula-chat/commit/e40c7737768262144dfba573ad9e096aefc568ce))
* add sample server folder ([e685d83](https://github.com/itsDaiton/nebula-chat/commit/e685d834a5ca4503bd1a6673a98dbbc045b8c419))
* add settings menu ([e68aca2](https://github.com/itsDaiton/nebula-chat/commit/e68aca2933748d6fc1a27a6a3b63280604a1c911))
* add workflow to push to azure ([1c1368c](https://github.com/itsDaiton/nebula-chat/commit/1c1368c3d47b38993b0509f04c97d2ac4f34b48b))
* **cache:** add prompt caching and rate limiting ([#19](https://github.com/itsDaiton/nebula-chat/issues/19)) ([5fcd9ae](https://github.com/itsDaiton/nebula-chat/commit/5fcd9aeac7955154ba0a9a91b0e26a4b224c2523))
* **chat:** add markdown and code rendering ([#38](https://github.com/itsDaiton/nebula-chat/issues/38)) ([6a5b47e](https://github.com/itsDaiton/nebula-chat/commit/6a5b47eeadabf5511326006b3282a910af3d6464))
* **chat:** add model selection and cleanup frontend ([#13](https://github.com/itsDaiton/nebula-chat/issues/13)) ([b21c08f](https://github.com/itsDaiton/nebula-chat/commit/b21c08fca5cd71d9f458248f048a18c087ebcb70))
* **chat:** add OpenAI model endpoint ([#2](https://github.com/itsDaiton/nebula-chat/issues/2)) ([019ba7a](https://github.com/itsDaiton/nebula-chat/commit/019ba7a2233d21a5329e91278d74edc711a1990f))
* **chat:** add production URL configuration for API requests ([#5](https://github.com/itsDaiton/nebula-chat/issues/5)) ([e4c27c9](https://github.com/itsDaiton/nebula-chat/commit/e4c27c9de1c7ef6c4f90e0af69ad29daefa567a1))
* **chat:** add streaming and chat history ([#3](https://github.com/itsDaiton/nebula-chat/issues/3)) ([81c812a](https://github.com/itsDaiton/nebula-chat/commit/81c812a103ca803070c85ed218f70f7d5aa02e25))
* **chat:** add token usage info ([#4](https://github.com/itsDaiton/nebula-chat/issues/4)) ([cc922fe](https://github.com/itsDaiton/nebula-chat/commit/cc922fe537652e5ea0f9c6579714a71ec1d518ea))
* **chat:** ehance chat functionality and add history ([#34](https://github.com/itsDaiton/nebula-chat/issues/34)) ([84c085e](https://github.com/itsDaiton/nebula-chat/commit/84c085e9bdc52ff8cf3c6370f08a58bb44ad7869))
* **chat:** implement cursor-based pagination for conversations ([#35](https://github.com/itsDaiton/nebula-chat/issues/35)) ([287c3ae](https://github.com/itsDaiton/nebula-chat/commit/287c3ae05f656644bfcdfbcd4407e680d0b82cdb))
* **chat:** update chat backend capabilities ([#30](https://github.com/itsDaiton/nebula-chat/issues/30)) ([b45688a](https://github.com/itsDaiton/nebula-chat/commit/b45688a841eed26e0684f2a0522a7ddd63bc83f5))
* **ci:** add prisma validation to workflow ([#9](https://github.com/itsDaiton/nebula-chat/issues/9)) ([c8c1980](https://github.com/itsDaiton/nebula-chat/commit/c8c19802cdb6fe3d844bae48b52ab8a206195fed))
* **conversation:** add pagination config for api fetch ([#39](https://github.com/itsDaiton/nebula-chat/issues/39)) ([d810408](https://github.com/itsDaiton/nebula-chat/commit/d8104082db58dc4addb5e8fc13a74683768d88fc))
* **database:** add database layer for conversations ([#7](https://github.com/itsDaiton/nebula-chat/issues/7)) ([a475640](https://github.com/itsDaiton/nebula-chat/commit/a4756401959e8d4c86d7622fddff02b0863fa598))
* **docker:** add local redis service ([#27](https://github.com/itsDaiton/nebula-chat/issues/27)) ([34e1536](https://github.com/itsDaiton/nebula-chat/commit/34e1536164297490d0f99b1814b3994286e7dd8d))
* enhance chat functionality and UI ([e891b32](https://github.com/itsDaiton/nebula-chat/commit/e891b32b6a2f19147c1d7963f6f11aea10be7325))
* enhance chat ui ([9e19796](https://github.com/itsDaiton/nebula-chat/commit/9e1979609b587e6664a4f5e0181deb3a26962700))
* **errors:** implement custom error class ([#26](https://github.com/itsDaiton/nebula-chat/issues/26)) ([c1b312d](https://github.com/itsDaiton/nebula-chat/commit/c1b312d7ddc8537fffcd1143ff30fb916fe6e284))
* **github:** add codeowners file ([eeb502c](https://github.com/itsDaiton/nebula-chat/commit/eeb502c72a2528398904b2d165aa51a8b8d485cb))
* improve chat input and light mode UI ([8c9407c](https://github.com/itsDaiton/nebula-chat/commit/8c9407cb0695ac44eeade43abaa81a596f776e1e))
* **layout:** implement responsive layout for chat ([#37](https://github.com/itsDaiton/nebula-chat/issues/37)) ([a3b3268](https://github.com/itsDaiton/nebula-chat/commit/a3b3268e505cd5a2bb5a5ea24a78c5519b3c86cf))
* **openapi:** add openAPI docs ([#29](https://github.com/itsDaiton/nebula-chat/issues/29)) ([eb78b6a](https://github.com/itsDaiton/nebula-chat/commit/eb78b6a51ad93db45bb13c6c5935992848cd8485))
* **redirect:** add redirect rule for index.html ([#43](https://github.com/itsDaiton/nebula-chat/issues/43)) ([b2405ea](https://github.com/itsDaiton/nebula-chat/commit/b2405ea2e1ad5bd049fdf77832652271ccb245f8))
* remove old file ([72d365e](https://github.com/itsDaiton/nebula-chat/commit/72d365e067cd476c884243fd50587bdad07951eb))
* remove project.md ([4bbff72](https://github.com/itsDaiton/nebula-chat/commit/4bbff72205ae1786f8bbc47ae2542a2aba665709))
* setup claude and dependabot ([#53](https://github.com/itsDaiton/nebula-chat/issues/53)) ([cc2ac99](https://github.com/itsDaiton/nebula-chat/commit/cc2ac9966f96aa58f1dcc01e58fad9bfeadd5f1a))
* update dark mode design ([43a8b39](https://github.com/itsDaiton/nebula-chat/commit/43a8b394d8c64a943c45472914522966b17a6157))
* update docker ([c6350ba](https://github.com/itsDaiton/nebula-chat/commit/c6350baa3eeb74c46633538fdcf51e6cf79856b5))
* update worklow for manual start ([1b17995](https://github.com/itsDaiton/nebula-chat/commit/1b17995611e1dee3c723886b04a3865db5d85b58))


### Bug Fixes

* add node types ([2f5bd43](https://github.com/itsDaiton/nebula-chat/commit/2f5bd43241c497652c6d3f494e90bdf1b466bf90))
* adjust Prisma config for environment variable handling ([#79](https://github.com/itsDaiton/nebula-chat/issues/79)) ([a722611](https://github.com/itsDaiton/nebula-chat/commit/a72261142159d3caf96cacccc17068d81ed28ee3))
* another docker fix ([992bbcb](https://github.com/itsDaiton/nebula-chat/commit/992bbcb9f7521535f89d7edb55a069ed3c1711c5))
* another docker fix ([7241311](https://github.com/itsDaiton/nebula-chat/commit/72413119ff01aec7dd1bbb79ed4fd3c1b8d1b869))
* another fix for azure workflow ([c56c721](https://github.com/itsDaiton/nebula-chat/commit/c56c721e3ee22ff0a638de3d9d4179eb251063f3))
* **backend:** correct path to server file in start script ([#24](https://github.com/itsDaiton/nebula-chat/issues/24)) ([637c800](https://github.com/itsDaiton/nebula-chat/commit/637c800c17de12f8cc4dbdc59f5812a589baac2e))
* **backend:** edit production scripts ([#23](https://github.com/itsDaiton/nebula-chat/issues/23)) ([823d88b](https://github.com/itsDaiton/nebula-chat/commit/823d88b715fcad54d4821537f994552f776e7dad))
* **build:** update build script to resolve production backend issue ([#6](https://github.com/itsDaiton/nebula-chat/issues/6)) ([4a1b49f](https://github.com/itsDaiton/nebula-chat/commit/4a1b49f75861d5ba8e6a4dcd61fedfca58f607bc))
* **chat:** increase bottom margin in chat and resolve icon issue ([#15](https://github.com/itsDaiton/nebula-chat/issues/15)) ([00c7af5](https://github.com/itsDaiton/nebula-chat/commit/00c7af5bb6468504fdfea2c9a88e73090d7de6e0))
* **chat:** stream chat bugfixing cleanup ([#33](https://github.com/itsDaiton/nebula-chat/issues/33)) ([94edbc8](https://github.com/itsDaiton/nebula-chat/commit/94edbc85ad3d18e75eb171a6632d080fc601419f))
* **chat:** update chat input button darkmode ([#21](https://github.com/itsDaiton/nebula-chat/issues/21)) ([6ebe646](https://github.com/itsDaiton/nebula-chat/commit/6ebe646f73c4f1db9ea0edadf00eaaa846a3f17b))
* **chat:** update chat input button styles ([#20](https://github.com/itsDaiton/nebula-chat/issues/20)) ([90804b9](https://github.com/itsDaiton/nebula-chat/commit/90804b99f5801b371bfb9918e3de8d3105577dcb))
* correct path in docker build ([4acb813](https://github.com/itsDaiton/nebula-chat/commit/4acb8138b9f29b308ef63fee0dd50efebec25d92))
* correct server setup ([14fd52c](https://github.com/itsDaiton/nebula-chat/commit/14fd52c50a6420f6407c53afa23d9fd97c218154))
* **cors:** resolve CORS issues ([#31](https://github.com/itsDaiton/nebula-chat/issues/31)) ([00d6702](https://github.com/itsDaiton/nebula-chat/commit/00d6702848ecd6625a7e6d88ed3e919f7d5f6022))
* **database:** resolve broken ts-config and prisma errors ([#8](https://github.com/itsDaiton/nebula-chat/issues/8)) ([7d6f280](https://github.com/itsDaiton/nebula-chat/commit/7d6f280bbc58a6899aa07322e568ee8eaf20f02b))
* emoji in welcome chat ([#82](https://github.com/itsDaiton/nebula-chat/issues/82)) ([463025d](https://github.com/itsDaiton/nebula-chat/commit/463025df6e619a65e7ff53d2b2dc00d2df1767bd))
* fix path issue in workflow ([fe49951](https://github.com/itsDaiton/nebula-chat/commit/fe4995152457fe94b29efaa379d278ff9bd922d5))
* **frontend:** FE bugfixing + rate limiting ([#45](https://github.com/itsDaiton/nebula-chat/issues/45)) ([469a1a9](https://github.com/itsDaiton/nebula-chat/commit/469a1a98b98aadceee4af4e33e473189daa1b351))
* **github:** fix codeowners ([e9a6114](https://github.com/itsDaiton/nebula-chat/commit/e9a61145f601bfe6b96ed9135a98ef44531844a4))
* **icon:** correct icon loading ([#16](https://github.com/itsDaiton/nebula-chat/issues/16)) ([541b254](https://github.com/itsDaiton/nebula-chat/commit/541b254801eb9798927cc81e418e4ef8ae534805))
* load `jsonc` language in Shiki highlighter ([#47](https://github.com/itsDaiton/nebula-chat/issues/47)) ([eead843](https://github.com/itsDaiton/nebula-chat/commit/eead843d6dc2d9856d811ee428f2b2e0e2d2e6a6))
* **migrations:** update migration scripts and schema ([#11](https://github.com/itsDaiton/nebula-chat/issues/11)) ([b86e090](https://github.com/itsDaiton/nebula-chat/commit/b86e090f2cec740797af7b8d5b9907b29cdd6fd2))
* **prisma:** update client provider to use prisma-client-js ([#10](https://github.com/itsDaiton/nebula-chat/issues/10)) ([773096c](https://github.com/itsDaiton/nebula-chat/commit/773096c29ebf81c6799534a51bcfde33dad98998))
* **prompt:** move system prompt to TS file ([#32](https://github.com/itsDaiton/nebula-chat/issues/32)) ([9996d21](https://github.com/itsDaiton/nebula-chat/commit/9996d211c9db829079a4cc49638299e107015d8b))
* release-please pipeline ([#86](https://github.com/itsDaiton/nebula-chat/issues/86)) ([a91a6a2](https://github.com/itsDaiton/nebula-chat/commit/a91a6a20e46b983d26b841e176e2a0ebfb21bbd7))
* **services:** update object destructuring in api ([#12](https://github.com/itsDaiton/nebula-chat/issues/12)) ([7ec6773](https://github.com/itsDaiton/nebula-chat/commit/7ec677384bfc59161a822325ea6e523d29dbf852))
* small fix for chating ([1401bb4](https://github.com/itsDaiton/nebula-chat/commit/1401bb47337cb835698cbe83d7859fa52478c98b))
* small fix for docker filer ([57c3f4d](https://github.com/itsDaiton/nebula-chat/commit/57c3f4d7b178494a9ecdd173f6055dedbb972ad8))
* update .prettierignore to include CHANGELOG.md and README.md ([#83](https://github.com/itsDaiton/nebula-chat/issues/83)) ([42cefa1](https://github.com/itsDaiton/nebula-chat/commit/42cefa14a940527971280290ab9736958800d87e))
* update azure workflow ([f9f7372](https://github.com/itsDaiton/nebula-chat/commit/f9f73727b1797b9e74f91ca1d70deb5f48bcfdf9))
* update release-please workflow to correctly reference PR number ([#88](https://github.com/itsDaiton/nebula-chat/issues/88)) ([b811394](https://github.com/itsDaiton/nebula-chat/commit/b811394d4eef8be1a864aec3a3b4b4beaf369ecc))
* update start script to use server.ts and set PORT from environment variable ([f4aae96](https://github.com/itsDaiton/nebula-chat/commit/f4aae96df479616caf87b048f40359e2ea213239))
* update workflow azure ([5863464](https://github.com/itsDaiton/nebula-chat/commit/5863464ac280958e808e5d43f86639aaccff82b6))
* **vite:** update base path in Vite config ([#17](https://github.com/itsDaiton/nebula-chat/issues/17)) ([8287fcc](https://github.com/itsDaiton/nebula-chat/commit/8287fcc37b5d3d8c5eb65e29257da69903868e6f))
* workflow fix ([fa50df9](https://github.com/itsDaiton/nebula-chat/commit/fa50df96ae0a92094e37dceb835b005991501a8f))
* yet another fix ([647561d](https://github.com/itsDaiton/nebula-chat/commit/647561db2c5af3642219cc8c361b7a04a358ccd0))

## [1.1.0](https://github.com/itsDaiton/nebula-chat/compare/v1.0.0...v1.1.0) (2026-03-14)


### Features

* add basic chat ui + redesign FE structure ([789afc8](https://github.com/itsDaiton/nebula-chat/commit/789afc89ba1e21a632437ec7e9c34d9230070402))
* add basic frontend ([413be47](https://github.com/itsDaiton/nebula-chat/commit/413be474e222e47a621da7e2f446bed4759cae34))
* add chakra ui ([b631f62](https://github.com/itsDaiton/nebula-chat/commit/b631f628009d79766f3dec901db4bdb94f12ba76))
* add layout components and routing ([4f49c80](https://github.com/itsDaiton/nebula-chat/commit/4f49c80e0a4a690759d3597ba5efc481a72a20df))
* add MegaLinter ([#84](https://github.com/itsDaiton/nebula-chat/issues/84)) ([8d51698](https://github.com/itsDaiton/nebula-chat/commit/8d51698dca699812068b05ee1e915c74edd8bfed))
* add release please pipeline ([#78](https://github.com/itsDaiton/nebula-chat/issues/78)) ([dff2b7d](https://github.com/itsDaiton/nebula-chat/commit/dff2b7d43384c4f8659d0a4c98bd0fe4c9fb9121))
* add sample dark mode ([e40c773](https://github.com/itsDaiton/nebula-chat/commit/e40c7737768262144dfba573ad9e096aefc568ce))
* add sample server folder ([e685d83](https://github.com/itsDaiton/nebula-chat/commit/e685d834a5ca4503bd1a6673a98dbbc045b8c419))
* add settings menu ([e68aca2](https://github.com/itsDaiton/nebula-chat/commit/e68aca2933748d6fc1a27a6a3b63280604a1c911))
* add workflow to push to azure ([1c1368c](https://github.com/itsDaiton/nebula-chat/commit/1c1368c3d47b38993b0509f04c97d2ac4f34b48b))
* **cache:** add prompt caching and rate limiting ([#19](https://github.com/itsDaiton/nebula-chat/issues/19)) ([5fcd9ae](https://github.com/itsDaiton/nebula-chat/commit/5fcd9aeac7955154ba0a9a91b0e26a4b224c2523))
* **chat:** add markdown and code rendering ([#38](https://github.com/itsDaiton/nebula-chat/issues/38)) ([6a5b47e](https://github.com/itsDaiton/nebula-chat/commit/6a5b47eeadabf5511326006b3282a910af3d6464))
* **chat:** add model selection and cleanup frontend ([#13](https://github.com/itsDaiton/nebula-chat/issues/13)) ([b21c08f](https://github.com/itsDaiton/nebula-chat/commit/b21c08fca5cd71d9f458248f048a18c087ebcb70))
* **chat:** add OpenAI model endpoint ([#2](https://github.com/itsDaiton/nebula-chat/issues/2)) ([019ba7a](https://github.com/itsDaiton/nebula-chat/commit/019ba7a2233d21a5329e91278d74edc711a1990f))
* **chat:** add production URL configuration for API requests ([#5](https://github.com/itsDaiton/nebula-chat/issues/5)) ([e4c27c9](https://github.com/itsDaiton/nebula-chat/commit/e4c27c9de1c7ef6c4f90e0af69ad29daefa567a1))
* **chat:** add streaming and chat history ([#3](https://github.com/itsDaiton/nebula-chat/issues/3)) ([81c812a](https://github.com/itsDaiton/nebula-chat/commit/81c812a103ca803070c85ed218f70f7d5aa02e25))
* **chat:** add token usage info ([#4](https://github.com/itsDaiton/nebula-chat/issues/4)) ([cc922fe](https://github.com/itsDaiton/nebula-chat/commit/cc922fe537652e5ea0f9c6579714a71ec1d518ea))
* **chat:** ehance chat functionality and add history ([#34](https://github.com/itsDaiton/nebula-chat/issues/34)) ([84c085e](https://github.com/itsDaiton/nebula-chat/commit/84c085e9bdc52ff8cf3c6370f08a58bb44ad7869))
* **chat:** implement cursor-based pagination for conversations ([#35](https://github.com/itsDaiton/nebula-chat/issues/35)) ([287c3ae](https://github.com/itsDaiton/nebula-chat/commit/287c3ae05f656644bfcdfbcd4407e680d0b82cdb))
* **chat:** update chat backend capabilities ([#30](https://github.com/itsDaiton/nebula-chat/issues/30)) ([b45688a](https://github.com/itsDaiton/nebula-chat/commit/b45688a841eed26e0684f2a0522a7ddd63bc83f5))
* **ci:** add prisma validation to workflow ([#9](https://github.com/itsDaiton/nebula-chat/issues/9)) ([c8c1980](https://github.com/itsDaiton/nebula-chat/commit/c8c19802cdb6fe3d844bae48b52ab8a206195fed))
* **conversation:** add pagination config for api fetch ([#39](https://github.com/itsDaiton/nebula-chat/issues/39)) ([d810408](https://github.com/itsDaiton/nebula-chat/commit/d8104082db58dc4addb5e8fc13a74683768d88fc))
* **database:** add database layer for conversations ([#7](https://github.com/itsDaiton/nebula-chat/issues/7)) ([a475640](https://github.com/itsDaiton/nebula-chat/commit/a4756401959e8d4c86d7622fddff02b0863fa598))
* **docker:** add local redis service ([#27](https://github.com/itsDaiton/nebula-chat/issues/27)) ([34e1536](https://github.com/itsDaiton/nebula-chat/commit/34e1536164297490d0f99b1814b3994286e7dd8d))
* enhance chat functionality and UI ([e891b32](https://github.com/itsDaiton/nebula-chat/commit/e891b32b6a2f19147c1d7963f6f11aea10be7325))
* enhance chat ui ([9e19796](https://github.com/itsDaiton/nebula-chat/commit/9e1979609b587e6664a4f5e0181deb3a26962700))
* **errors:** implement custom error class ([#26](https://github.com/itsDaiton/nebula-chat/issues/26)) ([c1b312d](https://github.com/itsDaiton/nebula-chat/commit/c1b312d7ddc8537fffcd1143ff30fb916fe6e284))
* **github:** add codeowners file ([eeb502c](https://github.com/itsDaiton/nebula-chat/commit/eeb502c72a2528398904b2d165aa51a8b8d485cb))
* improve chat input and light mode UI ([8c9407c](https://github.com/itsDaiton/nebula-chat/commit/8c9407cb0695ac44eeade43abaa81a596f776e1e))
* **layout:** implement responsive layout for chat ([#37](https://github.com/itsDaiton/nebula-chat/issues/37)) ([a3b3268](https://github.com/itsDaiton/nebula-chat/commit/a3b3268e505cd5a2bb5a5ea24a78c5519b3c86cf))
* **openapi:** add openAPI docs ([#29](https://github.com/itsDaiton/nebula-chat/issues/29)) ([eb78b6a](https://github.com/itsDaiton/nebula-chat/commit/eb78b6a51ad93db45bb13c6c5935992848cd8485))
* **redirect:** add redirect rule for index.html ([#43](https://github.com/itsDaiton/nebula-chat/issues/43)) ([b2405ea](https://github.com/itsDaiton/nebula-chat/commit/b2405ea2e1ad5bd049fdf77832652271ccb245f8))
* remove old file ([72d365e](https://github.com/itsDaiton/nebula-chat/commit/72d365e067cd476c884243fd50587bdad07951eb))
* remove project.md ([4bbff72](https://github.com/itsDaiton/nebula-chat/commit/4bbff72205ae1786f8bbc47ae2542a2aba665709))
* setup claude and dependabot ([#53](https://github.com/itsDaiton/nebula-chat/issues/53)) ([cc2ac99](https://github.com/itsDaiton/nebula-chat/commit/cc2ac9966f96aa58f1dcc01e58fad9bfeadd5f1a))
* update dark mode design ([43a8b39](https://github.com/itsDaiton/nebula-chat/commit/43a8b394d8c64a943c45472914522966b17a6157))
* update docker ([c6350ba](https://github.com/itsDaiton/nebula-chat/commit/c6350baa3eeb74c46633538fdcf51e6cf79856b5))
* update worklow for manual start ([1b17995](https://github.com/itsDaiton/nebula-chat/commit/1b17995611e1dee3c723886b04a3865db5d85b58))


### Bug Fixes

* add node types ([2f5bd43](https://github.com/itsDaiton/nebula-chat/commit/2f5bd43241c497652c6d3f494e90bdf1b466bf90))
* adjust Prisma config for environment variable handling ([#79](https://github.com/itsDaiton/nebula-chat/issues/79)) ([a722611](https://github.com/itsDaiton/nebula-chat/commit/a72261142159d3caf96cacccc17068d81ed28ee3))
* another docker fix ([992bbcb](https://github.com/itsDaiton/nebula-chat/commit/992bbcb9f7521535f89d7edb55a069ed3c1711c5))
* another docker fix ([7241311](https://github.com/itsDaiton/nebula-chat/commit/72413119ff01aec7dd1bbb79ed4fd3c1b8d1b869))
* another fix for azure workflow ([c56c721](https://github.com/itsDaiton/nebula-chat/commit/c56c721e3ee22ff0a638de3d9d4179eb251063f3))
* **backend:** correct path to server file in start script ([#24](https://github.com/itsDaiton/nebula-chat/issues/24)) ([637c800](https://github.com/itsDaiton/nebula-chat/commit/637c800c17de12f8cc4dbdc59f5812a589baac2e))
* **backend:** edit production scripts ([#23](https://github.com/itsDaiton/nebula-chat/issues/23)) ([823d88b](https://github.com/itsDaiton/nebula-chat/commit/823d88b715fcad54d4821537f994552f776e7dad))
* **build:** update build script to resolve production backend issue ([#6](https://github.com/itsDaiton/nebula-chat/issues/6)) ([4a1b49f](https://github.com/itsDaiton/nebula-chat/commit/4a1b49f75861d5ba8e6a4dcd61fedfca58f607bc))
* **chat:** increase bottom margin in chat and resolve icon issue ([#15](https://github.com/itsDaiton/nebula-chat/issues/15)) ([00c7af5](https://github.com/itsDaiton/nebula-chat/commit/00c7af5bb6468504fdfea2c9a88e73090d7de6e0))
* **chat:** stream chat bugfixing cleanup ([#33](https://github.com/itsDaiton/nebula-chat/issues/33)) ([94edbc8](https://github.com/itsDaiton/nebula-chat/commit/94edbc85ad3d18e75eb171a6632d080fc601419f))
* **chat:** update chat input button darkmode ([#21](https://github.com/itsDaiton/nebula-chat/issues/21)) ([6ebe646](https://github.com/itsDaiton/nebula-chat/commit/6ebe646f73c4f1db9ea0edadf00eaaa846a3f17b))
* **chat:** update chat input button styles ([#20](https://github.com/itsDaiton/nebula-chat/issues/20)) ([90804b9](https://github.com/itsDaiton/nebula-chat/commit/90804b99f5801b371bfb9918e3de8d3105577dcb))
* correct path in docker build ([4acb813](https://github.com/itsDaiton/nebula-chat/commit/4acb8138b9f29b308ef63fee0dd50efebec25d92))
* correct server setup ([14fd52c](https://github.com/itsDaiton/nebula-chat/commit/14fd52c50a6420f6407c53afa23d9fd97c218154))
* **cors:** resolve CORS issues ([#31](https://github.com/itsDaiton/nebula-chat/issues/31)) ([00d6702](https://github.com/itsDaiton/nebula-chat/commit/00d6702848ecd6625a7e6d88ed3e919f7d5f6022))
* **database:** resolve broken ts-config and prisma errors ([#8](https://github.com/itsDaiton/nebula-chat/issues/8)) ([7d6f280](https://github.com/itsDaiton/nebula-chat/commit/7d6f280bbc58a6899aa07322e568ee8eaf20f02b))
* emoji in welcome chat ([#82](https://github.com/itsDaiton/nebula-chat/issues/82)) ([463025d](https://github.com/itsDaiton/nebula-chat/commit/463025df6e619a65e7ff53d2b2dc00d2df1767bd))
* fix path issue in workflow ([fe49951](https://github.com/itsDaiton/nebula-chat/commit/fe4995152457fe94b29efaa379d278ff9bd922d5))
* **frontend:** FE bugfixing + rate limiting ([#45](https://github.com/itsDaiton/nebula-chat/issues/45)) ([469a1a9](https://github.com/itsDaiton/nebula-chat/commit/469a1a98b98aadceee4af4e33e473189daa1b351))
* **github:** fix codeowners ([e9a6114](https://github.com/itsDaiton/nebula-chat/commit/e9a61145f601bfe6b96ed9135a98ef44531844a4))
* **icon:** correct icon loading ([#16](https://github.com/itsDaiton/nebula-chat/issues/16)) ([541b254](https://github.com/itsDaiton/nebula-chat/commit/541b254801eb9798927cc81e418e4ef8ae534805))
* load `jsonc` language in Shiki highlighter ([#47](https://github.com/itsDaiton/nebula-chat/issues/47)) ([eead843](https://github.com/itsDaiton/nebula-chat/commit/eead843d6dc2d9856d811ee428f2b2e0e2d2e6a6))
* **migrations:** update migration scripts and schema ([#11](https://github.com/itsDaiton/nebula-chat/issues/11)) ([b86e090](https://github.com/itsDaiton/nebula-chat/commit/b86e090f2cec740797af7b8d5b9907b29cdd6fd2))
* **prisma:** update client provider to use prisma-client-js ([#10](https://github.com/itsDaiton/nebula-chat/issues/10)) ([773096c](https://github.com/itsDaiton/nebula-chat/commit/773096c29ebf81c6799534a51bcfde33dad98998))
* **prompt:** move system prompt to TS file ([#32](https://github.com/itsDaiton/nebula-chat/issues/32)) ([9996d21](https://github.com/itsDaiton/nebula-chat/commit/9996d211c9db829079a4cc49638299e107015d8b))
* **services:** update object destructuring in api ([#12](https://github.com/itsDaiton/nebula-chat/issues/12)) ([7ec6773](https://github.com/itsDaiton/nebula-chat/commit/7ec677384bfc59161a822325ea6e523d29dbf852))
* small fix for chating ([1401bb4](https://github.com/itsDaiton/nebula-chat/commit/1401bb47337cb835698cbe83d7859fa52478c98b))
* small fix for docker filer ([57c3f4d](https://github.com/itsDaiton/nebula-chat/commit/57c3f4d7b178494a9ecdd173f6055dedbb972ad8))
* update .prettierignore to include CHANGELOG.md and README.md ([#83](https://github.com/itsDaiton/nebula-chat/issues/83)) ([42cefa1](https://github.com/itsDaiton/nebula-chat/commit/42cefa14a940527971280290ab9736958800d87e))
* update azure workflow ([f9f7372](https://github.com/itsDaiton/nebula-chat/commit/f9f73727b1797b9e74f91ca1d70deb5f48bcfdf9))
* update start script to use server.ts and set PORT from environment variable ([f4aae96](https://github.com/itsDaiton/nebula-chat/commit/f4aae96df479616caf87b048f40359e2ea213239))
* update workflow azure ([5863464](https://github.com/itsDaiton/nebula-chat/commit/5863464ac280958e808e5d43f86639aaccff82b6))
* **vite:** update base path in Vite config ([#17](https://github.com/itsDaiton/nebula-chat/issues/17)) ([8287fcc](https://github.com/itsDaiton/nebula-chat/commit/8287fcc37b5d3d8c5eb65e29257da69903868e6f))
* workflow fix ([fa50df9](https://github.com/itsDaiton/nebula-chat/commit/fa50df96ae0a92094e37dceb835b005991501a8f))
* yet another fix ([647561d](https://github.com/itsDaiton/nebula-chat/commit/647561db2c5af3642219cc8c361b7a04a358ccd0))
