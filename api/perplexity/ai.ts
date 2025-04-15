import { VercelRequest, VercelResponse } from '@vercel/node';

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

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

    const { prompt, modelType } = req.body;

    if (!prompt || !modelType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const perplexity = createOpenAI({
            name: 'perplexity',
            apiKey: process.env.PERPLEXITY_API_KEY ?? '',
            baseURL: process.env.PERPLEXITY_API_URL ?? '',
        });

        const { text } = await generateText({
            model: perplexity(modelType),
            prompt,
        });

        return res.status(200).json(text);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}