
import React, { useState, useEffect } from 'react';
import { AppStep, ScrollDirection, AspectRatio, ImageSourceOption, CardStyle, AiImageStyle } from './types';
import type { Card, LayoutSettings, ApiKeys, ImageApiProvider } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateCardContent, generateImageKeywords, generateImageWithGemini } from './services/geminiService';
import { fetchImageFromApi } from './services/imageService';

import { ApiKeyManager } from './components/ApiKeyManager';
import { StepIndicator } from './components/StepIndicator';
import { CardPreview } from './components/CardPreview';
import { StyleSelector } from './components/StyleSelector';

import { SparklesIcon } from './components/icons/SparklesIcon';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { RobotIcon } from './components/icons/RobotIcon';
import { PhotoIcon } from './components/icons/PhotoIcon';
import { PencilIcon } from './components/icons/PencilIcon';

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.Topic);
    const [topic, setTopic] = useState<string>('');
    const [cards, setCards] = useState<Card[]>([]);
    const [layout, setLayout] = useState<LayoutSettings>({
        scrollDirection: ScrollDirection.Horizontal,
        aspectRatio: AspectRatio.Square,
        cardStyle: CardStyle.Classic,
        gradientColors: { from: '#4338ca', to: '#8b5cf6' }, // Default: indigo to purple
    });
    const [imageSource, setImageSource] = useState<ImageSourceOption | null>(null);
    const [imageApiProvider, setImageApiProvider] = useLocalStorage<ImageApiProvider | null>('image-api-provider', null);
    const [aiImageStyle, setAiImageStyle] = useState<AiImageStyle>(AiImageStyle.Photorealistic);
    const [imageUrlInputs, setImageUrlInputs] = useState<string[]>([]);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
    
    const [isApiKeyManagerOpen, setApiKeyManagerOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [apiKeys, setApiKeys] = useLocalStorage<ApiKeys>('api-keys', { pixabay: '', pexels: '', unsplash: '' });
    const hasApiKeys = !!(apiKeys.pixabay || apiKeys.pexels || apiKeys.unsplash);

    // Dynamic Step Names
    const stepNames = [
        '주제', '콘텐츠', '레이아웃', '스타일', '이미지 소스', '키워드', 
        imageSource === ImageSourceOption.Manual ? 'URL 입력' : '이미지 생성', 
        '미리보기'
    ];

    useEffect(() => {
        if (step === AppStep.ImageGeneration && generationProgress.current === 0 && generationProgress.total > 0) {
            processImages();
        }
    }, [step, generationProgress]);
    
    useEffect(() => {
        if (imageApiProvider && !apiKeys[imageApiProvider]) {
            setImageApiProvider(null);
        }
    }, [apiKeys, imageApiProvider]);

    const handleTopicSubmit = async () => {
        if (!topic.trim()) { setError('주제를 입력해주세요.'); return; }
        setIsLoading(true);
        setError(null);
        try {
            const generatedCards = await generateCardContent(topic);
            setCards(generatedCards);
            setStep(AppStep.Content);
        } catch (e) { setError((e as Error).message); } 
        finally { setIsLoading(false); }
    };

    const handleContentConfirm = () => setStep(AppStep.Layout);
    const handleLayoutConfirm = () => setStep(AppStep.Style);
    const handleStyleConfirm = () => setStep(AppStep.ImageSource);

    const handleImageSourceConfirm = () => {
        if (imageSource === null) {
            setError('이미지 소스를 선택해주세요.');
            return;
        }
         if (imageSource === ImageSourceOption.Api && !imageApiProvider) {
            setError('이미지 API를 선택해주세요.');
            return;
        }
        setError(null);
        setStep(AppStep.Keywords);
    };

    const handleKeywordsConfirm = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const cardsWithKeywords = await generateImageKeywords(cards);
            setCards(cardsWithKeywords);
            if (imageSource === ImageSourceOption.Manual) {
                setImageUrlInputs(new Array(cardsWithKeywords.length).fill(''));
                setStep(AppStep.Images);
            } else {
                setGenerationProgress({ current: 0, total: cardsWithKeywords.length });
                setStep(AppStep.ImageGeneration);
            }
        } catch (e) { setError((e as Error).message); } 
        finally { setIsLoading(false); }
    };
    
    const handleImagesConfirm = () => {
        const updatedCards = cards.map((card, index) => ({
            ...card,
            imageUrl: imageUrlInputs[index] || undefined,
        }));
        setCards(updatedCards);
        setStep(AppStep.Preview);
    };

    const processImages = async () => {
        setIsLoading(true);
        const updatedCards: Card[] = [...cards];
        for (let i = 0; i < updatedCards.length; i++) {
            const card = updatedCards[i];
            let imageUrl: string | null = null;
            try {
                if (imageSource === ImageSourceOption.Gemini) {
                    const prompt = `a high-quality image for a social media card titled "${card.title}". Keywords: ${card.englishKeywords}.`;
                    imageUrl = await generateImageWithGemini(prompt, layout.aspectRatio, aiImageStyle);
                } else if (imageSource === ImageSourceOption.Api) {
                    const query = card.englishKeywords?.split(',')[0].trim() || card.title;
                    imageUrl = await fetchImageFromApi(query, apiKeys, imageApiProvider);
                }
            } catch (e) {
                console.error(`Error processing image for card ${card.id}`, e);
                setError(`카드 ${card.id} 이미지 처리 중 오류 발생`);
            }
            updatedCards[i] = { ...card, imageUrl: imageUrl || undefined };
            setCards([...updatedCards]);
            setGenerationProgress(prev => ({ ...prev, current: i + 1 }));
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        setIsLoading(false);
        setTimeout(() => setStep(AppStep.Preview), 500);
    };

    const restart = () => {
        setStep(AppStep.Topic);
        setTopic('');
        setCards([]);
        setError(null);
        setImageSource(null);
        setImageApiProvider(null);
    };

    const renderStep = () => {
        switch (step) {
            case AppStep.Topic: return (
                <>
                    <h2 className="text-2xl font-bold mb-4">어떤 주제로 카드뉴스를 만들고 싶으신가요?</h2>
                    <p className="text-gray-400 mb-6">예: 건강한 아침 루틴 만들기, 투자 초보자를 위한 가이드 등 구체적인 주제를 알려주세요.</p>
                    <textarea value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-indigo-500 transition" rows={3} placeholder="여기에 주제를 입력하세요..." />
                    <button onClick={handleTopicSubmit} disabled={isLoading} className="mt-4 w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-500">
                        {isLoading ? '생성 중...' : <><SparklesIcon className="w-5 h-5 mr-2" />콘텐츠 생성하기</>}
                    </button>
                </>
            );
            case AppStep.Content: return (
                <>
                    <h2 className="text-2xl font-bold mb-4">📋 생성된 카드뉴스 콘텐츠</h2>
                    <p className="text-gray-400 mb-6">내용이 마음에 드시나요? 아래에서 직접 수정할 수 있습니다.</p>
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 w-full">{cards.map((card, index) => (
                        <div key={card.id} className="bg-gray-800 p-4 rounded-lg">
                            <label className="font-bold text-indigo-400">카드 {card.id}: 제목</label>
                            <input type="text" value={card.title} onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, title: e.target.value} : c))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1 mb-2" />
                            <label className="font-bold text-indigo-400">본문</label>
                            <textarea value={card.body} onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, body: e.target.value} : c))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1" rows={3} />
                        </div>))}
                    </div>
                    <button onClick={handleContentConfirm} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">내용 확정</button>
                </>
            );
            case AppStep.Layout: return (
                <div className="w-full">
                    <div className="mb-8">
                        <h3 className="text-xl font-bold mb-3">🔄 스크롤 방향</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onClick={() => setLayout(p => ({...p, scrollDirection: ScrollDirection.Horizontal}))} className={`p-4 rounded-lg border-2 text-left ${layout.scrollDirection === ScrollDirection.Horizontal ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}>
                                <h4 className="font-bold">가로 스크롤 (← →)</h4><p className="text-sm text-gray-400 mt-1">인스타그램 스토리 스타일</p>
                            </button>
                            <button onClick={() => setLayout(p => ({...p, scrollDirection: ScrollDirection.Vertical}))} className={`p-4 rounded-lg border-2 text-left ${layout.scrollDirection === ScrollDirection.Vertical ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}>
                                <h4 className="font-bold">세로 스크롤 (↑ ↓)</h4><p className="text-sm text-gray-400 mt-1">블로그/피드 스타일</p>
                            </button>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-3">📐 카드 비율</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <button onClick={() => setLayout(p => ({...p, aspectRatio: AspectRatio.Square}))} className={`p-4 rounded-lg border-2 text-left ${layout.aspectRatio === AspectRatio.Square ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}>
                                <h4 className="font-bold">정사각형 (1:1)</h4><p className="text-sm text-gray-400 mt-1">인스타그램 포스트</p>
                            </button>
                            <button onClick={() => setLayout(p => ({...p, aspectRatio: AspectRatio.Landscape}))} className={`p-4 rounded-lg border-2 text-left ${layout.aspectRatio === AspectRatio.Landscape ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}>
                                <h4 className="font-bold">가로형 (16:9)</h4><p className="text-sm text-gray-400 mt-1">유튜브 썸네일</p>
                            </button>
                            <button onClick={() => setLayout(p => ({...p, aspectRatio: AspectRatio.Portrait}))} className={`p-4 rounded-lg border-2 text-left ${layout.aspectRatio === AspectRatio.Portrait ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}>
                                <h4 className="font-bold">세로형 (9:16)</h4><p className="text-sm text-gray-400 mt-1">인스타그램 스토리</p>
                            </button>
                        </div>
                    </div>
                    <button onClick={handleLayoutConfirm} className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">다음</button>
                </div>
            );
            case AppStep.Style: return (
                <div className="w-full">
                    <StyleSelector 
                        selectedStyle={layout.cardStyle}
                        onSelect={style => setLayout(p => ({ ...p, cardStyle: style }))}
                    />
                    {layout.cardStyle === CardStyle.Gradient && (
                        <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                            <h3 className="text-lg font-bold mb-4 text-center text-white">🎨 그라디언트 색상 선택</h3>
                            <div className="flex justify-center items-center gap-8">
                                <div>
                                    <label htmlFor="fromColor" className="block text-sm font-medium text-gray-300 mb-2 text-center">시작 색상</label>
                                    <input
                                    id="fromColor"
                                    type="color"
                                    value={layout.gradientColors?.from || '#4338ca'}
                                    onChange={e => setLayout(p => ({ ...p, gradientColors: { ...p.gradientColors!, from: e.target.value } }))}
                                    className="p-0 h-12 w-16 block bg-transparent border-none cursor-pointer rounded-lg disabled:opacity-50 disabled:pointer-events-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="toColor" className="block text-sm font-medium text-gray-300 mb-2 text-center">종료 색상</label>
                                    <input
                                    id="toColor"
                                    type="color"
                                    value={layout.gradientColors?.to || '#8b5cf6'}
                                    onChange={e => setLayout(p => ({ ...p, gradientColors: { ...p.gradientColors!, to: e.target.value } }))}
                                    className="p-0 h-12 w-16 block bg-transparent border-none cursor-pointer rounded-lg disabled:opacity-50 disabled:pointer-events-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <button onClick={handleStyleConfirm} className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">다음</button>
                </div>
            );
            case AppStep.ImageSource: return (
                <div className="w-full text-center">
                    <h2 className="text-2xl font-bold mb-4">어떻게 이미지를 추가하시겠어요?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <button onClick={() => setImageSource(ImageSourceOption.Gemini)} className={`flex flex-col items-center p-6 bg-gray-800 rounded-lg border-2 transition-all ${imageSource === ImageSourceOption.Gemini ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 hover:border-indigo-600'}`}>
                            <RobotIcon className="w-10 h-10 mb-3 text-indigo-400" />
                            <h4 className="font-bold text-lg">AI 이미지 생성</h4><p className="text-sm text-gray-400 mt-1">각 카드에 맞는 이미지를 생성합니다.</p>
                        </button>
                        <button onClick={() => setImageSource(ImageSourceOption.Api)} disabled={!hasApiKeys} className={`flex flex-col items-center p-6 bg-gray-800 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-700 ${imageSource === ImageSourceOption.Api ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 hover:border-indigo-600'}`}>
                            <PhotoIcon className="w-10 h-10 mb-3 text-indigo-400" />
                            <h4 className="font-bold text-lg">이미지 API 사용</h4><p className="text-sm text-gray-400 mt-1">키워드로 이미지를 자동 검색합니다.</p>
                            {!hasApiKeys && <span className="text-xs text-yellow-400 mt-2">(API 키를 먼저 설정해주세요)</span>}
                        </button>
                        <button onClick={() => setImageSource(ImageSourceOption.Manual)} className={`flex flex-col items-center p-6 bg-gray-800 rounded-lg border-2 transition-all ${imageSource === ImageSourceOption.Manual ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 hover:border-indigo-600'}`}>
                            <PencilIcon className="w-10 h-10 mb-3 text-indigo-400" />
                            <h4 className="font-bold text-lg">수동 URL 입력</h4><p className="text-sm text-gray-400 mt-1">직접 찾은 이미지 주소를 입력합니다.</p>
                        </button>
                    </div>

                    {imageSource === ImageSourceOption.Gemini && (
                        <div className="mt-8 text-left">
                            <h3 className="text-lg font-bold mb-3 text-center">🤖 AI 이미지 스타일 선택</h3>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setAiImageStyle(AiImageStyle.Photorealistic)} className={`px-4 py-2 rounded-lg border-2 ${aiImageStyle === AiImageStyle.Photorealistic ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}>포토리얼리스틱</button>
                                <button onClick={() => setAiImageStyle(AiImageStyle.DigitalArt)} className={`px-4 py-2 rounded-lg border-2 ${aiImageStyle === AiImageStyle.DigitalArt ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}>디지털 아트</button>
                                <button onClick={() => setAiImageStyle(AiImageStyle.Minimalist)} className={`px-4 py-2 rounded-lg border-2 ${aiImageStyle === AiImageStyle.Minimalist ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}>미니멀리스트</button>
                            </div>
                        </div>
                    )}
                    
                    {imageSource === ImageSourceOption.Api && hasApiKeys && (
                        <div className="mt-8 text-left">
                            <h3 className="text-lg font-bold mb-3 text-center">🖼️ 이미지 API 선택</h3>
                            <div className="flex justify-center flex-wrap gap-4">
                                {(Object.keys(apiKeys) as ImageApiProvider[]).filter(key => apiKeys[key]).map(provider => (
                                    <button
                                        key={provider}
                                        onClick={() => setImageApiProvider(provider)}
                                        className={`px-4 py-2 rounded-lg border-2 capitalize transition-colors ${imageApiProvider === provider ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-700 bg-gray-800 hover:border-indigo-600'}`}
                                    >
                                        {provider}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={handleImageSourceConfirm} className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                        이미지 소스 확정
                    </button>
                </div>
            );
            case AppStep.Keywords: return (
                <div className="w-full">
                    <h2 className="text-2xl font-bold mb-2">🔍 카드별 이미지 검색어</h2>
                    <p className="text-gray-400 mb-6">생성된 검색어를 바탕으로 이미지를 준비합니다.</p>
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 bg-gray-800 p-4 rounded-lg">{cards.map(card => (
                        <div key={card.id}>
                            <h4 className="font-bold text-lg text-indigo-300">카드 {card.id}: {card.title}</h4>
                            <p className="text-sm"><span className="font-bold">🇰🇷 한글:</span> {card.koreanKeywords}</p>
                            <p className="text-sm"><span className="font-bold">🇺🇸 영문:</span> {card.englishKeywords}</p>
                        </div>))}
                    </div>
                    <button onClick={handleKeywordsConfirm} disabled={isLoading} className="mt-6 w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-500">
                       {isLoading ? '준비 중...' : '다음'}
                    </button>
                </div>
            );
            case AppStep.ImageGeneration: return (
                <div className="w-full text-center">
                    <h2 className="text-2xl font-bold mb-4">{imageSource === ImageSourceOption.Gemini ? '🤖 AI 이미지 생성 중' : '📷 API에서 이미지 검색 중'}</h2>
                    <p className="text-gray-400 mb-6">각 카드에 맞는 이미지를 준비하고 있습니다. 잠시만 기다려주세요.</p>
                    <div className="w-full bg-gray-700 rounded-full h-4">
                        <div className="bg-indigo-600 h-4 rounded-full transition-all duration-500" style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}></div>
                    </div>
                    <p className="mt-4 font-bold text-lg">{generationProgress.current} / {generationProgress.total}</p>
                </div>
            );
            case AppStep.Images: return (
                <div className="w-full">
                    <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-300 p-4 rounded-lg mb-6">
                        <h3 className="font-bold text-lg">🚨 중요! 이미지 저장 안내</h3>
                        <p className="text-sm mt-1">이미지 저장이 실패하는 경우, 다른 이미지 주소를 사용해보세요. Unsplash, Pexels, Pixabay 등의 사이트는 대부분 잘 작동합니다.</p>
                    </div>
                    <p className="text-gray-400 mb-4">각 카드에 사용할 이미지 URL을 입력해주세요. (우클릭 후 '이미지 주소 복사')</p>
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">{cards.map((card, index) => (
                        <div key={card.id}>
                            <label className="font-bold text-indigo-400">카드 {card.id}: {card.title}</label>
                            <input type="url" value={imageUrlInputs[index]} onChange={e => setImageUrlInputs(urls => urls.map((u, i) => i === index ? e.target.value : u))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1" placeholder="https://images.unsplash.com/..."/>
                        </div>))}
                    </div>
                     <button onClick={handleImagesConfirm} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">미리보기 생성</button>
                </div>
            );
            case AppStep.Preview: return (
                <div className="w-full">
                     <h2 className="text-2xl font-bold mb-4">✨ 완성된 카드뉴스</h2>
                     <CardPreview cards={cards} layout={layout} />
                     <button onClick={restart} className="mt-4 text-gray-400 hover:text-white">다시 만들기</button>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 md:p-8">
            <header className="w-full max-w-5xl flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <SparklesIcon className="w-8 h-8 text-indigo-400" />
                    <h1 className="text-3xl font-bold ml-3">AI 카드뉴스 메이커</h1>
                </div>
                <button onClick={() => setApiKeyManagerOpen(true)} className="p-2 rounded-full hover:bg-gray-700 transition-colors" title="API Key Settings">
                    <SettingsIcon className="w-6 h-6 text-gray-400" />
                </button>
            </header>
            
            <main className="w-full max-w-5xl bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-10 shadow-2xl flex flex-col items-center">
                {step < AppStep.Preview && <StepIndicator currentStep={step} stepNames={stepNames} />}
                {error && <div className="w-full bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-lg mb-4">{error}</div>}
                <div className="w-full max-w-3xl flex flex-col items-center">
                   {renderStep()}
                </div>
            </main>

            <ApiKeyManager 
                isOpen={isApiKeyManagerOpen} 
                onClose={() => setApiKeyManagerOpen(false)}
                apiKeys={apiKeys}
                onApiKeysChange={setApiKeys}
            />
        </div>
    );
};

export default App;