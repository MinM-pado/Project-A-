import { GoogleGenAI } from "@google/genai";
import type { Card, AspectRatio, AiImageStyle } from '../types';
import { AiImageStyle as AiImageStyleEnum } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCardContent = async (topic: string): Promise<Card[]> => {
  const prompt = `주제: "${topic}"

위 주제에 대해 5-8장 분량의 카드뉴스 콘텐츠를 생성해줘. 각 카드는 [제목]과 2-3줄의 [본문]으로 구성해줘. 다음 형식을 반드시 지켜줘:
카드 1: [제목] 제목 내용 / [본문] 본문 내용
카드 2: [제목] 제목 내용 / [본문] 본문 내용
...`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text;
    return parseCardContent(text);
  } catch (error) {
    console.error("Error generating card content:", error);
    if (error instanceof Error && error.message.includes("format")) {
        throw error;
    }
    throw new Error("콘텐츠 생성 중 오류가 발생했습니다.");
  }
};

export const generateImageKeywords = async (cards: Card[]): Promise<Card[]> => {
    const contentForPrompt = cards.map(card => `카드 ${card.id}: [제목] ${card.title}`).join('\n');

    const prompt = `다음 카드뉴스 콘텐츠 각 카드에 어울리는 이미지 검색어를 한글과 영문으로 3개씩 추천해줘. 다음 형식을 반드시 지켜줘:
카드 1: [제목] {카드1 제목}
🇰🇷 한글 검색어: "검색어1, 검색어2, 검색어3"
🇺🇸 영문 검색어: "keyword1, keyword2, keyword3"

--- 콘텐츠 ---
${contentForPrompt}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        return parseKeywords(text, cards);
    } catch (error) {
        console.error("Error generating keywords:", error);
        throw new Error("키워드 생성 중 오류가 발생했습니다.");
    }
};

export const generateImageWithGemini = async (prompt: string, aspectRatio: AspectRatio, style: AiImageStyle): Promise<string> => {
    let styleEnhancer = '';
    switch (style) {
        case AiImageStyleEnum.Photorealistic:
            styleEnhancer = 'A photorealistic, cinematic, high-resolution 8k photograph of ';
            break;
        case AiImageStyleEnum.DigitalArt:
            styleEnhancer = 'A vibrant, detailed, digital art illustration of ';
            break;
        case AiImageStyleEnum.Minimalist:
            styleEnhancer = 'A minimalist, clean, vector style illustration of ';
            break;
    }

    const finalPrompt = `${styleEnhancer} ${prompt}`;

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: finalPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: aspectRatio,
            },
        });

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image with Gemini:", error);
        throw new Error("Gemini 이미지 생성 중 오류가 발생했습니다.");
    }
};

const parseCardContent = (text: string): Card[] => {
    const cards: Card[] = [];
    const lines = text.split('\n').filter(line => line.trim().startsWith('카드'));

    // Primary strategy: flexible single-line parsing
    lines.forEach((line, index) => {
        const match = line.match(/\[제목\](.*?)\s*\/?\s*\[본문\](.*?)$/);
        if (match) {
            cards.push({
                id: index + 1,
                title: match[1].trim(),
                body: match[2].trim(),
            });
        }
    });

    // Fallback strategy: multi-line section parsing
    if (cards.length === 0) {
        const cardSections = text.split(/카드\s*\d+\s*:/).filter(s => s.trim().length > 0);
        cardSections.forEach((section, index) => {
            const titleMatch = section.match(/\[제목\](.*?)(?=\[본문\])/s);
            const bodyMatch = section.match(/\[본문\](.*)/s);
            if (titleMatch && bodyMatch) {
                cards.push({
                    id: index + 1,
                    title: titleMatch[1].trim(),
                    body: bodyMatch[1].trim(),
                });
            }
        });
    }

    if (cards.length === 0) {
        console.error("Failed to parse card content. Raw model output:", text);
        throw new Error("생성된 콘텐츠의 형식이 올바르지 않습니다. 다시 시도해주세요.");
    }

    return cards;
};

const parseKeywords = (text: string, originalCards: Card[]): Card[] => {
    const updatedCards = [...originalCards];
    const cardSections = text.split(/카드\s*\d+\s*:/).filter(s => s.trim() !== '');

    cardSections.forEach((section, index) => {
        if (updatedCards[index]) {
            const koreanMatch = section.match(/🇰🇷 한글 검색어: "(.*?)"/);
            const englishMatch = section.match(/🇺🇸 영문 검색어: "(.*?)"/);
            
            if (koreanMatch) {
                updatedCards[index].koreanKeywords = koreanMatch[1];
            }
            if (englishMatch) {
                updatedCards[index].englishKeywords = englishMatch[1];
            }
        }
    });
    
    return updatedCards;
};
