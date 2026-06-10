/**
 * 캡처/이미지에서 영어 단어 추출 및 입력창 포맷 (유형#12·#15 공통)
 */
import { callOpenAI } from './common';

export interface ExtractedWordItem {
  english: string;
  korean: string;
  partOfSpeech?: string;
}

const PART_OF_SPEECH_IN_MEANING_REGEX = /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|interj\.)\s+(.+)$/i;

export const isEnglishToken = (token: string): boolean =>
  /^[a-zA-Z][a-zA-Z\-']*$/.test(token.trim());

/** 단일 단어 또는 숙어(공백 포함 구문) */
export const isEnglishWordOrPhrase = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return /^[a-zA-Z][a-zA-Z\s\-']*$/.test(trimmed) && !/[가-힣]/.test(trimmed);
};

export const parseMeaningPart = (value: string): { partOfSpeech?: string; korean: string } => {
  const trimmed = value.trim();
  const match = trimmed.match(PART_OF_SPEECH_IN_MEANING_REGEX);
  if (match) {
    return { partOfSpeech: match[1], korean: match[2].trim() };
  }
  return { korean: trimmed };
};

export const formatWordsForInputText = (words: ExtractedWordItem[]): string =>
  words
    .map(word => {
      const pos = word.partOfSpeech?.trim();
      return pos
        ? `${word.english} : ${pos} ${word.korean}`
        : `${word.english} : ${word.korean}`;
    })
    .join('\n');

export const parseWordsFromTextSimple = (text: string): ExtractedWordItem[] => {
  if (!text.trim()) return [];

  const lines = text.split('\n').filter(line => line.trim());
  const words: ExtractedWordItem[] = [];
  const seen = new Set<string>();

  const addWord = (english: string, korean = '', partOfSpeech?: string) => {
    const trimmed = english.trim();
    if (!trimmed || !isEnglishWordOrPhrase(trimmed)) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    words.push({
      english: trimmed,
      korean,
      ...(partOfSpeech ? { partOfSpeech } : {})
    });
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    let english = '';
    let korean = '';
    let partOfSpeech: string | undefined;
    let paired = false;

    if (trimmedLine.includes('\t')) {
      const parts = trimmedLine.split('\t').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2) {
        english = parts[0];
        const parsed = parseMeaningPart(parts.slice(1).join(' '));
        korean = parsed.korean;
        partOfSpeech = parsed.partOfSpeech;
      }
    }

    if (!english && !korean) {
      const match = trimmedLine.match(/^(.+?)\s*[:：]\s*(.+)$/);
      if (match) {
        english = match[1].trim();
        const parsed = parseMeaningPart(match[2]);
        korean = parsed.korean;
        partOfSpeech = parsed.partOfSpeech;
      }
    }

    if (!english && !korean) {
      const match = trimmedLine.match(/^(.+?)\s*-\s*(.+)$/);
      if (match) {
        english = match[1].trim();
        const parsed = parseMeaningPart(match[2]);
        korean = parsed.korean;
        partOfSpeech = parsed.partOfSpeech;
      }
    }

    if (!english && !korean) {
      const wordsArray = trimmedLine.split(/\s+/);
      if (wordsArray.length >= 2) {
        let englishParts: string[] = [];
        let koreanParts: string[] = [];
        let foundKorean = false;

        for (const word of wordsArray) {
          const trimmedWord = word.trim();
          if (!trimmedWord) continue;

          if (/^[가-힣]/.test(trimmedWord)) {
            foundKorean = true;
            koreanParts.push(trimmedWord);
          } else if (!foundKorean && /^[a-zA-Z]/.test(trimmedWord)) {
            englishParts.push(trimmedWord);
          } else if (foundKorean) {
            koreanParts.push(trimmedWord);
          }
        }

        if (englishParts.length > 0 && koreanParts.length > 0) {
          english = englishParts.join(' ');
          korean = koreanParts.join(' ');
        }
      }
    }

    if (english && korean && english !== korean) {
      addWord(english, korean, partOfSpeech);
      paired = true;
    }

    if (!paired) {
      const stripped = trimmedLine.replace(/^\d+\.?\s*/, '').trim();
      const tokens = stripped.split(/\s+/).filter(t => t.trim());

      if (tokens.length === 1 && isEnglishToken(tokens[0])) {
        addWord(tokens[0]);
      } else if (tokens.length === 2 && tokens.every(isEnglishToken)) {
        // hand down, hold down 등 2단어 숙어·구동사 보존
        addWord(tokens.join(' '));
      } else if (tokens.length > 2 && tokens.every(isEnglishToken)) {
        tokens.forEach(token => addWord(token));
      }
    }
  }

  return words;
};

