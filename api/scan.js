export default async function handler(req, res) {
    // 🌐 إعدادات الاتصال للسماح للموقع بالتواصل مع السيرفر
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

    try {
        const { mimeType, data } = req.body;
        
        // 🛠️ استخدام الموديل المتوافق مع الإصدارات الحالية
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
