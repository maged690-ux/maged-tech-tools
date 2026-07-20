export default async function handler(req, res) {
    // 1. تلجرام بيبعت البيانات عن طريق POST
    if (req.method !== 'POST') {
        return res.status(200).send('Maged Tech Telegram Bot is running!');
    }

    // جلب المفاتيح من إعدادات Vercel
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // المفتاح القديم اللي ضفناه زمان

    try {
        const update = req.body;
        
        // التأكد إنو الرسالة نصية
        if (!update.message || !update.message.text) {
            return res.status(200).send('OK');
        }

        const chatId = update.message.chat.id;
        const text = update.message.text;

        // 2. الرد على رسالة البدء /start
        if (text === '/start') {
            await sendTelegramMessage(chatId, "أهلين يا معلم! أنا عبود، مساعدك بورشة maged tech. هات لشوف شو العطل اللي مجننك اليوم؟ 🤖🔧", TELEGRAM_TOKEN);
            return res.status(200).send('OK');
        }

        // 3. إظهار "يكتب..." في تلجرام لمحاكاة عبود
        await sendTelegramAction(chatId, 'typing', TELEGRAM_TOKEN);

        // 4. إرسال العطل للذكاء الاصطناعي (نفس عقل الموقع)
        const systemPrompt = `أنت اسمك "عبود"، وتعمل كموظف ومساعد فني لدى المعلم في ورشة صيانة الهواتف "maged tech". 
        طريقتك في الكلام مرحة وتستخدم اللهجة الشامية السورية بشكل طبيعي (مثل: يا معلم، على راسي، هات لشوف، كاوية اللحام، الآفو).
        رغم أسلوبك المرح، أنت خبير تقني محترف جداً في صيانة الموبايلات.
        العطل المطلوب حله هو: ${text}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
        
        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const geminiData = await geminiResponse.json();
        
        let replyText = "معلش يا معلم، السيرفر عليه ضغط وما قدرت أحلل العطل.";
        if (geminiData.candidates && geminiData.candidates[0].content.parts[0].text) {
            replyText = geminiData.candidates[0].content.parts[0].text;
        }

        // 5. إرسال الحل للفني على تلجرام
        await sendTelegramMessage(chatId, replyText, TELEGRAM_TOKEN);

        return res.status(200).send('OK'); // لازم نرد بـ 200 لتلجرام عشان ما يكرر الرسالة
    } catch (error) {
        console.error(error);
        return res.status(200).send('OK');
    }
}

// دالة إرسال الرسالة لتلجرام
async function sendTelegramMessage(chatId, text, token) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text })
    });
}

// دالة إظهار "يكتب..."
async function sendTelegramAction(chatId, action, token) {
    const url = `https://api.telegram.org/bot${token}/sendChatAction`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: action })
    });
}
