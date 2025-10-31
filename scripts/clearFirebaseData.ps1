Write-Host "🔥 Firebase 데이터 삭제 시작..." -ForegroundColor Red

# Firebase 프로젝트 설정
firebase use edgeenglishlab

# packageQuizzes 컬렉션 삭제
Write-Host "📦 packageQuizzes 컬렉션 삭제 중..." -ForegroundColor Yellow
firebase firestore:delete packageQuizzes --recursive

# users 컬렉션의 packageQuizzes 서브컬렉션 삭제
Write-Host "👥 users 컬렉션의 packageQuizzes 서브컬렉션 삭제 중..." -ForegroundColor Yellow
firebase firestore:delete users --recursive

# 기타 관련 컬렉션들 삭제
Write-Host "🗑️ 기타 관련 컬렉션들 삭제 중..." -ForegroundColor Yellow
firebase firestore:delete quizResults --recursive
firebase firestore:delete userProgress --recursive
firebase firestore:delete temporaryQuizzes --recursive

Write-Host "🎉 모든 데이터 삭제 완료!" -ForegroundColor Green
