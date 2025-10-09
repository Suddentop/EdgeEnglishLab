# 🔑 OpenAI API Key 확인 및 재발급 가이드

## 🚨 "Incorrect API key provided" 오류 해결

### **원인**
- API Key가 만료되었거나 삭제됨
- API Key가 비활성화됨
- OpenAI 계정 문제

---

## ✅ **해결 단계**

### **1단계: OpenAI 대시보드 접속**

브라우저에서:
```
https://platform.openai.com/api-keys
```

### **2단계: 현재 API Key 상태 확인**

현재 사용 중인 키:
```
sk-proj-AS19yhM7Rv9M...iIkA
```

**확인 사항**:
- ✅ 키가 목록에 있는지
- ✅ "Active" 상태인지
- ⚠️ 삭제되었거나 만료되었는지

### **3단계: 새 API Key 발급** (필요 시)

1. **Create new secret key** 클릭
2. 키 이름 입력 (예: `EngQuiz-Dev`)
3. **Create secret key** 클릭
4. **⚠️ 키를 복사** (한 번만 표시됨!)

---

## 🔄 **.env.local 파일 업데이트**

새 API Key를 발급받았다면:

### **PowerShell 명령어**:

```powershell
# .env.local 파일 백업
Copy-Item .env.local .env.local.backup

# 새 키로 업데이트 (YOUR_NEW_KEY_HERE 부분을 실제 키로 교체)
$newKey = "sk-proj-YOUR_NEW_KEY_HERE"
$content = Get-Content .env.local
$content = $content -replace "REACT_APP_OPENAI_API_KEY=.*", "REACT_APP_OPENAI_API_KEY=$newKey"
$content | Out-File -FilePath .env.local -Encoding utf8
```

### **또는 직접 편집**:

1. `.env.local` 파일 열기
2. `REACT_APP_OPENAI_API_KEY=...` 줄 찾기
3. 새 키로 교체
4. 저장

---

## 🚀 **React 앱 재시작** (필수!)

환경 변수를 변경한 후:

```powershell
# Ctrl+C로 중지
npm start
```

---

## 🧪 **테스트**

### **API Key 직접 테스트**:

PowerShell에서:

```powershell
$apiKey = "sk-proj-YOUR_KEY_HERE"
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $apiKey"
}
$body = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Hello, test message"
        }
    )
    max_tokens = 10
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" -Method Post -Headers $headers -Body $body

Write-Host "✅ API Key 유효!" -ForegroundColor Green
$response.choices[0].message.content
```

**성공 시**: AI 응답 출력  
**실패 시**: 401 오류 → API Key 재발급 필요

---

## 📝 **OpenAI 계정 확인**

### **사용 가능 크레딧 확인**:
```
https://platform.openai.com/usage
```

- 무료 크레딧이 남아있는지
- 결제 수단이 등록되어 있는지
- 사용 한도를 초과하지 않았는지

---

## 🔐 **보안 주의사항**

새 API Key를 발급받은 경우:

1. **이전 키 삭제** (OpenAI 대시보드에서)
2. **Git 커밋 전 확인** (.env.local이 .gitignore에 있는지)
3. **프로덕션 서버 업데이트** (필요 시)

---

## 🆘 **여전히 문제가 있다면**

1. **OpenAI 계정 확인**
   - 크레딧 잔액
   - 결제 수단
   - 계정 상태

2. **API Key 권한 확인**
   - All 권한 있는지
   - Rate limit 설정

3. **네트워크 확인**
   - 방화벽
   - VPN
   - 프록시 설정


