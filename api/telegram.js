export default async function handler(req, res) {
    // 1. التعامل مع طلبات CORS (السماح للموقع وتلجرام بالتواصل مع السيرفر)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // أو رابط موقعك
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // الرد على طلبات الـ OPTIONS (جزء من عملية CORS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. التحقق من مفتاح API لجوجل
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "Missing Gemini API Key in server environment variables." });
    }

    try {
        const userRequest = req.body;
        
        // 3. إضافة "حقنة الذكاء البصري"
        // نتحقق إذا كان الطلب بيحتوي على صورة (inline_data)
        let hasImage = false;
        if (userRequest.contents && userRequest.contents[0] && userRequest.contents[0].parts) {
            hasImage = userRequest.contents[0].parts.some(part => part.inline_data);
        }

        // إذا في صورة، نضيف تعليمات صارمة ليحلل كمهندس
        if (hasImage) {
            const visionPrompt = {
                text: `أنت الآن في وضع "الفحص البصري الدقيق" كخبير صيانة هواتف. 
                أمامك صورة للوحة أم (Board) أو قطعة هاتف. 
                حلل الصورة بدقة متناهية: 
                - ابحث عن آثار حرق، أكسدة (ماء)، أو مكونات مفقودة.
                - اقرأ أي أرقام ظاهرة (مثل أرقام الآي سي، الباركود، أو السيريال).
                - أعطِ الفني ملاحظات محددة عن المنطقة الظاهرة في الصورة، ولا تخمن معلومات غير موجودة.`
            };
            userRequest.contents[0].parts.unshift(visionPrompt); 
        }

        // 4. إعداد رابط API لجوجل (استخدمنا pro-latest لأنه الأذكى بالصور)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

        // 5. إرسال الطلب إلى جوجل
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userRequest)
        });

        const data = await response.json();

        // 6. إرسال الرد من جوجل مرة أخرى إلى موقعك أو تلجرام
        res.status(200).json(data);

    } catch (error) {
        console.error("Error communicating with Gemini API:", error);
        res.status(500).json({ error: "Failed to fetch response from Gemini AI." });
    }
}
