import React, { useRef, useEffect } from 'react';
import type { Card, LayoutSettings } from '../types';
import { ScrollDirection, AspectRatio, CardStyle } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { CodeIcon } from './icons/CodeIcon';

declare var JSZip: any;

const targetResolutions: Record<AspectRatio, { width: number; height: number }> = {
  [AspectRatio.Square]: { width: 1080, height: 1080 },
  [AspectRatio.Landscape]: { width: 1280, height: 720 },
  [AspectRatio.Portrait]: { width: 720, height: 1280 },
};

const previewDimensions: Record<AspectRatio, { width: number; height: number }> = {
  [AspectRatio.Square]: { width: 540, height: 540 },
  [AspectRatio.Landscape]: { width: 640, height: 360 },
  [AspectRatio.Portrait]: { width: 360, height: 640 },
};

const hexToRgba = (hex: string, alpha: number): string => {
    if (!hex || typeof hex !== 'string' || hex.length < 4) {
        return `rgba(0,0,0,${alpha})`; // Return a default color if hex is invalid
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return `rgba(0,0,0,${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const fitText = (element: HTMLElement | null) => {
    if (!element) return;
    const container = element.parentElement;
    if (!container) return;
    element.style.fontSize = ''; // Reset font size to start calculation from CSS value
    const initialFontSize = parseFloat(window.getComputedStyle(element).fontSize);
    let fontSize = initialFontSize;
    
    if (element.scrollHeight <= container.clientHeight && element.scrollWidth <= container.clientWidth) return;

    while ((element.scrollHeight > container.clientHeight || element.scrollWidth > container.clientWidth) && fontSize > 8) {
        fontSize -= 1;
        element.style.fontSize = `${fontSize}px`;
    }
};

interface CardPreviewProps {
  cards: Card[];
  layout: LayoutSettings;
}

export const CardPreview: React.FC<CardPreviewProps> = ({ cards, layout }) => {
  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardContainerRef.current) return;
    const cardsToProcess = cardContainerRef.current.querySelectorAll('.card-item');
    const timer = setTimeout(() => {
        cardsToProcess.forEach(card => {
            const titleEl = card.querySelector('.card-title') as HTMLElement;
            const bodyEl = card.querySelector('.card-body') as HTMLElement;
            if (titleEl) fitText(titleEl);
            if (bodyEl) fitText(bodyEl);
        });
    }, 150);
    return () => clearTimeout(timer);
  }, [cards, layout]);

  const saveAllCardsAsZip = async () => {
    const downloadButton = document.getElementById('save-all-btn');
    if (downloadButton) {
      downloadButton.setAttribute('disabled', 'true');
    }
    const updateProgress = (message: string) => {
      if (downloadButton) (downloadButton as HTMLButtonElement).innerHTML = message;
    };

    try {
      const zip = new JSZip();
      const cardsData = cards;
      let failedCards: number[] = [];

      for (let i = 0; i < cardsData.length; i++) {
        const cardData = cardsData[i];
        updateProgress(`이미지 생성 중... ${i + 1}/${cardsData.length}`);
        
        const targetRes = targetResolutions[layout.aspectRatio];
        const originalCardElement = document.getElementById(`card-${cardData.id}`);

        if (!originalCardElement) {
          console.error(`Card element for card ${cardData.id} not found.`);
          failedCards.push(cardData.id);
          continue;
        }

        const renderContainer = document.createElement('div');
        renderContainer.style.position = 'absolute';
        renderContainer.style.left = '-9999px';
        renderContainer.style.top = '0';
        renderContainer.style.width = `${targetRes.width}px`;
        renderContainer.style.height = `${targetRes.height}px`;
        renderContainer.style.margin = '0';
        renderContainer.style.padding = '0';
        document.body.appendChild(renderContainer);
        
        try {
            const clone = originalCardElement.cloneNode(true) as HTMLElement;
            clone.style.width = '100%';
            clone.style.height = '100%';
            clone.style.position = 'static';

            const pageNumberEl = clone.querySelector('.page-number-span');
            if (pageNumberEl) {
                (pageNumberEl as HTMLElement).style.display = 'none';
            }

            renderContainer.appendChild(clone);
            
            await document.fonts.ready;
            const images = Array.from(clone.getElementsByTagName('img'));
            await Promise.all(images.map(img => 
                new Promise(resolve => {
                    if (img.complete && img.naturalHeight !== 0) return resolve(true);
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                })
            ));
            await new Promise(resolve => setTimeout(resolve, 100));

            const titleEl = clone.querySelector('.card-title') as HTMLElement;
            const bodyEl = clone.querySelector('.card-body') as HTMLElement;
            if (titleEl) fitText(titleEl);
            if (bodyEl) fitText(bodyEl);
            await new Promise(resolve => setTimeout(resolve, 50));

            const canvas = await (window as any).html2canvas(renderContainer, {
                useCORS: true,
                backgroundColor: null,
                imageTimeout: 30000,
                logging: false,
                scale: 1,
            });
          
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                zip.file(`card-${i + 1}.png`, blob);
            } else {
                throw new Error('Blob generation failed.');
            }
        } catch (cardError) {
          console.error(`카드 ${cardData.id} 처리 실패:`, cardError);
          failedCards.push(cardData.id);
        } finally {
            if (document.body.contains(renderContainer)) {
                document.body.removeChild(renderContainer);
            }
        }
      }
      
      if (Object.keys(zip.files).length > 0) {
        updateProgress('압축 중...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.download = `card-news-${Date.now()}.zip`;
        link.href = URL.createObjectURL(zipBlob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        if (failedCards.length > 0) {
          alert(`성공적으로 저장되었습니다. 하지만 다음 카드(들)는 실패했습니다: ${failedCards.join(', ')}`);
        } else {
          setTimeout(() => alert('모든 카드 이미지가 ZIP 파일로 저장되었습니다!'), 100);
        }
      } else {
        alert('이미지를 저장하지 못했습니다. 모든 카드 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('ZIP 파일 저장 실패:', error);
      alert('이미지를 ZIP 파일로 저장하는 중 오류가 발생했습니다.');
    } finally {
      if (downloadButton) {
        downloadButton.removeAttribute('disabled');
        (downloadButton as HTMLButtonElement).innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path></svg> ZIP 파일로 모두 저장`;
      }
    }
  };
  
  const saveAsHtml = () => {
    if (!cardContainerRef.current) return;

    const containerClone = cardContainerRef.current.cloneNode(true) as HTMLElement;
    containerClone.querySelectorAll('.page-number-span').forEach(el => el.remove());

    const htmlString = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Card News</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>
        body {
            background-color: #111827; /* bg-gray-900 */
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 2rem;
            font-family: sans-serif;
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #1f2937; }
        ::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 4px; }
    </style>
</head>
<body>
    ${containerClone.outerHTML}
</body>
</html>`;

    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'card-news.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

  const isHorizontal = layout.scrollDirection === ScrollDirection.Horizontal;
  const placeholderImage = (id: number) => `https://placehold.co/800x800/1f2937/374151?text=Image+${id}`;

  return (
    <div className="w-full flex flex-col items-center">
      <div
        ref={cardContainerRef}
        className={`w-full max-w-full p-4 rounded-lg bg-gray-800/50 ${
          isHorizontal ? 'flex flex-row items-center overflow-x-auto space-x-4 pb-4 h-[44rem]' : 'flex flex-col items-center space-y-4'
        }`}
        style={isHorizontal ? { scrollbarWidth: 'thin' } : {}}
      >
        {cards.map((card) => {
            const baseCardClasses = `card-item relative overflow-hidden shadow-lg rounded-lg flex-shrink-0`;
            const key = `${card.id}-${layout.cardStyle}-${layout.gradientColors?.from}-${layout.gradientColors?.to}`;
            const cardImage = card.imageUrl || placeholderImage(card.id);
            const dims = previewDimensions[layout.aspectRatio];
            const styleProps: React.CSSProperties = isHorizontal
              ? { width: `${dims.width}px`, height: `${dims.height}px` }
              : { width: '100%', maxWidth: `${dims.width}px`, height: `${dims.height}px` };

            switch (layout.cardStyle) {
                case CardStyle.Minimalist:
                    return (
                        <div key={key} id={`card-${card.id}`} className={`${baseCardClasses} bg-white flex flex-col`} style={styleProps}>
                            <span className="page-number-span absolute top-3 right-3 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full z-20">{card.id} / {cards.length}</span>
                            <div className="w-full h-3/5 overflow-hidden">
                                <img src={cardImage} alt={card.title} className="w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage(card.id); }}/>
                            </div>
                            <div className="w-full h-2/5 p-6 md:p-8 flex flex-col justify-center text-center text-gray-800 overflow-hidden">
                                <h3 className="card-title font-bold text-xl md:text-2xl [word-break:keep-all] break-words">{card.title}</h3>
                                <p className="card-body mt-2 text-sm md:text-base text-gray-600 [word-break:keep-all] break-words">{card.body}</p>
                            </div>
                        </div>
                    );
                case CardStyle.Modern:
                     return (
                        <div key={key} id={`card-${card.id}`} className={`${baseCardClasses} bg-white p-6 md:p-8`} style={styleProps}>
                            <div className="w-full h-full flex flex-col">
                                <span className="page-number-span absolute top-8 right-8 text-gray-400 text-xs font-bold z-20">{card.id} / {cards.length}</span>
                                <div className="w-full h-3/5 rounded-md overflow-hidden">
                                    <img src={cardImage} alt={card.title} className="w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage(card.id); }}/>
                                </div>
                                <div className="flex-1 pt-6 md:pt-8 flex flex-col justify-center text-center text-gray-800 overflow-hidden">
                                    <h3 className="card-title font-bold text-xl md:text-2xl [word-break:keep-all] break-words">{card.title}</h3>
                                    <p className="card-body mt-2 text-sm md:text-base text-gray-600 [word-break:keep-all] break-words">{card.body}</p>
                                </div>
                            </div>
                        </div>
                    );
                case CardStyle.Gradient:
                    const fromColor = layout.gradientColors?.from || '#4338ca';
                    const toColor = layout.gradientColors?.to || '#8b5cf6';
                    return (
                        <div key={key} id={`card-${card.id}`} className={`${baseCardClasses} bg-gray-900 text-white`} style={styleProps}>
                            <img src={cardImage} alt={card.title} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage(card.id); }}/>
                            <div 
                                className="absolute inset-0"
                                style={{ background: `linear-gradient(to top, ${hexToRgba(fromColor, 0.8)}, ${hexToRgba(toColor, 0.4)}, transparent)` }}
                            ></div>
                            <div className="relative z-10 flex flex-col justify-between h-full p-8 md:p-10">
                                <span className="page-number-span absolute top-4 right-4 text-white text-sm font-bold">{card.id} / {cards.length}</span>
                                <div className="flex-1 flex flex-col justify-end overflow-hidden">
                                    <h3 className="card-title font-extrabold text-2xl md:text-4xl drop-shadow-lg [word-break:keep-all] break-words">{card.title}</h3>
                                    <p className="card-body mt-2 md:mt-4 text-sm md:text-base drop-shadow-md [word-break:keep-all] break-words">{card.body}</p>
                                </div>
                            </div>
                        </div>
                    );
                 case CardStyle.TextFocus:
                    return (
                        <div key={key} id={`card-${card.id}`} className={`${baseCardClasses} bg-gray-800 text-white flex flex-col justify-center items-center p-8 md:p-10 text-center`} style={styleProps}>
                            <span className="page-number-span absolute top-4 right-4 text-gray-500 text-xs font-bold">{card.id} / {cards.length}</span>
                            <img src={cardImage} alt={card.title} className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover mb-4 md:mb-6 border-4 border-gray-700 flex-shrink-0" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage(card.id); }}/>
                            <div className="flex-1 flex flex-col justify-center w-full overflow-hidden">
                                <h3 className="card-title font-bold text-xl md:text-3xl text-indigo-300 [word-break:keep-all] break-words">{card.title}</h3>
                                <p className="card-body mt-3 text-sm md:text-base text-gray-300 max-w-prose [word-break:keep-all] break-words">{card.body}</p>
                            </div>
                        </div>
                    );
                case CardStyle.Classic:
                default:
                    return (
                        <div key={key} id={`card-${card.id}`} className={`${baseCardClasses} bg-gray-900 text-white`} style={styleProps}>
                            <img src={cardImage} alt={card.title} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage(card.id); }}/>
                            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                            <div className="relative z-10 flex flex-col justify-between h-full p-8 md:p-10">
                                <span className="page-number-span absolute top-4 right-4 bg-black/50 text-white text-sm font-bold px-3 py-1 rounded-full">{card.id} / {cards.length}</span>
                                <div className="flex-1 flex flex-col justify-end overflow-hidden">
                                    <h3 className="card-title font-extrabold text-2xl md:text-4xl drop-shadow-lg [word-break:keep-all] break-words" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>{card.title}</h3>
                                    <p className="card-body mt-2 md:mt-4 text-sm md:text-base drop-shadow-md [word-break:keep-all] break-words" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>{card.body}</p>
                                </div>
                            </div>
                        </div>
                    );
            }
        })}
      </div>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
            id="save-all-btn"
            onClick={saveAllCardsAsZip}
            className="w-full sm:w-auto flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-wait"
        >
            <DownloadIcon className="w-5 h-5 mr-2" />
            ZIP 파일로 모두 저장
        </button>
        <button
            onClick={saveAsHtml}
            className="w-full sm:w-auto flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500"
        >
            <CodeIcon className="w-5 h-5 mr-2" />
            HTML로 저장
        </button>
      </div>
    </div>
  );
};