# 🚀 PromptMeUp

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

단순한 프롬프트 실행기를 넘어, 프롬프트를 하나의 완전한 '함수 객체(PromptFunction)'로 취급하고, 다단계 파이프라인을 통해 지능적으로 프롬프트를 생성, 테스트, 실행 및 관리하는 강력한 로컬 AI 개발 플랫폼입니다.

## ✨ 핵심 기능

* **지능형 프롬프트 빌더 엔진:** 사용자의 아이디어를 입력받아, 다단계 모듈 파이프라인을 거쳐 고품질의 구조화된 프롬프트를 자동으로 생성합니다.
* **하이브리드 AI 전략:** 작업의 성격에 따라 로컬 AI(Ollama)와 외부 AI(Gemini)를 자동으로 선택하여 최적의 결과물을 도출합니다.
* **완전 자동화 파이프라인:** 생성된 프롬프트는 즉시 시스템에 자동으로 등록되고, 검색을 위한 임베딩 벡터까지 완료됩니다.
* **상태 저장 에이전트 런타임:** 생성된 프롬프트를 '두뇌'로 삼아, 대화의 맥락을 기억하고 지속적으로 상호작용하는 AI 에이전트를 실행합니다.
* **개발자용 편의 도구 (CLI):** `replay`, `search` 등 터미널 명령어로 시스템의 핵심 기능을 쉽게 사용하고 관리할 수 있습니다.

## 🛠️ 기술 스택

* **Backend:** Node.js (ESM)
* **Infrastructure:** Vercel (Serverless Functions)
* **Database:** Vercel KV (Redis)
* **Local AI:** Ollama

## 🚀 시작하기

자세한 설치 및 사용법은 `USAGE_GUIDE.md` 파일을 참고해주세요.

## ⚙️ 주요 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run test-orchestrator` | 아이디어를 입력받아 프롬프트를 자동 생성/등록/임베딩합니다. |
| `npm run generate-embeddings` | DB에 있는 프롬프트 중 임베딩이 없는 것을 찾아 일괄 생성합니다. |
| `npm run replay [promptId]` | 특정 ID의 프롬프트를 재실행하고 결과를 로그 파일로 저장합니다. |
| `npm run search "[query]"` | 검색어와 의미적으로 가장 유사한 프롬프트를 DB에서 검색합니다. |

## 📄 라이선스

본 프로젝트는 MIT 라이선스를 따릅니다.