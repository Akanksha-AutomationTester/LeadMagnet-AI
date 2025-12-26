
import { GoogleGenAI, Type } from "@google/genai";

export interface MapResult {
  name: string;
  rating: number;
  type: string;
  address: string;
  phone: string;
  website: string;
  email: string; // Added email field
  reviewCount: number;
  sourceUrl: string;
}

export const fetchRealLeadsFromAI = async (
  query: string, 
  location: string,
  sector: string,
  excludeNames: string[] = []
): Promise<{ results: MapResult[], groundingMetadata: any }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const sectorContext = sector && sector !== "All Sectors" ? `in the ${sector} sector` : "";
  const locationContext = location ? `located in or around ${location}` : "";
  const exclusionPrompt = excludeNames.length > 0 
    ? `\nIMPORTANT: I already have these businesses, do NOT repeat them: ${excludeNames.join(", ")}.` 
    : "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find an exhaustive list of real, verified businesses ${sectorContext} ${locationContext}. 
      Your specific search query is: "${query}". 
      I want ALL available data you can find, specifically looking for contact details. Please return at least 25-30 unique results per batch if possible. ${exclusionPrompt}
      
      Provide accurate, genuine details for each:
      - Name
      - Rating (e.g. 4.5)
      - Business Category (e.g. Dental Clinic)
      - Full Address
      - Phone Number (International format)
      - Website URL (Critical: find the official website if available)
      - Email Address (Search for publicly listed emails on their website or social profiles)
      - Review Count
      - A source URL for verification
      
      Return as a structured JSON object with a 'businesses' array.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            businesses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                  address: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  website: { type: Type.STRING },
                  email: { type: Type.STRING }, // Included in schema
                  reviewCount: { type: Type.NUMBER },
                  sourceUrl: { type: Type.STRING }
                },
                required: ["name", "type", "address"]
              }
            }
          }
        }
      },
    });

    const jsonStr = response.text.trim();
    const data = JSON.parse(jsonStr);
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return {
      results: data.businesses || [],
      groundingMetadata
    };
  } catch (error) {
    console.error("Exhaustive fetch failed:", error);
    throw error;
  }
};
