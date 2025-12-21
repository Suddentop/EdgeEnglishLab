import React, { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
}

/**
 * 페이지별 제목과 메타 설명을 동적으로 변경하는 컴포넌트
 * 사용법: <SEO title="페이지 제목" description="페이지 설명" />
 */
const SEO: React.FC<SEOProps> = ({ title, description }) => {
  useEffect(() => {
    // 기본값 설정
    const defaultTitle = "Edge English Lab (엣지잉글리쉬랩) - AI 영어 문제 생성 플랫폼";
    const defaultDescription = "수능 수준의 고품질 영어 문제를 AI로 자동 생성하세요. 독해, 문법, 어휘 문제 제작과 인쇄를 지원하는 영어 선생님 필수 도구입니다.";

    // 제목 변경
    document.title = title ? `${title} | Edge English Lab` : defaultTitle;
    
    // Open Graph 제목 변경 (40자 이내 권장)
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const ogTitleValue = title ? `${title} | Edge English Lab` : "Edge English Lab - AI 영어 문제 생성 플랫폼";
      ogTitle.setAttribute('content', ogTitleValue);
    }

    // 메타 설명 변경
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description || defaultDescription);
    }
    
    // Open Graph URL 변경 (현재 URL)
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', window.location.href);
    }
    
    // Twitter 메타 태그 변경 (40자 이내 권장)
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      const twitterTitleValue = title ? `${title} | Edge English Lab` : "Edge English Lab - AI 영어 문제 생성 플랫폼";
      twitterTitle.setAttribute('content', twitterTitleValue);
    }
    
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', description || defaultDescription);
    }
    
    const twitterUrl = document.querySelector('meta[name="twitter:url"]');
    if (twitterUrl) {
      twitterUrl.setAttribute('content', window.location.href);
    }
  }, [title, description]);

  return null;
};

export default SEO;

