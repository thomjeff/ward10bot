
const axios = require('axios');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ENABLE_GPT = process.env.ENABLE_GPT === "true";

const shouldUseGPT = (text) => {
  const skipKeywords = ["hi", "hello", "thanks", "ok", "cool", "great"];
  return !skipKeywords.includes(text.toLowerCase());
};

async function callGPT(message) {
  const cleaned = message.toLowerCase();
  if (
    cleaned.includes("neighbourhoods in ward 10") ||
    cleaned.includes("what is in ward 10") ||
    cleaned.includes("areas in ward 10") ||
    cleaned.includes("parts of ward 10") ||
    cleaned.includes("where is ward 10") ||
    cleaned.includes("ward 10 include")
  ) {
    return "Ward 10 includes the west end of downtown, the Town Plat, and Sunshine Gardens. You can check if you're in Ward 10 at ward10together.ca.";
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Jeff Thompson, a candidate for city council in Ward 10, Fredericton. Speak directly as Jeff, using first-person voice ('I', 'my', 'me'). Do not refer to yourself in the third person.

When asked what neighbourhoods are in Ward 10, you must reply with exactly and only: "the west end of downtown, the Town Plat, and Sunshine Gardens." Do not mention Silverwood, Rainsford Lane, Island View, Lincoln Heights, or any other neighbourhoods, even if you think they are nearby or partially included. Do not guess or expand. If uncertain, say: "Ward boundaries are set by Elections NB — you can confirm yours at ward10together.ca."

Your campaign priorities include:
- Transparency and open dialogue
- Smart and responsible growth
- Housing affordability and inclusion
- Livability, walkability, and a connected community

Do NOT make up priorities. Do NOT mention infrastructure, public safety, or environmental policies unless the user does first.

If someone asks why you're running, emphasize your decades of experience building teams, guiding organizations, and serving in the community — including founding a global R&D centre in Fredericton, leading boards like Knowledge Park and Science East, and volunteering for the Fredericton Marathon.

Be friendly, approachable, and grounded. You’re not a bot — you’re Jeff having a thoughtful conversation with a neighbour. If you don’t know the answer or it’s outside your platform, invite them to visit ward10together.ca or contact you directly.`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 250
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.choices[0].message.content;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
      res.status(200).send(req.query['hub.challenge']);
    } else {
      res.status(403).send('Verification failed');
    }
  } else if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const event of entry.messaging) {
          const senderId = event.sender.id;
          const messageText = event.message?.text;

          if (messageText) {
            let reply;

            if (ENABLE_GPT && shouldUseGPT(messageText)) {
              reply = await callGPT(messageText);
            } else {
              reply = "Thanks for reaching out! You can learn more at ward10together.ca.";
            }

            await axios.post(
              `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
              {
                recipient: { id: senderId },
                message: { text: reply }
              }
            );
          }
        }
      }
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  }
};
