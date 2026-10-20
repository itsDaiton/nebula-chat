# Changelog

## [2.6.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.5.0...nebula-chat-otel-v2.6.0) (2026-10-20)


### Features

* **worker:** NEB-354 produce Direct replies in a dedicated worker app via BullMQ and Redis Streams ([#601](https://github.com/itsDaiton/nebula-chat/issues/601)) ([69ac0b4](https://github.com/itsDaiton/nebula-chat/commit/69ac0b43aba769dcbfccbb61ef7fa66cd8d571d4))

## [2.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.4.0...nebula-chat-otel-v2.5.0) (2026-10-19)


### Features

* **cli:** add nebula log-level get, reading levels from every server instance ([#592](https://github.com/itsDaiton/nebula-chat/issues/592)) ([b64556e](https://github.com/itsDaiton/nebula-chat/commit/b64556eca2538515a32edd5b472151fe8e187835))

## [2.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.3.0...nebula-chat-otel-v2.4.0) (2026-10-19)


### Features

* **sessions:** NEB-352 rename Conversation to Session end to end ([#588](https://github.com/itsDaiton/nebula-chat/issues/588)) ([4d8e9c5](https://github.com/itsDaiton/nebula-chat/commit/4d8e9c58949d573ba641f476095f920645fdec74))

## [2.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.2.1...nebula-chat-otel-v2.3.0) (2026-10-17)


### Features

* **otel:** NEB-371 export logs over OTLP to Grafana Loki ([#513](https://github.com/itsDaiton/nebula-chat/issues/513)) ([aa17553](https://github.com/itsDaiton/nebula-chat/commit/aa17553081239abfd33b9bb9bc82a4bd379ca7e8))

## [2.2.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.2.0...nebula-chat-otel-v2.2.1) (2026-10-16)


### Bug Fixes

* **db:** log and survive idle Postgres connection errors ([#512](https://github.com/itsDaiton/nebula-chat/issues/512)) ([32e170f](https://github.com/itsDaiton/nebula-chat/commit/32e170f5c7a44cc3bb52a7dff3b4de3a4db5af3a))

## [2.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.1.4...nebula-chat-otel-v2.2.0) (2026-10-11)


### Features

* **auth:** NEB-471 NEB-472 NEB-473 Profile images ([#502](https://github.com/itsDaiton/nebula-chat/issues/502)) ([f6c1da5](https://github.com/itsDaiton/nebula-chat/commit/f6c1da596344946fd4c3cb5f93db38ac3df23046))

## [2.1.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.1.3...nebula-chat-otel-v2.1.4) (2026-10-09)


### Bug Fixes

* **server:** NEB-447 redact the password-reset token from request logs ([#483](https://github.com/itsDaiton/nebula-chat/issues/483)) ([fd85730](https://github.com/itsDaiton/nebula-chat/commit/fd85730290bee58b8ee512aedf23c1b78a5bcaa1))

## [2.1.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.1.2...nebula-chat-otel-v2.1.3) (2026-10-06)


### Bug Fixes

* **server:** exit promptly on shutdown so dev reloads are not stalled ([#478](https://github.com/itsDaiton/nebula-chat/issues/478)) ([520c0a7](https://github.com/itsDaiton/nebula-chat/commit/520c0a7d6954e934e4cfc5532ce03c25fbe5344b))

## [2.1.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.1.1...nebula-chat-otel-v2.1.2) (2026-10-02)


### Bug Fixes

* **redis:** open the connection before the first authStore command ([#410](https://github.com/itsDaiton/nebula-chat/issues/410)) ([c5366dc](https://github.com/itsDaiton/nebula-chat/commit/c5366dcc54ec62c84fe7d3813b25daa36340e704))

## [2.1.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.1.0...nebula-chat-otel-v2.1.1) (2026-10-02)


### Bug Fixes

* **redis:** log connection errors through the injected logger ([#412](https://github.com/itsDaiton/nebula-chat/issues/412)) ([54b4be2](https://github.com/itsDaiton/nebula-chat/commit/54b4be2744ca7ab5739050a632562b4fc537fd47))

## [2.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.0.1...nebula-chat-otel-v2.1.0) (2026-10-02)


### Features

* **otel:** NEB-370 change log levels at runtime without a restart ([#408](https://github.com/itsDaiton/nebula-chat/issues/408)) ([399cee0](https://github.com/itsDaiton/nebula-chat/commit/399cee03a0992cbd64bef6ace59fda931bd5f00b))

## [2.0.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v2.0.0...nebula-chat-otel-v2.0.1) (2026-09-28)


### Bug Fixes

* **deps:** NEB-398 migrate lib builds from tsup to tsdown ([#399](https://github.com/itsDaiton/nebula-chat/issues/399)) ([678284f](https://github.com/itsDaiton/nebula-chat/commit/678284fd43a580450dda1586802bd27eac1c06c0))

## [2.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v1.1.0...nebula-chat-otel-v2.0.0) (2026-09-25)


### ⚠ BREAKING CHANGES

* **otel:** NEB-369 structured logging conventions across server and libs ([#372](https://github.com/itsDaiton/nebula-chat/issues/372))

### Features

* **otel:** NEB-369 structured logging conventions across server and libs ([#372](https://github.com/itsDaiton/nebula-chat/issues/372)) ([d276ddf](https://github.com/itsDaiton/nebula-chat/commit/d276ddf6711db0ff715efe2c2f3afe67275a3a32))

## [1.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-otel-v1.0.0...nebula-chat-otel-v1.1.0) (2026-09-16)


### Features

* **test:** add Vitest unit testing across server, client and libs ([#305](https://github.com/itsDaiton/nebula-chat/issues/305)) ([e8c09ee](https://github.com/itsDaiton/nebula-chat/commit/e8c09eec1385c11ab1d6744ae7a75b79713b47fd))

## 1.0.0 (2026-09-14)


### Features

* **otel:** add @nebula-chat/otel logger factory and OTel tracing ([#299](https://github.com/itsDaiton/nebula-chat/issues/299)) ([357fec3](https://github.com/itsDaiton/nebula-chat/commit/357fec3de84a2f1328af647268e83c58fe2d26c9))


### Bug Fixes

* **frontend:** improve URL safety with URL API parser ([75e2e4d](https://github.com/itsDaiton/nebula-chat/commit/75e2e4d9e6dfe1170eaf9e0149896dd7e78b8c63))
