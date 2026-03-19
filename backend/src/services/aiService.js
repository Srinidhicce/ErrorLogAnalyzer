const axios = require('axios');
const logger = require('../utils/logger');


const buildPrompt = (maskedContent, errors, repeatedErrors) => {
  const errorSummary = errors.slice(0, 20).map((e, i) =>
    `${i + 1}. [${e.severity}][${e.category}] Line ${e.lineNumber}: ${e.content}`
  ).join('\n');

  const repeatedSummary = repeatedErrors.slice(0, 10).map((e) =>
    `- (x${e.count}) [${e.category}] ${e.content}`
  ).join('\n');

  return `You are an expert DevOps engineer and log analysis specialist. Analyze the following preprocessed log data (sensitive information has been masked) and provide a structured analysis.

## LOG CONTENT (FIRST 3000 CHARS):
\`\`\`
${maskedContent.substring(0, 3000)}
\`\`\`

## EXTRACTED ERRORS (TOP 20):
${errorSummary || 'No errors found'}

## REPEATED ERRORS:
${repeatedSummary || 'No repeated errors'}

## REQUIRED ANALYSIS:
Respond ONLY with a valid JSON object in this exact format:
{
  "rootCause": "Primary root cause analysis in 2-3 sentences",
  "errorSummary": "Overall summary of what happened in the logs",
  "suggestedFixes": [
    "Specific actionable fix 1",
    "Specific actionable fix 2",
    "Specific actionable fix 3"
  ],
  "criticalIssues": [
    "Most critical issue that needs immediate attention",
    "Second critical issue if any"
  ],
  "overallHealth": "healthy|warning|critical|unknown",
  "confidence": 85,
  "technicalDetails": "In-depth technical explanation for developers"
}

Be specific, actionable, and technical. Respond ONLY with the JSON object, no other text.`;
};



const parseAIResponse = (rawText) => {
  try {
  
    const cleaned = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return { ...parsed, rawResponse: rawText };
  } catch (e) {
 
    return {
      rootCause: 'Could not parse structured response',
      errorSummary: rawText.substring(0, 500),
      suggestedFixes: ['Review the raw AI response for details'],
      criticalIssues: [],
      overallHealth: 'unknown',
      confidence: 0,
      rawResponse: rawText
    };
  }
};


const analyzeWithOpenAI = async (apiKey, maskedContent, errors, repeatedErrors, model = 'gpt-4o-mini') => {
  const prompt = buildPrompt(maskedContent, errors, repeatedErrors);

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: 'You are an expert log analysis AI. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  const rawText = response.data.choices[0]?.message?.content || '';
  return parseAIResponse(rawText);
};


const analyzeWithGemini = async (apiKey, maskedContent, errors, repeatedErrors, model = 'gemini-1.5-flash') => {
  const prompt = buildPrompt(maskedContent, errors, repeatedErrors);

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json'
      }
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    }
  );

  const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseAIResponse(rawText);
};


const analyzeWithOpenRouter = async (apiKey, maskedContent, errors, repeatedErrors, model = 'openai/gpt-4o-mini') => {
  const prompt = buildPrompt(maskedContent, errors, repeatedErrors);

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: 'You are an expert log analysis AI. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-log-analyzer.app',
        'X-Title': 'AI Log Analyzer'
      },
      timeout: 30000
    }
  );

  const rawText = response.data.choices?.[0]?.message?.content || '';
  return parseAIResponse(rawText);
};

/**
 * Anthropic Claude API
 */
const analyzeWithAnthropic = async (apiKey, maskedContent, errors, repeatedErrors, model = 'claude-3-haiku-20240307') => {
  const prompt = buildPrompt(maskedContent, errors, repeatedErrors);

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  const rawText = response.data.content?.[0]?.text || '';
  return parseAIResponse(rawText);
};


const PROVIDER_MODELS = {
  openai:     ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  gemini:     ['gemini-1.5-flash', 'gemini-1.5-pro'],
  anthropic:  ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
  openrouter: ['openai/gpt-4o-mini'],  
};



const analyzeWithAI = async ({ provider, apiKey, maskedContent, errors, repeatedErrors, model }) => {
  const startTime = Date.now();
  logger.info(`AI analysis started with provider: ${provider}`);

  try {
    let result;
    const selectedModel = model || PROVIDER_MODELS[provider]?.[0];

    switch (provider.toLowerCase()) {
      case 'openai':
        result = await analyzeWithOpenAI(apiKey, maskedContent, errors, repeatedErrors, selectedModel);
        break;
      case 'gemini':
        result = await analyzeWithGemini(apiKey, maskedContent, errors, repeatedErrors, selectedModel);
        break;
      case 'openrouter':
        result = await analyzeWithOpenRouter(apiKey, maskedContent, errors, repeatedErrors, selectedModel);
        break;
      case 'anthropic':
        result = await analyzeWithAnthropic(apiKey, maskedContent, errors, repeatedErrors, selectedModel);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    const processingTime = Date.now() - startTime;
    logger.info(`AI analysis completed in ${processingTime}ms`);
    return { ...result, processingTimeMs: processingTime, model: selectedModel };
  } catch (error) {
    logger.error(`AI analysis failed for provider ${provider}:`, error.message);

   
    const apiError = error.response?.data?.error?.message
      || error.response?.data?.message
      || error.message;

    throw new Error(`AI provider error (${provider}): ${apiError}`);
  }
};

module.exports = { analyzeWithAI, PROVIDER_MODELS };