import React from 'react';

interface TestPrintFormatProps {
  packageQuiz: any[];
  isAnswerMode?: boolean;
}

const TestPrintFormat: React.FC<TestPrintFormatProps> = ({ packageQuiz, isAnswerMode = false }) => {
  console.log('🧪 TestPrintFormat 렌더링:', { packageQuiz, isAnswerMode });
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>테스트 인쇄 페이지</h1>
      <p>패키지 퀴즈 개수: {packageQuiz?.length || 0}</p>
      <p>정답 모드: {isAnswerMode ? '예' : '아니오'}</p>
      
      {packageQuiz && packageQuiz.length > 0 ? (
        <div>
          <h2>퀴즈 데이터:</h2>
          {packageQuiz.map((item, index) => (
            <div key={index} style={{ margin: '10px 0', padding: '10px', border: '1px solid #ccc' }}>
              <h3>퀴즈 {index + 1}</h3>
              <p>유형 ID: {item.workTypeId}</p>
              <p>유형 이름: {item.workTypeName}</p>
              <p>데이터 키: {item.data ? Object.keys(item.data).join(', ') : '없음'}</p>
              <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px' }}>
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <p>퀴즈 데이터가 없습니다.</p>
      )}
    </div>
  );
};

export default TestPrintFormat;
