export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('Maged Tech Telegram Bot is running!');
    }

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 

    try {
        const update = req.body;
        if (!update.message) return res.status(200).send('OK');

        const chatId = update.message.chat.id;
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

        if (!text && !fileId) return res.status(200).send('OK');

        await sendTelegramAction(chatId, 'typing', TELEGRAM_TOKEN);

        const systemPrompt = `أنت اسمك "عبود"، وتعمل كموظف ومساعد فني لدى المعلم في ورشة صيانة الهواتف "maged tech". 
        طريقتك في الكلام مرحة وتستخدم اللهجة الشامية السورية. 
        أنت خبير تقني محترف جداً في صيانة الموبايلات.`;

        let parts = [{ text: systemPrompt }];

        if (fileId) {
            const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            
            if (fileData.ok) {
                const filePath = fileData.result.file_path;
                const downloadRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
                const arrayBuffer = await downloadRes.arrayBuffer();
                const base64File = Buffer.from(arrayBuffer).toString('base64');

                parts.push({
                    inline_data: { mime_type: mimeType, data: base64File }
                });

                // 🔥 حقنة الذكاء البصري الصارمة 🔥
                if (mimeType.includes('image')) {
                    const smartVisionPrompt = `أنت الآن في وضع الفحص البصري الدقيق كمهندس صيانة.
                    1. إذا كانت الصورة لكرتونة هاتف أو ملصق: استخرج جميع الأرقام الظاهرة بدقة متناهية (IMEI, السيريال، الموديل) واكتبها في قائمة واضحة ومفصلة.
                    2. إذا كانت الصورة للوحة أم (Motherboard): ابحث عن أي آثار حرق، أكسدة (ماء)، أو مكونات مفقودة، واشرح المشكلة بالتفصيل.
                    كن دقيقاً جداً ولا تخمن أي معلومات غير موجودة في الصورة.
                    ${text ? 'السؤال المرفق من الفني: ' + text : 'حلل هذه الصورة وأعطني التفاصيل والأرقام المهمة.'}`;
                    
                    parts.push({ text: smartVisionPrompt });
                } else if (mimeType.includes('audio')) {
                    parts.push({ text: "استمع لهذه البصمة الصوتية وأجبني." });
                }
            }
        } else if (text) {
            parts.push({ text: `سؤال الفني: ${text}` });
        }

        // إرسال الطلب لملف الموقع الأساسي
        const aiResponse = await fetch('https://maged-tech-tools.vercel.app/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const aiData = await aiResponse.json();
        let replyText = "في مشكلة بتحليل العطل يا معلم.";
        
        if (aiData.error) {
            replyText = "يا معلم جوجل عطاني هاد الخطأ: " + JSON.stringify(aiData.error);
        } else if (aiData.candidates && aiData.candidates[0].content.parts[0].text) {
            replyText = aiData.candidates[0].content.parts[0].text;
        }

        await sendTelegramMessage(chatId, replyText, TELEGRAM_TOKEN);
        return res.status(200).send('OK');

    } catch (error) {
        console.error("Bot Error:", error);
        return res.status(200).send('OK');
    }
}

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
