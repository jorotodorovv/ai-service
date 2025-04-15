import { VercelRequest, VercelResponse } from '@vercel/node';

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

enum ModelType {
    SONAR_DEEP_RESEARCH = 'sonar-deep-research',
    SONAR_REASONING_PRO = 'sonar-reasoning-pro',
    SONAR_REASONING = 'sonar-reasoning',
    SONAR_PRO = 'sonar-pro',
    SONAR = 'sonar',
    R1_1776 = 'r1-1776',
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const apiKey = req.headers['x-api-key']; // Or req.query.apiKey

    if (!apiKey || process.env.APP_AUTHORIZED_API_KEYS !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { system, prompt, modelType } = req.body;

    if (!prompt || !modelType || !(Object.values(ModelType) as string[]).includes(modelType)) {
        return res.status(400).json({ error: 'Missing required fields or invalid model' });
    }

    try {
        const perplexity = createOpenAI({
            name: 'perplexity',
            apiKey: process.env.PERPLEXITY_API_KEY ?? '',
            baseURL: process.env.PERPLEXITY_API_URL ?? ''
        });

        const { text } = await generateText({
            model: perplexity(modelType),
            system,
            prompt,
            maxTokens: 100,
        });

        return res.status(200).json(text);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}