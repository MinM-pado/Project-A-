
export enum AppStep {
  Topic,
  Content,
  Layout,
  Style,
  ImageSource,
  Keywords,
  Images, // Now specifically for manual URL input
  ImageGeneration, // For API/AI processing
  Preview,
}

export interface Card {
  id: number;
  title: string;
  body: string;
  koreanKeywords?: string;
  englishKeywords?: string;
  imageUrl?: string;
}

export enum ScrollDirection {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

export enum AspectRatio {
  Square = '1:1',
  Landscape = '16:9',
  Portrait = '9:16',
}

export enum CardStyle {
  Classic = 'CLASSIC',
  Minimalist = 'MINIMALIST',
  Modern = 'MODERN',
  Gradient = 'GRADIENT',
  TextFocus = 'TEXT_FOCUS',
}

export interface LayoutSettings {
  scrollDirection: ScrollDirection;
  aspectRatio: AspectRatio;
  cardStyle: CardStyle;
  gradientColors?: { from: string; to: string };
}

export interface ApiKeys {
  pixabay: string;
  pexels: string;
  unsplash: string;
}

export enum ImageSourceOption {
  Manual = 'MANUAL',
  Api = 'API',
  Gemini = 'GEMINI',
}

export enum AiImageStyle {
  Photorealistic = 'PHOTOREALISTIC',
  DigitalArt = 'DIGITAL_ART',
  Minimalist = 'MINIMALIST',
}

export type ImageApiProvider = 'pixabay' | 'pexels' | 'unsplash';