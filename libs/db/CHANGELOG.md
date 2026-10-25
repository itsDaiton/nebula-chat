# Changelog

## [1.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v1.0.1...nebula-chat-db-v1.1.0) (2026-10-25)


### Features

* **worker:** NEB-567 Model call ledger for Direct replies ([#646](https://github.com/itsDaiton/nebula-chat/issues/646)) ([75f4522](https://github.com/itsDaiton/nebula-chat/commit/75f452203e59f60f7c75d3b5d007d5f296a8dd03))

## [1.0.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v1.0.0...nebula-chat-db-v1.0.1) (2026-10-24)


### Bug Fixes

* **agents:** slim agent docs, drop home-grown skills, trim heavy comments ([#627](https://github.com/itsDaiton/nebula-chat/issues/627)) ([acf7b7c](https://github.com/itsDaiton/nebula-chat/commit/acf7b7cb6c96b0103eb27382a77043d4133a615c))

## [1.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.7.0...nebula-chat-db-v1.0.0) (2026-10-19)


### ⚠ BREAKING CHANGES

* **messages:** NEB-353 remove the unused system role from Message ([#599](https://github.com/itsDaiton/nebula-chat/issues/599))

### Bug Fixes

* **messages:** NEB-353 remove the unused system role from Message ([#599](https://github.com/itsDaiton/nebula-chat/issues/599)) ([80ff6ac](https://github.com/itsDaiton/nebula-chat/commit/80ff6ac1869cd0237a4f0ba451c5e085244f17ff))

## [0.7.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.6.2...nebula-chat-db-v0.7.0) (2026-10-19)


### Features

* **sessions:** NEB-352 rename Conversation to Session end to end ([#588](https://github.com/itsDaiton/nebula-chat/issues/588)) ([4d8e9c5](https://github.com/itsDaiton/nebula-chat/commit/4d8e9c58949d573ba641f476095f920645fdec74))

## [0.6.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.6.1...nebula-chat-db-v0.6.2) (2026-10-18)


### Bug Fixes

* **repo:** NEB-526 rename apps to apps/client and apps/server as @nebula-chat/&lt;app&gt; ([#577](https://github.com/itsDaiton/nebula-chat/issues/577)) ([fe5ab0a](https://github.com/itsDaiton/nebula-chat/commit/fe5ab0aa5fedb1a769a22d7cf7433d2c4e45921d)), closes [#526](https://github.com/itsDaiton/nebula-chat/issues/526)

## [0.6.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.6.0...nebula-chat-db-v0.6.1) (2026-10-16)


### Bug Fixes

* **db:** log and survive idle Postgres connection errors ([#512](https://github.com/itsDaiton/nebula-chat/issues/512)) ([32e170f](https://github.com/itsDaiton/nebula-chat/commit/32e170f5c7a44cc3bb52a7dff3b4de3a4db5af3a))

## [0.6.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.5.2...nebula-chat-db-v0.6.0) (2026-10-11)


### Features

* **auth:** NEB-471 NEB-472 NEB-473 Profile images ([#502](https://github.com/itsDaiton/nebula-chat/issues/502)) ([f6c1da5](https://github.com/itsDaiton/nebula-chat/commit/f6c1da596344946fd4c3cb5f93db38ac3df23046))

## [0.5.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.5.1...nebula-chat-db-v0.5.2) (2026-09-29)


### Bug Fixes

* **server:** NEB-388 load env files with dotenvx in package scripts ([#403](https://github.com/itsDaiton/nebula-chat/issues/403)) ([23792d3](https://github.com/itsDaiton/nebula-chat/commit/23792d342af65a151c9e30d26462c3efe237ec5a))

## [0.5.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.5.0...nebula-chat-db-v0.5.1) (2026-09-28)


### Bug Fixes

* **deps:** NEB-398 migrate lib builds from tsup to tsdown ([#399](https://github.com/itsDaiton/nebula-chat/issues/399)) ([678284f](https://github.com/itsDaiton/nebula-chat/commit/678284fd43a580450dda1586802bd27eac1c06c0))

## [0.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.4.0...nebula-chat-db-v0.5.0) (2026-09-22)


### Features

* **auth:** add @nebula-chat/auth better-auth substrate (M-6) ([#322](https://github.com/itsDaiton/nebula-chat/issues/322)) ([a4ba239](https://github.com/itsDaiton/nebula-chat/commit/a4ba2392f879b97966a92978288cd64d1dc55b8d))

## [0.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.3.1...nebula-chat-db-v0.4.0) (2026-09-16)


### Features

* **test:** add Vitest unit testing across server, client and libs ([#305](https://github.com/itsDaiton/nebula-chat/issues/305)) ([e8c09ee](https://github.com/itsDaiton/nebula-chat/commit/e8c09eec1385c11ab1d6744ae7a75b79713b47fd))

## [0.3.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.3.0...nebula-chat-db-v0.3.1) (2026-09-12)


### Bug Fixes

* **db:** surface migration errors and add a journal baseline ([#293](https://github.com/itsDaiton/nebula-chat/issues/293)) ([26b60b8](https://github.com/itsDaiton/nebula-chat/commit/26b60b8160ea3ae03ae51f340d9b45449bb830ae))

## [0.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-db-v0.2.0...nebula-chat-db-v0.3.0) (2026-05-03)


### Features

* **db:** migrate from Prisma to Drizzle ORM ([#214](https://github.com/itsDaiton/nebula-chat/issues/214)) ([c6c543a](https://github.com/itsDaiton/nebula-chat/commit/c6c543a9ea85c7742083ff37e58739d5f391c715))


### Bug Fixes

* **ci:** migrate monorepo builds to Turborepo ([#239](https://github.com/itsDaiton/nebula-chat/issues/239)) ([1a03d6f](https://github.com/itsDaiton/nebula-chat/commit/1a03d6fdbdb4c003abffa502cb3abe15802173cb))
* **frontend:** improve URL safety with URL API parser ([75e2e4d](https://github.com/itsDaiton/nebula-chat/commit/75e2e4d9e6dfe1170eaf9e0149896dd7e78b8c63))

## [0.2.0](https://github.com/itsDaiton/nebula-chat/compare/db-v0.1.0...db-v0.2.0) (2026-05-01)


### Features

* **db:** migrate from Prisma to Drizzle ORM ([#214](https://github.com/itsDaiton/nebula-chat/issues/214)) ([c6c543a](https://github.com/itsDaiton/nebula-chat/commit/c6c543a9ea85c7742083ff37e58739d5f391c715))


### Bug Fixes

* **frontend:** improve URL safety with URL API parser ([75e2e4d](https://github.com/itsDaiton/nebula-chat/commit/75e2e4d9e6dfe1170eaf9e0149896dd7e78b8c63))
