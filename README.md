# 🚀 PromptMeUp

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

단순한 프롬프트 실행기를 넘어, 프롬프트를 하나의 완전한 '함수 객체(PromptFunction)'로 취급하고, 다단계 파이프라인을 통해 지능적으로 프롬프트를 생성, 테스트, 실행하는 강력한 로컬 AI 개발 플랫폼입니다.

## ✨ 핵심 기능

* **프롬프트 빌더 엔진:** 사용자의 아이디어를 입력받아, 다단계 모듈 파이프라인을 통해 고품질의 구조화된 프롬프트를 자동으로 생성합니다.
* **하이브리드 AI 전략:** 작업의 종류에 따라 최적의 AI를 선택하여 실행합니다.
    * **로컬 AI (Ollama):** 구조 분석, 변환 등 빠르고 비용 없는 작업 수행
    * **외부 AI (OpenAI, Gemini):** 예시 생성 등 창의적이고 복잡한 작업 수행
* **로컬 임베딩 및 유사도 검색:** 외부 API 없이 로컬 환경에서 직접 프롬프트의 임베딩 벡터를 생성하고, 저장된 프롬프트 간의 의미적 유사도를 계산하여 검색할 수 있습니다.

## 🛠️ 기술 스택

* **Backend:** Node.js (ESM)
* **Infrastructure:** Vercel (Serverless Functions)
* **Database:** Vercel KV (Redis)
* **Local AI:** Ollama

## 🚀 시작하기

#### 1. 소스 코드 복제

```bash
git clone [https://github.com/your-username/promptmeup.git](https://github.com/your-username/promptmeup.git)
cd promptmeup
2. 의존성 설치
Bash

npm install
3. 환경 변수 설정
프로젝트 루트에 .env.development.local 파일을 생성하고 아래 내용을 채워주세요.

코드 스니펫

# Gemini API 키 (선택 사항)
GEMINI_API_KEY=

# OpenAI API 키 (선택 사항)
OPENAI_API_KEY=

# 로컬 Ollama 서버 IP 주소 (보통 127.0.0.1 또는 ipconfig로 확인한 주소)
OLLAMA_HOST=127.0.0.1
Vercel KV 토큰은 아래 명령어로 자동 설정할 수 있습니다.

Bash

vercel env pull .env.development.local
4. 로컬 AI(Ollama) 설정
Ollama를 사용하려면 Ollama 공식 홈페이지에서 프로그램을 설치한 후, 터미널에서 아래 명령어로 AI 모델을 다운로드 및 실행해야 합니다.

Bash

ollama run gemma:2b
5. 개발 서버 실행
Bash

vercel dev
서버가 실행되면 http://localhost:3000 주소로 API를 테스트할 수 있습니다.

💡 API 사용법
프롬프트 등록 (/api/prompts)
PowerShell

curl -X POST -H "Content-Type: application/json" -d '{"promptId":"local-hello","content":"안녕, 내 컴퓨터에서 일하는 로컬 AI! 자기소개 한 줄만 해줘.","versionTag":"v1.0.0","metadata":{"execution_mode":"local_llm","author":"architect"}}' http://localhost:3000/api/prompts
프롬프트 실행 (/api/run)
PowerShell

curl -X POST -H "Content-Type: application/json" -d '{"promptId":"local-hello","versionTag":"v1.0.0","user_input":{}}' http://localhost:3000/api/run
유사 프롬프트 검색 (/api/find-similar)
PowerShell

curl "http://localhost:3000/api/find-similar?promptId=local-hello&versionTag=v1.0.0"
⚙️ 주요 스크립트
임베딩 생성
새로운 프롬프트를 등록한 후, 아래 명령어를 실행하여 해당 프롬프트의 임베딩 벡터를 생성해야 합니다.

Bash

npm run generate-embeddings
프롬프트 빌더 테스트
prompt-modules.yaml에 정의된 워크플로우를 테스트합니다.

Bash

npm run test-orchestrator
📄 라이선스
본 프로젝트는 MIT 라이선스를 따릅니다.