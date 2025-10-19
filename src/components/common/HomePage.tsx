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
          <h1 className="hero-title">영어 교육 전문가를 위한 AI 영어 문제 생성 플랫폼</h1>
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

      <section className="cta-section">
        <div className="cta-content">
          <h3>영어 학습 지도를 위한 새로운 툴을 경험해보세요</h3>
          <p>AI 모델링을 통해 특화된 영어 문제 생성으로 준비 시간을 단축하고 집중력 있는 학습을 유도합니다</p>
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

      {/* 푸터 섹션 */}
      <footer className="App-footer">
        <div className="footer-content">
          <div className="footer-left">
            <div className="company-info">
              <p className="company-name">주식회사 제이커머스</p>
              <p className="company-details">
                인천광역시 연수구 연구단지로55번길 16, 602호<br />
              jcomtax@naver.com
              </p>
              <p className="contact-info">
                전화번호 : 032-264-0501 / 대표: 김동연 / 사업자등록번호: 751-87-03106<br />
                통신판매업 신고번호: 2025-인천연수구-1970호
              </p>
              <p className="copyright">COPYRIGHT(C) JCommerce CO. ALL RIGHTS RESERVED.</p>
            </div>
          </div>
          <div className="footer-right">
            <div className="policy-links">
              <button onClick={() => setShowPrivacy(true)} className="footer-link-btn">개인정보처리방침</button>
              <button onClick={() => setShowTerms(true)} className="footer-link-btn">이용약관</button>
            </div>
          </div>
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
                <li>① "서비스"라 함은 구현되는 단말기(PC, TV, 휴대형단말기 등의 각종 유무선 장치를 포함)와 상관없이 "회원"이 이용할 수 있는 "플랫폼" 및 관련 제반 서비스를 의미합니다.</li>
                <li>② "회원"이란 플랫폼에 가입하여 이 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                <li>③ "아이디(ID)"라 함은 "회원"의 식별과 "서비스" 이용을 위하여 "회원"이 정하고 "회사"가 승인하는 문자, 숫자, 특수문자의 조합을 의미합니다.</li>
                <li>④ "비밀번호"라 함은 "회원"이 부여 받은 "아이디"와 일치되는 "회원"임을 확인하고 비밀보호를 위해 "회원" 자신이 정한 문자 또는 숫자의 조합을 의미합니다.</li>
                <li>⑤ "포인트"란 회사가 제공하는 서비스를 유료로 이용하기 위해 회원이 구매하거나 지급받은 가상의 결제 수단을 의미합니다.</li>
                <li>⑥ "문제 생성 서비스"란 회원이 제공한 텍스트를 기반으로 회사가 AI 등을 통해 영어 문제를 자동 생성하고 PDF 파일로 제공하는 서비스를 의미합니다.</li>
                <li>⑦ "게시물"이라 함은 "회사" 및 "회원"이 "서비스"를 이용함에 있어 "서비스"상에 게시한 부호ㆍ문자ㆍ음성ㆍ음향ㆍ화상ㆍ동영상 등의 정보 형태의 글, 사진, 동영상 및 각종 파일과 링크 등을 의미합니다.</li>
              </ul>

              <h3>제3조 (약관의 게시와 개정)</h3>
              <ul>
                <li>① "회사"는 이 약관의 내용을 "회원"이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</li>
                <li>② "회사"는 "약관의규제에관한법률", "정보통신망이용촉진및정보보호등에관한법률(이하 "정보통신망법")" 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</li>
                <li>③ "회사"가 약관을 개정할 경우에는 지체없이 적용일자 및 주요 개정 사유를 명시하여 서비스 내에 공지합니다.</li>
                <li>④ "회사"가 전항에 따라 개정약관을 공지 후 30일 이내 "회원"이 명시적으로 거부의 의사표시를 하지 아니한 경우 "회원"이 개정약관에 동의한 것으로 봅니다.</li>
                <li>⑤ "회원"은 변경된 약관에 동의하지 않을 경우 "회원" 탈퇴(해지)를 요청할 수 있습니다.</li>
              </ul>

              <h3>제4조 (약관의 해석)</h3>
              <ul>
                <li>① "회사"는 "유료서비스" 및 개별 서비스에 대해서는 별도의 이용약관 및 정책(이하 "유료서비스약관 등")을 둘 수 있으며, 해당 내용이 이 약관과 상충할 경우에는 "유료서비스약관 등"이 우선하여 적용됩니다.</li>
                <li>② 이 약관에서 정하지 아니한 사항이나 해석에 대해서는 "유료서비스약관 등" 및 관계법령 또는 상관례에 따릅니다.</li>
              </ul>

              <h3>제5조 (포인트 이용 및 환불)</h3>
              <ul>
                <li>① "포인트"는 문제 생성 서비스를 사용하기 위하여 이용되는 결제 수단으로 신용카드, 계좌이체 등의 결제 과정을 거쳐 충전이 가능합니다.</li>
                <li>② "회사"는 "회원"이 서비스를 이용하는 경우 "회사"의 정책에 따라 "회원"에게 "포인트"를 부여할 수 있습니다.</li>
                <li>③ "회원"은 "회사"가 정하는 절차와 조건에 따라 서비스 이용 시 "포인트"를 사용할 수 있습니다.</li>
                <li>④ "포인트"의 유효기간은 각 포인트의 적립 조건에 따라 정해진 정책을 따릅니다. 유효기간 만료 시 포인트는 자동 소멸되며 복구되지 않습니다.</li>
                <li>⑤ "회원"이 직접 신용카드, 계좌이체 등의 결제 과정을 거쳐 "포인트"를 충전한 경우 "포인트"의 유효기간은 각 포인트의 충전 일로부터 5년까지 유효합니다.</li>
                <li>⑥ "회원"이 이벤트 등을 통하여 "회사"로부터 "포인트"를 무료로 제공받은 경우 "회사"에서 정한 기한에 한해서만 이용이 가능합니다.</li>
                <li>⑦ "회원"은 "포인트"를 본인의 거래에 대해서만 사용할 수 있으며, 어떠한 경우라도 타인에게 매매 또는 양도할 수 없습니다.</li>
                <li>⑧ "회원"이 부당 또는 부정하게 "포인트"를 취득한 경우 "회원"은 "포인트"를 사용할 수 없으며 "회사"는 이를 회수할 수 있습니다.</li>
                <li>⑨ "포인트"의 환불 정책은 각 "포인트"의 적립 조건에 따라 정해진 정책을 따르며 환불 요청 후 업무일 기준 15일 이내에 환불처리를 합니다.</li>
                <li>⑩ "회원"이 직접 신용카드, 계좌이체 등의 결제 과정을 거쳐 "포인트"를 충전한 경우 충전일로부터 3일 이내 환불 신청 시: 잔여 환불대상 금액의 100% 환불 가능합니다.</li>
                <li>⑪ "회원"이 직접 신용카드, 계좌이체 등의 결제 과정을 거쳐 "포인트"를 충전한 경우 충전일로부터 3일 초과하여 환불 신청 시: 잔여 환불대상 금액의 90% 환불합니다.</li>
                <li>⑫ "회원"이 "회사"로부터 "포인트"를 무상으로 제공받은 경우 환불할 수 없으며, "회사"는 그 기한과 이용 방법을 별도로 정할 수 있습니다.</li>
              </ul>

              <h3>제6조 (이용계약 체결)</h3>
              <ul>
                <li>① 이용계약은 "회원"이 되고자 하는 자가 약관의 내용에 대하여 동의를 한 다음 "회원"가입신청을 하고 "회사"가 이러한 신청에 대하여 승낙함으로써 체결됩니다.</li>
                <li>② "회사"는 가입신청자의 신청에 대하여 "서비스" 이용을 승낙함을 원칙으로 합니다. 다만, "회사"는 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다.</li>
                <ul>
                  <li>1) 가입신청자가 이 약관에 의하여 이전에 "회원"자격을 상실한 적이 있는 경우</li>
                  <li>2) 실명이 아니거나 타인의 명의를 이용한 경우</li>
                  <li>3) 허위의 정보를 기재하거나, "회사"가 제시하는 내용을 기재하지 않은 경우</li>
                  <li>4) 14세 미만 아동이 법정대리인(부모 등)의 동의를 얻지 아니한 경우</li>
                  <li>5) "회원"의 귀책사유로 인하여 승인이 불가능하거나 기타 규정한 제반 사항을 위반하며 신청하는 경우</li>
                </ul>
                <li>③ 제1항에 따른 신청에 있어 "회사"는 "회원"의 종류에 따라 전문기관을 통한 실명확인 및 본인인증을 요청할 수 있습니다.</li>
                <li>④ "회사"는 서비스관련설비의 여유가 없거나, 기술상 또는 업무상 문제가 있는 경우에는 승낙을 유보할 수 있습니다.</li>
                <li>⑤ 이용계약의 성립 시기는 "회사"가 가입완료를 신청절차 상에서 표시한 시점으로 합니다.</li>
              </ul>

              <h3>제7조 ("회원"정보의 변경)</h3>
              <ul>
                <li>① "회원"은 개인정보관리화면을 통하여 언제든지 본인의 개인정보를 열람하고 수정할 수 있습니다. 다만, 서비스 관리를 위해 필요한 실명, 주민등록번호, 아이디 등은 수정이 불가능합니다.</li>
                <li>② "회원"은 "회원"가입신청 시 기재한 사항이 변경되었을 경우 온라인으로 수정을 하거나 전자우편 기타 방법으로 "회사"에 대하여 그 변경사항을 알려야 합니다.</li>
                <li>③ 제2항의 변경사항을 "회사"에 알리지 않아 발생한 불이익에 대하여 "회사"는 책임지지 않습니다.</li>
              </ul>

              <h3>제8조 (개인정보보호 의무)</h3>
              <ul>
                <li>① "회사"는 "정보통신망법" 등 관계 법령이 정하는 바에 따라 "회원"의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련법 및 "회사"의 개인정보취급방침이 적용됩니다.</li>
              </ul>

              <h3>제9조 ("회원"의 "아이디" 및 "비밀번호"의 관리에 대한 의무)</h3>
              <ul>
                <li>① "회원"의 "아이디"와 "비밀번호"에 관한 관리책임은 "회원"에게 있으며, 이를 제3자가 이용하도록 하여서는 안 됩니다.</li>
                <li>② "회사"는 "회원"의 "아이디"가 개인정보 유출 우려가 있거나, 반사회적 또는 미풍양속에 어긋나거나 "회사" 및 "회사"의 운영자로 오인한 우려가 있는 경우, 해당 "아이디"의 이용을 제한할 수 있습니다.</li>
                <li>③ "회원"은 "아이디" 및 "비밀번호"가 도용되거나 제3자가 사용하고 있음을 인지한 경우에는 이를 즉시 "회사"에 통지하고 "회사"의 안내에 따라야 합니다.</li>
                <li>④ 제3항의 경우에 해당 "회원"이 "회사"에 그 사실을 통지하지 않거나, 통지한 경우에도 "회사"의 안내에 따르지 않아 발생한 불이익에 대하여 "회사"는 책임지지 않습니다.</li>
              </ul>

              <h3>제10조 ("회원"에 대한 통지)</h3>
              <ul>
                <li>① "회사"가 "회원"에 대한 통지를 하는 경우 이 약관에 별도 규정이 없는 한 서비스 내 전자우편주소 등으로 할 수 있습니다.</li>
                <li>② "회사"는 "회원" 전체에 대한 통지의 경우 7일 이상 "회사"의 게시판에 게시함으로써 제1항의 통지에 갈음할 수 있습니다.</li>
              </ul>

              <h3>제11조 ("회사"의 의무)</h3>
              <ul>
                <li>① "회사"는 관련법과 이 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 "서비스"를 제공하기 위하여 최선을 다하여 노력합니다.</li>
                <li>② "회사"는 "회원"이 안전하게 "서비스"를 이용할 수 있도록 개인정보(신용정보 포함)보호를 위해 보안시스템을 갖추어야 하며 개인정보취급방침을 공시하고 준수합니다.</li>
                <li>③ "회사"는 서비스이용과 관련하여 "회원"으로부터 제기된 의견이나 불만이 정당하다고 인정할 경우에는 이를 처리하여야 합니다.</li>
              </ul>

              <h3>제12조 ("회원"의 의무)</h3>
              <ul>
                <li>① "회원"은 다음 행위를 하여서는 안 됩니다.</li>
                <ul>
                  <li>1) "회원" 정보신청 또는 변경 시 허위내용의 등록</li>
                  <li>2) 타인의 정보도용</li>
                  <li>3) "회사"가 게시한 정보의 변경</li>
                  <li>4) "회사"가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                  <li>5) "회사"와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                  <li>6) "회사" 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                  <li>7) 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 "서비스"에 공개 또는 게시하는 행위</li>
                  <li>8) "회사"의 동의 없이 영리를 목적으로 "서비스"를 사용하는 행위</li>
                  <li>9) 기타 불법적이거나 부당한 행위</li>
                </ul>
                <li>② "회원"은 관계법, 이 약관의 규정, 이용안내 및 "서비스"와 관련하여 공지한 주의사항, "회사"가 통지하는 사항 등을 준수하여야 하며, 기타 "회사"의 업무에 방해되는 행위를 하여서는 안 됩니다.</li>
              </ul>

              <h3>제13조 ("서비스"의 제공 등)</h3>
              <ul>
                <li>① "회사"는 "회원"에게 아래와 같은 서비스를 제공합니다.</li>
                <ul>
                  <li>1) 문제 생성 플랫폼</li>
                  <li>2) 기타 "회사"가 추가 개발하거나 다른 "회사"와의 제휴계약 등을 통해 "회원"에게 제공하는 일체의 서비스</li>
                </ul>
                <li>② "서비스"는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.</li>
                <li>③ "회사"는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 "서비스"의 제공을 일시적으로 중단할 수 있습니다.</li>
              </ul>

              <h3>제14조 ("서비스"의 변경)</h3>
              <ul>
                <li>① "회사"는 상당한 이유가 있는 경우에 운영상, 기술상의 필요에 따라 제공하고 있는 전부 또는 일부 "서비스"를 변경할 수 있습니다.</li>
                <li>② "서비스"의 내용, 이용방법, 이용시간에 대하여 변경이 있는 경우에는 변경사유, 변경될 서비스의 내용 및 제공일자 등은 그 변경 전에 해당 서비스 초기화면에 게시하여야 합니다.</li>
                <li>③ "회사"는 무료로 제공되는 서비스의 일부 또는 전부를 "회사"의 정책 및 운영의 필요상 수정, 중단, 변경할 수 있으며, 이에 대하여 관련법에 특별한 규정이 없는 한 "회원"에게 별도의 보상을 하지 않습니다.</li>
              </ul>

              <h3>제15조 (정보의 제공 및 광고의 게재)</h3>
              <ul>
                <li>① "회사"는 "회원"이 "서비스" 이용 중 필요하다고 인정되는 다양한 정보를 공지사항이나 전자우편 등의 방법으로 "회원"에게 제공할 수 있습니다.</li>
                <li>② "회사"는 "서비스"의 운영과 관련하여 서비스 화면, 홈페이지, 전자우편 등에 광고를 게재할 수 있습니다.</li>
              </ul>

              <h3>제16조 ("게시물"의 저작권)</h3>
              <ul>
                <li>① "회원"이 "서비스" 내에 게시한 "게시물"의 저작권은 해당 게시물의 저작자에게 귀속됩니다.</li>
                <li>② "회원"이 "서비스" 내에 게시하는 "게시물"은 "서비스" 및 관련 프로모션 등에 노출될 수 있으며, 해당 노출을 위해 필요한 범위 내에서는 일부 수정, 복제, 편집되어 게시될 수 있습니다.</li>
                <li>③ "회사"는 제2항 이외의 방법으로 "회원"의 "게시물"을 이용하고자 하는 경우에는 전화, 팩스, 전자우편 등을 통해 사전에 "회원"의 동의를 얻어야 합니다.</li>
              </ul>

              <h3>제17조 ("게시물"의 관리)</h3>
              <ul>
                <li>① "회원"의 "게시물"이 "정보통신망법" 및 "저작권법"등 관련법에 위반되는 내용을 포함하는 경우, 권리자는 관련법이 정한 절차에 따라 해당 "게시물"의 게시중단 및 삭제 등을 요청할 수 있으며, "회사"는 관련법에 따라 조치를 취하여야 합니다.</li>
                <li>② "회사"는 전항에 따른 권리자의 요청이 없는 경우라도 권리침해가 인정될 만한 사유가 있거나 기타 "회사" 정책 및 관련법에 위반되는 경우에는 관련법에 따라 해당 "게시물"에 대해 임시조치 등을 취할 수 있습니다.</li>
              </ul>

              <h3>제18조 (권리의 귀속)</h3>
              <ul>
                <li>① "서비스"에 대한 저작권 및 지적재산권은 "회사"에 귀속됩니다. 단, "회원"의 "게시물" 및 제휴계약에 따라 제공된 저작물 등은 제외합니다.</li>
                <li>② "회사"는 서비스와 관련하여 "회원"에게 "회사"가 정한 이용조건에 따라 계정, "아이디", 콘텐츠, "포인트" 등을 이용할 수 있는 권한을 부여하며, "회원"은 이를 양도, 판매, 담보제공 등의 처분행위를 할 수 없습니다.</li>
              </ul>

              <h3>제19조 (계약해제, 해지 등)</h3>
              <ul>
                <li>① "회원"은 언제든지 서비스초기화면의 고객센터 또는 내 정보 관리 메뉴 등을 통하여 이용계약 해지 신청을 할 수 있으며, "회사"는 관련법 등이 정하는 바에 따라 이를 즉시 처리하여야 합니다.</li>
                <li>② "회원"이 계약을 해지할 경우, 관련법 및 개인정보취급방침에 따라 "회사"가 "회원"정보를 보유하는 경우를 제외하고는 해지 즉시 "회원"의 모든 데이터는 소멸됩니다.</li>
                <li>③ "회원"이 계약을 해지하는 경우, "회원"이 작성한 "게시물" 중 메일 등과 같이 본인 계정에 등록된 게시물 일체는 삭제됩니다.</li>
              </ul>

              <h3>제20조 (이용제한 등)</h3>
              <ul>
                <li>① "회사"는 "회원"이 이 약관의 의무를 위반하거나 "서비스"의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등으로 "서비스" 이용을 단계적으로 제한할 수 있습니다.</li>
                <li>② "회사"는 전항에도 불구하고, "주민등록법"을 위반한 명의도용 및 결제도용, "저작권법" 및 "컴퓨터프로그램보호법"을 위반한 불법프로그램의 제공 및 운영방해, "정보통신망법"을 위반한 불법통신 및 해킹, 악성프로그램의 배포, 접속권한 초과행위 등과 같이 관련법을 위반한 경우에는 즉시 영구이용정지를 할 수 있습니다.</li>
                <li>③ "회사"는 "회원"이 계속해서 1년 이상 로그인하지 않는 경우, "회원"정보의 보호 및 운영의 효율성을 위해 이용을 제한할 수 있습니다.</li>
              </ul>

              <h3>제21조 (책임제한)</h3>
              <ul>
                <li>① "회사"는 천재지변 또는 이에 준하는 불가항력으로 인하여 "서비스"를 제공할 수 없는 경우에는 "서비스" 제공에 관한 책임이 면제됩니다.</li>
                <li>② "회사"는 "회원"의 귀책사유로 인한 "서비스" 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
                <li>③ "회사"는 "회원"이 "서비스"와 관련하여 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</li>
                <li>④ "회사"는 "회원" 간 또는 "회원"과 제3자 상호간에 "서비스"를 매개로 하여 거래 등을 한 경우에는 책임이 면제됩니다.</li>
                <li>⑤ "회사"는 무료로 제공되는 서비스 이용과 관련하여 관련법에 특별한 규정이 없는 한 책임을 지지 않습니다.</li>
              </ul>

              <h3>제22조 (준거법 및 재판관할)</h3>
              <ul>
                <li>① "회사"와 "회원"간 제기된 소송은 대한민국법을 준거법으로 합니다.</li>
                <li>② "회사"와 "회원"간 발생한 분쟁에 관한 소송은 제소 당시의 "회원"의 주소에 의하고, 주소가 없는 경우 거소를 관할하는 지방법원의 전속관할로 합니다.</li>
                <li>③ 해외에 주소나 거소가 있는 '회원'의 경우 '회사'와 '회원'간 발생한 분쟁에 관한 소송은 전항에도 불구하고 대한민국 서울중앙지방법원을 관할 법원으로 합니다.</li>
              </ul>

              <h3>제23조 (아이디 공유 차단)</h3>
              <ul>
                <li>① 정상적인 "서비스" 이용을 위하여 1인 1 아이디를 원칙으로 합니다.</li>
                <li>② 아이디의 공유 행위 등으로 인해 회사의 정상적인 운영에 피해를 주거나 다른 "회원"들에게 손해를 끼친다고 판단될 시 제20조 "이용제한 등"의 규제를 적용할 수 있습니다.</li>
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
              <p>정보통신망법 규정에 따라 워크시트메이커에 회원가입을 신청하시는 분께 개인정보 수집 및 이용목적, 수집하는 개인정보의 항목, 개인정보의 보유 및 이용기간을 안내해 드리오니, 읽으신 후 동의하여 주시기 바랍니다.</p>

              <h3>1. 개인정보의 수집 및 이용목적</h3>
              <p>워크시트메이커는 이용자의 소중한 개인정보를 아래의 목적으로만 이용합니다.</p>
              <ul>
                <li>1) 회원 식별, 본인확인, 문제회원의 부정 이용 방지</li>
                <li>2) 각종 서비스 제공, 문의사항 처리, 공지사항 전달</li>
                <li>3) 약정한 서비스 제공, 유료 서비스 이용에 대한 요금 결제</li>
                <li>4) 마케팅 및 광고에 활용, 이벤트 등 광고성 정보 전달, 참여기회 제공</li>
                <li>5) 서비스 이용기록과 접속빈도 분석, 통계 작성, 맞춤형 서비스 제공, 서비스 개선</li>
              </ul>

              <h3>2. 수집하는 개인정보의 항목</h3>
              <p>워크시트메이커는 회원가입, 원활한 고객상담, 각종 서비스 등 기본적인 서비스 제공을 위한 필수정보와 고객 맞춤 서비스 제공을 위한 선택정보로 구분하여 아래와 같은 개인정보를 수집하고 있습니다.</p>
              <ul>
                <li>1) <strong>필수항목:</strong> 이름, 아이디, 비밀번호, 이메일주소, 휴대전화번호, 닉네임, 직업</li>
                <li>2) <strong>선택항목:</strong> 없음</li>
                <li>3) <strong>서비스 이용 시 자동 생성되는 정보:</strong> IP주소, 쿠키, 방문일시, 서비스 이용기록, 악성 이용기록, 기기정보</li>
                <li>4) <strong>민감정보:</strong> 기본인권을 침해할 우려가 있는 민감정보(인종, 사상 및 신조, 정치적 성향, 범죄기록, 의료정보 등)는 원칙적으로 수집하지 않으며, 부득이한 경우 사전 동의를 받아 수집합니다.</li>
              </ul>

              <h3>3. 개인정보의 보유 및 이용기간</h3>
              <p>원칙적으로 워크시트메이커는 이용자의 개인정보를 회원가입을 하는 시점부터 서비스를 제공하는 기간 동안에만 제한적으로 이용하고 있습니다. 이용자가 회원탈퇴를 요청하거나 제공한 개인정보의 수집 및 이용에 대한 동의를 철회하는 경우, 또는 수집 및 이용목적이 달성되거나 보유 및 이용기간이 종료한 경우 해당 이용자의 개인정보는 지체 없이 파기 됩니다.</p>
              <p>단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.</p>
              <ul>
                <li>1) 회원탈퇴 시 보존되는 개인정보</li>
                <li>2) 관계법령의 규정에 따른 보존 개인 정보</li>
                <ul>
                  <li><strong>보존항목:</strong> 이용자가 제공한 이름, 아이디, 이메일 주소, 전화번호</li>
                  <li><strong>보존근거:</strong> 동일 아이디의 일정 기간 사용을 막기 위한 내부 회원관리 정책, 명예훼손 등 권리 침해 분쟁 해결 및 수사 협조</li>
                  <li><strong>보존기간:</strong> 회원탈퇴 후 1년</li>
                </ul>
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
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>표시/광고에 관한 기록</td>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>전자상거래 등에서의 소비자보호에 관한 법률</td>
                      <td style={{padding: '0.5rem'}}>6개월</td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #ddd'}}>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>계약 또는 청약철회 등에 관한 기록</td>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>전자상거래 등에서의 소비자보호에 관한 법률</td>
                      <td style={{padding: '0.5rem'}}>5년</td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #ddd'}}>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>대금결제 및 재화 등의 공급에 관한 기록</td>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>전자상거래 등에서의 소비자보호에 관한 법률</td>
                      <td style={{padding: '0.5rem'}}>5년</td>
                    </tr>
                    <tr style={{borderBottom: '1px solid #ddd'}}>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>소비자의 불만 또는 분쟁처리에 관한 기록</td>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>전자상거래 등에서의 소비자보호에 관한 법률</td>
                      <td style={{padding: '0.5rem'}}>3년</td>
                    </tr>
                    <tr>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>전자금융 거래에 관한 기록</td>
                      <td style={{padding: '0.5rem', borderRight: '1px solid #ddd'}}>전자금융거래법</td>
                      <td style={{padding: '0.5rem'}}>5년</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage; 