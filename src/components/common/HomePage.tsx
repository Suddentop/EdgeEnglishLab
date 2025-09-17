import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  setCurrentQuiz?: (quiz: any) => void;
}

const HomePage: React.FC<HomePageProps> = ({ setCurrentQuiz }) => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const navigate = useNavigate();

  const services = [
    {
      id: 'sentence-order-test',
      title: '문단 순서 맞추기 문제',
      description: 'AI가 영어 본문을 의미 단위로 분석하여 4단락으로 분할하고 섞은 뒤, 원래의 본문 순서를 맞추는 문제를 자동 생성합니다. 독해력 향상과 논리적 사고력 개발에 효과적입니다.',
      icon: '📝',
      features: ['OpenAI GPT-4 기반 의미 분석', '교육과정 표준 준수', 'A4 인쇄 최적화', '즉시 문제지 생성'],
      path: '/work_01_article-order'
    },
    {
      id: 'reading-comprehension',
      title: '독해 문제 종합 생성',
      description: '원 본문의 내용을 체계적으로 분석하여 본문의 주요 단어를 같은 의미의 다른 단어로 교체한 뒤, 본문을 해석하는 문제를 생성합니다. 독해력 향상과 문해력 향상에 효과적입니다.',
      icon: '🔍',
      features: ['종합적 독해 능력 평가', '입시 유형 문제', '상세한 해설 제공', '난이도별 출제'],
      path: '/work_02_reading-comprehension'
    },
    {
      id: 'vocabulary-word',
      title: '빈칸(단어) 추론 문제',
      description: '주어진 영어 본문에서 중요한 단어를 선정하여 빈칸으로 제시하고, 그 빈칸에 들어갈 단어를 객관식으로 고르는 문제를 생성합니다. 실제 시험에 가까운 추론형 문제로 사고력과 독해력을 함께 키울 수 있습니다.',
      icon: '📚',
      features: ['중요 구 자동 선별', '객관식 빈칸 추론', '실제 시험 스타일', '자동 정답 생성'],
      path: '/work_03_vocabulary-word'
    },
    {
      id: 'blank-phrase-inference',
      title: '빈칸(구) 추론 문제',
      description: '영어 본문에서 주제와 가장 밀접한 구(phrase)를 빈칸으로 바꾸고, 객관식 5지선다 문제를 자동 생성합니다. 사고력과 독해력을 함께 키울 수 있습니다.',
      icon: '🧩',
      features: ['중요 구(phrase) 자동 선별', '객관식 빈칸 추론', '실제 시험 스타일', '자동 정답 생성'],
      path: '/work_04_blank-phrase-inference'
    },
    {
      id: 'blank-sentence-inference',
      title: '빈칸(문장) 추론 문제',
      description: '영어 본문에서 주제와 가장 밀접한 문장(sentence)을 빈칸으로 바꾸고, 객관식 5지선다 문제를 자동 생성합니다. 실제 시험에 가까운 추론형 문제로 사고력과 독해력을 함께 키울 수 있습니다.',
      icon: '✒️',
      features: ['중요 문장(sentence) 자동 선별', '객관식 빈칸 추론', '실제 시험 스타일', '자동 정답 생성'],
      path: '/work_05_blank-sentence-inference'
    },
    {
      id: 'sentence-position',
      title: '주요 문장 위치 찾기 문제',
      description: '영어 본문에서 가장 중요한 주제 문장을 찾아 본문에서 제거하고, 주어진 유요 문장이 들어가야 할 위치를 찾는 문제를 생성합니다. 문해력을 바탕으로 사고의 폭을 향상시킵니다.',
      icon: '🔲',
      features: ['주제 문장 자동 추출', '문장 위치 찾기', '원문자(①~⑤) 자동 삽입', '정답 위치 자동 표시'],
      path: '/work_06_sentence-position'
    },
    {
      id: 'main-idea-inference',
      title: '주제 추론 문제',
      description: '주어진 본문의 내용을 파악하여, 본문의 주제를 AI가 추론해 5지선다 객관식 문제로 출제합니다. 문해력을 바탕으로 사고의 폭을 향상시킵니다.',
      icon: '🧠',
      features: ['주제 자동 추론', '객관식 문제 생성', '정답/해설 인쇄', 'AI 기반 본문 분석'],
      path: '/work_07_main-idea-inference'
    },
    {
      id: 'title-inference',
      title: '제목 추론 문제',
      description: '주어진 본문의 주제의식에 맞는 제목을 AI가 추론해 5지선다 객관식 문제로 출제합니다. 문해력을 바탕으로 사고의 폭을 향상시킵니다.',
      icon: '🏷️',
      features: ['제목 자동 추론', '객관식 문제 생성', '정답/해설 인쇄', 'AI 기반 본문 분석'],
      path: '/work_08_title-inference'
    },
    {
      id: 'grammar-error',
      title: '어법 변형 문제',
      description: '주어진 본문에서 AI가 의미있는 단어를 선정하여 문법에 어긋나도록 변형 시킨 후, 잘못된 문법이 적용된 단어를 찾는 문제를 생성합니다. 문해력을 바탕으로 높은 문법적 사고를 필요로 합니다.',
      icon: '📝',
      features: ['어법 변형 자동', '객관식 문제 생성', '정답/해설 인쇄', 'AI 기반 본문 분석'],
      path: '/work_09_grammar-error'
    },
    {
      id: 'multi-grammar-error',
      title: '다중 어법 오류 찾기 문제',
      description: '주어진 본문에서 AI 어법(문법)을 변형시킨 다수의 단어를 찾는 문제를 생성합니다. 빠른 독해력과 높은 문법적 사고를 바탕으로 사고의 폭을 향상시킵니다.',
      icon: '🧮',
      features: ['복수의 어법에 오류 찾기', '객관식 정답 선택', '정답/해설 인쇄', 'AI 기반 본문 분석'],
      path: '/work_10_multi-grammar-error'
    },
    {
      id: 'sentence-translation',
      title: '본문 문장별 해석',
      description: '주어진 본문을 문장별로 분할하여 독해 연습을 할 수 있는 문제를 생성합니다. 기본적인 영어 독해력을 향상시키는데 도움이 됩니다.',
      path: '/work_11_sentence-translation',
      icon: '📝',
      features: ['문장별 해석 작성', 'AI 기반 본문 분석', '정답/해설 인쇄', '다양한 입력 방식']
    },
    {
      id: 'word-study',
      title: '단어 학습 문제',
      description: '학습에 필요한 영어단어-한글뜻을 입력하면, 영어단어를 제시하고 한글뜻을 맞추거나, 한글뜻에 따라 영어단어를 맞추는 문제를 생성합니다. 어휘력을 향상키키고, 시험 대비에 큰 도움이 됩니다.',
      path: '/work_12_word-study',
      icon: '📚',
      features: ['영어단어-한글뜻 정리', '영어단어-(___) 뜻 맞추기', '한글뜻-(___) 영어단어 맞추기', '정답/해설 인쇄']
    }
  ];

  return (
    <div className="homepage">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">교육 전문가를 위한 AI 영어 문제 생성 플랫폼</h1>
          <p className="hero-description">
            학원과 강사님들의 수업 준비 시간을 대폭 단축하고, 교육 품질을 한 단계 높여주는 전문적인 AI 솔루션입니다.
          </p>
          <p className="hero-description">
            복잡한 문제 제작 과정을 간소화하여 교육에만 집중할 수 있습니다.
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">GPT-5</div>
              <div className="stat-label">AI 엔진 기반</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">14가지</div>
              <div className="stat-label">문제 유형</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50%</div>
              <div className="stat-label">시간 절약</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">즉시</div>
              <div className="stat-label">문제지 생성</div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-to-work-section">
        <div className="how-to-work-content">
          <h3 className="how-to-work-title">
            <span className="title-highlight">문제 생성</span> 프로세스
          </h3>
          <p className="how-to-work-description">
            간단한 3단계로 전문적인 영어 문제를 생성하세요
          </p>
          <div className="how-to-work-image-container">
            <div className="image-wrapper">
              <img 
                src="/howtowork.png" 
                alt="문제 생성 프로세스" 
                className="how-to-work-image"
              />
              <div className="image-glow"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="services-section">
        <div className="services-header">
          <h3>전문 교육 서비스</h3>
          <p>체계적이고 효과적인 영어 교육을 위한 AI 기반 문제 생성 도구</p>
        </div>
        
        <div className="services-grid">
          {services.map((service) => (
            <div 
              key={service.id} 
              className="service-card"
              onClick={() => {
                if (setCurrentQuiz) setCurrentQuiz(null);
                navigate(service.path);
              }}
            >
              <div className="service-icon">{service.icon}</div>
              <h2 className="service-title">{service.title}</h2>
              <p className="service-description">{service.description}</p>
              <ul className="service-features">
                {service.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              <button className="service-button">
                문제 생성하기 →
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="features-section">
        <div className="features-header">
          <h3>Edge English Lab을 선택하는 이유</h3>
        </div>
        
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">🎓</div>
            <h4>교육 전문성</h4>
            <p>교육과정 표준을 준수하며, 실제 수업과 시험에 바로 활용 가능한 고품질 문제를 생성합니다.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⏰</div>
            <h4>효율성 극대화</h4>
            <p>문제 제작에 소요되는 시간을 90% 단축하여 강사님들이 교육에만 집중할 수 있습니다.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📋</div>
            <h4>즉시 활용</h4>
            <p>A4 용지에 최적화된 레이아웃으로 생성 즉시 인쇄하여 수업에 바로 활용 가능합니다.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔧</div>
            <h4>맞춤형 설정</h4>
            <p>난이도와 문제 유형을 세밀하게 조정하여 학습자 수준에 맞는 최적의 문제를 제공합니다.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💡</div>
            <h4>지능적 분석</h4>
            <p>AI가 텍스트의 의미와 구조를 정확히 분석하여 교육적 가치가 높은 문제를 생성합니다.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🏆</div>
            <h4>검증된 품질</h4>
            <p>교육 현장에서 검증된 문제 패턴과 형식을 기반으로 신뢰할 수 있는 평가 도구를 제공합니다.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h3>교육의 혁신을 경험해보세요</h3>
          <p>AI 기반 영어 문제 생성으로 수업의 질을 높이고 준비 시간을 단축하세요</p>
          <div className="cta-buttons">
            <button 
              className="cta-primary"
              onClick={() => navigate('/sample-problems')}
            >
              샘플 문제 다운로드
            </button>
          </div>
        </div>
      </section>

      {/* 푸터 섹션 */}
      <footer className="App-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Edge English Lab</h3>
            <p>AI 기반 영어 교육 솔루션의 선두주자교육의 미래를 만들어갑니다.</p>
          </div>
         </div>
         <div className="footer-bottom">
          <p>
            고객센터 : jcombizone@naver.com 
            <a href="mailto:jcombizone@naver.com" className="footer-link">[이메일 문의]</a> | 
            <button onClick={() => setShowTerms(true)} className="footer-link-btn">이용약관</button> | 
            <button onClick={() => setShowPrivacy(true)} className="footer-link-btn">개인정보처리방침</button>
          </p>
          <p>주소 : 인천광역시 연수구 연구단지로55번길 16, 602호</p>
          <p>사업자등록번호 : 751-87-03106 | 통신판매업 : 2025-인천연수구-1970호 | 주식회사 제이커머스</p>
          <p>Copyright © Jcommerce, All rights reserved</p>
        </div>
      </footer>

      {/* 이용약관 모달 */}
      {showTerms && (
        <div className="modal-overlay" onClick={() => setShowTerms(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>영어 문제 생성 플랫폼 이용약관</h2>
              <button className="modal-close" onClick={() => setShowTerms(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>시행일자:</strong> 2025년 08월 01일</p>

              <h3>제1조 (목적)</h3>
              <p>이 약관은 회원이 영어 문제 생성 웹사이트(이하 "플랫폼")에서 제공하는 서비스(문제 생성 및 다운로드 포함)를 이용함에 있어 회사와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

              <h3>제2조 (정의)</h3>
              <p>이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
              <ul>
                <li>① "회원"이란 플랫폼에 가입하여 이 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                <li>② "포인트"란 회사가 제공하는 서비스를 유료로 이용하기 위해 회원이 구매하거나 지급받은 가상의 결제 수단을 의미합니다.</li>
                <li>③ "문제 생성 서비스"란 회원이 제공한 텍스트를 기반으로 회사가 AI 등을 통해 영어 문제를 자동 생성하고 PDF 파일로 제공하는 서비스를 의미합니다.</li>
              </ul>

              <h3>제3조 (약관의 효력 및 변경)</h3>
              <ul>
                <li>① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력을 발생합니다.</li>
                <li>② 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 사전 고지합니다.</li>
              </ul>

              <h3>제4조 (서비스 이용)</h3>
              <ul>
                <li>① 회원은 포인트를 사용하여 문제 생성 서비스를 이용할 수 있으며, 생성된 문제는 PDF 형태로 다운로드됩니다.</li>
                <li>② 문제 생성에 필요한 텍스트 콘텐츠는 회원이 자발적으로 제공하며, 제공된 콘텐츠의 저작권과 관련된 모든 책임은 회원에게 있습니다.</li>
              </ul>

              <h3>제5조 (포인트 결제 및 환불)</h3>
              <ul>
                <li>① 포인트는 회사가 지정한 결제수단(신용카드, 계좌이체 등)을 통해 구매할 수 있습니다.</li>
                <li>② 사용된 포인트는 환불되지 않으며, 미사용 포인트는 구매일로부터 5년간 유효합니다.</li>
                <li>③ 회원은 충전한 포인트에 대해 잔여 금액이 있는 경우, 전자상거래법 등 관련 법령에 따라 환불을 요청할 수 있습니다.</li>
              </ul>

              <h3>제6조 (포인트 유효기간 및 소멸정책)</h3>
              <ul>
                <li>① 유상으로 충전한 포인트의 유효기간은 5년이며, 기간이 경과하면 자동 소멸됩니다.</li>
                <li>② 회사가 이벤트 등을 통해 무상 지급한 포인트는 별도 고지된 유효기간 내 사용하지 않을 경우 소멸될 수 있습니다.</li>
              </ul>

              <h3>제7조 (지적재산권 및 콘텐츠 책임)</h3>
              <ul>
                <li>① 회원이 제공한 텍스트 및 생성된 문제의 저작권과 책임은 회원 본인에게 있으며, 회사는 해당 콘텐츠의 법적 책임을 지지 않습니다.</li>
                <li>② 회사는 문제가 생성된 PDF 결과물에 대해 복사, 배포, 유통 등의 행위를 하지 않습니다.</li>
              </ul>

              <h3>제8조 (면책)</h3>
              <ul>
                <li>① 회원이 제공한 콘텐츠의 오류, 부정확성, 저작권 위반 등으로 발생한 문제에 대해 회사는 일체 책임을 지지 않습니다.</li>
                <li>② 문제 생성 결과는 자동화된 알고리즘을 기반으로 하며, 모든 교육적·학술적 정확성을 보장하지 않습니다.</li>
              </ul>

              <h3>제9조 (이용제한 및 계약 해지)</h3>
              <ul>
                <li>① 회사는 회원이 본 약관 또는 관계 법령을 위반한 경우 서비스 이용을 제한하거나 탈퇴 처리할 수 있습니다.</li>
              </ul>

              <h3>제10조 (분쟁 해결)</h3>
              <ul>
                <li>① 회사와 회원 간의 분쟁은 상호 협의를 통해 해결하며, 협의가 어려울 경우 회사 본사 소재지 관할 법원에 제소할 수 있습니다.</li>
              </ul>

              <p><strong>[부칙]</strong></p>
              <p>이 약관은 2025년 08월 01일부터 시행합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 개인정보처리방침 모달 */}
      {showPrivacy && (
        <div className="modal-overlay" onClick={() => setShowPrivacy(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>개인정보처리방침</h2>
              <button className="modal-close" onClick={() => setShowPrivacy(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>시행일자:</strong> 2025년 08월 01일</p>

              <h3>제1조 (수집하는 개인정보 항목)</h3>
              <ul>
                <li>① 회원 가입 시: 이름, 이메일, 비밀번호</li>
                <li>② 포인트 결제 시: 결제수단 정보(카드사, 결제 승인정보 등)</li>
                <li>③ 서비스 이용 시: IP 주소, 브라우저 정보, 이용 기록, 접속 로그, 쿠키</li>
                <li>④ 고객 문의 시: 이메일 주소, 문의 내용</li>
              </ul>

              <h3>제2조 (개인정보의 수집 및 이용 목적)</h3>
              <ul>
                <li>① 회원 식별 및 인증</li>
                <li>② 문제 생성 서비스 제공 및 이력 관리</li>
                <li>③ 결제 처리 및 포인트 관리</li>
                <li>④ 고객 문의 응대 및 민원 처리</li>
                <li>⑤ 서비스 품질 향상 및 통계 분석</li>
                <li>⑥ 법적 의무 이행</li>
              </ul>

              <h3>제3조 (개인정보의 보유 및 이용기간)</h3>
              <ul>
                <li>① 회원 탈퇴 시 지체 없이 파기</li>
                <li>② 단, 다음 정보는 관련 법령에 따라 일정 기간 보관</li>
              </ul>
              <div style={{margin: '1rem 0', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '2px solid #ddd'}}>
                      <th style={{padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #ddd'}}>보존 항목</th>
                      <th style={{padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #ddd'}}>보존 이유</th>
                      <th style={{padding: '0.5rem', textAlign: 'left'}}>보존 기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderBottom: '1px solid #ddd'}}>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>계약 또는 청약철회 기록</td>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>전자상거래법</td>
                      <td style={{padding: '0.5rem'}}>5년</td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #ddd'}}>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>결제 및 서비스 이용 내역</td>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>전자상거래법</td>
                      <td style={{padding: '0.5rem'}}>5년</td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #ddd'}}>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>소비자 불만 및 분쟁처리</td>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>전자상거래법</td>
                      <td style={{padding: '0.5rem'}}>3년</td>
                    </tr>
                    <tr>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>접속 기록(IP 등)</td>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>통신비밀보호법</td>
                      <td style={{padding: '0.5rem'}}>3개월</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>제4조 (개인정보 제3자 제공)</h3>
              <p>회사는 회원의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 다음의 경우 예외로 합니다:</p>
              <ul>
                <li>① 법령에 의거하거나 수사기관 요청 시</li>
                <li>② 회원의 사전 동의를 받은 경우</li>
              </ul>

              <h3>제5조 (개인정보 처리 위탁)</h3>
              <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁할 수 있습니다.</p>
              <div style={{margin: '1rem 0', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '2px solid #ddd'}}>
                      <th style={{padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #ddd'}}>수탁자</th>
                      <th style={{padding: '0.5rem', textAlign: 'left'}}>위탁 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderBottom: '1px solid #ddd'}}>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>결제대행사 (KG이니시스 등)</td>
                      <td style={{padding: '0.5rem'}}>포인트 결제 처리</td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #ddd'}}>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>Firebase, Dothome 등</td>
                      <td style={{padding: '0.5rem'}}>서버 운영 및 데이터 저장</td>
                    </tr>
                    <tr>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>이메일 발송 서비스 제공자</td>
                      <td style={{padding: '0.5rem'}}>알림메일, 인증메일 발송</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>제6조 (개인정보의 파기 절차 및 방법)</h3>
              <ul>
                <li>① 보존 기간 경과 또는 목적 달성 시 즉시 파기</li>
                <li>② 전자적 파일: 복구 불가능한 방식으로 삭제</li>
                <li>③ 종이 문서: 분쇄 또는 소각</li>
              </ul>

              <h3>제7조 (이용자의 권리와 행사 방법)</h3>
              <ul>
                <li>① 언제든지 본인의 개인정보 열람, 정정, 삭제 요청 가능</li>
                <li>② 회원 탈퇴 시 개인정보는 지체 없이 파기</li>
                <li>③ 이메일 또는 고객센터를 통해 요청 가능</li>
              </ul>

              <h3>제8조 (개인정보 자동 수집 장치의 설치 및 거부)</h3>
              <ul>
                <li>① 회사는 쿠키 등 자동 수집 장치를 운영할 수 있습니다.</li>
                <li>② 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.</li>
              </ul>

              <h3>제9조 (개인정보 보호책임자)</h3>
              <p>회사는 개인정보 처리에 대한 책임을 지는 책임자를 지정하고 있습니다.</p>
              <p>
                - 성명: 민경호<br/>
                - 이메일: jcombizone@gmail.com<br/>
                - 문의 방법: 이메일 또는 고객센터
              </p>

              <h3>제10조 (고지의 의무)</h3>
              <p>이 개인정보처리방침은 관련 법령이나 내부 정책에 따라 변경될 수 있으며, 변경 시 플랫폼 내 공지사항을 통해 사전 고지합니다.</p>

              <p><strong>[부칙]</strong></p>
              <p>본 방침은 2025년 08월 01일부터 시행됩니다.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage; 