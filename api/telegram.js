export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('Maged Tech Telegram Bot is running!');
    }

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 

    try {
        const update = req.body;
        
        if (!update.message) {
            return res.status(200).send('OK');
        }

        const chatId = update.message.chat.id;
        
        // جلب النص أو الصورة أو الصوت
        let text = update.message.text || update.message.caption || "";
        let fileId = null;
        let mimeType = '';

        if (update.message.photo) {
            const photoArray = update.message.photo;
            fileId = photoArray[photoArray.length - 1].file_id; 
            mimeType = 'image/jpeg';
        } else if (update.message.voice) {
            fileId = update.message.voice.file_id;
            mimeType = update.message.voice.mime_type || 'audio/ogg';
        }

        if (text === '/start') {
            await sendTelegramMessage(chatId, "أهلين يا معلم! أنا عبود، مساعدك بورشة maged tech. ابعتلي العطل كتابة، أو صورة، أو بصمة صوتية ورح أعطيك الصافي! 🤖🔧", TELEGRAM_TOKEN);
            return res.status(200).send('OK');
        }

        // إذا مافي لا نص ولا ملف، تجاهل
        if (!text && !fileId) return res.status(200).send('OK');

        await sendTelegramAction(chatId, 'typing', TELEGRAM_TOKEN);

        const systemPrompt = `أنت اسمك "عبود"، وتعمل كموظف ومساعد فني لدى المعلم في ورشة صيانة الهواتف "maged tech". 
        طريقتك في الكلام مرحة وتستخدم اللهجة الشامية السورية بشكل طبيعي (مثل: يا معلم، على راسي، هات لشوف، كاوية اللحام، الآفو).
        رغم أسلوبك المرح، أنت خبير تقني محترف جداً في صيانة الموبايلات.
        استفسار الفني: ${text}`;

        let parts = [{ text: systemPrompt }];

        // إذا الفني بعت صورة أو صوت، بنسحبها من تلجرام وبنحطها بالطلب
        if (fileId) {
            const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            
            if (fileData.ok) {
                const filePath = fileData.result.file_path;
                const downloadRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
                const arrayBuffer = await downloadRes.arrayBuffer();
                const base64File = Buffer.from(arrayBuffer).toString('base64');

                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64File
                    }
                });

                if (!text && mimeType.includes('image')) {
                    parts.push({ text: "حلل هذه الصورة للبورد وأخبرني بالمشكلة." });
                } else if (!text && mimeType.includes('audio')) {
                    parts.push({ text: "استمع لهذه البصمة الصوتية وأجبني." });
                }
            }
        }

        // إرسال الطلب لملف gemini تبع موقعك الأساسي (نفس الكود القديم اللي بيشتغل تمام)
        const aiResponse = await fetch('https://maged-tech-tools.vercel.app/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: parts }]
            })
        });

        const aiData = await aiResponse.json();
        
        let replyText = "";
        
        // معالجة الرد
        if (aiData.error) {
            replyText = "معلش يا معلم، السيرفر عليه ضغط متل ما بصير بالموقع. ريح كاوية اللحام ثواني وارجع اسألني!";
            console.error("Site API Error:", aiData.error);
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
