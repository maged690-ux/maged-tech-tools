export default async function handler(req, res) {
    // 🌐 فتح كل الصلاحيات الأمنية ليسمح لموقعك بالاتصال
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'غير مسموح بهذا الإجراء' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'المفتاح السري غير موجود' });
    }

    try {
        const { mimeType, data } = req.body;

        // 🚀 الاتصال الصحيح بموديل جيميني
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "أنت خبير صيانة إلكترونيات محترف في منصة Maged Tech. حلل الصورة المرفقة (بوردة، شاشة، مكون) تقنياً، حدد العطل (شورت، رطوبة، كسر، تفحم)، وقدم خطوات صيانة دقيقة بأسلوب مهني ومباشر." },
                        { inlineData: { mimeType: mimeType, data: data } }
                    ]
                }]
            })
        });

        const result = await response.json();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
