# Training Scripts 디렉토리

이 디렉토리에는 SageMaker에서 실행되는 학습 스크립트가 포함되어 있습니다.

## 파일 구조

```
training_scripts/
├── train_work03_model.py    # Work_03 모델 학습 스크립트
├── train_work04_model.py    # Work_04 모델 학습 스크립트 (추후 추가)
└── ...
```

## 사용 방법

이 스크립트들은 `launch_training_job.py`를 통해 자동으로 SageMaker에 업로드되고 실행됩니다.

직접 실행하려면:

```bash
python train_work03_model.py \
    --model_name gpt2-medium \
    --train_data /path/to/training_data.csv \
    --output_dir /opt/ml/model \
    --num_epochs 3 \
    --batch_size 4 \
    --learning_rate 5e-5
```

## 스크립트 요구사항

각 학습 스크립트는 다음 함수들을 포함해야 합니다:

- `model_fn(model_dir)`: 모델 로드 함수
- `input_fn(request_body, request_content_type)`: 입력 파싱 함수
- `predict_fn(input_data, model_dict)`: 예측 함수
- `output_fn(prediction, response_content_type)`: 출력 포맷팅 함수
- `train()`: 학습 메인 함수

## 주의사항

- SageMaker는 `/opt/ml/` 디렉토리를 사용합니다
- 학습 데이터는 `/opt/ml/input/data/training/`에 마운트됩니다
- 모델은 `/opt/ml/model/`에 저장되어야 합니다
- 로그는 CloudWatch에 자동으로 전송됩니다
