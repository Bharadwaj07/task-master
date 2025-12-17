const { aiService } = require('../services');

const generateTaskDescription = async (req, res, next) => {
  try {
    const { title, context } = req.body;

    if (!aiService.isApiKeyConfigured()) {
      return res.status(400).json({ message: 'OpenAI API key not configured' });
    }

    const description = await aiService.generateDescription(title, context);

    res.json({ description });
  } catch (error) {
    if (error.code === 'invalid_api_key') {
      return res.status(400).json({ message: 'Invalid OpenAI API key' });
    }
    next(error);
  }
};

const summarizeTask = async (req, res, next) => {
  try {
    const { title, description, comments } = req.body;

    if (!aiService.isApiKeyConfigured()) {
      return res.status(400).json({ message: 'OpenAI API key not configured' });
    }

    const summary = await aiService.summarize(title, description, comments);

    res.json({ summary });
  } catch (error) {
    if (error.code === 'invalid_api_key') {
      return res.status(400).json({ message: 'Invalid OpenAI API key' });
    }
    next(error);
  }
};

module.exports = { generateTaskDescription, summarizeTask };
