
import { GoogleGenAI } from "@google/genai";
import { PromptComponent } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePromptResponse = async (
  finalPrompt: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "Ошибка: API ключ не настроен.";
  }

  try {
    let validModel = modelName;
    if (modelName.toLowerCase().includes('flash')) {
        validModel = 'gemini-2.5-flash';
    } else if (modelName.toLowerCase().includes('pro')) {
        validModel = 'gemini-3-pro-preview';
    } else {
        validModel = 'gemini-2.5-flash';
    }

    const response = await client.models.generateContent({
      model: validModel,
      contents: finalPrompt,
    });

    return response.text || "Ответ не сгенерирован.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Ошибка генерации ответа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
  }
};

export const assemblePromptWithAI = async (components: PromptComponent[], target: 'SYSTEM' | 'USER'): Promise<string> => {
    const client = getClient();
    if (!client) return "";

    const filteredComponents = components.filter(c => c.target === target && c.value.trim() !== '');
    if (filteredComponents.length === 0) return "";

    const inputData = filteredComponents.map(c => `Label: ${c.label}\nContent: ${c.value}`).join('\n---\n');

    // Instructing Gemini to act as a prompt engineer to format the components nicely
    const prompt = `
    Act as a professional Prompt Engineer.
    Your task is to assemble a set of prompt components into a single, cohesive ${target === 'SYSTEM' ? 'System Instruction' : 'User Prompt'} using Markdown.
    
    The input components are provided below.
    
    Rules:
    1. Use Markdown headers (e.g. ### LabelName) for each component to maintain structure and clarity.
    2. Do not change the meaning of the content, but you may fix grammar or improve flow slightly if necessary.
    3. Preserve the language of the input content (Russian).
    4. Return ONLY the formatted prompt text. Do not add any conversational filler or explanations.
    
    Input Components:
    ${inputData}
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "";
    } catch (e) {
        console.error("Error assembling prompt", e);
        // Fallback to simple join if AI fails
        return filteredComponents.map(c => `### ${c.label}\n${c.value}`).join('\n\n');
    }
};