export const addWordsWithLimit = (
  newWords: ExtractedWordItem[],
  existingWords: ExtractedWordItem[] = [],
  maxWords = 60
): ExtractedWordItem[] => {
  const seen = new Set(existingWords.map(w => w.english.toLowerCase()));
  const merged = [...existingWords];
  for (const w of newWords) {
    const key = w.english.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(w);
    }
  }

  if (merged.length > maxWords) {
    alert(
      `최대 ${maxWords}개까지 사용됩니다.\n현재 단어: ${merged.length}개\n추가 이미지를 캡처할 수 없습니다.`
    );
    return merged.slice(0, maxWords);
  }

  return merged;
};

const VOCAB_VISION_PROMPT = `이 이미지는 영어 단어 학습 자료(단어장, 어휘 목록)입니다. 이미지에 보이는 영어 단어·숙어를 정확히 읽어 JSON 배열로 추출하세요.

규칙:
1. 각 항목(번호·행)마다 하나의 JSON 객체로 추출
2. 한글 뜻, 번호(0420 등), [명][동][형] 품사 표시는 korean/partOfSpeech에 반영하거나 무시 (영어 항목은 english에만)
3. **숙어·구동사(phrasal verb)는 절대 쪼개지 말 것** — 이미지에 "hand down", "hold down", "give up"처럼 두 단어 이상이 하나의 항목이면 english에 통째로 넣기
   - 잘못: "hand", "down" (분리)
   - 올바름: "hand down" (하나의 항목)
4. english 필드는 영어 알파벳·공백·하이픈·아포스트로피만 허용 (한글 금지)
5. 이미지에 한글 뜻이 보이면 korean에 넣고, 없으면 "" 로 둠
6. 모든 열·행을 빠짐없이 추출

출력 형식 (JSON 배열만, 다른 설명 금지):
[
  {"english": "dignity", "korean": "위엄, 품위"},
  {"english": "manifest", "korean": "분명히 나타내다"},
  {"english": "hand down", "korean": "물려주다, 전해 주다"},
  {"english": "hold down", "korean": "참다, 억제하다"}
]`;

function normalizeExtractedWord(raw: {
  english?: string;
  korean?: string;
  partOfSpeech?: string;
}): ExtractedWordItem | null {
  const english = raw.english?.trim();
  if (!english || !isEnglishWordOrPhrase(english)) return null;

  const korean = raw.korean?.trim() || '';
  const partOfSpeech = raw.partOfSpeech?.trim();
  return {
    english,
    korean,
    ...(partOfSpeech ? { partOfSpeech } : {})
  };
}

function parseWordsFromVisionJson(content: string): ExtractedWordItem[] {
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    const words: ExtractedWordItem[] = [];
    const seen = new Set<string>();

    for (const item of parsed) {
      const word = normalizeExtractedWord(item);
      if (!word) continue;
      const key = word.english.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      words.push(word);
    }

    return words;
  } catch {
    return [];
  }
}

