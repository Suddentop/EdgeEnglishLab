"""
SageMaker 학습 작업 시작 스크립트
"""

import os
import sagemaker
from sagemaker.huggingface import HuggingFace
from sagemaker import get_execution_role
from dotenv import load_dotenv
import boto3

# 환경 변수 로드
load_dotenv('.env.sagemaker')

def get_sagemaker_role():
    """SageMaker 실행 역할 가져오기"""
    role_arn = os.getenv('SAGEMAKER_ROLE_ARN')
    if role_arn:
        return role_arn
    
    try:
        return get_execution_role()
    except:
        # 역할이 없으면 직접 ARN 입력 요청
        role_arn = input("SageMaker 실행 역할 ARN을 입력하세요: ").strip()
        return role_arn


def launch_training_job(work_type: str = "work03"):
    """
    SageMaker에서 학습 작업 시작
    
    Args:
        work_type: 문제 유형 (work03, work04, etc.)
    """
    print(f"🚀 {work_type} 모델 학습 작업 시작...")
    
    # SageMaker 세션
    sess = sagemaker.Session()
    role = get_sagemaker_role()
    
    print(f"✅ SageMaker 역할: {role}")
    
    # 학습 데이터 S3 경로
    bucket_name = os.getenv('SAGEMAKER_TRAINING_BUCKET')
    if not bucket_name:
        bucket_name = input("학습 데이터 S3 버킷 이름을 입력하세요: ").strip()
    
    training_data_path = f"s3://{bucket_name}/{work_type}_train.csv"
    
    # 데이터 존재 확인
    s3 = boto3.client('s3')
    bucket, key = bucket_name, f"{work_type}_train.csv"
    try:
        s3.head_object(Bucket=bucket, Key=key)
        print(f"✅ 학습 데이터 확인: {training_data_path}")
    except:
        print(f"❌ 학습 데이터를 찾을 수 없습니다: {training_data_path}")
        print("먼저 prepare_training_data.py를 실행하여 데이터를 준비하세요.")
        return None
    
    # 하이퍼파라미터
    hyperparameters = {
        "model_name": "gpt2-medium",
        "num_epochs": "3",
        "batch_size": "4",
        "learning_rate": "5e-5"
    }
    
    print("\n📋 하이퍼파라미터:")
    for key, value in hyperparameters.items():
        print(f"  {key}: {value}")
    
    # 사용자 확인
    confirm = input("\n학습 작업을 시작하시겠습니까? (y/n): ").strip().lower()
    if confirm != 'y':
        print("❌ 취소되었습니다.")
        return None
    
    # HuggingFace Estimator 생성
    print("\n🔧 Estimator 생성 중...")
    huggingface_estimator = HuggingFace(
        entry_point="train_work03_model.py",
        source_dir="training_scripts",
        instance_type="ml.g4dn.xlarge",  # GPU 인스턴스
        instance_count=1,
        role=role,
        transformers_version="4.17",
        pytorch_version="1.10",
        py_version="py38",
        hyperparameters=hyperparameters,
        output_path=f"s3://{os.getenv('SAGEMAKER_ARTIFACT_BUCKET', bucket_name)}/{work_type}/",
        base_job_name=f"engquiz-{work_type}-training",
        sagemaker_session=sess
    )
    
    # 학습 시작
    print("\n🎓 학습 작업 시작 중...")
    try:
        huggingface_estimator.fit({"training": training_data_path})
        
        print("\n✅ 학습 작업이 완료되었습니다!")
        print(f"작업 이름: {huggingface_estimator.latest_training_job.name}")
        print(f"모델 아티팩트: {huggingface_estimator.model_data}")
        
        return huggingface_estimator
        
    except Exception as e:
        print(f"\n❌ 학습 작업 실패: {e}")
        return None


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("AWS SageMaker 학습 작업 시작")
    print("=" * 60)
    
    work_type = input("문제 유형을 입력하세요 (기본값: work03): ").strip() or "work03"
    
    estimator = launch_training_job(work_type)
    
    if estimator:
        print("\n" + "=" * 60)
        print("다음 단계:")
        print("1. 학습 완료를 기다리세요 (약 1-3시간 소요)")
        print("2. 모델 평가를 수행하세요")
        print("3. deploy_model.py를 실행하여 엔드포인트를 배포하세요")
        print("=" * 60)


if __name__ == "__main__":
    main()
