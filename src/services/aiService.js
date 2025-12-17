const OpenAI = require('openai');

let openai = null;

const getOpenAIClient = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
};

const isApiKeyConfigured = () => {
  return process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here';
};

const generateDescription = async (title, context) => {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  const prompt = `Generate a detailed task description for a task with the title: "${title}"${context ? `. Additional context: ${context}` : ''}. 
    
    The description should:
    - Be professional and clear
    - Include acceptance criteria if applicable
    - Be concise but comprehensive
    - Be 2-4 sentences`;

  const completion = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant that generates task descriptions for project management.'
      },
      { role: 'user', content: prompt }
    ],
    max_tokens: 200,
    temperature: 0.7
  });

  return completion.choices[0].message.content.trim();
};

const summarize = async (title, description, comments) => {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  const prompt = `Summarize the following task:
    
    Title: ${title}
    Description: ${description || 'No description'}
    ${comments?.length ? `Comments: ${comments.join('\n')}` : ''}
    
    Provide a brief summary in 1-2 sentences.`;

  const completion = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant that summarizes tasks.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 100,
    temperature: 0.5
  });

  return completion.choices[0].message.content.trim();
};

module.exports = {
  isApiKeyConfigured,
  generateDescription,
  summarize
};
