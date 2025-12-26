import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import './styles/App.css';
import './styles/PrintFormat.css';
import './components/auth/PhoneNumberInput.css';
import './components/layout/ErrorBoundary.css';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';
import { AuthProvider } from './contexts/AuthContext';
// 프로덕션 환경에서 콘솔 로그 비활성화
import './utils/disableConsole';
import PrivateRoute from './components/layout/PrivateRoute';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import HomePage from './components/common/HomePage';
import QuizDisplay from './components/quiz/QuizDisplay';
import QuizListPage from './components/quiz/QuizListPage';
import QuizDisplayPage from './components/quiz/QuizDisplayPage';
import Work_03_VocabularyWord from './components/work/Work_03_VocabularyWord/Work_03_VocabularyWord';
import Work_02_ReadingComprehension from './components/work/Work_02_ReadingComprehension/Work_02_ReadingComprehension';
import Work_01_ArticleOrder from './components/work/Work_01_ArticleOrder/Work_01_ArticleOrder';
import AuthModal from './components/auth/AuthModal';
import PrintHeader from './components/common/PrintHeader';
import ScrollToTop from './components/layout/ScrollToTop';
import Work_04_BlankPhraseInference from './components/work/Work_04_BlankPhraseInference/Work_04_BlankPhraseInference';
import Work_05_BlankSentenceInference from './components/work/Work_05_BlankSentenceInference/Work_05_BlankSentenceInference';
import Work_06_SentencePosition from './components/work/Work_06_SentencePosition/Work_06_SentencePosition';
import Work_07_MainIdeaInference from './components/work/Work_07_MainIdeaInference/Work_07_MainIdeaInference';
import Work_08_TitleInference from './components/work/Work_08_TitleInference/Work_08_TitleInference';
import Navigation from './components/layout/Navigation';
import Work_15_Display from './components/work/Work_15_ImageProblemAnalyzer/Work_15_Display';
import Work_09_GrammarError from './components/work/Work_09_GrammarError/Work_09_GrammarError';
import Work_10_MultiGrammarError from './components/work/Work_10_MultiGrammarError/Work_10_MultiGrammarError';
import Work_11_SentenceTranslation from './components/work/Work_11_SentenceTranslation/Work_11_SentenceTranslation';
import Work_12_WordStudy from './components/work/Work_12_WordStudy/Work_12_WordStudy';
import Work_13_BlankFillWord from './components/work/Work_13_BlankFillWord/Work_13_BlankFillWord';
import Work_14_BlankFillSentence from './components/work/Work_14_BlankFillSentence/Work_14_BlankFillSentence';
import Work_16_PassageWordStudy from './components/work/Work_16_PassageWordStudy/Work_16_PassageWordStudy';
import Work_15_ImageProblemAnalyzer from './components/work/Work_15_ImageProblemAnalyzer/Work_15_ImageProblemAnalyzer';
import Package_01_MultiQuizGenerater from './components/work/Package_01_MultiQuizGenerater/Package_01_MultiQuizGenerater';
import Package_02_TwoStepQuiz from './components/work/Package_02_TwoStepQuiz/Package_02_TwoStepQuiz';
import Package_03_ParagraphOrder from './components/work/Package_03_ParagraphOrder/Package_03_ParagraphOrder';
import SampleProblemsBoard from './components/quiz/SampleProblemsBoard';
import Feedback from './components/feedback/Feedback';
import AdminPage from './components/admin/AdminPage';
import ProfilePage from './components/profile/ProfilePage';
import PointCharge from './components/point/PointCharge';
import PaymentSuccess from './components/payment/PaymentSuccess';
import PaymentFail from './components/payment/PaymentFail';
import PaymentHistoryPage from './components/payment/PaymentHistoryPage';
import GuidePage from './components/guide/GuidePage';
import ErrorBoundary from './components/layout/ErrorBoundary';

// 🔍 앱 초기화 진단 로그
console.log('=== 🚀 React 앱 시작 ===');
console.log('📁 현재 시간:', new Date().toISOString());
console.log('📁 현재 URL:', window.location.href);
console.log('📁 User Agent:', navigator.userAgent);

