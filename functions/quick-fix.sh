#!/bin/bash
# 긴급 수정: OpenAI API 키 설정 후 함수 재배포

echo "🚀 Firebase Functions 재배포 중..."
firebase deploy --only functions:openaiProxy

echo ""
echo "✅ 배포 완료!"
echo "📋 다음 단계:"
echo "   1. Firebase Console에서 환경 변수 OPENAI_API_KEY 확인"
echo "   2. 웹사이트에서 이미지 업로드 테스트"
echo "   3. Firebase Functions 로그 확인"



