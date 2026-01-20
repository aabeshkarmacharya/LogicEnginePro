
import { GoogleGenAI, Type } from "@google/genai";
import { OPERATORS, ACTION_DEFINITIONS } from "../constants";
import { DataField } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function parseNaturalLanguageAutomation(prompt: string, currentFields: DataField[]) {
  const systemInstruction = `
    You are a business logic expert. Convert a user's natural language request into a structured JSON automation object.
    
    An automation consists of 'conditions' (IF) and 'actions' (THEN).
    
    Available fields for conditions: ${currentFields.map(f => `${f.name} (${f.type})`).join(', ')}
    Available operators: ${OPERATORS.map(o => o.value).join(', ')}
    Specialized Operators:
    - ends_with: Match string ending
    - is_month: Match month index (0 for Jan, 11 for Dec). 
      IMPORTANT: If the user asks for a month like "April 2024", format the value as "YYYY-M" (e.g. "2024-3").
    - is_year: Match 4-digit year

    Available actions: ${ACTION_DEFINITIONS.map(a => a.type).join(', ')}

    The output MUST strictly follow this JSON schema:
    {
      "name": "Short descriptive name",
      "description": "Brief explanation",
      "conditions": [
        { "field": "string", "operator": "string", "value": "any" }
      ],
      "actions": [
        { "type": "string", "params": {} }
      ],
      "conditionLogic": "AND" | "OR"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            conditions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  operator: { type: Type.STRING },
                  value: { type: Type.STRING }
                },
                required: ["field", "operator", "value"]
              }
            },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  params: { type: Type.OBJECT }
                },
                required: ["type"]
              }
            },
            conditionLogic: { type: Type.STRING, enum: ["AND", "OR"] }
          },
          required: ["name", "conditions", "actions"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Automation Parsing Error:", error);
    throw error;
  }
}
