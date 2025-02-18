import { VercelRequest, VercelResponse } from '@vercel/node';

export enum ModelType {
    SUMMARY = 'summary',
    KEYWORD = 'keyword',
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function retry<T>(
    fn: () => Promise<T>,
    retries?: number,
    delayMs?: number
): Promise<T> {
    retries = retries ?? Number(process.env.DEFAULT_RETRY_COUNT);
    delayMs = delayMs ?? Number(process.env.DEFAULT_DELAY_MS);

    try {
        return await fn();
    } catch (error: unknown) {
        if (retries === 0) throw error;

        const retryError = error as {
            response?: {
                status: number;
                data?: { estimated_time: number };
            }
        };

        if (retryError &&
            retryError.response &&
            retryError.response.status === 503 &&
            retryError.response.data?.estimated_time) {
            const waitTime = (retryError.response.data.estimated_time * 1000) + 1000;
            await delay(waitTime);
        }
        else {
            await delay(delayMs);
        }
    }

    return retry(fn, retries - 1, delayMs);
}


export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content, modelType } = req.body;

    if (!content || !modelType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        let model: string | undefined;

        switch (modelType) {
            case ModelType.SUMMARY:
                model = process.env.AI_SUMMARY_MODEL;
                break;
            case ModelType.KEYWORD:
                model = process.env.AI_KEYWORD_MODEL;
                break;
            default:
                throw new Error('Invalid model type');
        }

        const result = await retry(async () => {
            const response = await fetch(
                `https://api-inference.huggingface.co/models/${model}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`
                    },
                    body: JSON.stringify({ inputs: content })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response.json();
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}