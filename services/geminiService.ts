
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const cleanLeadsWithAI = async (rawStrings: string[]): Promise<Lead[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Clean and structure the following raw business data. 
      - Standardize phone numbers to international format.
      - Extract and split the address into: Street, City, State, Country, and Zip Code.
      - If Zip code is missing, try to find it or leave empty.
      - Assign lead status based on rating (>4.2 is Hot).

      RAW DATA:
      ${rawStrings.join("\n")}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              phone: { type: Type.STRING },
              email: { type: Type.STRING },
              website: { type: Type.STRING },
              street: { type: Type.STRING },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              country: { type: Type.STRING },
              zipCode: { type: Type.STRING },
              category: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewCount: { type: Type.NUMBER },
              leadStatus: { type: Type.STRING },
              source: { type: Type.STRING }
            },
            required: ["name", "phone", "category", "city", "leadStatus"]
          }
        }
      }
    });

    const jsonStr = response.text.trim();
    const cleanedData = JSON.parse(jsonStr);

    return cleanedData.map((item: any, index: number) => ({
      ...item,
      id: `lead-${Date.now()}-${index}`,
      email: item.email || "n/a",
      website: item.website || "n/a",
      address: item.street || item.name, // Fallback for raw address display
      state: item.state || "",
      country: item.country || "",
      zipCode: item.zipCode || "",
      street: item.street || ""
    }));
  } catch (error) {
    console.error("AI Cleaning failed:", error);
    throw error;
  }
};
