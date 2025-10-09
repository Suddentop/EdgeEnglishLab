# 📚 dothome.co.kr 백엔드 서버 배포 문서

## 📋 문서 개요

이 폴더는 dothome.co.kr에서 EngQuiz 프로젝트를 위한 PHP 백엔드 서버를 구축하고 운영하는 데 필요한 모든 문서를 포함합니다.

## 📁 문서 구조

### 🚀 [메인 배포 가이드](./dothome_백엔드_서버_배포_가이드.md)
- **목적**: 전체 배포 과정을 단계별로 안내
- **내용**: 
  - 시스템 아키텍처 설명
  - 필요한 파일 목록
  - 단계별 배포 과정
  - React 앱 설정 방법
  - 성능 최적화 방법
- **대상**: 시스템 관리자, 개발자

### 🛠️ [문제 해결 가이드](./문제_해결_가이드.md)
- **목적**: 운영 중 발생할 수 있는 문제들의 해결 방법 제공
- **내용**:
  - 긴급 문제 해결 방법
  - 일반적인 오류 해결
  - 고급 문제 해결 기법
  - 성능 최적화 방법
  - 보안 강화 방법
- **대상**: 시스템 관리자, 기술 지원 담당자

### 🔒 [보안 설정 가이드](./보안_설정_가이드.md)
- **목적**: 백엔드 서버의 보안을 강화하고 API Key를 안전하게 보호
- **내용**:
  - API Key 보안 전략
  - CORS 보안 정책
  - 입력 검증 및 필터링
  - 요청 제한 및 Rate Limiting
  - 로깅 및 모니터링
  - 추가 보안 강화 방법
- **대상**: 보안 담당자, 시스템 관리자

### 📊 [모니터링 및 관리 가이드](./모니터링_및_관리_가이드.md)
- **목적**: 서버 성능, 보안, 사용량을 효과적으로 모니터링하고 관리
- **내용**:
  - 실시간 로그 모니터링
  - 성능 모니터링
  - 보안 모니터링
  - 사용량 모니터링
  - 자동 알림 시스템
- **대상**: 시스템 관리자, 운영 담당자

## 🎯 핵심 기능

### 🔐 보안 강화
- **API Key 완전 숨김**: 클라이언트에서 API Key 노출 방지
- **시간당 300회 요청 제한**: API 남용 방지
- **CORS 정책**: 허용된 도메인에서만 접근 가능
- **입력 검증**: 악의적 요청 자동 차단
- **실시간 보안 모니터링**: 침입 탐지 및 자동 차단

### 📈 성능 최적화
- **평균 응답 시간**: 5초 이내
- **성공률**: 99% 이상
- **가용성**: 99.9% 이상
- **자동 성능 모니터링**: 임계값 초과 시 자동 알림

### 💰 비용 관리
- **실시간 비용 추적**: API 사용량 및 비용 모니터링
- **일일/월간 비용 보고서**: 사용 패턴 분석
- **비용 예측**: 월간 비용 예상치 제공
- **비용 알림**: 임계값 초과 시 자동 알림

## 🚀 빠른 시작 가이드

### 1단계: 서버 파일 준비
```bash
# 필요한 파일들 확인
ls -la *.php
ls -la .htaccess
ls -la config.php
```

### 2단계: dothome.co.kr 서버에 업로드
```bash
# FTP 또는 파일 매니저를 통해 업로드
/public_html/
├── secure-api-proxy.php
├── config.php
├── rate-limiter.php
├── .htaccess
└── test-api.php
```

### 3단계: API 연결 테스트
```bash
# 브라우저에서 테스트
https://edgeenglish.net/test-api.php
```

### 4단계: React 앱 설정
```bash
# .env 파일에 추가
REACT_APP_API_PROXY_URL=https://edgeenglish.net/secure-api-proxy.php
```

### 5단계: 모니터링 설정
```bash
# 대시보드 생성
php dashboard.php
# 보안 대시보드 생성
php security_dashboard.php
```

## 📊 모니터링 도구

### 실시간 대시보드
- **성능 대시보드**: `dashboard.html`
- **보안 대시보드**: `security_dashboard.html`
- **사용량 대시보드**: `usage_dashboard.html`

### 로그 파일
- **API 로그**: `api_logs.txt`
- **보안 로그**: `security_logs.txt`
- **성능 로그**: `performance_logs.txt`
- **사용량 로그**: `usage_logs.txt`

### 모니터링 스크립트
```bash
# 실시간 로그 확인
tail -f api_logs.txt

# 에러 로그 확인
grep "ERROR" api_logs.txt

# 성능 통계 확인
php log_analyzer.php

# 보안 통계 확인
php security_monitor.php
```

## 🔧 설정 파일

### 핵심 설정
- **API Key**: `config.php`에 설정
- **요청 제한**: `rate-limiter.php`에서 조정
- **보안 설정**: `.htaccess`에서 관리
- **CORS 정책**: `.htaccess`에서 설정

### 환경 변수
```bash
# 서버 환경 변수
OPENAI_API_KEY=sk-proj-...
API_RATE_LIMIT=300
API_TIMEOUT=60

# React 앱 환경 변수
REACT_APP_API_PROXY_URL=https://edgeenglish.net/secure-api-proxy.php
```

## 🚨 긴급 상황 대응

### 서버 다운
1. dothome.co.kr 서버 상태 확인
2. PHP 서비스 재시작
3. 파일 권한 확인
4. 로그 파일 분석

### API Key 노출
1. 즉시 새로운 API Key 발급
2. 기존 API Key 비활성화
3. config.php 파일 업데이트
4. 모든 클라이언트 재배포

### 보안 침해
1. 즉시 서버 접근 차단
2. 로그 파일 분석
3. 침입 경로 추적
4. 보안 패치 적용

## 📞 지원 및 연락처

### 기술 지원
- **일반 문제**: 로그 파일과 함께 상세한 오류 메시지 제공
- **성능 문제**: 사용량 통계와 응답 시간 데이터 제공
- **보안 문제**: 보안 로그와 의심 활동 데이터 제공

### 연락처
- **시스템 관리자**: admin@edgeenglish.net
- **보안 담당자**: security@edgeenglish.net
- **기술 지원**: tech@edgeenglish.net

## 📚 추가 리소스

### 외부 문서
- [OpenAI API 문서](https://platform.openai.com/docs)
- [PHP 공식 문서](https://www.php.net/docs.php)
- [Apache .htaccess 가이드](https://httpd.apache.org/docs/current/howto/htaccess.html)
- [dothome.co.kr 고객지원](https://www.dothome.co.kr/)

### 관련 프로젝트
- [EngQuiz 프로젝트](../README.md)
- [Firebase 설정 가이드](../firebase.json)
- [React 앱 설정](../package.json)

---

## 🎉 성공 지표

### 배포 성공 기준
- ✅ API 연결 테스트 100% 성공
- ✅ 퀴즈 생성 기능 정상 작동
- ✅ 보안 기능 정상 적용
- ✅ 성능 요구사항 충족 (응답 시간 < 10초)
- ✅ 에러율 < 1%

### 운영 성공 기준
- ✅ 일일 API 호출 성공률 > 99%
- ✅ 평균 응답 시간 < 5초
- ✅ 서버 가동률 > 99.9%
- ✅ 보안 침해 사고 0건

**이 문서들을 따라하면 dothome.co.kr에서 안전하고 효율적인 백엔드 서버를 구축하고 운영할 수 있습니다!** 🚀
