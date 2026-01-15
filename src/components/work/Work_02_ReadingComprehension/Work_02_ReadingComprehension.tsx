import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './Work_02_ReadingComprehension.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { extractTextFromImage, callOpenAI } from '../../../services/common';
import '../../../styles/PrintFormat.css';
import PrintFormatWork02New from './PrintFormatWork02New';
import { processWithConcurrency } from '../../../utils/concurrency';

interface WordReplacement {
  original: string;           // 원본 단어/숙어
  replacement: string;        // 교체된 단어/숙어
  originalMeaning: string;    // 원본 단어/숙어의 한국어 뜻
  replacementMeaning: string; // 교체된 단어/숙어의 한국어 뜻
  originalPosition?: number;  // 원본 텍스트에서 교체된 위치
  replacedPosition?: number;  // 교체된 텍스트에서 교체된 위치
}

interface LayoutData {
  needsSecondPage: boolean;
  needsThirdPage: boolean;
  firstPageIncludesReplacements: boolean;
}

interface Work_02_ReadingComprehensionData {
  id?: string;
  title: string;
  originalText: string;      // 원본 본문
  modifiedText: string;      // 단어가 교체된 본문
  replacements: WordReplacement[];  // 교체된 단어들
  translation: string;       // 본문 해석
  layout?: LayoutData;       // 인쇄 레이아웃 정보
}

// 입력 아이템 인터페이스 (Work_01과 동일)
type InputType = 'clipboard' | 'file' | 'text';

interface InputItem {
  id: string;
  inputType: InputType;
  text: string;
  pastedImageUrl: string | null;
  isExpanded: boolean;
  isExtracting: boolean;
  error: string;
}

