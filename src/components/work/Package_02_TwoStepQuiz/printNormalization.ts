export const OPTION_LABELS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

/**
 * 유형#13, #14의 blankedText에서 빈칸 표시를 변환
 * (_____) → ( _ _ _ _ _ ) 형태로 변경 (정답 길이만큼 언더스코어 반복)
 */
export const formatBlankedTextForWork13 = (
  blankedText: string,
  correctAnswers: string[]
): string => {
  // 유형#14 (문장 단위)도 동일한 함수 사용
  return formatBlankedText(blankedText, correctAnswers);
};

/**
 * 빈칸 표시를 변환하는 공통 함수
 * (_____) → ( _ _ _ _ _ ) 형태로 변경 (정답 길이만큼 언더스코어 반복)
 */
export const formatBlankedText = (
  blankedText: string,
  correctAnswers: string[]
): string => {
  if (!blankedText || !Array.isArray(correctAnswers) || correctAnswers.length === 0) {
    return blankedText;
  }

  let formattedText = blankedText;
  let answerIndex = 0;

  // 포괄적인 빈칸 패턴: (_____), ( A _____ ), (_______________) 등 모든 형태를 찾음
  // 괄호 안에 선택적 문자(A-Z)와 언더스코어가 있는 패턴
  const blankPattern = /\([\s]*([A-Z])?[\s]*_+[\s]*\)/gi;

  formattedText = formattedText.replace(blankPattern, (match) => {
    if (answerIndex >= correctAnswers.length) {
      return match; // 정답이 부족하면 원본 유지
    }

    const answer = correctAnswers[answerIndex];
    const answerLength = answer.length;
    
    // 정답 길이만큼 " _ " 반복
    const blanks = Array(answerLength).fill('_').join(' ');
    
    // 괄호 안에 공백과 함께 배치: ( _ _ _ _ _ )
    const formattedBlank = `( ${blanks} )`;
    
    answerIndex++;
    return formattedBlank;
  });

  return formattedText;
};

export const WORK_TYPE_LABELS: Record<string, string> = {
  '01': '문단 순서 맞추기',
  '02': '유사단어 독해',
  '03': '빈칸(단어) 문제',
  '04': '빈칸(구) 문제',
  '05': '빈칸(문장) 문제',
  '06': '문장 위치 찾기',
  '07': '주제 추론',
  '08': '제목 추론',
  '09': '어법 오류 찾기',
  '10': '다중 어법 오류 찾기',
  '11': '본문 문장별 해석',
  '12': '단어 학습',
  '13': '빈칸 채우기 (단어-주관식)',
  '14': '빈칸 채우기 (문장-주관식)'
};

export type PrintSectionType =
  | 'title'
  | 'instruction'
  | 'paragraph'
  | 'text'
  | 'html'
  | 'options'
  | 'table'
  | 'answer'
  | 'translation'
  | 'list'
  | 'spacer';

export interface PrintOptionItem {
  label?: string;
  text: string;
  isCorrect?: boolean;
  translation?: string;
}

export interface PrintSection {
  type: PrintSectionType;
  key: string;
  text?: string;
  html?: string;
  label?: string;
  items?: string[];
  options?: PrintOptionItem[];
  headers?: string[];
  rows?: string[][];
  workTypeId?: string;
  chunkMeta?: any;
  meta?: Record<string, any>;
}

export interface NormalizedQuizItem {
  originalItem: any;
  workTypeId: string;
  chunkMeta?: any;
  sections: PrintSection[];
}

interface NormalizationHelpers {
  isAnswerMode: boolean;
  cleanOptionText: (value: string | number | undefined | null) => string;
  renderTextWithHighlight: (text: string, replacements: any[]) => string;
  getTranslatedText: (quizItem: any, quizData: any) => string;
}

const ensureParagraphArray = (paragraphs: any[]): { label?: string; content: string }[] => {
  if (!Array.isArray(paragraphs)) {
    return [];
  }
  return paragraphs
    .map((para) => {
      if (!para) return null;
      if (typeof para === 'string') {
        return { content: para };
      }
      return { label: para.label, content: para.content ?? para.text ?? '' };
    })
    .filter((para) => para && para.content && para.content.trim().length > 0) as {
    label?: string;
    content: string;
  }[];
};

const ensureOptionsArray = (options: any[], helpers: NormalizationHelpers): PrintOptionItem[] => {
  if (!Array.isArray(options)) return [];
  return options
    .map<PrintOptionItem | null>((option, idx) => {
      const fallbackLabel = OPTION_LABELS[idx] ?? undefined;

      if (typeof option === 'string') {
        return { label: fallbackLabel, text: option };
      }
      if (Array.isArray(option)) {
        return { label: fallbackLabel, text: option.join(' ') };
      }
      if (option && typeof option === 'object') {
        const textValue = option.text || option.value || option.label || '';
        if (!textValue) return null;
        return {
          label: option.label ?? fallbackLabel,
          text: String(textValue)
        };
      }
      return null;
    })
    .filter((opt): opt is PrintOptionItem => opt !== null && !!opt.text);
};

