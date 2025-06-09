
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
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Jeff Thompson’s campaign assistant. Respond to residents of Ward 10 in Fredericton using only information from ward10together.ca. Be helpful, factual, concise, and avoid political bias."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 200
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
