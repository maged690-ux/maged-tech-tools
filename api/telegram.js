export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    try {
        const update = req.body;
        if (!update.message) return res.status(200).send('OK');

        const chatId = update.message.chat.id;
        
        // جلب النص إذا موجود (أو النص المرفق مع الصورة)
        let text = update.message.text || update.message.caption || "";
        let fileId = null;
        let mimeType = '';

        // 1. فحص إذا الفني بعت صورة
        if (update.message.photo) {
            const photoArray = update.message.photo;
            fileId = photoArray[photoArray.length - 1].file_id; // أعلى دقة للصورة
            mimeType = 'image/jpeg';
        } 
        // 2. فحص إذا الفني بعت رسالة صوتية
        else if (update.message.voice) {
            fileId = update.message.voice.file_id;
            mimeType = update.message.voice.mime_type || 'audio/ogg';
        }

        // الرد على أمر البدء
        if (text === '/start') {
            await sendTelegramMessage(chatId, "أهلين يا معلم! أنا عبود.. ابعتلي العطل كتابة، أو صورة للبورد، أو حتى بصمة صوتية ورح أعطيك الصافي! 🤖🔧", TELEGRAM_TOKEN);
            return res.status(200).send('OK');
        }

        // إذا مافي لا نص ولا صورة ولا صوت، نتجاهل
        if (!text && !fileId) return res.status(200).send('OK');

        await sendTelegramAction(chatId, 'typing', TELEGRAM_TOKEN);

        // بناء الطلب لجوجل (Gemini)
        const systemPrompt = `أنت اسمك "عبود"، وتعمل كموظف ومساعد فني لدى المعلم في ورشة صيانة الهواتف "maged tech". 
        طريقتك في الكلام مرحة وتستخدم اللهجة الشامية السورية بشكل طبيعي. 
        رغم أسلوبك المرح، أنت خبير تقني محترف جداً في صيانة الموبايلات. 
        أجب على استفسار الفني بدقة وبشكل مختصر ومفيد.`;

        let geminiBody = {
            contents: [{ parts: [{ text: systemPrompt }] }]
        };

        // إذا في نص، نضيفه
        if (text) {
            geminiBody.contents[0].parts.push({ text: `رسالة الفني: ${text}` });
        }

        // إذا في ملف (صورة أو صوت)، بنسحبه من تلجرام وبنبعته لجوجل
        if (fileId) {
            // أ. جلب مسار الملف من تلجرام
            const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            const filePath = fileData.result.file_path;

            // ب. تحميل الملف وتحويله
            const downloadRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
            const arrayBuffer = await downloadRes.arrayBuffer();
            const base64File = Buffer.from(arrayBuffer).toString('base64');

            // ج. إضافته لجوجل
            geminiBody.contents[0].parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64File
                }
            });

            // إذا بعت صورة بدون نص، نعطيه أمر افتراضي
            if (!text && mimeType === 'image/jpeg') {
                geminiBody.contents[0].parts.push({ text: "الفني أرسل لك هذه الصورة للبورد، حللها وأخبره إذا كان هناك أي مشكلة ظاهرة أو كيف يبدأ الفحص." });
            }
             // إذا بعت صوت بدون نص
             if (!text && mimeType.includes('audio')) {
                geminiBody.contents[0].parts.push({ text: "استمع لرسالة الفني الصوتية وأجبه على مشكلته." });
            }
        }

        // إرسال الطلب لـ Gemini
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody)
        });

        const geminiJson = await geminiResponse.json();
        
        let replyText = "في مشكلة بتحليل العطل يا معلم.";
        
        // كشف الخطأ بالتفصيل 
        if (geminiJson.candidates && geminiJson.candidates[0].content.parts[0].text) {
            replyText = geminiJson.candidates[0].content.parts[0].text;
        } else if (geminiJson.error) {
            replyText = "يا معلم جوجل عم يعطيني هاد الخطأ: " + geminiJson.error.message;
        } else {
            replyText = "خطأ غير معروف من جوجل: " + JSON.stringify(geminiJson);
        }

        await sendTelegramMessage(chatId, replyText, TELEGRAM_TOKEN);
        return res.status(200).send('OK');

    } catch (error) {
        console.error("Bot Error:", error);
        
        // إذا الكود نفسه ضرب قبل ما يوصل لجوجل
        if (req.body && req.body.message && req.body.message.chat) {
            await sendTelegramMessage(req.body.message.chat.id, "في مشكلة بكود السيرفر: " + error.message, TELEGRAM_TOKEN);
        }
        
        return res.status(200).send('OK');
    }
}

// دوال مساعدة لتلجرام
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
