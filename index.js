
const axios = require('axios');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const ENABLE_GPT = process.env.ENABLE_GPT === "true";

const fallbackTracker = new Set();

const responses = [
  {
    keywords: ["menu", "help", "start", "start over", "options"],
    reply: {
      text: "Here are some ways you can get involved or learn more:",
      quick_replies: [
        { content_type: "text", title: "📌 Platform", payload: "platform" },
        { content_type: "text", title: "📅 Meet Jeff", payload: "meet" },
        { content_type: "text", title: "🏠 Lawn Sign", payload: "sign" },
        { content_type: "text", title: "🙋‍♂️ Volunteer", payload: "volunteer" },
        { content_type: "text", title: "💬 Share Thoughts", payload: "issue" },
        { content_type: "text", title: "🌐 Visit Website", payload: "website" }
      ]
    }
  },
  {
    keywords: ["why running", "why candidate", "why council", "purpose", "campaign reason"],
    reply: "I’m running because I believe Ward 10 deserves a transparent, responsive voice at City Hall. With decades of leadership in innovation, community development, and volunteer service, I’m ready to represent our community and help shape a more connected and inclusive Fredericton."
  },
  {
    keywords: ["platform", "priorities", "goals", "what do you stand for"],
    reply: "I’m focused on five core commitments: Transparent Governance, Smart and Inclusive Growth, Affordable Housing, Livable Neighbourhoods, and Fiscal Responsibility. You can learn more at ward10together.ca/commitments."
  },
  {
    keywords: ["what is ward 10", "where is ward 10", "neighbourhoods in ward 10", "parts of ward 10"],
    reply: "Ward 10 includes the west end of downtown, the Town Plat, and Sunshine Gardens. You can confirm your address at ward10together.ca."
  },
  {
    keywords: ["who is jeff", "about jeff", "background", "experience", "biography"],
    reply: "I’ve spent my career building organizations that drive innovation, education, and community impact. I’ve served on boards like Science East, Knowledge Park, and GFCEDA, and I’ve volunteered with the Fredericton Marathon and Community Kitchens. Learn more at ward10together.ca/about."
  },
  {
    keywords: ["volunteer", "help out", "campaign team", "get involved"],
    reply: "We’d love to have your help! Whether it’s door-to-door outreach, sign delivery, or phone calls, there’s a place for you. Visit ward10together.ca/getinvolved to sign up."
  },
  {
    keywords: ["lawn sign", "yard sign", "campaign sign"],
    reply: "Lawn signs are a great way to show support! You can request one here: ward10together.ca/lawnsign"
  },
  {
    keywords: ["donate", "contribute", "e-transfer", "make a donation", "financial contribution", "donation options"],
    reply: "Thanks for considering a donation — your support helps with outreach, materials, and events. Visit ward10together.ca/donate for details."
  },
  {
    keywords: ["coffee chat", "meet jeff", "talk with jeff", "book a meeting", "schedule a conversation"],
    reply: "Let’s connect! You can book a one-on-one or group conversation with me here: ward10together.ca/book"
  },
  {
    keywords: ["issue", "concern", "question", "problem", "feedback", "something to say", "share thoughts"],
    reply: "I want to hear what matters most to you. Please share your thoughts at ward10together.ca/yourvoice"
  },
  {
    keywords: ["transparency", "open meetings", "council committee", "decision making"],
    reply: "I believe decisions should be made in public, not behind closed doors. I’m committed to open, recurring ward meetings and stronger public engagement."
  },
  {
    keywords: ["housing", "affordable housing", "seniors housing", "housing options"],
    reply: "Everyone deserves a place to call home. I support expanding affordable and inclusive housing options and advocating for better provincial support."
  },
  {
    keywords: ["nbex", "growth", "development", "smart growth", "densification"],
    reply: "Growth should reflect community needs. I support smart, inclusive growth and will push to unlock the full potential of the NBEX plan."
  },
  {
    keywords: ["livable", "walkable", "safe streets", "parks", "community"],
    reply: "I’ll prioritize safe, connected neighbourhoods with green space, transit, and public areas that bring people together."
  },
  {
    keywords: ["taxes", "fiscal responsibility", "city budget", "value for money", "reforms"],
    reply: "We need to spend wisely and ensure real value for taxpayers. I’ll advocate for reforms that benefit Fredericton — not offload provincial responsibilities onto the city."
  },
  {
    keywords: ["events", "updates", "news", "what's happening", "announcements"],
    reply: "Stay up to date on campaign news, community chats, and priorities by signing up at ward10together.ca/stay-informed"
  },
  {
  keywords: ["website"],
  reply: "You can explore everything about the campaign at https://www.ward10together.ca"
  }
];

function findKeywordMatch(text) {
  const cleaned = text.toLowerCase();
  for (const { keywords, reply } of responses) {
    if (keywords.some(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(cleaned))) {
      return reply;
    }
  }
  return "Thanks for your message. A member of our campaign team will get back to you. You can also call or text +1 (506) 715-5525 or email contact@ward10together.ca.";
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

          // More flexible GET_STARTED payload match
          const payload = event.postback?.payload;
          if (payload && payload.toUpperCase().includes("GET_STARTED")) {
            await axios.post(
              `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
              {
                recipient: { id: senderId },
                message: {
                  text: "Hi, I’m Jeff Thompson — candidate for City Council in Ward 10. I’m glad you reached out. You can always contact me or learn more at ward10together.ca.",
                  quick_replies: [
                    { content_type: "text", title: "📌 Platform", payload: "platform" },
                    { content_type: "text", title: "📅 Meet Jeff", payload: "meet" },
                    { content_type: "text", title: "🏠 Lawn Sign", payload: "sign" },
                    { content_type: "text", title: "🙋‍♂️ Volunteer", payload: "volunteer" },
                    { content_type: "text", title: "💬 Share Thoughts", payload: "issue" },
                    { content_type: "text", title: "🌐 Visit Website", payload: "website" }
                  ]
                }
              }
            );
            continue;
          }

        const messageText = event.message?.text;
        if (messageText) {
          let reply;

        if (ENABLE_GPT) {
          reply = "Thanks for your message. GPT functionality is currently enabled — and keyword bot replies are turned off.";
        } else {
          reply = findKeywordMatch(messageText);

        // If it's the default fallback message, only send it once
        const fallbackMsg = "Thanks for your message. A member of our campaign team will get back to you. You can also call or text +1 (506) 715-5525 or email contact@ward10together.ca.";
        if (reply === fallbackMsg) {
            if (fallbackTracker.has(senderId)) {
              return res.status(200).send("Fallback suppressed.");
            } else {
              fallbackTracker.add(senderId);
              }
            }
          }

            await axios.post(
              `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
              {
                recipient: { id: senderId },
                message: typeof reply === "string" ? { text: reply } : reply
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
