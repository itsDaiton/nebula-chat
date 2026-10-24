# Changelog

## [3.0.2](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v3.0.1...nebula-chat-auth-v3.0.2) (2026-10-24)


### Bug Fixes

* **agents:** slim agent docs, drop home-grown skills, trim heavy comments ([#627](https://github.com/itsDaiton/nebula-chat/issues/627)) ([acf7b7c](https://github.com/itsDaiton/nebula-chat/commit/acf7b7cb6c96b0103eb27382a77043d4133a615c))

## [3.0.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v3.0.0...nebula-chat-auth-v3.0.1) (2026-10-23)


### Bug Fixes

* **server:** NEB-609 delete the stored Profile image when an account is deleted ([#616](https://github.com/itsDaiton/nebula-chat/issues/616)) ([cd1eeda](https://github.com/itsDaiton/nebula-chat/commit/cd1eeda0d084c7463f96cfab4ebc9062a99863c2))

## [3.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v2.5.0...nebula-chat-auth-v3.0.0) (2026-10-19)


### ⚠ BREAKING CHANGES

* the domain Conversation is now a Session ([#588](https://github.com/itsDaiton/nebula-chat/issues/588)). @nebula-chat/auth exports `claimSessions` and `ClaimSessionsParams` in place of `claimConversations` and `ClaimConversationsParams`. The OpenAPI contract serves `/api/sessions*` in place of `/api/conversations*`, with `Session`/`SessionPage` schemas and `sessionId` in place of `conversationId`.

### Features

* NEB-352 release the Session rename as breaking for auth and openapi ([#590](https://github.com/itsDaiton/nebula-chat/issues/590)) ([bc85d0f](https://github.com/itsDaiton/nebula-chat/commit/bc85d0f5c2fa2d800d87904b393d008bfc3c0175))

## [2.5.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v2.4.1...nebula-chat-auth-v2.5.0) (2026-10-19)


### Features

* **sessions:** NEB-352 rename Conversation to Session end to end ([#588](https://github.com/itsDaiton/nebula-chat/issues/588)) ([4d8e9c5](https://github.com/itsDaiton/nebula-chat/commit/4d8e9c58949d573ba641f476095f920645fdec74))

## [2.4.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v2.4.0...nebula-chat-auth-v2.4.1) (2026-10-18)


### Bug Fixes

* **auth:** rate-limit per client IP from CF-Connecting-IP ([#574](https://github.com/itsDaiton/nebula-chat/issues/574)) ([cc67f75](https://github.com/itsDaiton/nebula-chat/commit/cc67f75da9eb86cbfe11dfdab88c624fda430307))

## [2.4.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v2.3.0...nebula-chat-auth-v2.4.0) (2026-10-11)


### Features

* **auth:** NEB-471 NEB-472 NEB-473 Profile images ([#502](https://github.com/itsDaiton/nebula-chat/issues/502)) ([f6c1da5](https://github.com/itsDaiton/nebula-chat/commit/f6c1da596344946fd4c3cb5f93db38ac3df23046))

## [2.3.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v2.2.1...nebula-chat-auth-v2.3.0) (2026-10-10)


### Features

* **auth:** NEB-460 password change from a new Settings area ([#492](https://github.com/itsDaiton/nebula-chat/issues/492)) ([22b57ed](https://github.com/itsDaiton/nebula-chat/commit/22b57ed38737d9af2540c5ebb37cdd37a40dcc75))

## [2.2.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v2.2.0...nebula-chat-auth-v2.2.1) (2026-10-09)


### Bug Fixes

* **auth:** NEB-469 replace deprecated @react-email/components with react-email ([#480](https://github.com/itsDaiton/nebula-chat/issues/480)) ([a9b99f3](https://github.com/itsDaiton/nebula-chat/commit/a9b99f3a15804aa613918b081b433872228e5b52))

## [2.2.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v2.1.0...nebula-chat-auth-v2.2.0) (2026-10-06)


### Features

* **auth:** NEB-342 add Google and GitHub social sign-in ([#475](https://github.com/itsDaiton/nebula-chat/issues/475)) ([de3bdd8](https://github.com/itsDaiton/nebula-chat/commit/de3bdd8d2a01730b76ad51ab3e4a874439af9c36))

## [2.1.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v2.0.1...nebula-chat-auth-v2.1.0) (2026-10-04)


### Features

* **auth:** NEB-341 add email verification and password reset via Resend ([#445](https://github.com/itsDaiton/nebula-chat/issues/445)) ([2314bb8](https://github.com/itsDaiton/nebula-chat/commit/2314bb881fd672457e65a7ebf56e780d6a91e7e8))

## [2.0.1](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v2.0.0...nebula-chat-auth-v2.0.1) (2026-09-28)


### Bug Fixes

* **deps:** NEB-398 migrate lib builds from tsup to tsdown ([#399](https://github.com/itsDaiton/nebula-chat/issues/399)) ([678284f](https://github.com/itsDaiton/nebula-chat/commit/678284fd43a580450dda1586802bd27eac1c06c0))

## [2.0.0](https://github.com/itsDaiton/nebula-chat/compare/nebula-chat-auth-v1.0.0...nebula-chat-auth-v2.0.0) (2026-09-25)


### ⚠ BREAKING CHANGES

* **otel:** NEB-369 structured logging conventions across server and libs ([#372](https://github.com/itsDaiton/nebula-chat/issues/372))

### Features

* **otel:** NEB-369 structured logging conventions across server and libs ([#372](https://github.com/itsDaiton/nebula-chat/issues/372)) ([d276ddf](https://github.com/itsDaiton/nebula-chat/commit/d276ddf6711db0ff715efe2c2f3afe67275a3a32))

## 1.0.0 (2026-09-22)


### Features

* **auth:** add @nebula-chat/auth better-auth substrate (M-6) ([#322](https://github.com/itsDaiton/nebula-chat/issues/322)) ([a4ba239](https://github.com/itsDaiton/nebula-chat/commit/a4ba2392f879b97966a92978288cd64d1dc55b8d))


### Bug Fixes

* **frontend:** improve URL safety with URL API parser ([75e2e4d](https://github.com/itsDaiton/nebula-chat/commit/75e2e4d9e6dfe1170eaf9e0149896dd7e78b8c63))
