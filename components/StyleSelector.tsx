
import React from 'react';
import { CardStyle } from '../types';

interface StyleSelectorProps {
  selectedStyle: CardStyle;
  onSelect: (style: CardStyle) => void;
}

const styles: { id: CardStyle; name: string; preview: React.ReactNode }[] = [
  {
    id: CardStyle.Classic,
    name: 'Classic Overlay',
    preview: (
      <div className="w-full h-full bg-gray-500 rounded-sm relative flex items-end p-1">
        <div className="w-full">
          <div className="h-1.5 w-3/4 bg-white/70 rounded-sm mb-1"></div>
          <div className="h-1 w-full bg-white/50 rounded-sm"></div>
        </div>
      </div>
    ),
  },
  {
    id: CardStyle.Minimalist,
    name: 'Minimalist Split',
    preview: (
      <div className="w-full h-full rounded-sm flex flex-col">
        <div className="h-2/3 bg-gray-500 rounded-t-sm"></div>
        <div className="h-1/3 bg-white flex flex-col justify-center items-center p-1">
          <div className="h-1.5 w-3/4 bg-gray-600 rounded-sm mb-1"></div>
          <div className="h-1 w-full bg-gray-500 rounded-sm"></div>
        </div>
      </div>
    ),
  },
    {
    id: CardStyle.Modern,
    name: 'Modern Article',
    preview: (
        <div className="w-full h-full bg-white rounded-sm p-1.5">
            <div className="w-full h-full bg-gray-200 flex flex-col">
                <div className="h-1/2 bg-gray-500 rounded-t-sm"></div>
                <div className="h-1/2 p-1">
                    <div className="h-1.5 w-3/4 bg-gray-600 rounded-sm mb-1"></div>
                    <div className="h-1 w-full bg-gray-500 rounded-sm"></div>
                </div>
            </div>
        </div>
    ),
  },
  {
    id: CardStyle.Gradient,
    name: 'Vibrant Gradient',
    preview: (
      <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-sm relative flex items-end p-1">
        <div className="w-full">
          <div className="h-1.5 w-3/4 bg-white/70 rounded-sm mb-1"></div>
          <div className="h-1 w-full bg-white/50 rounded-sm"></div>
        </div>
      </div>
    ),
  },
  {
    id: CardStyle.TextFocus,
    name: 'Text Focus',
    preview: (
       <div className="w-full h-full bg-white rounded-sm flex flex-col items-center p-2">
            <div className="w-5 h-5 rounded-full bg-gray-500 mb-2"></div>
            <div className="h-1.5 w-3/4 bg-gray-600 rounded-sm mb-1"></div>
            <div className="h-1 w-5/6 bg-gray-500 rounded-sm mb-1"></div>
            <div className="h-1 w-full bg-gray-500 rounded-sm"></div>
        </div>
    ),
  },
];

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelect }) => {
  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4 text-center">🎨 디자인 스타일 선택</h2>
      <p className="text-gray-400 mb-6 text-center">원하는 카드뉴스 스타일을 선택해주세요.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelect(style.id)}
            className={`p-3 rounded-lg border-2 text-center transition-all duration-200
              ${selectedStyle === style.id ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}
          >
            <div className="w-full aspect-square mb-3 bg-gray-700 rounded-md p-1">
              {style.preview}
            </div>
            <h4 className="font-bold text-sm text-white">{style.name}</h4>
          </button>
        ))}
      </div>
    </div>
  );
};
