# 패키지#01 - 유형별 본문영어컨테이너 폰트 크기 및 Font Weight 정리

## 1. 문제생성 후 페이지 (Package_01_MultiQuizGenerater.tsx)

| 유형 | 폰트 크기 (fontSize) | Font Weight | 비고 |
|------|---------------------|-------------|------|
| 유형#01 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#02 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#03 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#04 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#05 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#06 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#07 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#08 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#09 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#10 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#11 | 1rem | 미지정 (기본값/상속) | 별도 컴포넌트 사용 |
| 유형#13 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |
| 유형#14 | 1rem | 미지정 (기본값/상속) | lineHeight: 1.7 |

**요약**: 모든 유형이 문제생성 후 페이지에서는 `fontSize: '1rem'`로 통일되어 있으며, font-weight는 명시적으로 설정되지 않아 기본값(보통 400 또는 normal)이 적용됩니다.

---

## 2. 인쇄 페이지 (PrintFormatPackage01.tsx 및 PrintFormatPackage01.css)

| 유형 | 문제 모드 (no-answer) | 정답 모드 (with-answer) | Font Weight | 비고 |
|------|----------------------|------------------------|-------------|------|
| 유형#01 | 확인 필요 | 확인 필요 | 미지정 | 별도 컴포넌트 (PrintFormatWork01) 사용 가능 |
| 유형#02 | 1rem | 0.9rem | 미지정 | lineHeight: 1.4 (문제), 1.7 (정답) |
| 유형#03 | 1rem | 1rem | 미지정 | lineHeight: 1.7 |
| 유형#04 | 1rem | 1rem | 미지정 | lineHeight: 1.7 |
| 유형#05 | 0.9rem | 0.9rem | 미지정 | lineHeight: 1.7 |
| 유형#06 | 확인 필요 | 확인 필요 | 미지정 | 별도 컴포넌트 사용 가능 |
| 유형#07 | 1rem | 1rem | 미지정 | lineHeight: 1.7 |
| 유형#08 | 1rem | 1rem | 미지정 | CSS에서 강제 적용, lineHeight: 1.7 |
| 유형#09 | 1.1rem | 1.1rem | 미지정 | CSS에서 강제 적용, lineHeight: 1.7 |
| 유형#10 | 1.1rem | 1.1rem | 미지정 | CSS에서 강제 적용, lineHeight: 1.7 |
| 유형#11 | 확인 필요 | 확인 필요 | 미지정 | 별도 컴포넌트 (PrintFormatWork11) 사용 |
| 유형#13 | 1.1rem | 1.1rem | 미지정 | CSS에서 강제 적용, lineHeight: 1.7 |
| 유형#14 | 1.1rem | 1.1rem | 미지정 | CSS에서 강제 적용, lineHeight: 1.7 |

**요약**:
- **1.1rem**: 유형#09, #10, #13, #14
- **1.0rem**: 유형#02 (문제 모드), 유형#03, #04, #07, #08
- **0.9rem**: 유형#02 (정답 모드), 유형#05
- **확인 필요**: 유형#01, #06, #11 (별도 컴포넌트 사용 가능)
- **Font Weight**: 모든 유형에서 명시적으로 설정되지 않음 (기본값/상속)

---

## 3. CSS 강제 규칙 (PrintFormatPackage01.css)

### 유형#08, #09, #10, #11, #13, #14
- CSS에서 `font-size: 1rem !important` 또는 `font-size: 1.1rem !important`로 강제 적용
- 유형#09, #10은 최근 1.1rem으로 변경됨

### 유형#02, #03, #04, #05, #07
- CSS에서 `font-size: 1rem !important`로 강제 적용
- 유형#05는 0.9rem으로 설정

---

## 4. 특이사항

1. **유형#09, #10**: 최근 폰트 크기가 1.1rem으로 변경됨 (인쇄 페이지)
2. **유형#02**: 문제 모드와 정답 모드에서 폰트 크기가 다름 (1rem vs 0.9rem)
3. **유형#05**: 인쇄 페이지에서 0.9rem으로 설정
4. **Font Weight**: 모든 유형에서 명시적으로 설정되지 않아 기본값(400/normal)이 적용됨
