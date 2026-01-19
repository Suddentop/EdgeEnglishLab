# 패키지#02 인쇄 화면 페이지 구성 및 높이 정리

## 1. 페이지 전체 구조

### A4 가로 페이지 템플릿
- **크기**: 29.7cm (가로) × 21cm (세로)
- **방향**: Landscape (가로)
- **페이지 분할**: `page-break-after: always` (마지막 페이지 제외)

```css
.a4-landscape-page-template {
  width: 29.7cm;
  height: 21cm;
}
```

---

## 2. 페이지 구성 요소 및 높이

### 2.1 헤더 (Header)
- **컨테이너 클래스**: `.a4-landscape-page-header`
- **높이**: `1.2cm`
- **패딩**: `0.3cm` (상단) / `0` (하단) / `0.5cm` (좌우)
- **하단 여백**: `0.25cm` (문제 모드) / `0.2cm` (정답 모드)
- **내용**: `PrintHeaderPackage02` 컴포넌트
  - 폰트 크기: `10pt`
  - 폰트 굵기: `700`
  - 하단 테두리: `2px solid #000`

```css
.a4-landscape-page-header {
  height: 1.2cm;
  padding: 0.3cm 0.5cm 0 0.5cm;
}
```

---

### 2.2 콘텐츠 영역 (Content Area)
- **컨테이너 클래스**: `.a4-landscape-page-content`
- **패딩**: `0` (상단) / `0.5cm` (하단) / `0.5cm` (좌우)
- **높이**: `flex: 1` (헤더를 제외한 남은 공간)
- **계산식**: `21cm (전체) - 1.2cm (헤더) - 0.5cm (하단 패딩) = 19.3cm`

```css
.a4-landscape-page-content {
  padding: 0 0.5cm 0.5cm 0.5cm;
  flex: 1;
}
```

---

### 2.3 2단 컨테이너 (Two Column Container)
- **컨테이너 클래스**: `.print-two-column-container`
- **높이**: `19.3cm` (고정)
- **간격**: `0.6cm` (양쪽 컬럼 사이)
- **레이아웃**: Flexbox (가로 배치)
- **오버플로우**: `hidden` (페이지 높이를 넘는 내용 숨김)

```css
.print-two-column-container {
  height: 19.3cm !important;
  gap: 0.6cm;
  overflow: hidden !important;
}
```

---

### 2.4 컬럼 (Column)
- **컨테이너 클래스**: `.print-column`
- **너비**: `calc(50% - 0.3cm)` (각 컬럼)
- **높이**: `19.3cm` (고정)
- **간격**: `0.35cm` (문제 모드) / `0.3cm` (정답 모드) - 컬럼 내부 요소 간
- **레이아웃**: Flexbox (세로 배치)
- **오버플로우**: `hidden`

```css
.print-column {
  flex: 1 1 calc(50% - 0.3cm);
  height: 19.3cm !important;
  gap: 0.35cm; /* 문제 모드 */
  gap: 0.3cm !important; /* 정답 모드 */
  overflow: hidden !important;
}
```

---

## 3. 문제 카드 구성 요소

### 3.1 문제 카드 컨테이너
- **컨테이너 클래스**: `.print-question-card`
- **패딩**: `0.5cm` (전체)
- **마진 하단**: `0.3cm`
- **예외**: 유형#01의 경우 좌우 패딩 `0`, 상하 패딩 `0.5cm`

```css
.print-question-card {
  padding: 0.5cm;
  margin-bottom: 0.3cm;
}
```

---

### 3.2 문제 제목
- **컨테이너 클래스**: `.print-question-title`
- **폰트 크기**: `11.3pt` (문제 모드) / `12.1pt` (정답 모드)
- **마진 하단**: `0.25cm`
- **패딩 하단**: `0.15cm`
- **하단 테두리**: `1.5px solid #333`
- **첫 번째 카드 마진 상단**: `0.3cm` (정답 모드)

```css
.print-question-title {
  font-size: 11.3pt; /* 문제 모드 */
  font-size: 12.1pt !important; /* 정답 모드 */
  margin-bottom: 0.25cm;
  padding-bottom: 0.15cm;
}
```

---

### 3.3 문제 지시문
- **컨테이너 클래스**: `.print-instruction`
- **폰트 크기**: `8.8pt` (문제 모드) / `9.35pt` (정답 모드)
- **패딩**: `0.2cm`
- **마진 하단**: `0.25cm`
- **배경색**: `#f0f0f0`

