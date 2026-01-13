import React, { useState } from 'react';
import Modal from 'react-modal';
import './WordStudyIntroModal.css';

interface WordStudyIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
}

const WordStudyIntroModal: React.FC<WordStudyIntroModalProps> = ({ isOpen, onClose, onNext }) => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // 예시 이미지들
  const exampleImages = [
    {
      id: 1,
      src: '/images/a02.png',
      alt: '영어-한글 단어 목록 예시 1',
      description: '영어 단어와 한글 뜻이 쌍으로 정리된 단어 목록'
    },
    {
      id: 2,
      src: '/images/a03.png',
      alt: '사전 페이지 예시',
      description: '영어 사전 페이지에서 단어와 뜻을 확인할 수 있습니다'
    },
    {
      id: 3,
      src: '/images/a04.png',
      alt: '단어 문제 예시',
      description: '단어 학습 문제나 연습 문제'
    },
    {
      id: 4,
      src: '/images/a05.png',
      alt: '단어장 예시',
      description: 'Day별로 정리된 단어장이나 단어 목록'
    }
  ];

  const handleImageClick = (imageSrc: string) => {
    setExpandedImage(imageSrc);
  };

  const handleCloseExpanded = () => {
    setExpandedImage(null);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        className="word-study-intro-modal"
        overlayClassName="word-study-intro-overlay"
        ariaHideApp={false}
      >
        <div className="word-study-intro-container">
          <div className="word-study-intro-header">
            <h2>📸 캡처 화면 준비하기</h2>
            <button 
              className="word-study-intro-close-btn"
              onClick={onClose}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          
          <div className="word-study-intro-content">
            <div className="intro-description">
              <p>
                단어문제를 생성하기 위해서는 <strong>영어 단어와 한글 뜻이 포함된 이미지</strong>를 캡처해야 합니다.
              </p>
              <p>
                아래와 같은 형태의 이미지를 캡처해주세요:
              </p>
            </div>

            <div className="example-images-grid">
              {exampleImages.map((image) => (
                <div key={image.id} className="example-image-item">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="example-image"
                    onClick={() => handleImageClick(image.src)}
                    onError={(e) => {
                      // 이미지 로드 실패 시 플레이스홀더 표시
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect width="300" height="200" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E이미지 예시%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <p className="example-image-description">{image.description}</p>
                </div>
              ))}
            </div>

            <div className="intro-tips">
              <h3>💡 캡처 팁</h3>
              <ul>
                <li>영어 단어와 한글 뜻이 모두 보이도록 캡처하세요</li>
                <li>텍스트가 선명하게 보이도록 밝은 곳에서 캡처하세요</li>
                <li>불필요한 부분은 제외하고 단어 목록만 캡처하세요</li>
                <li>여러 페이지를 연속으로 캡처할 수 있습니다</li>
              </ul>
            </div>
          </div>

          <div className="word-study-intro-footer">
            <button 
              className="word-study-intro-next-btn"
              onClick={onNext}
            >
              다음
            </button>
          </div>
        </div>
      </Modal>

      {/* 확대된 이미지 모달 */}
      {expandedImage && (
        <div className="expanded-image-overlay" onClick={handleCloseExpanded}>
          <div className="expanded-image-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className="expanded-image-close-btn"
              onClick={handleCloseExpanded}
              aria-label="닫기"
            >
              ×
            </button>
            <img 
              src={expandedImage} 
              alt="확대된 이미지"
              className="expanded-image"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default WordStudyIntroModal;
