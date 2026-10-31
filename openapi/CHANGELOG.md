# Changelog

## [4.8.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v4.7.0...nebula-chat-openapi-v4.8.0) (2026-10-31)


### Features

* **server:** NEB-542 Admin grants and revokes the Admin role and bans and unbans Users ([#702](https://github.com/itsDaiton/nebula-chat/issues/702)) ([29abb1a](https://github.com/itsDaiton/nebula-chat/commit/29abb1a3f14e0c3077ef640470070811b5d6eb19))

## [4.7.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v4.6.0...nebula-chat-openapi-v4.7.0) (2026-10-31)


### Features

* **server:** NEB-540 Admin reads the User list and a User's details ([#697](https://github.com/itsDaiton/nebula-chat/issues/697)) ([838729a](https://github.com/itsDaiton/nebula-chat/commit/838729a572dcd8bde13cd94ee1f5949b1842e441))
* **server:** NEB-544 Account deletion starts a 30-day Pending deletion ([#699](https://github.com/itsDaiton/nebula-chat/issues/699)) ([cbf636b](https://github.com/itsDaiton/nebula-chat/commit/cbf636b24371eb59794459f1c20494898e4479d2))

## [4.6.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v4.5.1...nebula-chat-openapi-v4.6.0) (2026-10-31)


### Features

* **server:** NEB-539 admin gate, Audit log and Operator admin routes ([#695](https://github.com/itsDaiton/nebula-chat/issues/695)) ([e044c81](https://github.com/itsDaiton/nebula-chat/commit/e044c818fbaf52095e2b9bda952d77c48eafb918)), closes [#539](https://github.com/itsDaiton/nebula-chat/issues/539)

## [4.5.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v4.5.0...nebula-chat-openapi-v4.5.1) (2026-10-29)


### Bug Fixes

* **worker:** NEB-671 omit unsupported sampling parameters per Model ([#684](https://github.com/itsDaiton/nebula-chat/issues/684)) ([ab86f47](https://github.com/itsDaiton/nebula-chat/commit/ab86f477b348d02040601e0227918db399ee8475))

## [4.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v4.4.0...nebula-chat-openapi-v4.5.0) (2026-10-28)


### Features

* **server:** Session search matches Message content and returns a snippet ([#680](https://github.com/itsDaiton/nebula-chat/issues/680)) ([367cf88](https://github.com/itsDaiton/nebula-chat/commit/367cf8835471ce9b00ac8d79e9fc28fd3f1753ac))

## [4.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v4.3.0...nebula-chat-openapi-v4.4.0) (2026-10-27)


### Features

* **server:** NEB-543 Users archive and restore their Sessions ([#673](https://github.com/itsDaiton/nebula-chat/issues/673)) ([64e909a](https://github.com/itsDaiton/nebula-chat/commit/64e909a9a1a86167abb26766ccc69569ad771abe))

## [4.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v4.2.0...nebula-chat-openapi-v4.3.0) (2026-10-26)


### Features

* **worker:** NEB-359 Runs with Intake Agents, Brief and Output Agent ([#651](https://github.com/itsDaiton/nebula-chat/issues/651)) ([d74c64e](https://github.com/itsDaiton/nebula-chat/commit/d74c64edb494ba93bb6cb76236dafb268c83f905)), closes [#359](https://github.com/itsDaiton/nebula-chat/issues/359)

## [4.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v4.1.0...nebula-chat-openapi-v4.2.0) (2026-10-25)


### Features

* **contracts:** NEB-565 model catalog, GET /api/models and prices ([#643](https://github.com/itsDaiton/nebula-chat/issues/643)) ([60856ed](https://github.com/itsDaiton/nebula-chat/commit/60856ed5f08c2fb8b93726617128a1a3f69c0458))

## [4.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v4.0.0...nebula-chat-openapi-v4.1.0) (2026-10-24)


### Features

* **worker:** NEB-355 make reply streams resumable and cancellable ([#621](https://github.com/itsDaiton/nebula-chat/issues/621)) ([75c9975](https://github.com/itsDaiton/nebula-chat/commit/75c99750070d7806cd96ccf71731b501d0eb7e23))

## [4.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v3.0.0...nebula-chat-openapi-v4.0.0) (2026-10-20)


### ⚠ BREAKING CHANGES

* NEB-354 release the worker split as breaking for server and openapi ([#603](https://github.com/itsDaiton/nebula-chat/issues/603))

### Features

* NEB-354 release the worker split as breaking for server and openapi ([#603](https://github.com/itsDaiton/nebula-chat/issues/603)) ([fd6d395](https://github.com/itsDaiton/nebula-chat/commit/fd6d39590a6e17ff62bc3a47366ae93b88120050))
* **worker:** NEB-354 produce Direct replies in a dedicated worker app via BullMQ and Redis Streams ([#601](https://github.com/itsDaiton/nebula-chat/issues/601)) ([69ac0b4](https://github.com/itsDaiton/nebula-chat/commit/69ac0b43aba769dcbfccbb61ef7fa66cd8d571d4))

## [3.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v2.1.0...nebula-chat-openapi-v3.0.0) (2026-10-19)


### ⚠ BREAKING CHANGES

* **messages:** NEB-353 remove the unused system role from Message ([#599](https://github.com/itsDaiton/nebula-chat/issues/599))

### Bug Fixes

* **messages:** NEB-353 remove the unused system role from Message ([#599](https://github.com/itsDaiton/nebula-chat/issues/599)) ([80ff6ac](https://github.com/itsDaiton/nebula-chat/commit/80ff6ac1869cd0237a4f0ba451c5e085244f17ff))

## [2.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v2.0.0...nebula-chat-openapi-v2.1.0) (2026-10-19)


### Features

* **cli:** add nebula log-level get, reading levels from every server instance ([#592](https://github.com/itsDaiton/nebula-chat/issues/592)) ([b64556e](https://github.com/itsDaiton/nebula-chat/commit/b64556eca2538515a32edd5b472151fe8e187835))

## [2.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.13.0...nebula-chat-openapi-v2.0.0) (2026-10-19)


### ⚠ BREAKING CHANGES

* the domain Conversation is now a Session ([#588](https://github.com/itsDaiton/nebula-chat/issues/588)). @nebula-chat/auth exports `claimSessions` and `ClaimSessionsParams` in place of `claimConversations` and `ClaimConversationsParams`. The OpenAPI contract serves `/api/sessions*` in place of `/api/conversations*`, with `Session`/`SessionPage` schemas and `sessionId` in place of `conversationId`.

### Features

* NEB-352 release the Session rename as breaking for auth and openapi ([#590](https://github.com/itsDaiton/nebula-chat/issues/590)) ([bc85d0f](https://github.com/itsDaiton/nebula-chat/commit/bc85d0f5c2fa2d800d87904b393d008bfc3c0175))

## [1.13.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.12.1...nebula-chat-openapi-v1.13.0) (2026-10-19)


### Features

* **sessions:** NEB-352 rename Conversation to Session end to end ([#588](https://github.com/itsDaiton/nebula-chat/issues/588)) ([4d8e9c5](https://github.com/itsDaiton/nebula-chat/commit/4d8e9c58949d573ba641f476095f920645fdec74))

## [1.12.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.12.0...nebula-chat-openapi-v1.12.1) (2026-10-18)


### Bug Fixes

* **client:** regenerate the API client and drop the spec version from its headers ([#582](https://github.com/itsDaiton/nebula-chat/issues/582)) ([d983e60](https://github.com/itsDaiton/nebula-chat/commit/d983e60efdf965535a7c3f85ceb39e4146b42711))

## [1.12.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.11.0...nebula-chat-openapi-v1.12.0) (2026-10-11)


### Features

* **server:** NEB-462 expose the message allowance as a read endpoint ([#509](https://github.com/itsDaiton/nebula-chat/issues/509)) ([3177464](https://github.com/itsDaiton/nebula-chat/commit/3177464f5f8abd7f61382e6d2d87a3ea6cb581b9))

## [1.11.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.10.0...nebula-chat-openapi-v1.11.0) (2026-10-11)


### Features

* **auth:** NEB-471 NEB-472 NEB-473 Profile images ([#502](https://github.com/itsDaiton/nebula-chat/issues/502)) ([f6c1da5](https://github.com/itsDaiton/nebula-chat/commit/f6c1da596344946fd4c3cb5f93db38ac3df23046))

## [1.10.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.9.0...nebula-chat-openapi-v1.10.0) (2026-10-02)


### Features

* **otel:** NEB-370 change log levels at runtime without a restart ([#408](https://github.com/itsDaiton/nebula-chat/issues/408)) ([399cee0](https://github.com/itsDaiton/nebula-chat/commit/399cee03a0992cbd64bef6ace59fda931bd5f00b))

## [1.9.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.8.0...nebula-chat-openapi-v1.9.0) (2026-09-29)


### Features

* **server:** NEB-385 switch OpenAPI generation to fastify-zod-openapi with named response schemas ([#401](https://github.com/itsDaiton/nebula-chat/issues/401)) ([f63d4fa](https://github.com/itsDaiton/nebula-chat/commit/f63d4fa7506af733c1cc6c138e13f538f6d40e53))

## [1.8.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.7.1...nebula-chat-openapi-v1.8.0) (2026-09-27)


### Features

* **server:** NEB-377 list one conversation's messages via GET /api/messages?conversationId ([#381](https://github.com/itsDaiton/nebula-chat/issues/381)) ([189091b](https://github.com/itsDaiton/nebula-chat/commit/189091b6cb513a23fafd99c70ac92114b6b1a305))

## [1.7.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.7.0...nebula-chat-openapi-v1.7.1) (2026-09-24)


### Bug Fixes

* **errors:** NEB-323 shared error library and unified error envelope across both apps ([#364](https://github.com/itsDaiton/nebula-chat/issues/364)) ([dcca70b](https://github.com/itsDaiton/nebula-chat/commit/dcca70b450381c2918708937aa24557dfd393a88))

## [1.7.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.6.1...nebula-chat-openapi-v1.7.0) (2026-09-22)


### Features

* **auth:** add @nebula-chat/auth better-auth substrate (M-6) ([#322](https://github.com/itsDaiton/nebula-chat/issues/322)) ([a4ba239](https://github.com/itsDaiton/nebula-chat/commit/a4ba2392f879b97966a92978288cd64d1dc55b8d))

## [1.6.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.6.0...nebula-chat-openapi-v1.6.1) (2026-09-19)


### Bug Fixes

* **openapi:** resolve Checkov CKV_OPENAPI_4/5/21 failures ([#319](https://github.com/itsDaiton/nebula-chat/issues/319)) ([6de7935](https://github.com/itsDaiton/nebula-chat/commit/6de79358062a5c22135a8586a9b6349b3d7003fa))

## [1.6.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.5.0...nebula-chat-openapi-v1.6.0) (2026-09-18)


### Features

* **redis:** add @nebula-chat/redis lib ([#312](https://github.com/itsDaiton/nebula-chat/issues/312)) ([3c6f77f](https://github.com/itsDaiton/nebula-chat/commit/3c6f77ff7a197a879c794029407671ca45d475ae))

## [1.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.4.0...nebula-chat-openapi-v1.5.0) (2026-09-16)


### Features

* **test:** add Vitest unit testing across server, client and libs ([#305](https://github.com/itsDaiton/nebula-chat/issues/305)) ([e8c09ee](https://github.com/itsDaiton/nebula-chat/commit/e8c09eec1385c11ab1d6744ae7a75b79713b47fd))

## [1.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.3.0...nebula-chat-openapi-v1.4.0) (2026-05-03)


### Features

* **langchain:** implement @nebula-chat/langchain lib and wire into server ([#229](https://github.com/itsDaiton/nebula-chat/issues/229)) ([c883085](https://github.com/itsDaiton/nebula-chat/commit/c883085c3fcf21cbcbe7e42feef1a03c9347e002))

## [1.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.2.0...nebula-chat-openapi-v1.3.0) (2026-05-01)


### Features

* **db:** migrate from Prisma to Drizzle ORM ([#214](https://github.com/itsDaiton/nebula-chat/issues/214)) ([c6c543a](https://github.com/itsDaiton/nebula-chat/commit/c6c543a9ea85c7742083ff37e58739d5f391c715))

## [1.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.1.0...nebula-chat-openapi-v1.2.0) (2026-04-25)


### Features

* **server:** migrate to fastify from express ([#196](https://github.com/itsDaiton/nebula-chat/issues/196)) ([9790324](https://github.com/itsDaiton/nebula-chat/commit/97903247f0c8c093cb2dc470ebb566a955182529))

## [1.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-openapi-v1.0.0...nebula-chat-openapi-v1.1.0) (2026-03-29)


### Features

* **backend:** add generate:openapi script ([#151](https://github.com/itsDaiton/nebula-chat/issues/151)) ([d525167](https://github.com/itsDaiton/nebula-chat/commit/d52516785ce575328616ad8fdf266c26dca13d99))


### Bug Fixes

* **frontend:** improve URL safety with URL API parser ([75e2e4d](https://github.com/itsDaiton/nebula-chat/commit/75e2e4d9e6dfe1170eaf9e0149896dd7e78b8c63))
