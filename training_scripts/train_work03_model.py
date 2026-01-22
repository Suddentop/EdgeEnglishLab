"""
Work_03 모델 학습 스크립트
SageMaker에서 실행되는 학습 코드
"""

import os
import json
import argparse
import torch
from transformers import (
    GPT2LMHeadModel,
    GPT2Tokenizer,
    Trainer,
    TrainingArguments,
    DataCollatorForLanguageModeling
)
from datasets import Dataset
import pandas as pd

def model_fn(model_dir):
    """SageMaker가 모델을 로드할 때 호출되는 함수"""
    tokenizer = GPT2Tokenizer.from_pretrained(model_dir)
    model = GPT2LMHeadModel.from_pretrained(model_dir)
    return {"model": model, "tokenizer": tokenizer}

def input_fn(request_body, request_content_type):
    """SageMaker 엔드포인트로 들어오는 요청을 파싱"""
    if request_content_type == "application/json":
        input_data = json.loads(request_body)
        return input_data
    else:
        raise ValueError(f"Unsupported content type: {request_content_type}")

def predict_fn(input_data, model_dict):
    """모델을 사용하여 예측 수행"""
    model = model_dict["model"]
    tokenizer = model_dict["tokenizer"]
    
    # 입력 텍스트 토크나이징
    prompt = input_data.get("prompt", "")
    inputs = tokenizer.encode(prompt, return_tensors="pt")
    
    # 생성
    with torch.no_grad():
        outputs = model.generate(
            inputs,
            max_length=512,
            temperature=0.7,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
    
    # 디코딩
    generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    return {"generated_text": generated_text}

def output_fn(prediction, response_content_type):
    """예측 결과를 JSON 형식으로 반환"""
    if response_content_type == "application/json":
        return json.dumps(prediction)
    else:
        raise ValueError(f"Unsupported content type: {response_content_type}")

def train():
    """학습 메인 함수"""
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_name", type=str, default="gpt2-medium")
    parser.add_argument("--train_data", type=str, required=True)
    parser.add_argument("--output_dir", type=str, default="/opt/ml/model")
    parser.add_argument("--num_epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=4)
    parser.add_argument("--learning_rate", type=float, default=5e-5)
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🚀 Work_03 모델 학습 시작")
    print("=" * 60)
    print(f"모델: {args.model_name}")
    print(f"학습 데이터: {args.train_data}")
    print(f"출력 디렉토리: {args.output_dir}")
    print(f"에포크: {args.num_epochs}")
    print(f"배치 크기: {args.batch_size}")
    print(f"학습률: {args.learning_rate}")
    print("=" * 60)
    
    # 모델 및 토크나이저 로드
    print("\n📦 모델 및 토크나이저 로드 중...")
    tokenizer = GPT2Tokenizer.from_pretrained(args.model_name)
    model = GPT2LMHeadModel.from_pretrained(args.model_name)
    
    # 패딩 토큰 설정
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        model.config.pad_token_id = tokenizer.eos_token_id
    
    print("✅ 모델 로드 완료")
    
    # 데이터 로드 및 전처리
    print("\n📂 학습 데이터 로드 중...")
    
    # CSV 파일 읽기
    df = pd.read_csv(args.train_data)
    print(f"✅ {len(df)}개의 학습 예제 로드 완료")
    
    # 데이터셋 준비
    def tokenize_function(examples):
        """토크나이징 함수"""
        # 입력과 출력을 결합하여 학습
        texts = []
        for inp, out in zip(examples["input"], examples["output"]):
            # 프롬프트와 응답을 결합
            combined_text = f"{inp}\n{out}"
            texts.append(combined_text)
        
        return tokenizer(
            texts,
            truncation=True,
            padding="max_length",
            max_length=512
        )
    
    print("\n🔄 데이터 토크나이징 중...")
    dataset = Dataset.from_pandas(df)
    tokenized_dataset = dataset.map(tokenize_function, batched=True)
    print("✅ 토크나이징 완료")
    
    # 학습 인자 설정
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.num_epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        save_strategy="epoch",
        logging_steps=100,
        push_to_hub=False,
        report_to="none"  # SageMaker에서는 자체 로깅 사용
    )
    
    # 데이터 콜레이터
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False  # Causal LM이므로 False
    )
    
    # 트레이너 생성
    print("\n🎓 트레이너 생성 중...")
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator
    )
    
    # 학습 시작
    print("\n🚀 학습 시작...")
    print("=" * 60)
    trainer.train()
    print("=" * 60)
    
    # 모델 저장
    print("\n💾 모델 저장 중...")
    trainer.save_model()
    tokenizer.save_pretrained(args.output_dir)
    
    print(f"\n✅ 모델 학습 완료!")
    print(f"저장 위치: {args.output_dir}")
    print("=" * 60)

if __name__ == "__main__":
    train()
