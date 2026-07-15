const { GoogleGenerativeAI } = require('@google/generative-ai');

// Connect to the Gemini API using your secret key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handleChat = async (req, res) => {
    try {
        const userMessage = req.body.message;
        
        // We use the fast 'flash' model for quick chatbot replies
        // Change your model initialization to use gemini-pro
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        // This is the "System Prompt" - it tells the AI how to act
        const prompt = `
            You are a helpful, professional Smart City Assistant. 
            Keep your answers brief (1-3 sentences maximum). 
            Help citizens figure out how to report issues, track infrastructure, or navigate the portal.
            The user just asked: "${userMessage}"
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.json({ success: true, reply: text });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ success: false, reply: "Sorry, the city network is busy. Try again later!" });
    }
};