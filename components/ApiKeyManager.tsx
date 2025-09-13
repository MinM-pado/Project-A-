import React, { useState, useEffect } from 'react';
import type { ApiKeys } from '../types';
import { testApiKey } from '../services/imageService';
import { KeyIcon } from './icons/KeyIcon';
import { CheckIcon } from './icons/CheckIcon';

interface ApiKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKeys;
  onApiKeysChange: (keys: ApiKeys) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ isOpen, onClose, apiKeys, onApiKeysChange }) => {
  const [localKeys, setLocalKeys] = useState<ApiKeys>(apiKeys);
  const [testStatus, setTestStatus] = useState<Record<keyof ApiKeys, TestStatus>>({ pixabay: 'idle', pexels: 'idle', unsplash: 'idle' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalKeys(apiKeys);
    setTestStatus({ pixabay: 'idle', pexels: 'idle', unsplash: 'idle' });
  }, [apiKeys, isOpen]);

  const handleSave = () => {
    onApiKeysChange(localKeys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isOpen) return null;

  const handleKeyChange = (service: keyof ApiKeys, value: string) => {
    setLocalKeys(prev => ({ ...prev, [service]: value }));
    setTestStatus(prev => ({ ...prev, [service]: 'idle' }));
  };

  const handleTest = async (service: keyof ApiKeys) => {
    setTestStatus(prev => ({ ...prev, [service]: 'testing' }));
    const success = await testApiKey(service, localKeys[service]);
    setTestStatus(prev => ({ ...prev, [service]: success ? 'success' : 'error' }));
  };
  
  const renderStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'testing':
        return <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>;
      case 'success':
        return <CheckIcon className="w-5 h-5 text-green-400" />;
      case 'error':
        return <span className="text-red-400 text-xl">×</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        <div className="flex items-center mb-6">
          <KeyIcon className="w-8 h-8 mr-3 text-indigo-400" />
          <h2 className="text-2xl font-bold text-white">API 키 관리</h2>
        </div>
        <p className="text-gray-400 mb-6 text-sm">
          이미지 사이트 API 키를 저장하여 이미지를 자동으로 불러올 수 있습니다. 입력된 키는 로컬 브라우저에만 암호화되어 저장됩니다.
        </p>
        
        <div className="space-y-4">
          {(['pixabay', 'pexels', 'unsplash'] as const).map(service => (
            <div key={service}>
              <label htmlFor={service} className="block text-sm font-medium text-gray-300 mb-1 capitalize">{service} API Key</label>
              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  id={service}
                  value={localKeys[service]}
                  onChange={(e) => handleKeyChange(service, e.target.value)}
                  className="flex-grow w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="••••••••••••••"
                />
                <button
                  onClick={() => handleTest(service)}
                  disabled={!localKeys[service] || testStatus[service] === 'testing'}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-20"
                >
                  {testStatus[service] === 'idle' ? '테스트' : 
                   testStatus[service] === 'testing' ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div> :
                   testStatus[service] === 'success' ? <CheckIcon className="w-5 h-5 text-green-400" /> :
                   <span className="text-red-400 font-bold">실패</span>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end items-center">
            {saved && (
                <div className="flex items-center text-green-400 mr-4 transition-opacity">
                    <CheckIcon className="w-5 h-5 mr-1" />
                    <span>저장되었습니다!</span>
                </div>
            )}
          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
