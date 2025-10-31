#!/bin/bash

echo "🔥 Firebase 데이터 삭제 시작..."

# Firebase 프로젝트 설정
firebase use edgeenglishlab

# packageQuizzes 컬렉션 삭제
echo "📦 packageQuizzes 컬렉션 삭제 중..."
firebase firestore:delete packageQuizzes --recursive --yes

# users 컬렉션의 packageQuizzes 서브컬렉션 삭제
echo "👥 users 컬렉션의 packageQuizzes 서브컬렉션 삭제 중..."
firebase firestore:delete users --recursive --yes

# 기타 관련 컬렉션들 삭제
echo "🗑️ 기타 관련 컬렉션들 삭제 중..."
firebase firestore:delete quizResults --recursive --yes
firebase firestore:delete userProgress --recursive --yes
firebase firestore:delete temporaryQuizzes --recursive --yes

echo "🎉 모든 데이터 삭제 완료!"
