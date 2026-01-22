"""
EngQuiz 학습 데이터 준비 스크립트
Firestore에서 데이터를 추출하여 SageMaker 학습용 형식으로 변환
"""

import json
import csv
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv('.env.sagemaker')

# Firebase 설정 (필요한 경우)
# import firebase_admin
# from firebase_admin import credentials, firestore

def construct_work03_prompt(passage: str, previously_selected_words: Optional[List[str]] = None) -> str:
    """
    Work_03 문제 생성 프롬프트 구성
    work03Service.ts의 프롬프트와 동일한 형식
    """
    base_prompt = """아래 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 빈칸 추론 문제를 만들어주세요.

**🎯 수능 수준의 어휘 선택 기준 (절대 필수):**

**수능 영어 빈칸 추론 문제의 특징:**
- 실제 수능에서는 본문 전체의 맥락을 이해하고, 앞뒤 문맥을 종합적으로 분석해야 답을 찾을 수 있는 어휘를 출제합니다.
- 단순히 단어 자체의 의미를 아는 것이 아니라, 문맥 속에서의 적절한 의미를 추론할 수 있는 능력을 평가합니다.
- 어휘 난이도는 CEFR B2-C1 수준(고등학교 3-5등급 어휘)에 해당하며, 학술적 텍스트나 문학 작품에서 자주 등장하는 어휘입니다.

1. **단어 선정 기준 (매우 중요 - 다양성 필수):**
   - ❌ 피해야 할 단어: 고유명사, 기본 어휘(a, an, the, is, are, was, were, go, come 등), 일상 대화용 어휘, 너무 쉬운 단어
   - ✅ 선택해야 할 단어: 
     * 학술 논문이나 교과서에서 등장하는 어휘 (예: analyze, demonstrate, significant, essential, phenomenon, perspective 등)
     * 문맥에 따라 의미가 달라지는 다의어 (예: address, concern, current, feature 등)
     * 추상적 개념을 표현하는 명사/형용사 (예: profound, subtle, inherent, explicit, implicit 등)

2. **정답 단어 요구사항:**
   - 반드시 본문에 실제로 등장한 단어(철자, 형태, 대소문자까지 동일)를 정답으로 선정해야 해.

3. **5지선다 선택지 생성 (수능 스타일):**
   - 정답(핵심단어) + 오답 4개 = 총 5개 선택지
   - 정답의 위치는 1~5번 중 랜덤으로 배치하세요.

4. **JSON 형식으로 응답하세요:**

{
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answerIndex": 0
}

입력된 영어 본문:
{passage}"""
    
    if previously_selected_words and len(previously_selected_words) > 0:
        exclusion_note = f"""

**⚠️ 매우 중요 - 이전 선택 단어 제외:**
* 아래 단어들은 이전에 이미 선택된 단어입니다. 이 단어들은 **절대 선택하지 마세요**:
* {', '.join([f'"{word}"' for word in previously_selected_words])}
* 위 단어들과는 **완전히 다른 단어**를 선택해야 합니다."""
        base_prompt += exclusion_note
    
    return base_prompt.format(passage=passage)


def prepare_work03_data(raw_data: List[Dict]) -> pd.DataFrame:
    """
    Work_03 문제 생성 데이터를 학습용 형식으로 변환
    
    Args:
        raw_data: Firestore에서 추출한 원본 데이터 리스트
        
    Returns:
        학습용 DataFrame (input, output 컬럼 포함)
    """
    training_examples = []
    
    for item in raw_data:
        try:
            # 입력 데이터 추출
            passage = item.get("passage") or item.get("inputText", "")
            if not passage:
                continue
            
            previously_selected_words = item.get("previouslySelectedWords", [])
            
            # 결과 데이터 추출
            result = item.get("result") or item.get("problemData", {})
            if not result:
                continue
            
            options = result.get("options", [])
            answer_index = result.get("answerIndex")
            
            if not options or answer_index is None:
                continue
            
            # 프롬프트 구성
            prompt = construct_work03_prompt(passage, previously_selected_words)
            
            # 출력 형식 (JSON)
            output = json.dumps({
                "options": options,
                "answerIndex": answer_index
            }, ensure_ascii=False)
            
            training_examples.append({
                "input": prompt,
                "output": output
            })
            
        except Exception as e:
            print(f"⚠️ 데이터 처리 오류 (건너뜀): {e}")
            continue
    
    return pd.DataFrame(training_examples)