// 파일 → base64 변환
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const Work_02_ReadingComprehension: React.FC = () => {
  const { userData, loading } = useAuth();
  
  // 상태 관리: 여러 아이템 지원
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }
  ]);
  
  const [quizzes, setQuizzes] = useState<Work_02_ReadingComprehensionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showScreenshotHelp, setShowScreenshotHelp] = useState(false);
  
  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);

  // 페이지 분할 계산 함수 (개별 퀴즈용)
  const calculatePageLayoutForQuiz = async (quizData: Work_02_ReadingComprehensionData): Promise<LayoutData> => {
    // 이제 인쇄 시 강제 2단 레이아웃을 사용하므로, 이 계산 로직은 사실상 무의미할 수 있으나
    // 기존 데이터 구조 호환성을 위해 유지하거나, 필요 시 제거 가능.
    // 여기서는 기본값만 반환하도록 간소화 (어차피 PrintFormatWork02New에서 2단 처리함)
    return {
      needsSecondPage: false,
      needsThirdPage: false,
      firstPageIncludesReplacements: true
    };
  };

  // 아이템 관리 함수들
  const addItem = () => {
    const newItem: InputItem = {
      id: Date.now().toString(),
      inputType: 'text', 
      text: '',
      pastedImageUrl: null,
      isExpanded: true,
      isExtracting: false,
      error: ''
    };
    setItems(prev => prev.map(item => ({ ...item, isExpanded: false })).concat(newItem));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<InputItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const toggleExpand = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isExpanded: !item.isExpanded } : item));
  };
      
  // 이미지 -> 텍스트 (개별 아이템용)
  const handleImageToText = async (id: string, image: File | Blob) => {
    updateItem(id, { isExtracting: true, error: '' });
    
    try {
      let previewUrl = null;
      if (image instanceof Blob) {
        previewUrl = URL.createObjectURL(image);
        updateItem(id, { pastedImageUrl: previewUrl });
          }
          
      const imageBase64 = await fileToBase64(image as File);
      // 공통 헬퍼 extractTextFromImage 사용
      const resultText = await extractTextFromImage(imageBase64);
      
      updateItem(id, { 
        text: resultText,
        isExtracting: false 
      });
    } catch (err: any) {
      updateItem(id, { 
        error: '이미지 텍스트 추출 실패: ' + (err?.message || err),
        isExtracting: false
      });
    }
  };

  const handlePaste = (id: string, e: React.ClipboardEvent) => {
    const item = items.find(i => i.id === id);
    if (!item || item.inputType !== 'clipboard') return;

    const clipItems = e.clipboardData.items;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file) {
          handleImageToText(id, file);
          e.preventDefault();
          return;
    }
      }
    }
  };

  const handleFileChange = (id: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      updateItem(id, { error: '이미지 파일만 첨부 가능합니다.' });
      return;
    }
    handleImageToText(id, file);
    e.target.value = '';
  };

  // 포인트 관련 초기화
  useEffect(() => {
    const initializePoints = async () => {
      try {
        const points = await getWorkTypePoints();
        setWorkTypePoints(points);
        if (!loading && userData && userData.uid) {
          const currentPoints = await getUserCurrentPoints(userData.uid);
          setUserCurrentPoints(currentPoints);
        }
      } catch (error) {
        console.error('포인트 초기화 오류:', error);
      }
    };
    if (!loading) initializePoints();
  }, [userData?.uid, loading]);

  // AI 함수들
  async function splitSentences(passage: string): Promise<string[]> {
    const prompt = `You will receive an English passage. Split it into individual sentences.
Use the following rules:
- End of sentence is marked by '.', '?', or '!' followed by a space or newline.
- Keep sentence punctuation.
- Do not merge or break sentences.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.

Passage:
${passage}

Required JSON format:
{
  "sentences": ["Sentence 1.", "Sentence 2?", "Sentence 3!"]
}`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0
    });

    if (!response.ok) throw new Error('API 요청 실패');
    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패');
    
    const cleanJson = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').replace(/\n/g, ' ').trim();
    return JSON.parse(cleanJson).sentences;
      }

  async function selectWordFromSentence(sentence: string, index: number, usedWords: string[] = []): Promise<{index: number, original: string}> {
    const usedWordsText = usedWords.length > 0 ? `\n\nALREADY USED WORDS (do not select these): ${usedWords.join(', ')}` : '';
    const prompt = `You are selecting one important word from sentence #${index + 1} below.

RULES:
1. Only ONE word should be selected. Never more than one.
2. Select a word that is NOT already used in previous sentences.
3. Choose a meaningful word that would be good for vocabulary learning.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.

Sentence: "${sentence}"${usedWordsText}

Required JSON format:
{
  "index": ${index},
  "original": "selectedWord"
}`;

      const response = await callOpenAI({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0
      });

    if (!response.ok) throw new Error('API 요청 실패');
      const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패');
    
    const cleanJson = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').replace(/\n/g, ' ').trim();
    return JSON.parse(cleanJson);
  }

  async function getSynonym(word: string): Promise<any> {
    const prompt = `Provide one appropriate synonym for the word "${word}" used in a reading comprehension context.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.

Required JSON format:
{
  "original": "${word}",
  "replacement": "synonym_word",
  "originalMeaning": "한국어 뜻",
  "replacementMeaning": "한국어 뜻"
}`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0
    });

    if (!response.ok) throw new Error('API 요청 실패');
    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패');
    
    const cleanJson = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').replace(/\n/g, ' ').trim();
    return JSON.parse(cleanJson);
  }

  function replaceWordsInTextSequentially(originalText: string, sentences: string[], replacements: any[]): string {
    let modifiedText = originalText;
    let currentPosition = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const replacement = replacements[i];
      if (!replacement) continue;
      
      const sentenceStart = modifiedText.indexOf(sentence, currentPosition);
      if (sentenceStart === -1) continue;
      
      const sentenceEnd = sentenceStart + sentence.length;
      const sentenceText = modifiedText.substring(sentenceStart, sentenceEnd);
      const escapedOriginal = replacement.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedOriginal}\\b`, 'gi');
      
      const modifiedSentence = sentenceText.replace(regex, replacement.replacement);
        modifiedText = modifiedText.substring(0, sentenceStart) + modifiedSentence + modifiedText.substring(sentenceEnd);
      currentPosition = sentenceStart + modifiedSentence.length;
    }
    return modifiedText;
  }

  async function translateText(text: string): Promise<string> {
    const prompt = `Translate the following English text to Korean. 
