async function testRAG() {
    console.log("🚀 正在發送問題給 AI 命理大腦，請稍候...\n");
    
    try {
        const response = await fetch('http://localhost:3000/api/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // 這裡可以換成任何您想問命理古籍的問題
            body: JSON.stringify({ 
                question: "根據《滴天髓》或《三命通會》的理論，如果八字『日主太弱』應該要怎麼辦？" 
            })
        });

        const data = await response.json();
        
        if (data.success) {
            console.log("=========================================");
            console.log("🔮 大師的回答：\n");
            console.log(data.reply);
            console.log("=========================================");
        } else {
            console.error("⚠️ 伺服器回報錯誤：", data.error);
        }
    } catch (error) {
        console.error("❌ 連線失敗：", error);
    }
}

testRAG();