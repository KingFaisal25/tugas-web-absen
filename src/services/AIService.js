const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async generateTaskInsight(tasks) {
    try {
      const prompt = `Analyze these tasks and give a brief productivity tip: ${JSON.stringify(tasks)}`;
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("AI Error:", error);
      return "AI Service unavailable.";
    }
  }

  async summarizeContent(text) {
    try {
      const prompt = `Summarize this text in 3 bullet points: ${text}`;
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      return "Could not summarize.";
    }
  }
}

module.exports = new AIService();