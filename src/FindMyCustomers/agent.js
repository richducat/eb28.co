import { GoogleGenAI } from '@google/genai';

// Note: In a production app, this should be handled securely on a backend server.
// For local demonstration, we'll use a Vite env variable if available, or a placeholder.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'MISSING_API_KEY';

let ai;
try {
  ai = new GoogleGenAI({ apiKey });
} catch (e) {
  console.warn("Failed to initialize Google GenAI SDK. Please check your API key.");
}

const SYSTEM_INSTRUCTION = `
You are the AdMaster AI, a state-of-the-art autonomous agent that simplifies advertising.
Your goal is to make managing ads across Google, Meta (Facebook/IG), TikTok, Apple, and X so easy a 10-year-old could do it.
Users will give you plain-English instructions (e.g., "Spend $50/day selling shoes to teens on TikTok").
You should respond in a friendly, extremely simple manner.

If the user gives a campaign instruction:
1. Summarize their strategy simply.
2. Recommend the best platform budget allocation.
3. Suggest 1 or 2 creative angles.
4. End by asking if they want you to draft the campaign.

Keep your responses concise and engaging. Do not use complex marketing jargon (like ROAS, CPC) unless explaining it simply.
`;

export async function generateAdMasterResponse(userMessage, chatHistory = []) {
  if (!ai || apiKey === 'MISSING_API_KEY') {
    // Fallback for UI demonstration if no API key is provided
    return new Promise(resolve => {
      setTimeout(() => {
        resolve("I'm running in offline mock mode because no API key was found. But if I were connected, I'd say: That sounds like a great campaign idea! Let's allocate $25 to TikTok and $25 to Instagram. Ready to launch?");
      }, 1500);
    });
  }

  try {
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // In @google/genai v1.48.0, the chat API is: ai.chats.create
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message: userMessage });
    return response.text;
  } catch (error) {
    console.error("Agent Error:", error);
    return "Oops! My AI circuits got a bit tangled. Make sure your API key is correct and try again!";
  }
}
