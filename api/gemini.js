export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    try {
        const userRequest = req.body;
        
        let hasImage = false;
        if (userRequest.contents && userRequest.contents[0] && userRequest.contents[0].parts) {
            hasImage = userRequest.contents[0].parts.some(part => part.inline_data);
        }

        if (hasImage) {
            userRequest.contents[0].parts.unshift({
                text: `أنت الآن في وضع "الفحص البصري الدقيق" كخبير صيانة هواتف. 
                حلل الصورة بدقة متناهية، ابحث عن آثار حرق، أكسدة، أو اقرأ أي أرقام ظاهرة (مثل IMEI) بوضوح تام وبدون تأليف.`
            }); 
        }

        // غيرنا الموديل للـ flash لحل مشكلة الضغط
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userRequest)
        });

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: "Failed to fetch response." });
    }
}
