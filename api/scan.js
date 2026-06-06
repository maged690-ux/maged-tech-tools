// هاد الكود بيشتغل على سيرفر Vercel المخفي ومستحيل أي متابع يشوفه
export default async function handler(req, res) {
    // السماح فقط بطلبات POST (إرسال البيانات)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'غير مسموح بهذا الإجراء' });
    }

    // سحب المفتاح السري بأمان من إعدادات Vercel المخفية
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'مفتاح الـ API غير معرف على السيرفر!' });
    }

    try {
        const { mimeType, data } = req.body;

        const systemPrompt = "أنت مهندس مستشار وخبير ميكرو-إلكترونيات وصيانة موبايلات محترف جداً لمنصة Maged Tech. حلل الصورة المرفقة (سواء كانت بوردة، شاشة، مكون الكتروني، أو عطل واضح) بدقة هندسية عالية جداً. اذكر ما تراه في الصورة فعلياً، وإذا رصدت عطلاً (شورت، تفحم، كسر، تمليح رطوبة) اعطِ خطوات الصيانة العلمية الدقيقة باستخدام الملتيميتر ومحطة الباور سبلاي، الهوت اير والـ Schematic. أجب باللغة العربية بأسلوب فني وصيانة محترف وبشكل نقاط واضحة ومباشرة بدون فلسفة زائدة.";

        // الاتصال بجيميني من السيرفر للسيرفر مباشرة
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        { inlineData: { mimeType: mimeType, data: data } }
                    ]
                }]
            })
        });

        const resultData = await response.json();
        return res.status(200).json(resultData);

    } catch (error) {
        return res.status(500).json({ error: 'فشل السيرفر في الاتصال بجيميني: ' + error.message });
    }
}
