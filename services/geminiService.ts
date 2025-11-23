import { GoogleGenAI, Type } from "@google/genai";
import { QuestionType } from "../types";

// Using the key from the environment/user context.
// In a production app, use a backend proxy. For this prototype, we use the client-side key.
// The user provided config implies no env var usage, so we will attempt to pull from a process env 
// OR use a placeholder if not set. Since I cannot create .env files in this format, 
// I will rely on the user having set process.env.API_KEY in their bundler or environment.
// Fallback logic is not ideal for "World Class" but necessary if env is missing in this strict output format.
const apiKey = process.env.API_KEY || ""; 

const ai = new GoogleGenAI({ apiKey });

export const generateQuestions = async (topic: string, purpose: string, count: number = 3) => {
  if (!apiKey) {
    console.warn("API Key missing for Gemini.");
    throw new Error("Gemini API Key is missing. Please check your configuration.");
  }

  const model = "gemini-2.5-flash";
  const prompt = `Generate ${count} multiple choice questions about "${topic}" designed for "${purpose}". Return the result as a JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              answer: { type: Type.STRING, description: "The correct option from the options array." }
            },
            required: ["question", "options", "answer"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    // Map to our app's internal format
    return parsed.map((item: any) => ({
      type: QuestionType.MULTIPLE_CHOICE,
      question: item.question,
      options: item.options,
      answer: item.answer,
      author: 'Gemini AI'
    }));
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