function parseWordsFromVisionPlainText(content: string): ExtractedWordItem[] {
  const cleaned = content
    .replace(/^(Sure!|Here is|Here are|Here's|Here\'s)[^\n:]*[:：]?\s*/i, '')
    .replace(/```[\s\S]*?```/g, '\n')
    .trim();

  const words: ExtractedWordItem[] = [];
  const seen = new Set<string>();

  const addFromLine = (english: string, korean = '') => {
    const word = normalizeExtractedWord({ english, korean });
    if (!word) return;
    const key = word.english.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    words.push(word);
  };

  for (const line of cleaned.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const colonMatch = trimmedLine.match(/^(.+?)\s*[:：]\s*(.+)$/);
    if (colonMatch) {
      addFromLine(colonMatch[1].replace(/^\d+\.?\s*/, ''), colonMatch[2]);
      continue;
    }

    const dashMatch = trimmedLine.match(/^(.+?)\s*-\s*(.+)$/);
    if (dashMatch) {
      const english = dashMatch[1].replace(/^\d+\.?\s*/, '').trim();
      const korean = dashMatch[2].trim();
      if (isEnglishWordOrPhrase(english) && /[가-힣]/.test(korean)) {
        addFromLine(english, korean);
        continue;
      }
    }

    // "hand down 물려주다" 형식 (한글 교재)
    const tokens = trimmedLine.replace(/^\d+\.?\s*/, '').split(/\s+/);
    if (tokens.length >= 2) {
      const englishParts: string[] = [];
      const koreanParts: string[] = [];
      let foundKorean = false;

      for (const token of tokens) {
        if (/^[가-힣]/.test(token) || /^\[/.test(token)) {
          foundKorean = true;
          if (/^[가-힣]/.test(token)) koreanParts.push(token);
        } else if (!foundKorean && /^[a-zA-Z]/.test(token)) {
          englishParts.push(token);
        } else if (foundKorean && /^[가-힣]/.test(token)) {
          koreanParts.push(token);
        }
      }

      if (englishParts.length > 0 && koreanParts.length > 0) {
        addFromLine(englishParts.join(' '), koreanParts.join(' '));
        continue;
      }
    }

    // 영어만 있는 한 줄 — 줄 전체를 하나의 항목으로 (숙어 보존)
    const englishOnly = trimmedLine.replace(/^\d+\.?\s*/, '').trim();
    if (isEnglishWordOrPhrase(englishOnly)) {
      addFromLine(englishOnly);
    }
  }

  return words;
}

function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** 이미지에서 영어 단어만 추출 (OpenAI Vision) */
export async function extractWordsFromImage(
  imageFile: File | Blob,
  retryCount = 0
): Promise<ExtractedWordItem[]> {
  const MAX_RETRIES = 2;
  const base64 = await fileToBase64(imageFile);
  const retryPrompt =
    retryCount > 0
      ? `${VOCAB_VISION_PROMPT}\n\nRETRY ATTEMPT ${retryCount + 1}: Please try again. Look more carefully at the image.`
      : VOCAB_VISION_PROMPT;

  try {
    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: retryPrompt },
            { type: 'image_url', image_url: { url: base64 } }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.3
    });

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    const rejectionPhrases = [
      "I'm sorry", "I can't assist", "I cannot", 'unable to',
      "can't help", '죄송합니다', '도와드릴 수 없'
    ];
    if (rejectionPhrases.some(p => content.toLowerCase().includes(p.toLowerCase()))) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000));
        return extractWordsFromImage(imageFile, retryCount + 1);
      }
      throw new Error('이미지에서 단어를 추출할 수 없어요. 다른 이미지로 다시 시도해주세요! 😊');
    }

    const jsonWords = parseWordsFromVisionJson(content);
    if (jsonWords.length > 0) return jsonWords;

    const plainWords = parseWordsFromVisionPlainText(content);
    if (plainWords.length > 0) return plainWords;

    if (retryCount < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000));
      return extractWordsFromImage(imageFile, retryCount + 1);
    }

    throw new Error('이미지에서 단어를 찾을 수 없어요. 더 선명한 이미지로 다시 붙여넣어 주세요! 😊');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (retryCount < MAX_RETRIES && !message.includes('😊')) {
      await new Promise(r => setTimeout(r, 1000));
      return extractWordsFromImage(imageFile, retryCount + 1);
    }
    if (message.includes('다시') || message.includes('😊')) throw error;
    throw new Error('이미지에서 단어를 추출할 수 없어요. 다른 이미지로 다시 시도해주세요! 😊');
  }
}

/** 입력 텍스트가 단어 목록 형식인지 판별 */
export function isWordListInput(text: string): boolean {
  const parsed = parseWordsFromTextSimple(text);
  if (parsed.length < 3) return false;

  const lines = text.split('\n').filter(l => l.trim());
  const hasFormattedLines = lines.filter(l => /[:：]/.test(l)).length >= 2;
  const hasMeanings = parsed.filter(w => w.korean?.trim()).length >= 3;

  return hasFormattedLines || (hasMeanings && lines.length >= 3);
}
