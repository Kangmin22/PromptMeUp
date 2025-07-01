# 🚀 PromptMeUp 사용자 가이드

## 1. 최초 환경 설정 (Initial Setup)

이 프로젝트를 처음 사용하는 개발자는 아래 단계를 순서대로 따라야 합니다.

### 1단계: 소스 코드 복제 및 의존성 설치

Bash

```bash
git clone <repository_url>
cd promptmeup
npm install
```

### 2단계: 환경 변수 설정

프로젝트 루트에 `.env.development.local` 파일을 생성하고, 필요한 API 키와 로컬 호스트 주소를 입력합니다.

코드 스니펫

```bash
# Gemini API 키 (선택 사항, 예시 생성 등 창의적 작업에 필요)
GEMINI_API_KEY=YOUR_GEMINI_KEY

# OpenAI API 키 (선택 사항)
OPENAI_API_KEY=YOUR_OPENAI_KEY

# 로컬 Ollama 서버 IP 주소 (Ollama 설치 후 확인)
OLLAMA_HOST=127.0.0.1
```

Vercel에 프로젝트를 연결한 후, 아래 명령어로 Vercel KV와 Blob 토큰을 자동으로 가져올 수 있습니다.

Bash

```bash
vercel env pull .env.development.local
```

### 3단계: 로컬 AI(Ollama) 실행

[Ollama 공식 홈페이지](https://ollama.com/download)에서 프로그램을 설치한 후, 터미널에서 아래 명령어로 프로젝트에 사용할 AI 모델을 실행합니다.

Bash

```bash
ollama run gemma:2b-instruct-q4_0
```

### 4단계: 개발 서버 실행

모든 설정이 끝나면, 아래 명령어로 로컬 개발 서버를 실행합니다. **이 서버는 다른 명령어들을 테스트하는 동안 항상 켜져 있어야 합니다.**

Bash

```bash
vercel dev
```

---

## 2. 핵심 사용법 (Core Workflows)

우리 시스템을 사용하는 방법은 크게 두 가지입니다.

### 워크플로우 A: 기존 프롬프트 찾아 실행하기

### 1단계: 프롬프트 검색

자연어 검색으로 데이터베이스에서 원하는 프롬프트를 찾습니다.

Bash

```bash
# "맛집"과 관련된 프롬프트를 검색
npm run search "맛집 추천"
```

검색 결과로 출력된 `prompt:ID:version` 형식의 `key` 값을 확인합니다.

### 2단계: 프롬프트 재실행

검색으로 찾은 `promptId`를 사용해서 해당 프롬프트를 즉시 실행하고 결과를 확인합니다.

Bash

```bash
# 예: prompt:local-hello:v1.0.0 -> local-hello
npm run replay local-hello
```

---

### 워크플로우 B: 아이디어로 새로운 프롬프트 자동 생성하기

이것이 우리 프로젝트의 핵심 기능입니다.

### 1단계: 아이디어 정의

`scripts/test-orchestrator.js` 파일을 열고, `userInput` 변수의 값을 자신의 아이디어로 수정합니다.

JavaScript

```bash
// scripts/test-orchestrator.js
const userInput = "당신의 새로운 아이디어를 여기에 입력하세요.";
```

### 2단계: 빌더 엔진 실행

터미널에서 아래 명령어를 실행합니다.

Bash

```bash
npm run test-orchestrator
```

### 3단계: 결과 확인

명령어 실행이 완료되면, 터미널 로그를 통해 **자동으로 생성된 `generated-xxxx` ID**를 확인할 수 있습니다. 이 새로운 프롬프트는 즉시 시스템에 등록되고 임베딩까지 완료되어, 워크플로우 A의 `replay`나 `search` 명령어로 바로 사용할 수 있습니다.

---

## 3. 주요 명령어 목록 (CLI Command Reference)

| 명령어 | 설명 | 사용 예시 |
| --- | --- | --- |
| `vercel dev` | 로컬 개발 서버를 실행합니다. (항상 실행 유지 필요) | `vercel dev` |
| `npm run test-orchestrator` | 아이디어를 입력받아 프롬프트를 자동 생성/등록/임베딩합니다. | `npm run test-orchestrator` |
| `npm run generate-embeddings` | DB에 있는 프롬프트 중 임베딩이 없는 것을 찾아 일괄 생성합니다. | `npm run generate-embeddings` |
| `npm run replay [promptId]` | 특정 ID의 프롬프트를 재실행하고 결과를 로그 파일로 저장합니다. | `npm run replay local-hello` |
| `npm run search "[query]"` | 검색어와 의미적으로 가장 유사한 프롬프트를 DB에서 검색합니다. | `npm run search "맛집 챗봇"` |