const createTitleSection = (workTypeId: string, chunkMeta?: any): PrintSection => {
  const label = WORK_TYPE_LABELS[workTypeId] || `유형#${workTypeId}`;
  return {
    type: 'title',
    key: `title-${workTypeId}`,
    text: `#${workTypeId}. ${label}`,
    workTypeId,
    chunkMeta
  };
};

const createInstructionSection = (
  workTypeId: string,
  defaultText: string,
  chunkMeta?: any
): PrintSection | null => {
  if (chunkMeta && chunkMeta.showInstruction === false) {
    return null;
  }
  return {
    type: 'instruction',
    key: `instruction-${workTypeId}`,
    text: defaultText,
    meta: { workTypeId }
  };
};

const legacyChunkMetaFromItem = (quizItem: any) => {
  if (typeof quizItem?.chunkIndex === 'number' && typeof quizItem?.totalChunks === 'number') {
    return {
      chunkIndex: quizItem.chunkIndex,
      totalChunks: quizItem.totalChunks,
      isSplitChunk: quizItem.totalChunks > 1,
      showInstruction: quizItem.chunkIndex === 0,
      showOptions: quizItem.chunkIndex === quizItem.totalChunks - 1,
      showAnswer: quizItem.chunkIndex === quizItem.totalChunks - 1,
      showTranslation: quizItem.chunkIndex === quizItem.totalChunks - 1
    };
  }
  return undefined;
};