// 모달 설정
Modal.setAppElement('#root');

// 앱 내용 컴포넌트
const AppContent: React.FC = () => {
  const [authModalIsOpen, setAuthModalIsOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any | null>(null);

  const handleQuizGenerated = (quiz: any) => {
    setCurrentQuiz(quiz);
  };

  return (
    <div className="App">
      <div className="no-print"><PrintHeader /></div>
      <Navigation />
      <div className="print-gap" />
      <ScrollToTop />
      <div className="App-main">
        <Routes>
          <Route path="/" element={<HomePage setCurrentQuiz={handleQuizGenerated} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route 
            path="/quiz-list" 
            element={
              <PrivateRoute>
                <QuizListPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/quiz-display" 
            element={
              <PrivateRoute>
                <QuizDisplayPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work-15-display" 
            element={
              <PrivateRoute>
                <Work_15_Display />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_02_reading-comprehension" 
            element={
              <PrivateRoute>
                <Work_02_ReadingComprehension />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_03_vocabulary-word" 
            element={
              <PrivateRoute>
                <Work_03_VocabularyWord />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_04_blank-phrase-inference" 
            element={
              <PrivateRoute>
                <Work_04_BlankPhraseInference />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_05_blank-sentence-inference" 
            element={
              <PrivateRoute>
                <Work_05_BlankSentenceInference />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_06_sentence-position" 
            element={
              <PrivateRoute>
                <Work_06_SentencePosition />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_07_main-idea-inference" 
            element={
              <PrivateRoute>
                <Work_07_MainIdeaInference />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_08_title-inference" 
            element={
              <PrivateRoute>
                <Work_08_TitleInference />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_09_grammar-error" 
            element={
              <PrivateRoute>
                <Work_09_GrammarError />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_10_multi-grammar-error" 
            element={
              <PrivateRoute>
                <Work_10_MultiGrammarError />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_01_article-order" 
            element={
              <PrivateRoute>
                <Work_01_ArticleOrder />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_11_sentence-translation" 
            element={
              <PrivateRoute>
                <Work_11_SentenceTranslation />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_12_word-study" 
            element={
              <PrivateRoute>
                <Work_12_WordStudy />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_13_blank-fill-word" 
            element={
              <PrivateRoute>
                <Work_13_BlankFillWord />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_14_blank-fill-sentence" 
            element={
              <PrivateRoute>
                <Work_14_BlankFillSentence />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_16_passage-word-study" 
            element={
              <PrivateRoute>
                <Work_16_PassageWordStudy />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/work_15_image-problem-analyzer" 
            element={
              <PrivateRoute>
                <Work_15_ImageProblemAnalyzer />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/package-quiz" 
            element={
              <PrivateRoute>
                <Package_01_MultiQuizGenerater />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/package-quiz-2step" 
            element={
              <PrivateRoute>
                <Package_02_TwoStepQuiz />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/package-quiz-3order" 
            element={
              <PrivateRoute>
                <Package_03_ParagraphOrder />
              </PrivateRoute>
            } 
          />

          <Route 
            path="/sample-problems" 
            element={<SampleProblemsBoard />} 
          />
          <Route 
            path="/feedback" 
            element={<Feedback />} 
          />
          <Route 
            path="/admin" 
            element={
              <PrivateRoute>
                <AdminPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/point-charge"
            element={
              <PrivateRoute>
                <PointCharge />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/payment-history"
            element={
              <PrivateRoute>
                <PaymentHistoryPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/guide" 
            element={<GuidePage />} 
          />
          <Route 
            path="/payment/success" 
            element={<PaymentSuccess />} 
          />
          <Route 
            path="/payment/fail" 
            element={<PaymentFail />} 
          />

        </Routes>
      </div>
      <AuthModal
        isOpen={authModalIsOpen}
        onRequestClose={() => setAuthModalIsOpen(false)}
      />
    </div>
  );
};

// 메인 앱 컴포넌트
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App; 