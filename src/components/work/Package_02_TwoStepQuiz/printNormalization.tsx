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
    if (chunkMeta && chunkMeta.showAnswer === false) return;
    pushSection({
      type: 'answer',
      key: `answer-${workTypeId}${keySuffix}`,
      items: answers,
      meta: description ? { description } : undefined
    });
  };

  const addTranslationSection = (text: string | undefined | null, keySuffix: string = '') => {
    if (!isAnswerMode) return;
    if (chunkMeta && chunkMeta.showTranslation === false) return;
    if (!text || !text.trim()) return;
    pushSection({
      type: 'translation',
      key: `translation-${workTypeId}${keySuffix}`,
      text
    });
  };

  const titleSection = createTitleSection(workTypeId, chunkMeta);
  pushSection(titleSection);

  switch (workTypeId) {
    case '01': {
      const data =
        quizItem?.work01Data ||
        quizData?.work01Data ||
        quizItem?.quiz?.work01Data ||
        quizData ||
        quizItem;

      pushSection(
        createInstructionSection(
          '01',
          '다음 단락들을 원래 순서대로 배열한 것을 고르세요',
          chunkMeta
        )
      );

      const paragraphs = ensureParagraphArray(
        data?.shuffledParagraphs || data?.paragraphs || quizData?.shuffledParagraphs || []
      );
      paragraphs.forEach((para, index) => {
        pushSection({
          type: 'paragraph',
          key: `paragraph-01-${index}`,
          text: para.content,
          label: para.label
        });
      });

      const optionsSource = data?.choices || quizData?.choices || quizData?.options || [];
      const options = ensureOptionsArray(optionsSource, helpers).map((option, idx) => ({
        ...option,
        text: cleanOptionText(option.text),
        isCorrect: isAnswerMode ? data?.answerIndex === idx : undefined
      }));
      addOptionsSection(options);

      if (isAnswerMode) {
        addAnswerSection([`정답: ${OPTION_LABELS[data?.answerIndex] || '-'}`]);
      }
      addTranslationSection(getTranslatedText(quizItem, data || quizData));
      break;
    }
    case '02': {
      const data =
        quizItem?.work02Data ||
        quizData?.work02Data ||
        quizItem?.quiz?.work02Data ||
        quizData ||
        quizItem;

      pushSection(createInstructionSection('02', '다음 본문을 읽고 해석하세요', chunkMeta));

      const htmlText = renderTextWithHighlight(
        data?.modifiedText || quizData?.modifiedText || '',
        data?.replacements || []
      );
      pushSection({
        type: 'html',
        key: 'html-02-passage',
        html: htmlText
      });

      if (isAnswerMode) {
        const replacements = data?.replacements || [];
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

      addTranslationSection(getTranslatedText(quizItem, data || quizData));
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
      const data =
        quizItem?.[`work${workTypeId}Data`] ||
        quizData?.[`work${workTypeId}Data`] ||
        quizItem?.quiz?.[`work${workTypeId}Data`] ||
        quizData ||
        quizItem;

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
        isCorrect: isAnswerMode ? data?.answerIndex === idx : undefined
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
      const data =
        quizItem?.work06Data ||
        quizData?.work06Data ||
        quizItem?.quiz?.work06Data ||
        quizData ||
        quizItem;

      if (data?.missingSentence) {
        pushSection({
          type: 'paragraph',
          key: 'paragraph-06-missing',
          text: `주요 문장: ${data.missingSentence}`
        });
      }

      if (data?.numberedPassage) {
        pushSection({
          type: 'paragraph',
          key: 'paragraph-06-passage',
          text: data.numberedPassage
        });
      }

      if (isAnswerMode && typeof data?.answerIndex === 'number') {
        addAnswerSection([`정답: ${OPTION_LABELS[data.answerIndex] || '-'}`]);
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
      const data =
        quizItem?.[`work${workTypeId}Data`] ||
        quizData?.[`work${workTypeId}Data`] ||
        quizItem?.quiz?.[`work${workTypeId}Data`] ||
        quizData ||
        quizItem;

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

      const data =
        quizItem?.[`work${workTypeId}Data`] ||
        quizData?.[`work${workTypeId}Data`] ||
        quizItem?.quiz?.[`work${workTypeId}Data`] ||
        quizData ||
        quizItem;
      const passage = data?.passage || '';
      if (passage) {
        pushSection({
          type: 'html',
          key: `html-${workTypeId}-passage`,
          html: passage.replace(/\\n/g, '<br/>')
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
        quizItem?.quiz?.work11Data ||
        quizData ||
        quizItem;

      pushSection(createInstructionSection('11', '다음 본문을 문장별로 해석하세요', chunkMeta));

      const sentences = Array.isArray(data?.sentences) ? data.sentences : [];
      sentences.forEach((sentence: any, idx: number) => {
        const englishText = typeof sentence === 'string' ? sentence : sentence?.english || sentence?.text || '';
        const koreanText = typeof sentence === 'string' ? '' : sentence?.korean || sentence?.translation || '';
        const label = sentence?.label || `문장 ${idx + 1}`;

        pushSection({
          type: 'paragraph',
          key: `paragraph-11-${idx}`,
          text: englishText,
          label,
          meta: { variant: 'sentence' }
        });

        if (isAnswerMode && koreanText) {
          pushSection({
            type: 'paragraph',
            key: `paragraph-11-${idx}-translation`,
            text: koreanText,
            meta: { variant: 'sentence-translation' }
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

      const data =
        quizItem?.[`work${workTypeId}Data`] ||
        quizData?.[`work${workTypeId}Data`] ||
        quizItem?.quiz?.[`work${workTypeId}Data`] ||
        quizData ||
        quizItem;
      if (data?.blankedText) {
        // 유형#13, #14의 경우 빈칸 표시를 변환: (_____) → ( _ _ _ _ _ )
        let formattedBlankedText = data.blankedText;
        if ((workTypeId === '13' || workTypeId === '14') && Array.isArray(data?.correctAnswers)) {
          formattedBlankedText = formatBlankedText(
            data.blankedText,
            data.correctAnswers
          );
        }
        
        pushSection({
          type: 'paragraph',
          key: `paragraph-${workTypeId}-blanked`,
          text: formattedBlankedText
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


