
const API_URL = 'http://localhost:9000/api/agent';

export interface AgentResponse {
    explanation: string;
    script: any[];
    code: string;
}

export const generateLesson = async (prompt: string): Promise<AgentResponse | string> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(errorData.detail || `Error: ${response.status}`);
        }

        const data = await response.json();

        // The agent might return a JSON string or a direct object depending on how google.adk behaves
        // and how process_request parses the output.
        // Ideally, the Orchestrator returns a JSON string which we parse here.
        try {
            if (typeof data === "string") {
                // Clean up potential markdown formatting ```json ... ```
                const cleanData = data.replace(/```json\n?|\n?```/g, '');
                return JSON.parse(cleanData);
            }
            return data;
        } catch (e) {
            console.warn("Failed to parse JSON from agent response", e);
            return data; // Return raw string if parsing fails
        }

    } catch (error) {
        console.error('Error calling backend agent:', error);
        throw error;
    }
};
