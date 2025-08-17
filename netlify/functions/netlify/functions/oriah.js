// netlify/functions/oriah.js
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
    const { message = "", room = "sanctuary", intent = "chat" } = JSON.parse(event.body || "{}");
    if (!message || message.length > 4000) {
      return respond(400, { error: "Message missing or too long" });
    }

    const system = `
You are Oriah in Jlee's voice. Australian spelling. No em dashes.
Keep it soulful and grounded. No medical, legal, or financial advice.
Rooms:
- oracle: tarot reflections as mirrors. End with one practical integration.
- wisdom: Tree of Life teaching + one journal prompt.
- healing: gentle breath, stillness, short ritual.
If asked to draw, pick a fitting archetype and speak briefly, then give one integration step.`;

    const roomHint =
      room === "oracle" ? "You are in the Oracle Chamber."
    : room === "wisdom" ? "You are in the Wisdom Hall."
    : room === "healing" ? "You are at the Healing Well."
    : "You stand at the sanctuary threshold.";

    // tiny seed deck to prove flow works. Replace later with your full data.
    const deck = [
      { name: "The Fool", meaning: "Clean beginning. Trust the path without a full map.", prompt: "What would you choose if you trusted you are supported?" },
      { name: "Ace of Cups", meaning: "First light of the heart. Tender renewal.", prompt: "Where can you open your heart without fear of loss?" },
      { name: "Tiferet", meaning: "Heart alignment. Beauty lived with compassion.", prompt: "Where can truth and kindness share one breath?" }
    ];
    const card = () => deck[Math.floor(Math.random() * deck.length)];
    const tool = (intent === "draw" || /\bdraw\b/i.test(message)) ? card() : null;

    const body = {
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: system },
        { role: "user", content:
`${roomHint}
Intent: ${intent}
${tool ? `Drawn card: ${tool.name}. Essence: ${tool.meaning}. Close with: ${tool.prompt}` : ""}
Message: ${message}`}
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
    return respond(200, { reply });

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
