// netlify/functions/draw-card.js
exports.handler = async function(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  try {
    const { question = "" } = JSON.parse(event.body || "{}");

    // Tiny seed deck to prove the flow. Replace with your full Echoes deck later.
    const deck = [
      { name: "The Fool", suit: "Major", meaning: "A clean beginning. Trust the path even without a full map.", prompt: "What would you choose if you trusted you are supported?" },
      { name: "Ace of Cups", suit: "Cups", meaning: "First light of the heart. Tender renewal and open flow.", prompt: "Where can you open your heart without fear of loss?" },
      { name: "Strength", suit: "Major", meaning: "Gentle courage. Power that guides rather than forces.", prompt: "Where can you replace force with gentleness?" },
      { name: "Nine of Pentacles", suit: "Pentacles", meaning: "Graceful independence. Savour the fruits of your effort.", prompt: "How can you honour what you have built?" },
      { name: "Queen of Wands", suit: "Wands", meaning: "Radiant confidence. Lead by standing in your own light.", prompt: "What would stepping into your power look like today?" }
    ];
    const pick = deck[Math.floor(Math.random() * deck.length)];

    // Compose a short Oriah response with Aussie spelling and your tone
    const system = `
You are Oriah in Jlee's voice. Australian spelling. No em dashes.
Keep it soulful, clear, and grounded. Readings are mirrors, not fortune telling.
Always close with one practical integration step.`;

    const userMsg = `
Visitor asked: ${question || "(no question provided)"}
Drawn card: ${pick.name} (${pick.suit})
Essence: ${pick.meaning}
Close with this prompt: ${pick.prompt}
Keep it to 6 to 10 sentences.`;

    const body = {
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg }
      ]
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const detail = await res.text();
      return respond(500, { error: "Upstream error", detail });
    }

    const json = await res.json();
    const reply = json?.choices?.[0]?.message?.content?.trim() || "I am here.";

    return respond(200, {
      card: { name: pick.name, suit: pick.suit, meaning: pick.meaning, prompt: pick.prompt },
      reply
    });

  } catch (e) {
    return respond(500, { error: "Server error", detail: String(e) });
  }
};

function respond(status, obj) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(obj)
  };
}
