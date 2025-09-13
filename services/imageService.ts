
import type { ApiKeys, ImageApiProvider } from '../types';

const PEXELS_API = 'https://api.pexels.com/v1/search';
const PIXABAY_API = 'https://pixabay.com/api/';
const UNSPLASH_API = 'https://api.unsplash.com/search/photos';

export const testApiKey = async (service: keyof ApiKeys, key: string): Promise<boolean> => {
    if (!key) return false;
    let url: string;
    let options: RequestInit = {};

    switch (service) {
        case 'pexels':
            url = `${PEXELS_API}?query=test&per_page=1`;
            options.headers = { Authorization: key };
            break;
        case 'unsplash':
            url = `${UNSPLASH_API}?query=test&per_page=1`;
            options.headers = { Authorization: `Client-ID ${key}` };
            break;
        case 'pixabay':
            url = `${PIXABAY_API}?key=${key}&q=test`;
            break;
        default:
            return false;
    }

    try {
        const response = await fetch(url, options);
        return response.ok;
    } catch (e) {
        console.error(`${service} API test error`, e);
        return false;
    }
};

export const fetchImageFromApi = async (query: string, keys: ApiKeys, provider: ImageApiProvider | null): Promise<string | null> => {
    if (!provider || !keys[provider]) {
        return null;
    }

    try {
        switch (provider) {
            case 'pexels':
                const pexelsResponse = await fetch(`${PEXELS_API}?query=${encodeURIComponent(query)}&per_page=1`, {
                    headers: { Authorization: keys.pexels }
                });
                if (pexelsResponse.ok) {
                    const data = await pexelsResponse.json();
                    if (data.photos && data.photos.length > 0) return data.photos[0].src.large;
                }
                break;
            case 'unsplash':
                const unsplashResponse = await fetch(`${UNSPLASH_API}?query=${encodeURIComponent(query)}&per_page=1`, {
                    headers: { Authorization: `Client-ID ${keys.unsplash}` }
                });
                if (unsplashResponse.ok) {
                    const data = await unsplashResponse.json();
                    if (data.results && data.results.length > 0) return data.results[0].urls.regular;
                }
                break;
            case 'pixabay':
                const pixabayResponse = await fetch(`${PIXABAY_API}?key=${keys.pixabay}&q=${encodeURIComponent(query)}&per_page=3`);
                if (pixabayResponse.ok) {
                    const data = await pixabayResponse.json();
                    if (data.hits && data.hits.length > 0) return data.hits[0].webformatURL;
                }
                break;
        }
    } catch (e) {
        console.error(`${provider} API error`, e);
    }

    return null;
};
