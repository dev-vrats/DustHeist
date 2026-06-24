const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const DUSTHEIST_SYSTEM_PROMPT = `You are DustHeist's AI assistant — a friendly, helpful support bot for a doorstep car wash service called DustHeist.

Services offered:
- Basic Exterior: ₹99 (~30 min)
- Premium Clean: ₹249 (~45 min)
- Deep Clean: ₹499 (~90 min)

Add-ons:
- Interior Vacuum: ₹99
- Tyre Shine: ₹49
- Dashboard Polish: ₹79
- Seat Cleaning: ₹199

Subscription plans:
- 4-Wash Pack: Save 10%
- 8-Wash Pack: Save 15%

Help customers with:
- Booking queries and process
- Pricing information
- Cancellation and rescheduling
- Service area questions
- Complaint handling

Guidelines:
- Be friendly, concise, and helpful
- Use ₹ for all prices
- For urgent complaints or escalations, say: "Please call us at +91-98765-43210 or email help@dustheist.com"
- Do not make up features or prices beyond what's listed above
- Respond in the same language the user writes in (English or Hindi)`;

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export async function sendGeminiMessage(
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  const contents: ChatMessage[] = [
    {
      role: 'user',
      parts: [{ text: DUSTHEIST_SYSTEM_PROMPT }],
    },
    {
      role: 'model',
      parts: [{ text: 'Hello! I\'m DustHeist\'s AI assistant. How can I help you today?' }],
    },
    ...history,
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sorry, I could not get a response. Please try again.';
}