```css
.print-instruction {
  font-size: 8.8pt; /* 문제 모드 */
  font-size: 9.35pt !important; /* 정답 모드 */
  padding: 0.2cm;
  margin-bottom: 0.25cm;
  background: #f0f0f0;
}
```

---

### 3.4 영어 본문
- **컨테이너 클래스**: `.print-passage`, `.print-paragraph-item`, `.print-html-block`, `.print-sentence-english`
- **폰트 크기**: `9.4pt` (문제 모드) / `9.9pt` (정답 모드)
- **줄간격**: `1.4` (기본) / `1.54` (유형#01-11) / `1.82` (유형#13-14)
- **패딩**: `0.25cm`
- **마진 하단**: `0.25cm`

```css
.print-passage {
  font-size: 9.4pt !important; /* 문제 모드 */
  font-size: 9.9pt !important; /* 정답 모드 */
  line-height: 1.4;
  padding: 0.25cm;
  margin-bottom: 0.25cm;
}
```

---

### 3.5 4지선다 옵션
- **컨테이너 클래스**: `.print-options`
- **패딩**: `0.25cm`
- **마진 상단**: `0` (마지막 영어 본문의 마진 하단만 사용)
- **마진 하단**: `0.5cm` (한글해석과의 간격)
- **옵션 항목**: `.print-option`
  - 폰트 크기: `9.0pt` (문제 모드) / `9.35pt` (정답 모드)
  - 마진 하단: `0.12cm` (마지막 제외)

```css
.print-options {
  padding: 0.25cm !important;
  margin-bottom: 0.5cm !important;
}

.print-option {
  font-size: 9.0pt !important; /* 문제 모드 */
  font-size: 9.35pt !important; /* 정답 모드 */
  margin-bottom: 0.12cm;
}
```

---

### 3.6 정답 섹션 (정답 모드 전용)
- **컨테이너 클래스**: `.print-answer-section`
- **마진 상단**: `0.3cm` (기본) / `0.4cm` (정답 모드)
- **패딩**: `0.2cm` (기본) / `0.3cm` (정답 모드)
- **배경색**: `#f8f9fa` (기본) / `#e3f2fd` (정답 모드)
- **정답 라벨**: `.print-answer-label`
  - 폰트 크기: `8pt` (기본) / `9pt` (정답 모드)
- **정답 내용**: `.print-answer-content`
  - 폰트 크기: `7.5pt` (기본) / `9pt` (정답 모드)

```css
.print-answer-section {
  margin-top: 0.3cm;
  padding: 0.2cm;
  background: #f8f9fa;
}
```

---

### 3.7 본문 해석 섹션 (정답 모드 전용)
- **컨테이너 클래스**: `.print-translation-section`
- **마진 상단**: `0.3cm`
- **패딩**: `0.1cm`
- **해석 제목**: `.print-translation-title`
  - 폰트 크기: `8.3pt` (기본) / `8.8pt` (정답 모드)
- **해석 내용**: `.print-translation-content`
  - 폰트 크기: `8.3pt` (기본) / `8.8pt` (정답 모드)
  - 줄간격: `1.35`

```css
.print-translation-section {
  margin-top: 0.3cm !important;
  padding: 0.1cm !important;
}

.print-translation-content {
  font-size: 8.3pt; /* 기본 */
  font-size: 8.8pt !important; /* 정답 모드 */
  line-height: 1.35;
}
```

---

## 4. 특수 유형별 높이 및 스타일

### 4.1 유형#01 (문단 순서 맞추기)
- **고정단락박스**: `.fixed-paragraph-box`
  - 폰트 크기: `9.3pt`
  - 줄간격: `1.6`
  - 패딩: `0.6rem` (상하) / `1rem` (좌우)
  - 마진 하단: `0.75rem`
- **좌우 패딩**: `0` (카드 자체), `0.5cm` (제목/지시문/선택지)
- **마지막 영어 단락 마진 하단**: `0.3cm` (4지선다와의 간격)

---

### 4.2 유형#02 (유사단어 독해)
- **교체된 단어 강조**: `.print-word-highlight`
  - 밑줄 + 굵게
  - 폰트 크기: `9.35pt` (정답 모드)
- **교체 단어 테이블**: `.print-replacements-table`
  - 폰트 크기: `8.3pt` (기본) / `8.8pt` (정답 모드)
  - 마진 상단: `0.4cm` (정답 모드)
  - 셀 패딩: `0.06cm` (기본) / `0.1cm` (정답 모드)

---

### 4.3 유형#06 (문장 위치 찾기)
- **주요 문장 컨테이너**: `.print-missing-sentence`, `.work06-main-sentence`
  - 폰트 크기: `9pt`
  - 패딩: `0.25cm 0.2cm`
  - 마진 하단: `0.2cm`
  - 테두리: `1px solid #000`
  - 배경색: `#f0f0f0`
- **정보 컨테이너**: `.print-work06-info-container`
  - 폰트 크기: `9.0pt`
  - 마진 상단: `0.3cm`
  - 패딩: `0.2cm 0.25cm`

---

### 4.4 유형#11 (문장별 해석)
- **문장 항목**: `.print-sentence-item`
  - 마진 하단: `0.25cm`
  - 하단 테두리: `1px solid #ddd`
  - 패딩 하단: `0.15cm`
- **한글 해석**: `.print-sentence-korean-inline`
  - 폰트 크기: `8pt`
  - 패딩 좌우: `0.15cm` (영어 문장과 정렬)

---

### 4.5 유형#13, 14 (빈칸 채우기)
- **줄간격**: `1.82` (유형#01-11보다 30% 증가)
- **빈칸 언더스코어 색상**: `#999` (문제 모드)
- **정답 표시**: `.print-blank-filled-answer`
  - 폰트 크기: `9pt` (기본) / `9.9pt` (정답 모드)
  - 색상: `#1565c0`

---

## 5. 페이지 높이 계산식

### 전체 높이 분배
```
총 페이지 높이: 21cm
├─ 헤더: 1.2cm
├─ 헤더 하단 여백: 0.25cm (문제) / 0.2cm (정답)
├─ 콘텐츠 하단 패딩: 0.5cm
└─ 2단 컨테이너: 19.3cm (고정)
   = 21cm - 1.2cm - 0.5cm = 19.3cm
```

### 컬럼 내부 높이 계산
- **사용 가능한 높이**: `19.3cm`
- **컬럼 간격**: `0.35cm` (문제) / `0.3cm` (정답) - 각 카드 사이
- **카드 구성 요소**:
  ```
  문제 카드 높이 = 
    제목 (마진 포함: ~0.4cm) +
    지시문 (마진 포함: ~0.45cm) +
    영어 본문 (가변) +
    4지선다 (마진 포함: ~0.75cm) +
    정답 섹션 (정답 모드: ~0.8cm) +
    본문 해석 (정답 모드: 가변) +
    카드 패딩/마진 (0.8cm)
  ```

---

## 6. 폰트 크기 요약표

| 요소 | 문제 모드 | 정답 모드 |
|------|----------|----------|
| 헤더 | 10pt | 10pt |
| 문제 제목 | 11.3pt | 12.1pt |
| 지시문 | 8.8pt | 9.35pt |
| 영어 본문 | 9.4pt | 9.9pt |
| 4지선다 옵션 | 9.0pt | 9.35pt |
| 정답 라벨 | 8pt | 9pt |
| 정답 내용 | 7.5pt | 9pt |
| 한글 해석 | 8.3pt | 8.8pt |
| 교체 단어 테이블 | 8.3pt | 8.8pt |

---

## 7. 마지막 페이지 특수 처리

- **클래스**: `.last-page`
- **스타일**: `page-break-after: avoid !important`
- **마진/패딩**: 하단 `0`으로 설정하여 빈 페이지 방지

```css
.a4-landscape-page-template.last-page {
  page-break-after: avoid !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
```

---

## 8. 인쇄 미디어 쿼리

모든 스타일은 `@media print` 내에서도 동일하게 적용되며, 추가로:
- `print-color-adjust: exact` (색상 정확도 유지)
- `visibility: visible` (인쇄 컨테이너만 표시)
- `page-break-inside: avoid` (요소 분할 방지)

---

**참고**: 실제 렌더링 시 요소들의 내용에 따라 높이가 가변적으로 결정되며, 컬럼 높이(`19.3cm`)를 초과하는 내용은 자동으로 다음 페이지로 분할됩니다.