Provide a natural, accurate Korean translation that maintains the original meaning and context.
IMPORTANT: Return ONLY the Korean translation. No explanations, no markdown, no code blocks.
English text: "${text}"
Korean translation:`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    });

    if (!response.ok) throw new Error('API 요청 실패');
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
    
  // AI 문제 생성 메인 함수
  async function generateReadingComprehensionWithAI(passage: string): Promise<Work_02_ReadingComprehensionData> {
    try {
      const sentences = await splitSentences(passage);

      const selectedWords = [];
      const usedWords = new Set<string>();
      
      for (let i = 0; i < sentences.length; i++) {
        const usedWordsArray = Array.from(usedWords);
        const wordSelection = await selectWordFromSentence(sentences[i], i, usedWordsArray);
        
        if (usedWords.has(wordSelection.original.toLowerCase())) {
          // 중복 시 재시도 1회
          const retrySelection = await selectWordFromSentence(sentences[i], i, usedWordsArray);
          selectedWords.push(retrySelection);
          usedWords.add(retrySelection.original.toLowerCase());
        } else {
          selectedWords.push(wordSelection);
          usedWords.add(wordSelection.original.toLowerCase());
        }
      }

      const replacements = [];
      for (const wordSelection of selectedWords) {
        const synonym = await getSynonym(wordSelection.original);
        replacements.push(synonym);
      }

      const modifiedText = replaceWordsInTextSequentially(passage, sentences, replacements);
        const translation = await translateText(passage);

        return {
          title: '독해 문제',
          originalText: passage,
          modifiedText: modifiedText,
          replacements: replacements,
          translation: translation
        };
    } catch (error) {
      console.error('문제 생성 중 오류:', error);
      throw error;
    }
  }

  // 문제 생성 핸들러 (UI 버튼)
  const handleGenerateQuiz = async () => {
    const validItems = items.filter(item => item.text.trim().length >= 10);
    
    if (validItems.length === 0) {
      alert('문제 생성을 위해 최소 하나의 본문을 입력해주세요.');
      return;
    }
    
    if (loading) return;
    if (!userData || !userData.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    const workType = workTypePoints.find(wt => wt.id === '2');
    if (!workType) {
      alert('포인트 정보를 불러올 수 없습니다.');
      return;
    }

    const totalPoints = workType.points * validItems.length;
    if (userCurrentPoints < totalPoints) {
      alert(`포인트가 부족합니다. 필요: ${totalPoints}P`);
      return;
    }

    setPointsToDeduct(workType.points);
    setShowPointModal(true);
  };

  // 포인트 차감 확인 및 실제 생성
  const handlePointDeductionConfirm = async () => {
    setShowPointModal(false);
    setIsLoading(true);
    setQuizzes([]);

    const validItems = items.filter(item => item.text.trim().length >= 10);
    const generatedQuizzes: Work_02_ReadingComprehensionData[] = [];
    let successCount = 0;
    let failCount = 0;
    
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '2');
      const totalPoints = workType.points * validItems.length;

      const deductionResult = await deductUserPoints(
        userData!.uid,
        '2',
        `독해 문제 생성 (${validItems.length}문제)`,
        userData!.displayName || '사용자',
        userData!.nickname || '사용자',
        totalPoints
      );

      if (!deductionResult.success) {
        throw new Error('포인트 차감 실패');
      }
      deductedPoints = totalPoints; 
      setUserCurrentPoints(deductionResult.remainingPoints);

      const results = await processWithConcurrency(validItems, 3, async (item) => {
        try {
          const quizData = await generateReadingComprehensionWithAI(item.text);
          const layout = await calculatePageLayoutForQuiz(quizData);
          return { ...quizData, id: item.id, layout };
        } catch (err) {
          console.error(`ID ${item.id} 생성 실패:`, err);
          return null;
        }
      });

      results.forEach(res => {
        if (res) {
          generatedQuizzes.push(res);
          successCount++;
        } else {
          failCount++;
        }
      });
      
      setQuizzes(generatedQuizzes);

      // 내역 저장
      if (generatedQuizzes.length > 0 && userData!.uid) {
        try {
           const combinedInputText = validItems.map(i => i.text).join('\n\n---\n\n');
          await saveQuizWithPDF({
             userId: userData!.uid,
             userName: userData!.name || '사용자',
             userNickname: userData!.nickname || '사용자',
            workTypeId: '02',
             workTypeName: `${getWorkTypeName('02')} (${generatedQuizzes.length}문제)`,
             points: totalPoints,
             inputText: combinedInputText,
             quizData: generatedQuizzes, 
            status: 'success'
          });
           console.log('✅ 내역 저장 완료');
         } catch (e) {
           console.error('내역 저장 실패:', e);
        }
      }

      if (failCount > 0) {
        alert(`${validItems.length}건 중 ${successCount}건 성공, ${failCount}건 실패했습니다.`);
      }
      
    } catch (err: any) {
      console.error(err);
      if (deductedPoints > 0) {
        await refundUserPoints(userData!.uid, deductedPoints, '2', userData!.name||'', userData!.nickname||'', '생성 실패 환불');
          setUserCurrentPoints(prev => prev + deductedPoints);
      }
      alert('문제 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      window.scrollTo(0, 0);
    }
  };

  const resetAll = () => {
    setQuizzes([]);
    setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
  };

  // 인쇄 핸들러 (Work_01 방식 적용)
  const triggerPrint = (mode: 'no-answer' | 'with-answer') => {
    if (quizzes.length === 0) return;
    
    console.log('🖨️ 인쇄 시작:', mode);
    
    const styleId = 'print-style-work02-landscape';
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @page {
        size: A4 landscape !important;
        margin: 0 !important;
      }
      @media print {
        html, body {
          width: 29.7cm !important;
          height: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #root {
            display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    const printContainer = document.createElement('div');
    printContainer.id = mode === 'with-answer' ? 'print-root-work02-new-answer' : 'print-root-work02-new';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatWork02New quizzes={quizzes} isAnswerMode={mode === 'with-answer'} />);

    const activatePrintContainer = () => {
      const inner = printContainer.querySelector('.print-container, .print-container-answer');
      if (inner) {
        inner.classList.add('pdf-generation-active');
      } else {
        requestAnimationFrame(activatePrintContainer);
      }
    };
    activatePrintContainer();

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        if (appRoot) {
          appRoot.style.display = 'block';
      }
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
        console.log('✅ 인쇄 완료');
      }, 100);
    }, 500);
  };

  // 인쇄용 텍스트 렌더링 (HTML 태그 포함 - 화면 표시용으로만 사용)
  const renderPrintTextWithUnderlines = (text: string, replacements: WordReplacement[], isOriginal: boolean = true) => {
    if (!replacements || replacements.length === 0) return text;
    
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    let processedSentences: string[] = [];
    let currentPosition = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceStart = text.indexOf(sentence, currentPosition);
      if (sentenceStart === -1) { processedSentences.push(sentence); continue; }
      const sentenceEnd = sentenceStart + sentence.length;
      
      let replacement: WordReplacement | null = null;
      for (const rep of replacements) {
        const wordToFind = isOriginal ? rep.original : rep.replacement;
        if (!wordToFind) continue;
        
        if (sentence.toLowerCase().includes(wordToFind.toLowerCase())) {
          const escapedWord = wordToFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
          if (regex.test(sentence)) {
            replacement = rep;
            break;
          }
        }
      }
      
      if (replacement) {
      const wordToHighlight = isOriginal ? replacement.original : replacement.replacement;
        const escapedWord = wordToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        processedSentences.push(sentence.replace(regex, `<u><strong>$&</strong></u>`));
      } else {
        processedSentences.push(sentence);
      }
      currentPosition = sentenceEnd;
    }
    return processedSentences.join(' ');
  };

  // 교체된 단어 테이블 렌더링 (화면 표시용)
  const renderReplacementsTable = (replacements: WordReplacement[]) => {
      if (!replacements || replacements.length === 0) {
        return <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>교체된 단어가 없습니다.</div>;
      }
      const halfLength = Math.ceil(replacements.length / 2);
    return (
        <table className="replacements-table work02-replacements-table" style={{
          borderCollapse: 'collapse',
          width: '100%',
          border: '1px solid #666',
          backgroundColor: '#ffffff'
        }}>
              <thead>
                <tr>
                    <th style={{ width: '25%' }}>원래 단어</th>
                    <th style={{ width: '25%' }}>교체된 단어</th>
                    <th style={{ width: '25%' }}>원래 단어</th>
                    <th style={{ width: '25%' }}>교체된 단어</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: halfLength }, (_, i) => (
                    <tr key={i}>
                        <td style={{ width: '25%' }}>
                          {replacements[i*2]?.original || ''}
                          {replacements[i*2]?.originalMeaning && <span className="original-meaning"> ({replacements[i*2]?.originalMeaning})</span>}
                        </td>
                        <td style={{ width: '25%', backgroundColor: '#f5f5f5' }}>
                          {replacements[i*2]?.replacement || ''}
                          {replacements[i*2]?.replacementMeaning && <span className="replacement-meaning"> ({replacements[i*2]?.replacementMeaning})</span>}
                        </td>
                        <td style={{ width: '25%' }}>
                          {replacements[i*2+1]?.original || ''}
                          {replacements[i*2+1]?.originalMeaning && <span className="original-meaning"> ({replacements[i*2+1]?.originalMeaning})</span>}
                        </td>
                        <td style={{ width: '25%', backgroundColor: '#f5f5f5' }}>
                          {replacements[i*2+1]?.replacement || ''}
                          {replacements[i*2+1]?.replacementMeaning && <span className="replacement-meaning"> ({replacements[i*2+1]?.replacementMeaning})</span>}
                        </td>
                  </tr>
                ))}
              </tbody>
            </table>
      );
  };


  // 퀴즈 결과 화면
  if (quizzes.length > 0) {
    return (
      <div className="quiz-display">
        <div className="quiz-header no-print">
          <h2>#02. 독해 문제 (총 {quizzes.length}문제)</h2>
          <div className="quiz-header-buttons">
            <button onClick={resetAll} className="reset-button" style={{
                width: '130px', height: '48px', padding: '0.75rem 1rem', fontSize: '11pt', fontWeight: '600',
                border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #bef264 0%, #a3e635 100%)',
                color: 'white', cursor: 'pointer', boxShadow: '0 4px 6px rgba(190, 242, 100, 0.25)'
            }}>새문제</button>
            <button onClick={() => triggerPrint('no-answer')} className="print-button" style={{
                width: '130px', height: '48px', padding: '0.75rem 1rem', fontSize: '11pt', fontWeight: '600',
                border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', cursor: 'pointer', boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)', marginRight:'10px'
            }}>🖨️ 인쇄 (문제)</button>
            <button onClick={() => triggerPrint('with-answer')} className="print-button" style={{
                width: '130px', height: '48px', padding: '0.75rem 1rem', fontSize: '11pt', fontWeight: '600',
                border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white', cursor: 'pointer', boxShadow: '0 4px 6px rgba(240, 147, 251, 0.25)'
            }}>🖨️ 인쇄 (정답)</button>
            </div>
                </div>

        <div className="quiz-content no-print">
            <div style={{ padding: '1rem', background: '#f0f7ff', borderRadius: '8px', marginBottom: '2rem', borderLeft: '4px solid #1976d2' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1976d2' }}>총 {quizzes.length}개의 문제가 생성되었습니다.</h3>
                </div>

            {quizzes.map((quiz, idx) => (
                <div key={idx} className="quiz-item-card" style={{ 
                  marginBottom: '2rem', 
                  padding: '1.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0'
                }}>
                    <div className="quiz-item-header" style={{ 
                      marginBottom: '1rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #e0e0e0',
                      paddingBottom: '0.5rem'
                    }}>
                        <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                          문제 {idx + 1} : 유사단어 독해
                        </h3>
                        <span style={{ 
                          fontSize: '0.9rem', 
                          color: '#666',
                          fontWeight: '500'
                        }}>
                          유형#02
                        </span>
                </div>

                    <div className="problem-instruction work02-instruction" style={{
                      fontWeight: 500, 
                      fontSize: '0.95rem', 
                      background: '#f5f5f5', 
                      color: '#000', 
                      padding: '0.6rem 1rem', 
                      borderRadius: '0', 
                      marginBottom: '1.5rem',
                      textAlign: 'left',
                      borderTop: '1px solid #e0e0e0',
                      borderBottom: '1px solid #e0e0e0'
                    }}>
                          다음 본문을 읽고 해석하세요
                  </div>

                    <div className="text-content work02-text-content" style={{
                      background: '#ffffff', 
                      backgroundColor: '#ffffff',
                      padding: '1rem', 
                      borderRadius: '0', 
                      marginBottom: '1.5rem',
                      border: '1px solid transparent',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      color: '#333',
                      borderBottom: '1px solid #e0e0e0',
                      paddingBottom: '1.5rem'
                    }} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(quiz.modifiedText, quiz.replacements, false)}}>
                  </div>

                    <h3>교체된 단어들:</h3>
                    {renderReplacementsTable(quiz.replacements)}

                    <div className="translation-section" style={{marginTop:'2rem'}}>
                        <h3>본문 해석:</h3>
                        <div className="translation-content work02-translation" style={{background: '#f5f5f5', backgroundColor: '#f5f5f5', padding: '1.2rem', borderRadius: '8px'}}>
                            {quiz.translation}
                    </div>
                          </div>
                          </div>
            ))}
                        </div>
      </div>
    );
  }

  // 입력 UI
  return (
    <div className="quiz-generator">
      <div className="generator-header">
        <h2>메뉴#02. 유사단어 독해 문제 생성</h2>
        <p>여러 개의 본문을 입력하여 한 번에 여러 문제를 생성할 수 있습니다.</p>
      </div>

      <div className="input-items-list">
        {items.map((item, index) => (
          <div key={item.id} className={`input-item ${item.isExpanded ? 'expanded' : ''}`}>
             <div className="input-item-header" onClick={() => toggleExpand(item.id)}>
                <div className="input-item-title">
                   <span>#{index + 1}</span>
                   <span className={`input-item-status ${item.text.length > 0 ? 'has-text' : ''}`}>
                      {item.text.length > 0 ? `텍스트 ${item.text.length}자` : '입력 대기'}
                   </span>
      </div>
                <div className="input-item-controls">
                   <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} title="삭제">🗑️</button>
                   <span className="expand-icon">{item.isExpanded ? '🔼' : '🔽'}</span>
            </div>
            </div>

             {item.isExpanded && (
                <div className="input-item-content">
                   <div className="input-type-section" style={{ marginBottom: '15px' }}>
                      <label><input type="radio" checked={item.inputType === 'clipboard'} onChange={() => updateItem(item.id, { inputType: 'clipboard', error: '' })} /><span>📸 캡처화면 붙여넣기</span></label>
                      <label><input type="radio" checked={item.inputType === 'file'} onChange={() => updateItem(item.id, { inputType: 'file', error: '' })} /><span>🖼️ 이미지 파일 첨부</span></label>
                      <label><input type="radio" checked={item.inputType === 'text'} onChange={() => updateItem(item.id, { inputType: 'text', error: '' })} /><span>✍️ 직접 붙여넣기</span></label>
        </div>
                   
                   {item.inputType === 'clipboard' && (
                      <div className="input-guide" tabIndex={0} onPaste={(e) => handlePaste(item.id, e)} style={{ minHeight: '120px' }}>
                         <div className="drop-icon">📋</div>
                         <div className="drop-text">여기에 이미지를 붙여넣으세요 (Ctrl+V)</div>
                         {item.pastedImageUrl && <div className="preview-row"><img src={item.pastedImageUrl} alt="Preview" className="preview-img" /></div>}
                         {item.isExtracting && <div className="loading-text">텍스트 추출 중...</div>}
              </div>
            )}
                   {item.inputType === 'file' && (
                      <div className="input-guide" style={{ minHeight: '80px' }}>
                         <input type="file" accept="image/*" onChange={(e) => handleFileChange(item.id, e)} disabled={item.isExtracting} />
                         {item.isExtracting && <span className="loading-text">추출 중...</span>}
        </div>
      )}

        <textarea
                      value={item.text}
                      onChange={(e) => updateItem(item.id, { text: e.target.value })}
                      placeholder="영어 본문이 여기에 표시됩니다. 직접 입력하거나 수정할 수 있습니다."
          className="text-input"
                      rows={6}
                      style={{ marginTop: '10px', width: '100%' }}
        />
        {item.error && <div className="error-message">❌ {item.error}</div>}
        </div>
             )}
          </div>
        ))}
      </div>

      <button onClick={addItem} className="add-item-button">➕ 본문 추가하기</button>

      <button onClick={handleGenerateQuiz} disabled={isLoading} className="generate-button" style={{ marginTop: '20px' }}>
        {items.length > 1 ? `📋 ${items.filter(i => i.text.length > 0).length}개 문제 일괄 생성` : '📋 독해 문제 생성'}
        </button>

      {/* 로딩 오버레이 */}
      {isLoading && (
          <div className="centered-hourglass-overlay">
            <div className="centered-hourglass-content">
              <span className="centered-hourglass-spinner">⏳</span>
               <div className="loading-text">문제 생성 중...</div>
            </div>
          </div>
        )}

      <ScreenshotHelpModal isOpen={showScreenshotHelp} onClose={() => setShowScreenshotHelp(false)} />
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
         workTypeName={`독해 문제 생성 (${items.filter(i => i.text.length >= 10).length}문제)`}
         pointsToDeduct={pointsToDeduct * items.filter(i => i.text.length >= 10).length}
        userCurrentPoints={userCurrentPoints}
         remainingPoints={userCurrentPoints - (pointsToDeduct * items.filter(i => i.text.length >= 10).length)}
      />
    </div>
  );
};

export default Work_02_ReadingComprehension; 