export const normalizeQuizItemForPrint = (
  quizItem: any,
  helpers: NormalizationHelpers
): NormalizedQuizItem => {
  const { isAnswerMode, cleanOptionText, renderTextWithHighlight, getTranslatedText } = helpers;

  const workTypeId = quizItem.workTypeId || 'unknown';
  const quizData = quizItem.quiz || quizItem.data || {};
  const chunkMeta = quizItem.chunkMeta || legacyChunkMetaFromItem(quizItem);

  const sections: PrintSection[] = [];
  const pushSection = (section: PrintSection | null | undefined) => {
    if (!section) return;
    sections.push(section);
  };

  const addOptionsSection = (options: PrintOptionItem[], keySuffix: string = '') => {
    if (chunkMeta && chunkMeta.showOptions === false) return;
    if (!options || options.length === 0) return;
    pushSection({
      type: 'options',
      key: `options-${workTypeId}${keySuffix}`,
      options
    });
  };

  const addAnswerSection = (answers: string[], description?: string, keySuffix: string = '') => {
    if (!isAnswerMode) return;
    // 유형#06의 경우 항상 정답 섹션 추가
    if (workTypeId === '06') {
      pushSection({
        type: 'answer',
        key: `answer-${workTypeId}${keySuffix}`,
        items: answers,
        meta: description ? { description } : undefined
      });
      return;
    }
    if (chunkMeta && chunkMeta.showAnswer === false) return;
    pushSection({
      type: 'answer',
      key: `answer-${workTypeId}${keySuffix}`,
      items: answers,
      meta: description ? { description } : undefined
    });
  };

  const addTranslationSection = (text: string | undefined | null, keySuffix: string = '') => {
    // 패키지#02 인쇄(정답) 모드에서는 각 유형의 translation 섹션을 추가하지 않음
    // 모든 유형의 translation을 모아서 마지막에 하나만 표시하도록 변경
    // 따라서 이 함수는 더 이상 사용하지 않음 (하위 호환성을 위해 유지)
    return;
  };

  const titleSection = createTitleSection(workTypeId, chunkMeta);
  pushSection(titleSection);

  switch (workTypeId) {
    case '01': {
      // 모의고사 형식인지 확인
      const isExamFormat = quizData.format === 'exam';
      const instruction = isExamFormat 
        ? '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.'
        : '다음 단락들을 의미에 맞게 가장 적절히 배열한 것을 고르세요.';
      
      pushSection(createInstructionSection('01', instruction, chunkMeta));
      
      // 모의고사 형식이면 고정된 첫 번째 단락을 박스로 표시
      if (isExamFormat && quizData.fixedParagraph) {
        pushSection({
          type: 'html',
          key: 'fixed-paragraph-01',
          html: `<div class="fixed-paragraph-box" style="border: 1px solid #000; border-radius: 8px; padding: 0.6rem 1.0rem; margin-top: 0; margin-bottom: 0.75rem; background-color: #fff; font-size: 9.3pt; line-height: 1.6; color: #333;">${quizData.fixedParagraph}</div>`
        });
      }
      
      const paragraphs = ensureParagraphArray(quizData.shuffledParagraphs || []);
      paragraphs.forEach((para, index) => {
        pushSection({
          type: 'paragraph',
          key: `paragraph-01-${index}`,
          text: para.content,
          label: isExamFormat ? `(${para.label})` : para.label // 모의고사 형식은 (A), (B), (C) 형식
        });
      });

      // 유형#01의 경우 choices는 배열의 배열이므로 형식에 따라 구분자 사용
      const choices = quizData.choices || [];
      const choiceSeparator = isExamFormat ? ' - ' : ' → ';
      const options = choices.map((choice: any, idx: number) => {
        const choiceArray = Array.isArray(choice) ? choice : [];
        const choiceText = choiceArray.length > 0 
          ? choiceArray.join(choiceSeparator)
          : cleanOptionText(choice);
        return {
          label: OPTION_LABELS[idx],
          text: choiceText,
          isCorrect: isAnswerMode ? quizData.answerIndex === idx : undefined
        };
      });
      
      // 모든 옵션 표시 (정답 모드에서도 모든 4지선다 항목 표시)
      addOptionsSection(options);

      // 정답 모드일 때: 4지선다 하단에 영어 본문 해석 추가
      if (isAnswerMode) {
        const translationText = getTranslatedText(quizItem, quizData);
        if (translationText && translationText.trim()) {
          // \n\n으로 구분된 단락별 번역을 하나의 문단으로 합치기 (줄바꿈 제거)
          const mergedTranslation = translationText
            .split('\n\n')
            .map(para => para.trim())
            .filter(para => para.length > 0)
            .join(' '); // 공백으로 연결하여 하나의 문단으로 만듦
          
          pushSection({
            type: 'translation',
            key: `translation-01${chunkMeta ? `-chunk-${chunkMeta.chunkIndex}` : ''}`,
            text: mergedTranslation
          });
        }
      }
      break;
    }
    case '02': {
      pushSection(createInstructionSection('02', '다음 본문을 읽고 해석하세요', chunkMeta));

      const htmlText = renderTextWithHighlight(
        quizData?.work02Data?.modifiedText || quizItem?.work02Data?.modifiedText || quizData?.modifiedText || '',
        quizData?.work02Data?.replacements || quizItem?.work02Data?.replacements || []
      );
      pushSection({
        type: 'html',
        key: 'html-02-passage',
        html: htmlText
      });

      if (isAnswerMode) {
        const replacements = quizData?.work02Data?.replacements || quizItem?.work02Data?.replacements || [];
        if (Array.isArray(replacements) && replacements.length > 0) {
          const headers = ['원래 단어', '교체 단어', '의미'];
          const rows = replacements.map((rep: any) => [
            rep.original || '',
            rep.replacement || '',
            rep.originalMeaning || ''
          ]);
          pushSection({
            type: 'table',
            key: 'table-02-replacements',
            headers,
            rows
          });
        }
      }

      addTranslationSection(getTranslatedText(quizItem, quizData));
      break;
    }
    case '03':
    case '04':
    case '05': {
      const instructionText =
        workTypeId === '03'
          ? '다음 빈칸에 들어갈 가장 적절한 단어를 고르세요'
          : workTypeId === '04'
          ? '다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르세요'
          : '다음 빈칸에 들어갈 가장 적절한 문장을 고르세요';
      pushSection(createInstructionSection(workTypeId, instructionText, chunkMeta));
      const data = quizItem?.[`work${workTypeId}Data`] || quizData?.[`work${workTypeId}Data`] || quizData;

      if (data?.blankedText) {
        pushSection({
          type: 'paragraph',
          key: `paragraph-${workTypeId}-blanked`,
          text: data.blankedText
        });
      }

      const options = ensureOptionsArray(data?.options || [], helpers).map((option, idx) => ({
        ...option,
        text: cleanOptionText(option.text),
        isCorrect: isAnswerMode ? data?.answerIndex === idx : undefined,
        // 유형#05의 경우 optionTranslations가 있으면 각 옵션에 translation 추가
        translation: isAnswerMode && data?.optionTranslations && Array.isArray(data.optionTranslations) && data.optionTranslations[idx] 
          ? data.optionTranslations[idx] 
          : option.translation || undefined
      }));
      addOptionsSection(options);

      if (isAnswerMode) {
        addAnswerSection([
          `정답: ${OPTION_LABELS[data?.answerIndex] || '-'}`
        ]);
      }

      addTranslationSection(getTranslatedText(quizItem, data || quizData));
      break;
    }
    case '06': {
      pushSection(createInstructionSection('06', '다음 영어본문에서 주요문장이 들어가야 할 가장 적합한 위치를 찾으세요.', chunkMeta));
      const data = quizItem?.work06Data || quizData?.work06Data || quizData;

      if (data?.missingSentence) {
        pushSection({
          type: 'paragraph',
          key: 'paragraph-06-missing',
          text: `주요 문장 : ${data.missingSentence}`,
          meta: { variant: 'missing-sentence' }
        });
      }

      if (data?.numberedPassage) {
        pushSection({
          type: 'paragraph',
          key: 'paragraph-06-passage',
          text: data.numberedPassage,
          meta: { variant: 'numbered-passage' }
        });
      }

      // 유형#06의 경우 answerIndex를 여러 소스에서 확인 (가장 우선순위 높은 것부터)
      let answerIndex: number | undefined = undefined;
      if (quizItem?.work06Data?.answerIndex !== undefined && typeof quizItem.work06Data.answerIndex === 'number') {
        answerIndex = quizItem.work06Data.answerIndex;
      } else if (data?.answerIndex !== undefined && typeof data.answerIndex === 'number') {
        answerIndex = data.answerIndex;
      } else if (quizData?.work06Data?.answerIndex !== undefined && typeof quizData.work06Data.answerIndex === 'number') {
        answerIndex = quizData.work06Data.answerIndex;
      } else if (quizItem?.quiz?.work06Data?.answerIndex !== undefined && typeof quizItem.quiz.work06Data.answerIndex === 'number') {
        answerIndex = quizItem.quiz.work06Data.answerIndex;
      } else if (quizItem?.quiz?.answerIndex !== undefined && typeof quizItem.quiz.answerIndex === 'number') {
        answerIndex = quizItem.quiz.answerIndex;
      }

      // 디버깅: 유형#06의 answerIndex 확인
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 유형#06 answerIndex 찾기:', {
          answerIndex,
          'quizItem.work06Data?.answerIndex': quizItem?.work06Data?.answerIndex,
          'data?.answerIndex': data?.answerIndex,
          'quizData?.work06Data?.answerIndex': quizData?.work06Data?.answerIndex,
          'quizItem?.quiz?.work06Data?.answerIndex': quizItem?.quiz?.work06Data?.answerIndex,
          'quizItem?.quiz?.answerIndex': quizItem?.quiz?.answerIndex,
          isAnswerMode
        });
      }

      // 영어본문 컨테이너 바로 아래에 정답이 들어갈 컨테이너 추가 (유형#06 인쇄 정답 모드)
      // 유형#06의 경우 영어본문 컨테이너 바로 아래에 "정답 : ④" 형식으로 표시
      if (isAnswerMode) {
        if (answerIndex !== undefined && typeof answerIndex === 'number') {
          const answerText = `정답 : ${OPTION_LABELS[answerIndex] || '-'}`;
          
          // 영어본문 컨테이너 바로 아래에 정답이 들어갈 컨테이너 추가
          const infoSection = {
            type: 'text' as const,
            key: 'text-06-info',
            text: answerText, // 정답 텍스트
            meta: { variant: 'work06-info' }
          };
          console.log('✅ 유형#06 정답 컨테이너 섹션 추가:', infoSection);
          pushSection(infoSection);
          console.log('✅ 유형#06 정답 컨테이너 섹션 추가 완료, 현재 섹션 수:', sections.length);
          
          // 기존 answer 섹션은 추가하지 않음 (정답이 컨테이너에 표시됨)
        } else {
          // answerIndex를 찾지 못한 경우 경고
          console.warn('⚠️ 유형#06: answerIndex를 찾을 수 없습니다', {
            quizItem: {
              work06Data: quizItem?.work06Data,
              quiz: quizItem?.quiz
            },
            data: {
              answerIndex: data?.answerIndex,
              work06Data: data?.work06Data
            },
            quizData: {
              work06Data: quizData?.work06Data,
              answerIndex: quizData?.answerIndex
            }
          });
        }
      }

      addTranslationSection(getTranslatedText(quizItem, data || quizData));
      break;
    }
    case '07':
    case '08': {
      const instructionText =
        workTypeId === '07'
          ? '다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요'
          : '다음 본문에 가장 적합한 제목을 고르세요';
      pushSection(createInstructionSection(workTypeId, instructionText, chunkMeta));
      const data = quizItem?.[`work${workTypeId}Data`] || quizData?.[`work${workTypeId}Data`] || quizData;

      if (data?.passage) {
        pushSection({
          type: 'paragraph',
          key: `paragraph-${workTypeId}-passage`,
          text: data.passage
        });
      }

      const options = ensureOptionsArray(data?.options || [], helpers).map((option, idx) => ({
        ...option,
        text: cleanOptionText(option.text),
        isCorrect: isAnswerMode ? data?.answerIndex === idx : undefined,
        translation:
          isAnswerMode &&
          (data?.optionTranslations?.[idx] ||
            data?.optionTranslationsKo?.[idx] ||
            data?.optionTranslationsEnKo?.[idx])
            ? data.optionTranslations?.[idx] ||
              data.optionTranslationsKo?.[idx] ||
              data.optionTranslationsEnKo?.[idx]
            : undefined
      }));
      addOptionsSection(options);

      if (isAnswerMode) {
        addAnswerSection([`정답: ${OPTION_LABELS[data?.answerIndex] || '-'}`]);
      }

      addTranslationSection(getTranslatedText(quizItem, data || quizData));
      break;
    }
    case '09':
    case '10': {
      const instructionText =
        workTypeId === '09'
          ? '다음 영어 본문에 표시된 단어들 중에서 어법상 틀린 것을 고르시오.'
          : '다음 영어 본문에 표시된 단어들 중에서 어법상 틀린 단어의 개수를 고르시오.';
      pushSection(createInstructionSection(workTypeId, instructionText, chunkMeta));

      const data = quizItem?.[`work${workTypeId}Data`] || quizData?.[`work${workTypeId}Data`] || quizData;
      
      // 유형#10: numberedPassage 우선 사용, 없으면 동적 생성
      let htmlContent = '';
      if (data?.numberedPassage) {
        // numberedPassage가 이미 HTML이므로 그대로 사용
        htmlContent = data.numberedPassage;
        console.log('🔍 유형#10: numberedPassage 사용 (항상 로그):', {
          hasNumberedPassage: true,
          htmlLength: htmlContent.length,
          htmlPreview: htmlContent.substring(0, 100)
        });
      } else if (data?.passage) {
        // numberedPassage가 없으면 originalWords와 transformedWords로 동적 생성
        const originalWords = data?.originalWords || [];
        const transformedWords = data?.transformedWords || [];
        
        if (originalWords.length > 0 && transformedWords.length > 0 && originalWords.length === transformedWords.length) {
          // 동적 생성 로직 (work10Service의 applyNumberAndUnderlineForWork10와 동일)
          const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
          const passage = data.passage;
          const wordPositions: Array<{ originalIndex: number; start: number; end: number }> = [];
          
          // 각 단어의 위치 찾기
          for (let i = 0; i < originalWords.length; i++) {
            const word = originalWords[i];
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
            const match = regex.exec(passage);
            
            if (match) {
              wordPositions.push({
                originalIndex: i,
                start: match.index,
                end: match.index + match[0].length
              });
            }
          }
          
          // 위치 기준으로 정렬
          wordPositions.sort((a, b) => a.start - b.start);
          
          // 뒤에서부터 치환 (인덱스 유지)
          let numberedPassage = passage;
          for (let i = wordPositions.length - 1; i >= 0; i--) {
            const pos = wordPositions[i];
            const circleNumber = circleNumbers[i];
            const displayWord = transformedWords[pos.originalIndex];
            const replacement = `<span class="word-idx">${circleNumber}</span><u>${displayWord}</u>`;
            
            numberedPassage = 
              numberedPassage.substring(0, pos.start) + 
              replacement + 
              numberedPassage.substring(pos.end);
          }
          
          // 줄바꿈 처리
          htmlContent = numberedPassage.replace(/\n/g, '<br/>');
          
          console.log('🔧 유형#10: numberedPassage가 없어서 동적으로 생성합니다 (항상 로그):', {
            hasNumberedPassage: false,
            originalWordsCount: originalWords.length,
            transformedWordsCount: transformedWords.length,
            wordPositionsCount: wordPositions.length,
            htmlLength: htmlContent.length,
            htmlPreview: htmlContent.substring(0, 100)
          });
        } else {
          // 동적 생성 불가능: passage만 사용
          htmlContent = data.passage.replace(/\\n/g, '<br/>');
          console.warn('⚠️ 유형#10: numberedPassage 동적 생성 불가능, passage만 사용:', {
            hasOriginalWords: originalWords.length > 0,
            hasTransformedWords: transformedWords.length > 0,
            originalWordsCount: originalWords.length,
            transformedWordsCount: transformedWords.length
          });
        }
      }
      
      if (htmlContent) {
        pushSection({
          type: 'html',
          key: `html-${workTypeId}-passage`,
          html: htmlContent
        });
      }

      if (Array.isArray(data?.options)) {
        const options = data.options.map((option: any, idx: number) => ({
          label: OPTION_LABELS[idx],
          text: cleanOptionText(String(option)),
          isCorrect: isAnswerMode ? data?.answerIndex === idx : undefined
        }));
        addOptionsSection(options);
      }

      // 유형#10 인쇄(정답) 모드: 4지선다 아래에 어법 오류 정보 텍스트 추가
      // 중요: 이 섹션은 options 섹션 다음에 추가되어야 함
      if (isAnswerMode && workTypeId === '10') {
        // 어법 오류 정보 포맷팅
        let errorText = '유형테스트';
        if (Array.isArray(data?.wrongIndexes) && Array.isArray(data?.originalWords) && Array.isArray(data?.transformedWords)) {
          const wrongIndexes = data.wrongIndexes;
          const originalWords = data.originalWords;
          const transformedWords = data.transformedWords;
          
          // 틀린 단어들을 인덱스 순서대로 정렬하여 포맷팅
          const sortedIndexes = [...wrongIndexes].sort((a, b) => a - b);
          const errorItems = sortedIndexes
            .filter(index => index >= 0 && index < 8 && originalWords[index] && transformedWords[index])
            .map(index => {
              const label = OPTION_LABELS[index] || `(${index + 1})`;
              const original = originalWords[index];
              const transformed = transformedWords[index];
              return `${label}${original} → ${transformed}`;
            });
          
          if (errorItems.length > 0) {
            errorText = `어법상 틀린 단어: ${errorItems.join(', ')}`;
          }
        }
        
        const testTextSection: PrintSection = {
          type: 'text',
          key: `text-${workTypeId}-test-label`,
          text: errorText
        };
        pushSection(testTextSection);
        console.log('✅ 유형#10 텍스트 섹션 추가 (항상 로그):', {
          workTypeId,
          isAnswerMode,
          section: testTextSection,
          sectionsCount: sections.length,
          allSectionTypes: sections.map(s => s.type),
          allSectionKeys: sections.map(s => s.key),
          errorText
        });
      }

      if (isAnswerMode) {
        if (workTypeId === '09') {
          addAnswerSection([`정답: ${OPTION_LABELS[data?.answerIndex] || '-'}`]);
        } else if (workTypeId === '10') {
          const answerOption = Array.isArray(data?.options)
            ? data.options[data.answerIndex]
            : undefined;
          const answerText =
            typeof answerOption === 'number'
              ? `${answerOption}개`
              : cleanOptionText(String(answerOption || '-'));
          addAnswerSection([`정답: ${answerText}`]);
        }
      }

      addTranslationSection(getTranslatedText(quizItem, data || quizData));
      break;
    }
    case '11': {
      const data =
        quizItem?.work11Data ||
        quizData?.work11Data ||
        quizData?.data?.work11Data ||
        quizData;

      // 디버깅: 유형#11 데이터 구조 확인
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 유형#11 정규화 디버깅:', {
          hasQuizItem: !!quizItem,
          hasQuizData: !!quizData,
          hasWork11Data: !!quizItem?.work11Data,
          hasQuizDataWork11Data: !!quizData?.work11Data,
          data: data,
          sentencesCount: Array.isArray(data?.sentences) ? data.sentences.length : 0,
          isAnswerMode: isAnswerMode
        });
      }

      pushSection(createInstructionSection('11', '다음 본문을 문장별로 해석하세요', chunkMeta));

      // sentences 배열 처리 (객체 배열 또는 문자열 배열)
      let sentences = Array.isArray(data?.sentences) ? data.sentences : [];
      
      // translations 배열이 별도로 있는 경우 (SentenceTranslationQuiz 타입)
      // sentences와 translations를 합쳐서 처리
      if (sentences.length === 0 && Array.isArray(data?.translations) && data?.translations.length > 0) {
        // translations만 있고 sentences가 없는 경우는 없어야 하지만, 안전하게 처리
        console.warn('⚠️ 유형#11: translations는 있지만 sentences가 없습니다.', { data });
      } else if (Array.isArray(data?.translations) && data?.translations.length > 0) {
        // sentences가 문자열 배열이고 translations가 별도 배열인 경우
        const isStringArray = sentences.length > 0 && typeof sentences[0] === 'string';
        if (isStringArray) {
          sentences = sentences.map((sentence: string, idx: number) => ({
            english: sentence,
            korean: data.translations[idx] || ''
          }));
        }
      }
      
      // sentences 배열이 비어있으면 경고 로그 출력
      if (sentences.length === 0) {
        console.warn('⚠️ 유형#11: sentences 배열이 비어있습니다.', {
          data: data,
          quizItem: quizItem,
          quizData: quizData,
          hasTranslations: Array.isArray(data?.translations),
          translationsCount: Array.isArray(data?.translations) ? data.translations.length : 0
        });
      }
      
      // sentences 배열이 비어있으면 경고하고 빈 섹션 추가 (빈 페이지 방지)
      if (sentences.length === 0) {
        console.error('❌ 유형#11: sentences 배열이 비어있어서 빈 페이지가 생성될 수 있습니다!', {
          data: data,
          quizItem: quizItem,
          quizData: quizData,
          hasTranslations: Array.isArray(data?.translations),
          translationsCount: Array.isArray(data?.translations) ? data.translations.length : 0
        });
        // 빈 섹션 추가하여 최소한 제목과 instruction이 표시되도록 함
        pushSection({
          type: 'paragraph',
          key: 'paragraph-11-empty',
          text: '(문장 데이터가 없습니다.)',
          meta: { variant: 'sentence' }
        });
      }
      
      sentences.forEach((sentence: any, idx: number) => {
        const englishText = typeof sentence === 'string' ? sentence : sentence?.english || sentence?.text || '';
        const koreanText = typeof sentence === 'string' ? '' : sentence?.korean || sentence?.translation || '';
        const label = sentence?.label || `문장 ${idx + 1} : `;

        // 영어 문장이 비어있으면 건너뛰기
        if (!englishText || englishText.trim().length === 0) {
          console.warn(`⚠️ 유형#11: ${idx + 1}번 문장이 비어있습니다.`, { sentence });
          return;
        }

        // 정답 모드: 영어 문장과 한글 해석을 하나의 섹션으로 묶기
        if (isAnswerMode) {
          pushSection({
            type: 'paragraph',
            key: `paragraph-11-${idx}-combined`,
            text: englishText,
            label,
            meta: { 
              variant: 'sentence-with-translation',
              translation: koreanText && koreanText.trim().length > 0 ? koreanText : undefined
            }
          });
          
          if (!koreanText || koreanText.trim().length === 0) {
            // 정답 모드인데 번역이 없는 경우 경고
            console.warn(`⚠️ 유형#11: ${idx + 1}번 문장의 번역이 없습니다.`, { 
              sentence, 
              englishText,
              hasKorean: !!koreanText 
            });
          }
        } else {
          // 문제 모드: 영어 문장만 표시
          pushSection({
            type: 'paragraph',
            key: `paragraph-11-${idx}`,
            text: englishText,
            label,
            meta: { variant: 'sentence' }
          });
        }
      });

      break;
    }
    case '12': {
      pushSection(createInstructionSection('12', '다음 단어들의 의미를 학습하세요', chunkMeta));
      const data = quizItem?.work12Data || quizData?.work12Data || quizData;

      if (data?.passage) {
        pushSection({
          type: 'paragraph',
          key: 'paragraph-12-passage',
          text: data.passage
        });
      }

      if (isAnswerMode && Array.isArray(data?.words)) {
        const listItems = data.words.map(
          (word: any) => `${word.word || ''}: ${word.meaning || ''}`.trim()
        );
        pushSection({
          type: 'list',
          key: 'list-12-words',
          items: listItems,
          meta: { variant: 'word-list' }
        });
      }
      break;
    }
    case '13':
    case '14': {
      const instructionText =
        workTypeId === '13'
          ? '다음 빈칸에 들어갈 적절한 정답을 쓰시오.'
          : '다음 빈칸에 들어갈 적절한 문장을 쓰시오.';
      pushSection(createInstructionSection(workTypeId, instructionText, chunkMeta));

      const data = quizItem?.[`work${workTypeId}Data`] || quizData?.[`work${workTypeId}Data`] || quizData;
      if (data?.blankedText) {
        let formattedBlankedText = data.blankedText;
        
        if (isAnswerMode && Array.isArray(data?.correctAnswers) && data.correctAnswers.length > 0) {
          // 정답 모드: 빈칸을 정답으로 대체 (파란색 진하게 스타일 적용)
          // 원본 blankedText에서 빈칸 패턴을 찾아서 정답으로 교체
          let answerIndex = 0;
          
          // 먼저 원본 텍스트에서 이상한 패턴들을 제거 (정답 교체 전에 정리)
          // 패턴: ( ( (____________________E____________________) 문장 ) 같은 복잡한 패턴 제거
          // 여러 개의 여는 괄호 + 빈칸 패턴 + 문장 + 닫는 괄호들
          // 더 포괄적인 패턴: 괄호 안에 언더스코어와 문자가 섞여있고 그 뒤에 문장이 있는 경우
          let hasCleanup = true;
          while (hasCleanup) {
            const beforeCleanup = formattedBlankedText;
            // 3개 이상의 여는 괄호 + 빈칸 패턴 + 문장 + 닫는 괄호들
            formattedBlankedText = formattedBlankedText.replace(/\(\s*\(\s*\([\s]*_+[A-Z]_+[\s]*\)[^)]*\)/gi, '');
            // 2개의 여는 괄호 + 빈칸 패턴 + 문장 + 닫는 괄호
            formattedBlankedText = formattedBlankedText.replace(/\(\s*\([\s]*_+[A-Z]_+[\s]*\)[^)]*\)/gi, '');
            // 괄호 안에 언더스코어가 있고 그 뒤에 문장이 있는 패턴 (일반적인 경우)
            formattedBlankedText = formattedBlankedText.replace(/\([\s]*_+[A-Z]_+[\s]*\)[^)]*\)/gi, '');
            hasCleanup = beforeCleanup !== formattedBlankedText;
          }
          
          // 포괄적인 빈칸 패턴: (_____), ( A _____ ), ( _ _ _ _ _ ), (_______________), (____________________A____________________) 등 모든 형태를 찾음
          // 괄호 안에 선택적 문자(A-Z), 공백, 언더스코어가 있는 패턴
          // 패턴 1: 일반적인 빈칸 (_____), ( A _____ )
          const blankPattern = /\([\s]*([A-Z])?[\s]*_+[\s]*\)/gi;
          
          formattedBlankedText = formattedBlankedText.replace(blankPattern, () => {
            if (answerIndex < data.correctAnswers.length) {
              const answer = data.correctAnswers[answerIndex++];
              // HTML로 파란색 진하게 스타일 적용
              return `( <span style="color: #1976d2; font-weight: 700;">${answer}</span> )`;
            }
            // 정답이 부족하면 원본 유지 (이론적으로는 발생하지 않아야 함)
            return '(_____)';
          });
          
          // 패턴 2: 언더스코어 사이에 문자가 있는 패턴 (____________________A____________________) 제거
          // 정답 교체 후 남은 이런 패턴들을 제거
          formattedBlankedText = formattedBlankedText.replace(/\([\s]*_+[A-Z]_+[\s]*\)/gi, () => {
            if (answerIndex < data.correctAnswers.length) {
              const answer = data.correctAnswers[answerIndex++];
              // HTML로 파란색 진하게 스타일 적용
              return `( <span style="color: #1976d2; font-weight: 700;">${answer}</span> )`;
            }
            // 정답이 없으면 빈 괄호로 제거
            return '';
          });
          
          // 패턴 3: 앞에 여분의 괄호가 있는 패턴 ( (____________________E____________________) 제거
          // 두 개의 괄호가 연속으로 있는 경우 (공백 있거나 없거나)
          // 정규식: 여는 괄호 하나 이상, 공백 0개 이상, 빈칸 패턴, 닫는 괄호
          let hasReplacement = true;
          while (hasReplacement) {
            const beforeReplace = formattedBlankedText;
            formattedBlankedText = formattedBlankedText.replace(/\(\s*\([\s]*_+[A-Z]_+[\s]*\)/gi, () => {
              if (answerIndex < data.correctAnswers.length) {
                const answer = data.correctAnswers[answerIndex++];
                // HTML로 파란색 진하게 스타일 적용 (여분의 괄호 제거)
                return `( <span style="color: #1976d2; font-weight: 700;">${answer}</span> )`;
              }
              // 정답이 없으면 완전히 제거
              return '';
            });
            hasReplacement = beforeReplace !== formattedBlankedText;
          }
          
          // 패턴 4: 남은 모든 빈칸 패턴 제거 (언더스코어만 있는 패턴, 두 개의 괄호 포함)
          formattedBlankedText = formattedBlankedText.replace(/\([\s]*_+[\s]*\)/gi, '');
          // 두 개의 괄호가 연속으로 있는 빈 패턴도 제거 (반복적으로)
          hasReplacement = true;
          while (hasReplacement) {
            const beforeReplace = formattedBlankedText;
            formattedBlankedText = formattedBlankedText.replace(/\(\s*\([\s]*_+[\s]*\)/gi, '');
            hasReplacement = beforeReplace !== formattedBlankedText;
          }
          
          // 패턴 5: 복잡한 중첩 패턴 제거 (정답 교체 후에도 남아있을 수 있는 패턴)
          // ( ( (___E___) 문장 ) 같은 패턴
          hasReplacement = true;
          while (hasReplacement) {
            const beforeReplace = formattedBlankedText;
            formattedBlankedText = formattedBlankedText.replace(/\(\s*\(\s*\([^)]*\)[^)]*\)/gi, '');
            formattedBlankedText = formattedBlankedText.replace(/\(\s*\([^)]*_+[^)]*\)[^)]*\)/gi, '');
            hasReplacement = beforeReplace !== formattedBlankedText;
          }
          
          // HTML이 포함된 텍스트이므로 html 타입으로 섹션 생성
          pushSection({
            type: 'html',
            key: `paragraph-${workTypeId}-blanked`,
            html: formattedBlankedText
          });
        } else if (!isAnswerMode && Array.isArray(data?.correctAnswers)) {
          // 문제 모드: 빈칸 표시를 변환: (_____) → ( _ _ _ _ _ )
          formattedBlankedText = formatBlankedText(
            data.blankedText,
            data.correctAnswers
          );
          
          pushSection({
            type: 'paragraph',
            key: `paragraph-${workTypeId}-blanked`,
            text: formattedBlankedText
          });
        } else {
          // 정답이 없는 경우 기본 텍스트로 표시
          pushSection({
            type: 'paragraph',
            key: `paragraph-${workTypeId}-blanked`,
            text: formattedBlankedText
          });
        }
      } else {
        // blankedText가 없으면 경고 (빈 페이지 방지)
        console.error(`❌ 유형#${workTypeId}: blankedText가 없어서 빈 페이지가 생성될 수 있습니다!`, {
          data: data,
          quizItem: quizItem,
          quizData: quizData
        });
      }

      if (isAnswerMode) {
        const answers = Array.isArray(data?.correctAnswers)
          ? data.correctAnswers.map((ans: string, idx: number) => `${idx + 1}. ${ans}`)
          : [];
        if (answers.length > 0) {
          addAnswerSection(answers);
        }
      }

      addTranslationSection(getTranslatedText(quizItem, data || quizData));
      break;
    }
    default: {
      pushSection({
        type: 'text',
        key: `unknown-${workTypeId}`,
        text: JSON.stringify(quizItem, null, 2)
      });
      break;
    }
  }

  return {
    originalItem: quizItem,
    workTypeId,
    chunkMeta,
    sections
  };
};