def load_data_from_file(file_path: str) -> List[Dict]:
    """
    JSON 또는 CSV 파일에서 데이터 로드
    """
    if file_path.endswith('.json'):
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    elif file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
        return df.to_dict('records')
    else:
        raise ValueError(f"지원하지 않는 파일 형식: {file_path}")


def split_data(df: pd.DataFrame, train_ratio: float = 0.7, val_ratio: float = 0.15) -> tuple:
    """
    데이터를 Train/Validation/Test로 분할
    """
    total = len(df)
    train_size = int(total * train_ratio)
    val_size = int(total * val_ratio)
    
    train_df = df[:train_size]
    val_df = df[train_size:train_size + val_size]
    test_df = df[train_size + val_size:]
    
    return train_df, val_df, test_df


def main():
    """
    메인 실행 함수
    """
    print("🚀 학습 데이터 준비 시작...")
    
    # 1. 데이터 파일 경로 설정
    input_file = input("입력 데이터 파일 경로를 입력하세요 (JSON 또는 CSV): ").strip()
    
    if not os.path.exists(input_file):
        print(f"❌ 파일을 찾을 수 없습니다: {input_file}")
        return
    
    # 2. 데이터 로드
    print("📂 데이터 로드 중...")
    raw_data = load_data_from_file(input_file)
    print(f"✅ {len(raw_data)}개의 데이터 로드 완료")
    
    # 3. 데이터 전처리
    print("🔄 데이터 전처리 중...")
    df = prepare_work03_data(raw_data)
    print(f"✅ {len(df)}개의 학습 예제 생성 완료")
    
    if len(df) == 0:
        print("❌ 유효한 학습 데이터가 없습니다.")
        return
    
    # 4. 데이터 분할
    print("📊 데이터 분할 중...")
    train_df, val_df, test_df = split_data(df)
    print(f"✅ 분할 완료 - Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    
    # 5. 저장 디렉토리 생성
    output_dir = "training_data"
    os.makedirs(output_dir, exist_ok=True)
    
    # 6. CSV 파일로 저장
    print("💾 파일 저장 중...")
    train_df.to_csv(f"{output_dir}/work03_train.csv", index=False, encoding='utf-8')
    val_df.to_csv(f"{output_dir}/work03_validation.csv", index=False, encoding='utf-8')
    test_df.to_csv(f"{output_dir}/work03_test.csv", index=False, encoding='utf-8')
    print(f"✅ 파일 저장 완료: {output_dir}/")
    
    # 7. S3 업로드 (선택적)
    upload_to_s3 = input("S3에 업로드하시겠습니까? (y/n): ").strip().lower()
    if upload_to_s3 == 'y':
        bucket_name = os.getenv('SAGEMAKER_TRAINING_BUCKET')
        if not bucket_name:
            bucket_name = input("S3 버킷 이름을 입력하세요: ").strip()
        
        import subprocess
        for file_name in ['work03_train.csv', 'work03_validation.csv', 'work03_test.csv']:
            s3_path = f"s3://{bucket_name}/{file_name}"
            subprocess.run(['aws', 's3', 'cp', f"{output_dir}/{file_name}", s3_path])
            print(f"✅ 업로드 완료: {s3_path}")
    
    print("🎉 데이터 준비 완료!")


if __name__ == "__main__":
    main()
