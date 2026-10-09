# Changelog

## [2.5.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.5.1...nebula-chat-server-v2.5.2) (2026-10-09)


### Bug Fixes

* **server:** NEB-447 redact the password-reset token from request logs ([#483](https://github.com/itsDaiton/nebula-chat/issues/483)) ([fd85730](https://github.com/itsDaiton/nebula-chat/commit/fd85730290bee58b8ee512aedf23c1b78a5bcaa1))

## [2.5.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.5.0...nebula-chat-server-v2.5.1) (2026-10-06)


### Bug Fixes

* **server:** exit promptly on shutdown so dev reloads are not stalled ([#478](https://github.com/itsDaiton/nebula-chat/issues/478)) ([520c0a7](https://github.com/itsDaiton/nebula-chat/commit/520c0a7d6954e934e4cfc5532ce03c25fbe5344b))

## [2.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.4.4...nebula-chat-server-v2.5.0) (2026-10-06)


### Features

* **auth:** NEB-342 add Google and GitHub social sign-in ([#475](https://github.com/itsDaiton/nebula-chat/issues/475)) ([de3bdd8](https://github.com/itsDaiton/nebula-chat/commit/de3bdd8d2a01730b76ad51ab3e4a874439af9c36))

## [2.4.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.4.3...nebula-chat-server-v2.4.4) (2026-10-05)


### Bug Fixes

* **docs:** add Metered user to the glossary and tighten Message allowance ([#456](https://github.com/itsDaiton/nebula-chat/issues/456)) ([7356d75](https://github.com/itsDaiton/nebula-chat/commit/7356d75e10f34e0a135ac2091d8b7408aa9b4848))

## [2.4.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.4.2...nebula-chat-server-v2.4.3) (2026-10-05)


### Bug Fixes

* **dev:** drop password segment from example DB URLs for secretlint ([#457](https://github.com/itsDaiton/nebula-chat/issues/457)) ([2c398f4](https://github.com/itsDaiton/nebula-chat/commit/2c398f457a7001566418326fccb54b56be3d245b))

## [2.4.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.4.1...nebula-chat-server-v2.4.2) (2026-10-05)


### Bug Fixes

* **dev:** move docker-compose.yml to the repo root ([#451](https://github.com/itsDaiton/nebula-chat/issues/451)) ([e50a462](https://github.com/itsDaiton/nebula-chat/commit/e50a46230f9795908782ae59c6d31bc43d0b90e6))

## [2.4.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.4.0...nebula-chat-server-v2.4.1) (2026-10-04)


### Bug Fixes

* point the API at api.nebula-chat.cz and document the same-site cookie rule ([#449](https://github.com/itsDaiton/nebula-chat/issues/449)) ([17af975](https://github.com/itsDaiton/nebula-chat/commit/17af975c468e6c85bf4ccf173f413b2d6bd0edbc))

## [2.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.3.7...nebula-chat-server-v2.4.0) (2026-10-04)


### Features

* **auth:** NEB-341 add email verification and password reset via Resend ([#445](https://github.com/itsDaiton/nebula-chat/issues/445)) ([2314bb8](https://github.com/itsDaiton/nebula-chat/commit/2314bb881fd672457e65a7ebf56e780d6a91e7e8))

## [2.3.7](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.3.6...nebula-chat-server-v2.3.7) (2026-10-04)


### Bug Fixes

* **server:** grant redis DAC_OVERRIDE so the entrypoint can traverse appendonlydir ([#442](https://github.com/itsDaiton/nebula-chat/issues/442)) ([df5d437](https://github.com/itsDaiton/nebula-chat/commit/df5d43703b3ed5dcfa01531a19d3595e6871d7d1))

## [2.3.6](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.3.5...nebula-chat-server-v2.3.6) (2026-10-03)


### Bug Fixes

* move zod to the pnpm catalog ([#439](https://github.com/itsDaiton/nebula-chat/issues/439)) ([7ce238d](https://github.com/itsDaiton/nebula-chat/commit/7ce238d413bd2097adff9af911dbb997de87f9eb))

## [2.3.5](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.3.4...nebula-chat-server-v2.3.5) (2026-10-03)


### Bug Fixes

* **server:** validate CLIENT_URL and SERVER_URL as http(s) origins ([#436](https://github.com/itsDaiton/nebula-chat/issues/436)) ([c81a461](https://github.com/itsDaiton/nebula-chat/commit/c81a4617ec2cb44ae84f725c5bd7c6a9a8de0eaa))

## [2.3.4](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.3.3...nebula-chat-server-v2.3.4) (2026-10-03)


### Bug Fixes

* **server:** keep the capabilities postgres and redis need to start ([#433](https://github.com/itsDaiton/nebula-chat/issues/433)) ([e7974e8](https://github.com/itsDaiton/nebula-chat/commit/e7974e89a4cb7c367a24a450fb5d81e04b6c1ee2))
* **server:** treat an empty OPERATOR_TOKEN as unset ([#432](https://github.com/itsDaiton/nebula-chat/issues/432)) ([6d480d4](https://github.com/itsDaiton/nebula-chat/commit/6d480d4eb0767bb1a99a629fa1a14024933ed2bc))

## [2.3.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.3.2...nebula-chat-server-v2.3.3) (2026-10-02)


### Bug Fixes

* **server:** NEB-415 add CORS headers to /api/auth/* responses ([#424](https://github.com/itsDaiton/nebula-chat/issues/424)) ([3a6aef8](https://github.com/itsDaiton/nebula-chat/commit/3a6aef868d8f4adff6ee0f8a7ed1a60619916bb8))
* **server:** NEB-423 forward @fastify/cors headers onto the chat stream ([#425](https://github.com/itsDaiton/nebula-chat/issues/425)) ([fe75351](https://github.com/itsDaiton/nebula-chat/commit/fe753515f13b242238c0d8d67a29aeb415ae1275))

## [2.3.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.3.1...nebula-chat-server-v2.3.2) (2026-10-02)


### Bug Fixes

* **redis:** open the connection before the first authStore command ([#410](https://github.com/itsDaiton/nebula-chat/issues/410)) ([c5366dc](https://github.com/itsDaiton/nebula-chat/commit/c5366dcc54ec62c84fe7d3813b25daa36340e704))
* **server:** tighten the auth catch-all failure comments and status ([#418](https://github.com/itsDaiton/nebula-chat/issues/418)) ([b7d15bd](https://github.com/itsDaiton/nebula-chat/commit/b7d15bd8a8a53c94776e1da1d874869a9d887c7d))

## [2.3.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.3.0...nebula-chat-server-v2.3.1) (2026-10-02)


### Bug Fixes

* **server:** answer the auth catch-all with a 500 when better-auth throws ([#414](https://github.com/itsDaiton/nebula-chat/issues/414)) ([e34721a](https://github.com/itsDaiton/nebula-chat/commit/e34721af33f67ae21f594e824e506e77f4f46367))

## [2.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.2.3...nebula-chat-server-v2.3.0) (2026-10-02)


### Features

* **otel:** NEB-370 change log levels at runtime without a restart ([#408](https://github.com/itsDaiton/nebula-chat/issues/408)) ([399cee0](https://github.com/itsDaiton/nebula-chat/commit/399cee03a0992cbd64bef6ace59fda931bd5f00b))

## [2.2.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.2.2...nebula-chat-server-v2.2.3) (2026-10-02)


### Bug Fixes

* **deps:** bump fastify, grpc-js, brace-expansion, fast-uri for CVEs ([#409](https://github.com/itsDaiton/nebula-chat/issues/409)) ([ef619c0](https://github.com/itsDaiton/nebula-chat/commit/ef619c03ee268b16b04d0c884ffe363e4991db03))

## [2.2.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.2.1...nebula-chat-server-v2.2.2) (2026-09-29)


### Bug Fixes

* **ci:** NEB-404 make pnpm knip pass and keep it green ([#406](https://github.com/itsDaiton/nebula-chat/issues/406)) ([052f360](https://github.com/itsDaiton/nebula-chat/commit/052f360423092be0e66bd108739bf1484de47edd))

## [2.2.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.2.0...nebula-chat-server-v2.2.1) (2026-09-29)


### Bug Fixes

* **server:** NEB-388 load env files with dotenvx in package scripts ([#403](https://github.com/itsDaiton/nebula-chat/issues/403)) ([23792d3](https://github.com/itsDaiton/nebula-chat/commit/23792d342af65a151c9e30d26462c3efe237ec5a))

## [2.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.1.2...nebula-chat-server-v2.2.0) (2026-09-29)


### Features

* **server:** NEB-385 switch OpenAPI generation to fastify-zod-openapi with named response schemas ([#401](https://github.com/itsDaiton/nebula-chat/issues/401)) ([f63d4fa](https://github.com/itsDaiton/nebula-chat/commit/f63d4fa7506af733c1cc6c138e13f538f6d40e53))

## [2.1.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.1.1...nebula-chat-server-v2.1.2) (2026-09-28)


### Bug Fixes

* **server:** NEB-391 drop TS 6 deprecated tsconfig options ([#396](https://github.com/itsDaiton/nebula-chat/issues/396)) ([01f9b9c](https://github.com/itsDaiton/nebula-chat/commit/01f9b9c145c248ba9f6b677a835b0ca971a8b7a2))

## [2.1.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.1.0...nebula-chat-server-v2.1.1) (2026-09-27)


### Bug Fixes

* **server:** honour OPENAPI_* env stand-ins in generate:openapi ([#383](https://github.com/itsDaiton/nebula-chat/issues/383)) ([d5ffcae](https://github.com/itsDaiton/nebula-chat/commit/d5ffcae27d796655529207fe01a8e5c4a0984876))

## [2.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v2.0.0...nebula-chat-server-v2.1.0) (2026-09-27)


### Features

* **server:** NEB-377 list one conversation's messages via GET /api/messages?conversationId ([#381](https://github.com/itsDaiton/nebula-chat/issues/381)) ([189091b](https://github.com/itsDaiton/nebula-chat/commit/189091b6cb513a23fafd99c70ac92114b6b1a305))

## [2.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.13.2...nebula-chat-server-v2.0.0) (2026-09-25)


### ⚠ BREAKING CHANGES

* **otel:** NEB-369 structured logging conventions across server and libs ([#372](https://github.com/itsDaiton/nebula-chat/issues/372))

### Features

* **otel:** NEB-369 structured logging conventions across server and libs ([#372](https://github.com/itsDaiton/nebula-chat/issues/372)) ([d276ddf](https://github.com/itsDaiton/nebula-chat/commit/d276ddf6711db0ff715efe2c2f3afe67275a3a32))

## [1.13.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.13.1...nebula-chat-server-v1.13.2) (2026-09-24)


### Bug Fixes

* **errors:** NEB-323 shared error library and unified error envelope across both apps ([#364](https://github.com/itsDaiton/nebula-chat/issues/364)) ([dcca70b](https://github.com/itsDaiton/nebula-chat/commit/dcca70b450381c2918708937aa24557dfd393a88))

## [1.13.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.13.0...nebula-chat-server-v1.13.1) (2026-09-22)


### Bug Fixes

* **workspace:** retire new-backend migration and custom agents; adopt GitHub Issues tickets ([#329](https://github.com/itsDaiton/nebula-chat/issues/329)) ([96cb556](https://github.com/itsDaiton/nebula-chat/commit/96cb5563ee2675dbe33e10d4f97d0d00bec5569c))

## [1.13.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.12.1...nebula-chat-server-v1.13.0) (2026-09-22)


### Features

* **auth:** add @nebula-chat/auth better-auth substrate (M-6) ([#322](https://github.com/itsDaiton/nebula-chat/issues/322)) ([a4ba239](https://github.com/itsDaiton/nebula-chat/commit/a4ba2392f879b97966a92978288cd64d1dc55b8d))

## [1.12.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.12.0...nebula-chat-server-v1.12.1) (2026-09-19)


### Bug Fixes

* **openapi:** resolve Checkov CKV_OPENAPI_4/5/21 failures ([#319](https://github.com/itsDaiton/nebula-chat/issues/319)) ([6de7935](https://github.com/itsDaiton/nebula-chat/commit/6de79358062a5c22135a8586a9b6349b3d7003fa))

## [1.12.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.11.0...nebula-chat-server-v1.12.0) (2026-09-18)


### Features

* **redis:** add @nebula-chat/redis lib ([#312](https://github.com/itsDaiton/nebula-chat/issues/312)) ([3c6f77f](https://github.com/itsDaiton/nebula-chat/commit/3c6f77ff7a197a879c794029407671ca45d475ae))

## [1.11.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.10.0...nebula-chat-server-v1.11.0) (2026-09-16)


### Features

* **test:** add Vitest unit testing across server, client and libs ([#305](https://github.com/itsDaiton/nebula-chat/issues/305)) ([e8c09ee](https://github.com/itsDaiton/nebula-chat/commit/e8c09eec1385c11ab1d6744ae7a75b79713b47fd))

## [1.10.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.9.2...nebula-chat-server-v1.10.0) (2026-09-14)


### Features

* **otel:** add @nebula-chat/otel logger factory and OTel tracing ([#299](https://github.com/itsDaiton/nebula-chat/issues/299)) ([357fec3](https://github.com/itsDaiton/nebula-chat/commit/357fec3de84a2f1328af647268e83c58fe2d26c9))

## [1.9.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.9.1...nebula-chat-server-v1.9.2) (2026-09-13)


### Bug Fixes

* **server:** clear four dependency security advisories ([#300](https://github.com/itsDaiton/nebula-chat/issues/300)) ([4600a63](https://github.com/itsDaiton/nebula-chat/commit/4600a63a62cb3abfc4546004a58b2e3afa37b408))

## [1.9.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.9.0...nebula-chat-server-v1.9.1) (2026-09-12)


### Bug Fixes

* **server,client:** correct stale README docs in both apps ([#291](https://github.com/itsDaiton/nebula-chat/issues/291)) ([f3423d6](https://github.com/itsDaiton/nebula-chat/commit/f3423d63f6e89c43b44b6ae02fc0e42d823bb668))

## [1.9.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.8.2...nebula-chat-server-v1.9.0) (2026-09-12)


### Features

* **agents:** overhaul the agentic workspace ([#284](https://github.com/itsDaiton/nebula-chat/issues/284)) ([c3c95c8](https://github.com/itsDaiton/nebula-chat/commit/c3c95c8bee4e936d43732ffc34b9a6c836661334))

## [1.8.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.8.1...nebula-chat-server-v1.8.2) (2026-05-03)


### Bug Fixes

* **ci:** migrate monorepo builds to Turborepo ([#239](https://github.com/itsDaiton/nebula-chat/issues/239)) ([1a03d6f](https://github.com/itsDaiton/nebula-chat/commit/1a03d6fdbdb4c003abffa502cb3abe15802173cb))

## [1.8.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.8.0...nebula-chat-server-v1.8.1) (2026-05-03)


### Bug Fixes

* bump deps ([#236](https://github.com/itsDaiton/nebula-chat/issues/236)) ([7a3c49d](https://github.com/itsDaiton/nebula-chat/commit/7a3c49d9af36556bd1f427ec68df07c48573cfee))

## [1.8.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.7.1...nebula-chat-server-v1.8.0) (2026-05-03)


### Features

* **langchain:** implement @nebula-chat/langchain lib and wire into server ([#229](https://github.com/itsDaiton/nebula-chat/issues/229)) ([c883085](https://github.com/itsDaiton/nebula-chat/commit/c883085c3fcf21cbcbe7e42feef1a03c9347e002))

## [1.7.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.7.0...nebula-chat-server-v1.7.1) (2026-05-01)


### Bug Fixes

* update build script to include database ([#219](https://github.com/itsDaiton/nebula-chat/issues/219)) ([fd25b51](https://github.com/itsDaiton/nebula-chat/commit/fd25b51cd568e8653c37eb751d9b59f2394e5814))

## [1.7.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.6.1...nebula-chat-server-v1.7.0) (2026-05-01)


### Features

* **db:** migrate from Prisma to Drizzle ORM ([#214](https://github.com/itsDaiton/nebula-chat/issues/214)) ([c6c543a](https://github.com/itsDaiton/nebula-chat/commit/c6c543a9ea85c7742083ff37e58739d5f391c715))

## [1.6.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.6.0...nebula-chat-server-v1.6.1) (2026-04-26)


### Bug Fixes

* **render:** add configuration for render deploy ([#210](https://github.com/itsDaiton/nebula-chat/issues/210)) ([f239885](https://github.com/itsDaiton/nebula-chat/commit/f239885417fb8cbd6487e463667d3dae5abeee2a))

## [1.6.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.5.0...nebula-chat-server-v1.6.0) (2026-04-25)


### Features

* **server:** migrate to fastify from express ([#196](https://github.com/itsDaiton/nebula-chat/issues/196)) ([9790324](https://github.com/itsDaiton/nebula-chat/commit/97903247f0c8c093cb2dc470ebb566a955182529))

## [1.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.4.3...nebula-chat-server-v1.5.0) (2026-03-29)


### Features

* **backend:** add generate:openapi script ([#151](https://github.com/itsDaiton/nebula-chat/issues/151)) ([d525167](https://github.com/itsDaiton/nebula-chat/commit/d52516785ce575328616ad8fdf266c26dca13d99))

## [1.4.3](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.4.2...nebula-chat-server-v1.4.3) (2026-03-22)


### Bug Fixes

* knip code cleanup ([#129](https://github.com/itsDaiton/nebula-chat/issues/129)) ([e8f3a8a](https://github.com/itsDaiton/nebula-chat/commit/e8f3a8a5fecb69242ce107eea4cdfa9ba765fd55))

## [1.4.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.4.1...nebula-chat-server-v1.4.2) (2026-03-22)


### Bug Fixes

* **server:** backend code cleanup ([#123](https://github.com/itsDaiton/nebula-chat/issues/123)) ([f4a47fc](https://github.com/itsDaiton/nebula-chat/commit/f4a47fce73e7be496cd51f37cfb79851faf07b70))

## [1.4.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.4.0...nebula-chat-server-v1.4.1) (2026-03-21)


### Bug Fixes

* **backend:** harden Express trust proxy config for IP rate limiting ([#112](https://github.com/itsDaiton/nebula-chat/issues/112)) ([fc9f015](https://github.com/itsDaiton/nebula-chat/commit/fc9f01510ab33c45636448a55f0e0e422c630dce))

## [1.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.3.2...nebula-chat-server-v1.4.0) (2026-03-21)


### Features

* **client:** add zustand state management ([#110](https://github.com/itsDaiton/nebula-chat/issues/110)) ([5e708bc](https://github.com/itsDaiton/nebula-chat/commit/5e708bc3e50d97791808b2f1b8325e6fb0e17597))

## [1.3.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.3.1...nebula-chat-server-v1.3.2) (2026-03-15)


### Bug Fixes

* **server:** enable trust proxy setting for express app ([#107](https://github.com/itsDaiton/nebula-chat/issues/107)) ([0ce6bce](https://github.com/itsDaiton/nebula-chat/commit/0ce6bce7002bb9e06830477b9cc54e48efc367bf))

## [1.3.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.3.0...nebula-chat-server-v1.3.1) (2026-03-15)


### Bug Fixes

* **frontend:** improve URL safety with URL API parser ([75e2e4d](https://github.com/itsDaiton/nebula-chat/commit/75e2e4d9e6dfe1170eaf9e0149896dd7e78b8c63))

## [1.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.2.1...nebula-chat-server-v1.3.0) (2026-03-14)


### Features

* **ci:** add sonar and fix issues ([#101](https://github.com/itsDaiton/nebula-chat/issues/101)) ([5e138b4](https://github.com/itsDaiton/nebula-chat/commit/5e138b4bf06b16681e6caf163e02e0a0c1fcf7b3))

## [1.2.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.2.0...nebula-chat-server-v1.2.1) (2026-03-14)


### Bug Fixes

* prisma config pipeline error ([#90](https://github.com/itsDaiton/nebula-chat/issues/90)) ([c2895a7](https://github.com/itsDaiton/nebula-chat/commit/c2895a712a2fd2255b8e63df33da015441faa473))

## [1.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.1.0...nebula-chat-server-v1.2.0) (2026-03-14)


### Features

* add MegaLinter ([#84](https://github.com/itsDaiton/nebula-chat/issues/84)) ([8d51698](https://github.com/itsDaiton/nebula-chat/commit/8d51698dca699812068b05ee1e915c74edd8bfed))

## [1.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-server-v1.0.0...nebula-chat-server-v1.1.0) (2026-03-14)


### Features

* add release please pipeline ([#78](https://github.com/itsDaiton/nebula-chat/issues/78)) ([dff2b7d](https://github.com/itsDaiton/nebula-chat/commit/dff2b7d43384c4f8659d0a4c98bd0fe4c9fb9121))
* add sample server folder ([e685d83](https://github.com/itsDaiton/nebula-chat/commit/e685d834a5ca4503bd1a6673a98dbbc045b8c419))
* **cache:** add prompt caching and rate limiting ([#19](https://github.com/itsDaiton/nebula-chat/issues/19)) ([5fcd9ae](https://github.com/itsDaiton/nebula-chat/commit/5fcd9aeac7955154ba0a9a91b0e26a4b224c2523))
* **chat:** add OpenAI model endpoint ([#2](https://github.com/itsDaiton/nebula-chat/issues/2)) ([019ba7a](https://github.com/itsDaiton/nebula-chat/commit/019ba7a2233d21a5329e91278d74edc711a1990f))
* **chat:** add streaming and chat history ([#3](https://github.com/itsDaiton/nebula-chat/issues/3)) ([81c812a](https://github.com/itsDaiton/nebula-chat/commit/81c812a103ca803070c85ed218f70f7d5aa02e25))
* **chat:** add token usage info ([#4](https://github.com/itsDaiton/nebula-chat/issues/4)) ([cc922fe](https://github.com/itsDaiton/nebula-chat/commit/cc922fe537652e5ea0f9c6579714a71ec1d518ea))
* **chat:** implement cursor-based pagination for conversations ([#35](https://github.com/itsDaiton/nebula-chat/issues/35)) ([287c3ae](https://github.com/itsDaiton/nebula-chat/commit/287c3ae05f656644bfcdfbcd4407e680d0b82cdb))
* **chat:** update chat backend capabilities ([#30](https://github.com/itsDaiton/nebula-chat/issues/30)) ([b45688a](https://github.com/itsDaiton/nebula-chat/commit/b45688a841eed26e0684f2a0522a7ddd63bc83f5))
* **ci:** add prisma validation to workflow ([#9](https://github.com/itsDaiton/nebula-chat/issues/9)) ([c8c1980](https://github.com/itsDaiton/nebula-chat/commit/c8c19802cdb6fe3d844bae48b52ab8a206195fed))
* **conversation:** add pagination config for api fetch ([#39](https://github.com/itsDaiton/nebula-chat/issues/39)) ([d810408](https://github.com/itsDaiton/nebula-chat/commit/d8104082db58dc4addb5e8fc13a74683768d88fc))
* **database:** add database layer for conversations ([#7](https://github.com/itsDaiton/nebula-chat/issues/7)) ([a475640](https://github.com/itsDaiton/nebula-chat/commit/a4756401959e8d4c86d7622fddff02b0863fa598))
* **docker:** add local redis service ([#27](https://github.com/itsDaiton/nebula-chat/issues/27)) ([34e1536](https://github.com/itsDaiton/nebula-chat/commit/34e1536164297490d0f99b1814b3994286e7dd8d))
* **errors:** implement custom error class ([#26](https://github.com/itsDaiton/nebula-chat/issues/26)) ([c1b312d](https://github.com/itsDaiton/nebula-chat/commit/c1b312d7ddc8537fffcd1143ff30fb916fe6e284))
* **openapi:** add openAPI docs ([#29](https://github.com/itsDaiton/nebula-chat/issues/29)) ([eb78b6a](https://github.com/itsDaiton/nebula-chat/commit/eb78b6a51ad93db45bb13c6c5935992848cd8485))


### Bug Fixes

* add node types ([2f5bd43](https://github.com/itsDaiton/nebula-chat/commit/2f5bd43241c497652c6d3f494e90bdf1b466bf90))
* adjust Prisma config for environment variable handling ([#79](https://github.com/itsDaiton/nebula-chat/issues/79)) ([a722611](https://github.com/itsDaiton/nebula-chat/commit/a72261142159d3caf96cacccc17068d81ed28ee3))
* **backend:** correct path to server file in start script ([#24](https://github.com/itsDaiton/nebula-chat/issues/24)) ([637c800](https://github.com/itsDaiton/nebula-chat/commit/637c800c17de12f8cc4dbdc59f5812a589baac2e))
* **backend:** edit production scripts ([#23](https://github.com/itsDaiton/nebula-chat/issues/23)) ([823d88b](https://github.com/itsDaiton/nebula-chat/commit/823d88b715fcad54d4821537f994552f776e7dad))
* **build:** update build script to resolve production backend issue ([#6](https://github.com/itsDaiton/nebula-chat/issues/6)) ([4a1b49f](https://github.com/itsDaiton/nebula-chat/commit/4a1b49f75861d5ba8e6a4dcd61fedfca58f607bc))
* **chat:** stream chat bugfixing cleanup ([#33](https://github.com/itsDaiton/nebula-chat/issues/33)) ([94edbc8](https://github.com/itsDaiton/nebula-chat/commit/94edbc85ad3d18e75eb171a6632d080fc601419f))
* correct server setup ([14fd52c](https://github.com/itsDaiton/nebula-chat/commit/14fd52c50a6420f6407c53afa23d9fd97c218154))
* **cors:** resolve CORS issues ([#31](https://github.com/itsDaiton/nebula-chat/issues/31)) ([00d6702](https://github.com/itsDaiton/nebula-chat/commit/00d6702848ecd6625a7e6d88ed3e919f7d5f6022))
* **database:** resolve broken ts-config and prisma errors ([#8](https://github.com/itsDaiton/nebula-chat/issues/8)) ([7d6f280](https://github.com/itsDaiton/nebula-chat/commit/7d6f280bbc58a6899aa07322e568ee8eaf20f02b))
* **frontend:** FE bugfixing + rate limiting ([#45](https://github.com/itsDaiton/nebula-chat/issues/45)) ([469a1a9](https://github.com/itsDaiton/nebula-chat/commit/469a1a98b98aadceee4af4e33e473189daa1b351))
* **migrations:** update migration scripts and schema ([#11](https://github.com/itsDaiton/nebula-chat/issues/11)) ([b86e090](https://github.com/itsDaiton/nebula-chat/commit/b86e090f2cec740797af7b8d5b9907b29cdd6fd2))
* **prisma:** update client provider to use prisma-client-js ([#10](https://github.com/itsDaiton/nebula-chat/issues/10)) ([773096c](https://github.com/itsDaiton/nebula-chat/commit/773096c29ebf81c6799534a51bcfde33dad98998))
* **prompt:** move system prompt to TS file ([#32](https://github.com/itsDaiton/nebula-chat/issues/32)) ([9996d21](https://github.com/itsDaiton/nebula-chat/commit/9996d211c9db829079a4cc49638299e107015d8b))
* **services:** update object destructuring in api ([#12](https://github.com/itsDaiton/nebula-chat/issues/12)) ([7ec6773](https://github.com/itsDaiton/nebula-chat/commit/7ec677384bfc59161a822325ea6e523d29dbf852))
* update start script to use server.ts and set PORT from environment variable ([f4aae96](https://github.com/itsDaiton/nebula-chat/commit/f4aae96df479616caf87b048f40359e2ea213239))
