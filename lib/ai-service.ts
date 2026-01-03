import OpenAI from 'openai';

export async function callAI(
    prompt: string,
    systemPrompt: string = "You are a helpful assistant.",
    json: boolean = false,
    passedApiKey?: string
) {
    const apiKey = passedApiKey || process.env.API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("No AI API Key provided (checked passed key, API_KEY, and OPENAI_API_KEY)");

    const isOpenRouter = apiKey.startsWith('sk-or-');
    const isCerebras = apiKey.startsWith('csk-');
    const isTogether = apiKey.startsWith('together_');
    const isGroq = apiKey.startsWith('gsk_');
    const isOllama = apiKey.startsWith('ollama:');

    let baseURL = undefined;
    if (isOpenRouter) baseURL = 'https://openrouter.ai/api/v1';
    else if (isCerebras) baseURL = 'https://api.cerebras.ai/v1';
    else if (isTogether) baseURL = 'https://api.together.xyz/v1';
    else if (isGroq) baseURL = 'https://api.groq.com/openai/v1';
    else if (isOllama) baseURL = 'http://localhost:11434/v1';

    const openai = new OpenAI({
        apiKey: isOllama ? 'ollama' : apiKey,
        baseURL
    });

    let modelName = 'gpt-4o';
    if (isOpenRouter) modelName = 'google/gemini-2.0-flash-exp:free';
    else if (isTogether) modelName = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
    else if (isGroq) modelName = 'llama-3.3-70b-versatile';
    else if (isOllama) modelName = apiKey.split(':')[1] || 'llama3';
    else if (isCerebras) modelName = 'llama-3.3-70b';

    // Groq doesn't support response_format json_object, so we handle it via prompt
    let finalSystemPrompt = systemPrompt;
    let responseFormat: { type: "json_object" } | undefined = undefined;

    if (json) {
        if (isGroq) {
            // For Groq, use prompt engineering for JSON
            finalSystemPrompt = `${systemPrompt}\n\nIMPORTANT: You MUST respond with ONLY valid JSON. No explanations, no markdown, just pure JSON.`;
        } else {
            // For OpenAI, OpenRouter, Cerebras, etc. use native JSON mode
            responseFormat = { type: "json_object" };
        }
    }

    const response = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: finalSystemPrompt },
            { role: 'user', content: prompt }
        ],
        model: modelName,
        response_format: responseFormat,
        temperature: 0.1,
        max_tokens: 4000
    });

    return response.choices[0].message.content;
}
