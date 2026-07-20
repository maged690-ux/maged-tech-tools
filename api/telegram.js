export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('Maged Tech Telegram Bot is running!');
    }

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 

    try {
        const update = req.body;
        
        if (!update.message || !update.message.text) {
            return res.status(200).send('OK');
        }

        const chatId = update.message.chat.id;
        const text = update.message.text;

        if (text === '/start') {
            await sendTelegramMessage(chatId, "أهلين يا معلم! أنا عبود، مساعدك بورشة maged tech. هات لشوف شو العطل اللي مجننك اليوم؟ 🤖🔧", TELEGRAM_TOKEN);
            return res.status(200).send('OK');
        }

        await sendTelegramAction(chatId, 'typing', TELEGRAM_TOKEN);

        const systemPrompt = `أنت اسمك "عبود"، وتعمل كموظف ومساعد فني لدى المعلم في ورشة صيانة الهواتف "maged tech". 
        طريقتك في الكلام مرحة وتستخدم اللهجة الشامية السورية بشكل طبيعي (مثل: يا معلم، على راسي، هات لشوف، كاوية اللحام، الآفو).
        رغم أسلوبك المرح، أنت خبير تقني محترف جداً في صيانة الموبايلات.
        العطل المطلوب حله هو: ${text}`;

        // السر هون: تلجرام عم يطلب المساعدة من ملف gemini تبع موقعك الأساسي!
        const aiResponse = await fetch('https://maged-tech-tools.vercel.app/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const aiData = await aiResponse.json();
        
        let replyText = "";
        
        // معالجة الرد بنفس طريقة الموقع تماماً
        if (aiData.error) {
            replyText = "معلش يا معلم، السيرفر عليه ضغط متل ما بصير بالموقع. ريح كاوية اللحام ثواني وارجع اسألني!";
        } else if (aiData.candidates && aiData.candidates[0].content.parts[0].text) {
            replyText = aiData.candidates[0].content.parts[0].text;
        } else {
            replyText = "في مشكلة بتحليل العطل يا معلم.";
        }

        await sendTelegramMessage(chatId, replyText, TELEGRAM_TOKEN);
        return res.status(200).send('OK');

    } catch (error) {
        console.error("Bot Error:", error);
        return res.status(200).send('OK');
    }
}

// دوال إرسال الرسائل لتلجرام
async function sendTelegramMessage(chatId, text, token) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text })
    });
}

async function sendTelegramAction(chatId, action, token) {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: action })
    });
}
