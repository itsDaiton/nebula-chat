# Changelog

## [1.9.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.8.2...nebula-chat-worker-v1.9.0) (2026-10-31)


### Features

* **server:** NEB-665 Messages carry their Model, estimated cost, Run and context usage ([#704](https://github.com/itsDaiton/nebula-chat/issues/704)) ([c9bf8b3](https://github.com/itsDaiton/nebula-chat/commit/c9bf8b33f1bac83076aed43f18b1e986c661b6ca))

## [1.8.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.8.1...nebula-chat-worker-v1.8.2) (2026-10-30)


### Bug Fixes

* Claude Code harness, skills update and GLOSSARY.md ([#688](https://github.com/itsDaiton/nebula-chat/issues/688)) ([17abd54](https://github.com/itsDaiton/nebula-chat/commit/17abd5450d4020b267c8e8b07579f23da90bb2e5))

## [1.8.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.8.0...nebula-chat-worker-v1.8.1) (2026-10-29)


### Bug Fixes

* **worker:** NEB-671 omit unsupported sampling parameters per Model ([#684](https://github.com/itsDaiton/nebula-chat/issues/684)) ([ab86f47](https://github.com/itsDaiton/nebula-chat/commit/ab86f477b348d02040601e0227918db399ee8475))

## [1.8.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.7.0...nebula-chat-worker-v1.8.0) (2026-10-26)


### Features

* **worker:** NEB-361 resume Runs from their checkpoint and enforce failure end states ([#663](https://github.com/itsDaiton/nebula-chat/issues/663)) ([7b89c2f](https://github.com/itsDaiton/nebula-chat/commit/7b89c2fa48d978b4badc2bf7210fbc9c91b0d829))

## [1.7.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.6.0...nebula-chat-worker-v1.7.0) (2026-10-26)


### Features

* **worker:** NEB-360 Orchestrator tool-calling loop with delegate Agents and Run budget ([#656](https://github.com/itsDaiton/nebula-chat/issues/656)) ([273a3ba](https://github.com/itsDaiton/nebula-chat/commit/273a3bac5dd566f996862e0d0f4075bcc5c9cbf5))

## [1.6.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.5.0...nebula-chat-worker-v1.6.0) (2026-10-26)


### Features

* **worker:** NEB-359 Runs with Intake Agents, Brief and Output Agent ([#651](https://github.com/itsDaiton/nebula-chat/issues/651)) ([d74c64e](https://github.com/itsDaiton/nebula-chat/commit/d74c64edb494ba93bb6cb76236dafb268c83f905)), closes [#359](https://github.com/itsDaiton/nebula-chat/issues/359)

## [1.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.4.0...nebula-chat-worker-v1.5.0) (2026-10-25)


### Features

* **worker:** NEB-567 Model call ledger for Direct replies ([#646](https://github.com/itsDaiton/nebula-chat/issues/646)) ([75f4522](https://github.com/itsDaiton/nebula-chat/commit/75f452203e59f60f7c75d3b5d007d5f296a8dd03))

## [1.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.3.1...nebula-chat-worker-v1.4.0) (2026-10-25)


### Features

* **contracts:** NEB-565 model catalog, GET /api/models and prices ([#643](https://github.com/itsDaiton/nebula-chat/issues/643)) ([60856ed](https://github.com/itsDaiton/nebula-chat/commit/60856ed5f08c2fb8b93726617128a1a3f69c0458))

## [1.3.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.3.0...nebula-chat-worker-v1.3.1) (2026-10-25)


### Bug Fixes

* **worker:** NEB-358 dissolve @nebula-chat/langchain into the worker app ([#640](https://github.com/itsDaiton/nebula-chat/issues/640)) ([bd2919f](https://github.com/itsDaiton/nebula-chat/commit/bd2919f913fbfd7ebd52fcb7c82bd9cd398450ab))

## [1.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.2.0...nebula-chat-worker-v1.3.0) (2026-10-25)


### Features

* **worker:** NEB-357 propagate one OTel trace across server, queue and worker ([#637](https://github.com/itsDaiton/nebula-chat/issues/637)) ([7046d62](https://github.com/itsDaiton/nebula-chat/commit/7046d624d9e9c7440e469e2c89b00eca9201ad99))

## [1.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.1.1...nebula-chat-worker-v1.2.0) (2026-10-25)


### Features

* **worker:** NEB-356 cache Direct replies in the worker ([#635](https://github.com/itsDaiton/nebula-chat/issues/635)) ([0eed2a0](https://github.com/itsDaiton/nebula-chat/commit/0eed2a04199e74d979b818cc2299b25814d56109))

## [1.1.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.1.0...nebula-chat-worker-v1.1.1) (2026-10-24)


### Bug Fixes

* **agents:** slim agent docs, drop home-grown skills, trim heavy comments ([#627](https://github.com/itsDaiton/nebula-chat/issues/627)) ([acf7b7c](https://github.com/itsDaiton/nebula-chat/commit/acf7b7cb6c96b0103eb27382a77043d4133a615c))

## [1.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-worker-v1.0.0...nebula-chat-worker-v1.1.0) (2026-10-24)


### Features

* **worker:** NEB-355 make reply streams resumable and cancellable ([#621](https://github.com/itsDaiton/nebula-chat/issues/621)) ([75c9975](https://github.com/itsDaiton/nebula-chat/commit/75c99750070d7806cd96ccf71731b501d0eb7e23))

## 1.0.0 (2026-10-20)


### Features

* **worker:** NEB-354 produce Direct replies in a dedicated worker app via BullMQ and Redis Streams ([#601](https://github.com/itsDaiton/nebula-chat/issues/601)) ([69ac0b4](https://github.com/itsDaiton/nebula-chat/commit/69ac0b43aba769dcbfccbb61ef7fa66cd8d571d4))


### Bug Fixes

* **frontend:** improve URL safety with URL API parser ([75e2e4d](https://github.com/itsDaiton/nebula-chat/commit/75e2e4d9e6dfe1170eaf9e0149896dd7e78b8c63))
