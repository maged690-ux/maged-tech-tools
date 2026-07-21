export default async function handler(req, res) {
    // التأكد من أن الطلب جاي كـ POST
    if (req.method !== 'POST') {
        return res.status(200).send('maged tech Telegram Bot is running!');
    }

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 

    try {
        const update = req.body;
        if (!update.message) return res.status(200).send('OK');

        const chatId = update.message.chat.id;
        
        // === كود حفظ الـ ID بقاعدة بيانات Upstash (ميزة الذاكرة) ===
        const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
        const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (UPSTASH_URL && UPSTASH_TOKEN) {
            try {
                await fetch(`${UPSTASH_URL}/sadd/users/${chatId}`, {
                    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
                });
                console.log(`تم حفظ الـ ID: ${chatId}`);
            } catch (error) {
                console.error("خطأ بحفظ الآيدي:", error);
            }
        }
        // ============================================================

        let text = update.message.text || update.message.caption || "";
        let fileId = null;
        let mimeType = '';

        // التحقق من وجود صورة أو بصمة صوتية
        if (update.message.photo) {
            const photoArray = update.message.photo;
            fileId = photoArray[photoArray.length - 1].file_id; 
            mimeType = 'image/jpeg';
        } else if (update.message.voice) {
            fileId = update.message.voice.file_id;
            mimeType = update.message.voice.mime_type || 'audio/ogg';
        }

        // رسالة الترحيب
        if (text === '/start') {
            await sendTelegramMessage(chatId, "أهلين يا معلم! أنا عبود، الصبي والمساعد تبعك بورشة maged tech. ابعتلي العطل كتابة، صورة، أو بصمة صوت، ورح فصفصلك ياه وأعطيك الصافي من الآخر! 🤖🔧", TELEGRAM_TOKEN);
            return res.status(200).send('OK');
        }

        if (!text && !fileId) return res.status(200).send('OK');

        // إظهار حالة "يكتب..." للمستخدم
        await sendTelegramAction(chatId, 'typing', TELEGRAM_TOKEN);

        // 🔥 شخصية عبود المعدلة: صارمة تقنياً وفكاهية شامياً 🔥
        const systemPrompt = `أنت اسمك "عبود"، صبي ومساعد فني محترف جداً تعمل لدى المعلم في ورشة صيانة الهواتف "maged tech".
شخصيتك: مهضوم، فكاهي، وتتحدث بلهجة شامية سورية محببة للقلب (مثل: يا معلم، على راسي، تكرم عينك).
المطلوب منك بصرامة:
1. يُمنع منعاً باتاً المماطلة أو إعطاء ردود إنشائية بدون حلول (لا تقل "سأجهز لك الحل"، بل أعطه الحل فوراً).
2. فصفص المشكلة المذكورة أو المصورة، وقدم الحل التقني الشامل والدقيق فوراً (مسارات، قياسات ممانعة وفولت، أسباب العطل، أو خطوات سوفتوير).
3. اجعل رسالتك تبدأ بترحيب شامي لطيف، ثم ادخل في صلب الحل التقني الاحترافي مباشرة، واختم بتشجيع للمعلم.`;

        let parts = [{ text: systemPrompt }];

        // معالجة الملفات (صور أو صوت)
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

                // توجيه دقيق للذكاء البصري والصوتي
                if (mimeType.includes('image')) {
                    const smartVisionPrompt = `أنت الآن تفحص هذه الصورة بعين مهندس صيانة محترف.
1. إذا كانت لكرتونة هاتف: استخرج الأرقام بدقة تامة وبدون أي تخمين.
2. إذا كانت للوحة أم (Motherboard) أو فلاتة: حلل آثار التلف، الأكسدة، أو المسارات المقطوعة، واطرح الحل العملي للتعويض أو التبديل.
أعطِ الحل بلهجتك الشامية مع الاحتفاظ بالدقة التقنية المطلوبة للمهندسين.
${text ? 'ملاحظة الفني المرفقة: ' + text : ''}`;
                    
                    parts.push({ text: smartVisionPrompt });
                } else if (mimeType.includes('audio')) {
                    parts.push({ text: "استمع لهذه البصمة الصوتية بعناية، افهم العطل، وأعطني الحل التقني الشامل فوراً بلهجتك الشامية المعتادة." });
                }
            }
        } else if (text) {
            parts.push({ text: `تفاصيل العطل من الفني: ${text}` });
        }

        // إرسال الطلب لملف معالجة جيميناي
        const aiResponse = await fetch('https://maged-tech-tools.vercel.app/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const aiData = await aiResponse.json();
        let replyText = "يا معلم، اعذرني في مشكلة صغيرة بتحليل العطل هلق، جرب ابعتلي ياه مرة تانية.";
        
        if (aiData.error) {
            replyText = "يا معلم جوجل عطاني هاد الخطأ، شوف شو القصة: " + JSON.stringify(aiData.error);
        } else if (aiData.candidates && aiData.candidates[0].content.parts[0].text) {
            replyText = aiData.candidates[0].content.parts[0].text;
        }

        // إرسال الرد النهائي للمستخدم
        await sendTelegramMessage(chatId, replyText, TELEGRAM_TOKEN);
        return res.status(200).send('OK');

    } catch (error) {
        console.error("Bot Error:", error);
        return res.status(200).send('OK');
    }
}

// دالة إرسال الرسائل عبر تيليجرام
async function sendTelegramMessage(chatId, text, token) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text })
    });
}

// دالة إرسال حالة "يكتب..." عبر تيليجرام
async function sendTelegramAction(chatId, action, token) {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: action })
    });
}
