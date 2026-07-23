// 全球主要城市真太陽時誤差資料庫 (單位：分鐘)
// 格式支援多國語言架構：中文 (English)
// 運算原理：(該城市經度 - 其所在標準時區中央經度) * 4 分鐘
// 註：正值代表太陽升起較早（手錶要加上此分鐘數），負值代表太陽升起較晚（手錶要扣除此分鐘數）

const locationsData = {
  "阿根廷 (Argentina)": [
    { "name": "布宜諾斯艾利斯 (Buenos Aires)", "offset": -54 },
    { "name": "科爾多瓦 (Cordoba)", "offset": -77 },
    { "name": "門多薩 (Mendoza)", "offset": -95 },
    { "name": "羅薩里奧 (Rosario)", "offset": -63 }
  ],
  "澳洲 (Australia)": [
    { "name": "阿德雷德 (Adelaide)", "offset": -16 },
    { "name": "布里斯本 (Brisbane)", "offset": 12 },
    { "name": "坎培拉 (Canberra)", "offset": -3 },
    { "name": "達爾文 (Darwin)", "offset": -47 },
    { "name": "黃金海岸 (Gold Coast)", "offset": 14 },
    { "name": "荷巴特 (Hobart)", "offset": -11 },
    { "name": "墨爾本 (Melbourne)", "offset": -20 },
    { "name": "伯斯 (Perth)", "offset": -17 },
    { "name": "雪梨 (Sydney)", "offset": 5 }
  ],
  "奧地利 (Austria)": [
    { "name": "薩爾斯堡 (Salzburg)", "offset": -8 },
    { "name": "維也納 (Vienna)", "offset": 5 }
  ],
  "巴林 (Bahrain)": [
    { "name": "麥納瑪 (Manama)", "offset": 22 }
  ],
  "孟加拉 (Bangladesh)": [
    { "name": "吉大港 (Chittagong)", "offset": 7 },
    { "name": "達卡 (Dhaka)", "offset": 2 }
  ],
  "比利時 (Belgium)": [
    { "name": "安特衛普 (Antwerp)", "offset": -42 },
    { "name": "布魯塞爾 (Brussels)", "offset": -43 },
    { "name": "根特 (Ghent)", "offset": -45 }
  ],
  "玻利維亞 (Bolivia)": [
    { "name": "拉巴斯 (La Paz)", "offset": -32 }
  ],
  "巴西 (Brazil)": [
    { "name": "巴西利亞 (Brasilia)", "offset": -12 },
    { "name": "庫里奇巴 (Curitiba)", "offset": -17 },
    { "name": "福塔雷薩 (Fortaleza)", "offset": 26 },
    { "name": "瑪瑙斯 (Manaus)", "offset": 0 },
    { "name": "里約熱內盧 (Rio de Janeiro)", "offset": 7 },
    { "name": "薩爾瓦多 (Salvador)", "offset": 26 },
    { "name": "聖保羅 (Sao Paulo)", "offset": -7 }
  ],
  "柬埔寨 (Cambodia)": [
    { "name": "金邊 (Phnom Penh)", "offset": -1 }
  ],
  "加拿大 (Canada)": [
    { "name": "布蘭普頓 (Brampton)", "offset": -19 },
    { "name": "本拿比 (Burnaby)", "offset": -12 },
    { "name": "卡加利 (Calgary)", "offset": -36 },
    { "name": "愛德蒙頓 (Edmonton)", "offset": -34 },
    { "name": "哈利法克斯 (Halifax)", "offset": -14 },
    { "name": "漢密爾頓 (Hamilton)", "offset": -19 },
    { "name": "基隆拿 (Kelowna)", "offset": 2 },
    { "name": "基奇納 (Kitchener)", "offset": -22 },
    { "name": "拉瓦勒 (Laval)", "offset": 5 },
    { "name": "倫敦 (London, ON)", "offset": -25 },
    { "name": "萬錦 (Markham)", "offset": -17 },
    { "name": "密西沙加 (Mississauga)", "offset": -18 },
    { "name": "蒙特婁 (Montreal)", "offset": 6 },
    { "name": "奧克維爾 (Oakville)", "offset": -19 },
    { "name": "渥太華 (Ottawa)", "offset": -3 },
    { "name": "魁北克市 (Quebec City)", "offset": 15 },
    { "name": "雷吉納 (Regina)", "offset": -58 },
    { "name": "列治文 (Richmond)", "offset": -13 },
    { "name": "列治文山 (Richmond Hill)", "offset": -18 },
    { "name": "薩斯卡通 (Saskatoon)", "offset": -67 },
    { "name": "聖約翰斯 (St. John's)", "offset": -1 },
    { "name": "素里 (Surrey)", "offset": -11 },
    { "name": "多倫多 (Toronto)", "offset": -18 },
    { "name": "旺市 (Vaughan)", "offset": -18 },
    { "name": "溫哥華 (Vancouver)", "offset": -12 },
    { "name": "維多利亞 (Victoria)", "offset": -13 },
    { "name": "滑鐵盧 (Waterloo)", "offset": -22 },
    { "name": "白馬市 (Whitehorse)", "offset": -120 },
    { "name": "溫莎 (Windsor)", "offset": -32 },
    { "name": "溫尼伯 (Winnipeg)", "offset": -29 },
    { "name": "黃刀鎮 (Yellowknife)", "offset": -37 }
  ],
  "智利 (Chile)": [
    { "name": "聖地牙哥 (Santiago)", "offset": -43 },
    { "name": "瓦爾帕萊索 (Valparaiso)", "offset": -47 }
  ],
  "中國 (China)": [
    { "name": "北京 (Beijing)", "offset": -14 },
    { "name": "長春 (Changchun)", "offset": 21 },
    { "name": "長沙 (Changsha)", "offset": -28 },
    { "name": "成都 (Chengdu)", "offset": -64 },
    { "name": "重慶 (Chongqing)", "offset": -54 },
    { "name": "大連 (Dalian)", "offset": 6 },
    { "name": "東莞 (Dongguan)", "offset": -25 },
    { "name": "福州 (Fuzhou)", "offset": -3 },
    { "name": "廣州 (Guangzhou)", "offset": -27 },
    { "name": "貴陽 (Guiyang)", "offset": -53 },
    { "name": "杭州 (Hangzhou)", "offset": 1 },
    { "name": "哈爾濱 (Harbin)", "offset": 26 },
    { "name": "合肥 (Hefei)", "offset": -11 },
    { "name": "香港 (Hong Kong)", "offset": -23 },
    { "name": "濟南 (Jinan)", "offset": -12 },
    { "name": "昆明 (Kunming)", "offset": -69 },
    { "name": "蘭州 (Lanzhou)", "offset": -65 },
    { "name": "澳門 (Macau)", "offset": -26 },
    { "name": "南昌 (Nanchang)", "offset": -16 },
    { "name": "南京 (Nanjing)", "offset": -5 },
    { "name": "南寧 (Nanning)", "offset": -46 },
    { "name": "青島 (Qingdao)", "offset": 2 },
    { "name": "上海 (Shanghai)", "offset": 6 },
    { "name": "瀋陽 (Shenyang)", "offset": 14 },
    { "name": "深圳 (Shenzhen)", "offset": -24 },
    { "name": "石家莊 (Shijiazhuang)", "offset": -22 },
    { "name": "蘇州 (Suzhou)", "offset": 2 },
    { "name": "天津 (Tianjin)", "offset": -11 },
    { "name": "烏魯木齊 (Urumqi)", "offset": -130 },
    { "name": "武漢 (Wuhan)", "offset": -23 },
    { "name": "西安 (Xi'an)", "offset": -44 },
    { "name": "廈門 (Xiamen)", "offset": -8 },
    { "name": "鄭州 (Zhengzhou)", "offset": -25 }
  ],
  "哥倫比亞 (Colombia)": [
    { "name": "波哥大 (Bogota)", "offset": 4 },
    { "name": "麥德林 (Medellin)", "offset": -2 }
  ],
  "捷克 (Czech Republic)": [
    { "name": "布爾諾 (Brno)", "offset": 6 },
    { "name": "布拉格 (Prague)", "offset": -2 }
  ],
  "丹麥 (Denmark)": [
    { "name": "奧胡斯 (Aarhus)", "offset": -19 },
    { "name": "哥本哈根 (Copenhagen)", "offset": -10 }
  ],
  "厄瓜多 (Ecuador)": [
    { "name": "瓜亞基爾 (Guayaquil)", "offset": -19 },
    { "name": "基多 (Quito)", "offset": -14 }
  ],
  "埃及 (Egypt)": [
    { "name": "亞歷山大港 (Alexandria)", "offset": 0 },
    { "name": "開羅 (Cairo)", "offset": 5 }
  ],
  "芬蘭 (Finland)": [
    { "name": "赫爾辛基 (Helsinki)", "offset": -20 }
  ],
  "法國 (France)": [
    { "name": "波爾多 (Bordeaux)", "offset": -62 },
    { "name": "里爾 (Lille)", "offset": -48 },
    { "name": "里昂 (Lyon)", "offset": -41 },
    { "name": "馬賽 (Marseille)", "offset": -39 },
    { "name": "尼斯 (Nice)", "offset": -31 },
    { "name": "巴黎 (Paris)", "offset": -51 },
    { "name": "史特拉斯堡 (Strasbourg)", "offset": -29 },
    { "name": "土魯斯 (Toulouse)", "offset": -54 }
  ],
  "德國 (Germany)": [
    { "name": "柏林 (Berlin)", "offset": -6 },
    { "name": "科隆 (Cologne)", "offset": -32 },
    { "name": "杜塞道夫 (Dusseldorf)", "offset": -33 },
    { "name": "法蘭克福 (Frankfurt)", "offset": -25 },
    { "name": "漢堡 (Hamburg)", "offset": -20 },
    { "name": "萊比錫 (Leipzig)", "offset": -11 },
    { "name": "慕尼黑 (Munich)", "offset": -14 },
    { "name": "斯圖加特 (Stuttgart)", "offset": -23 }
  ],
  "希臘 (Greece)": [
    { "name": "雅典 (Athens)", "offset": -25 },
    { "name": "塞薩洛尼基 (Thessaloniki)", "offset": -28 }
  ],
  "匈牙利 (Hungary)": [
    { "name": "布達佩斯 (Budapest)", "offset": 16 }
  ],
  "印度 (India)": [
    { "name": "阿美達巴德 (Ahmedabad)", "offset": -40 },
    { "name": "邦加羅爾 (Bangalore)", "offset": -20 },
    { "name": "清奈 (Chennai)", "offset": -9 },
    { "name": "新德里 (Delhi)", "offset": -21 },
    { "name": "海得拉巴 (Hyderabad)", "offset": -16 },
    { "name": "齋浦爾 (Jaipur)", "offset": -27 },
    { "name": "加爾各答 (Kolkata)", "offset": 23 },
    { "name": "孟買 (Mumbai)", "offset": -38 },
    { "name": "浦那 (Pune)", "offset": -35 },
    { "name": "蘇拉特 (Surat)", "offset": -39 }
  ],
  "印尼 (Indonesia)": [
    { "name": "萬隆 (Bandung)", "offset": 10 },
    { "name": "峇里島 (Denpasar/Bali)", "offset": -19 },
    { "name": "雅加達 (Jakarta)", "offset": 7 },
    { "name": "棉蘭 (Medan)", "offset": -25 },
    { "name": "泗水 (Surabaya)", "offset": 31 }
  ],
  "愛爾蘭 (Ireland)": [
    { "name": "科克 (Cork)", "offset": -34 },
    { "name": "都柏林 (Dublin)", "offset": -25 }
  ],
  "以色列 (Israel)": [
    { "name": "耶路撒冷 (Jerusalem)", "offset": 21 },
    { "name": "特拉維夫 (Tel Aviv)", "offset": 19 }
  ],
  "義大利 (Italy)": [
    { "name": "波隆那 (Bologna)", "offset": -15 },
    { "name": "佛羅倫斯 (Florence)", "offset": -15 },
    { "name": "米蘭 (Milan)", "offset": -23 },
    { "name": "拿坡里 (Naples)", "offset": -3 },
    { "name": "羅馬 (Rome)", "offset": -10 },
    { "name": "杜林 (Turin)", "offset": -29 },
    { "name": "威尼斯 (Venice)", "offset": -11 }
  ],
  "日本 (Japan)": [
    { "name": "福岡 (Fukuoka)", "offset": -18 },
    { "name": "廣島 (Hiroshima)", "offset": -10 },
    { "name": "神戶 (Kobe)", "offset": 1 },
    { "name": "京都 (Kyoto)", "offset": 3 },
    { "name": "名古屋 (Nagoya)", "offset": 8 },
    { "name": "沖繩/那霸 (Naha/Okinawa)", "offset": -29 },
    { "name": "大阪 (Osaka)", "offset": 2 },
    { "name": "札幌 (Sapporo)", "offset": 25 },
    { "name": "仙台 (Sendai)", "offset": 23 },
    { "name": "東京 (Tokyo)", "offset": 19 },
    { "name": "橫濱 (Yokohama)", "offset": 19 }
  ],
  "肯亞 (Kenya)": [
    { "name": "蒙巴薩 (Mombasa)", "offset": -21 },
    { "name": "奈洛比 (Nairobi)", "offset": -33 }
  ],
  "科威特 (Kuwait)": [
    { "name": "科威特城 (Kuwait City)", "offset": 12 }
  ],
  "馬來西亞 (Malaysia)": [
    { "name": "喬治市 (George Town)", "offset": -79 },
    { "name": "怡保 (Ipoh)", "offset": -76 },
    { "name": "新山 (Johor Bahru)", "offset": -65 },
    { "name": "吉隆坡 (Kuala Lumpur)", "offset": -73 },
    { "name": "古晉 (Kuching)", "offset": -39 },
    { "name": "馬六甲 (Malacca)", "offset": -71 },
    { "name": "檳城 (Penang)", "offset": -79 }
  ],
  "墨西哥 (Mexico)": [
    { "name": "坎昆 (Cancun)", "offset": -47 },
    { "name": "瓜達拉哈拉 (Guadalajara)", "offset": -53 },
    { "name": "墨西哥城 (Mexico City)", "offset": -37 },
    { "name": "蒙特雷 (Monterrey)", "offset": -41 },
    { "name": "蒂華納 (Tijuana)", "offset": 12 }
  ],
  "緬甸 (Myanmar)": [
    { "name": "仰光 (Yangon)", "offset": -5 }
  ],
  "荷蘭 (Netherlands)": [
    { "name": "阿姆斯特丹 (Amsterdam)", "offset": -40 },
    { "name": "恩荷芬 (Eindhoven)", "offset": -38 },
    { "name": "鹿特丹 (Rotterdam)", "offset": -42 },
    { "name": "海牙 (The Hague)", "offset": -43 }
  ],
  "紐西蘭 (New Zealand)": [
    { "name": "奧克蘭 (Auckland)", "offset": -21 },
    { "name": "基督城 (Christchurch)", "offset": -29 },
    { "name": "但尼丁 (Dunedin)", "offset": -38 },
    { "name": "漢密爾頓 (Hamilton)", "offset": -19 },
    { "name": "威靈頓 (Wellington)", "offset": -21 }
  ],
  "奈及利亞 (Nigeria)": [
    { "name": "阿布加 (Abuja)", "offset": -30 },
    { "name": "拉哥斯 (Lagos)", "offset": -46 }
  ],
  "挪威 (Norway)": [
    { "name": "卑爾根 (Bergen)", "offset": -39 },
    { "name": "奧斯陸 (Oslo)", "offset": -17 }
  ],
  "阿曼 (Oman)": [
    { "name": "馬斯喀特 (Muscat)", "offset": -6 }
  ],
  "巴基斯坦 (Pakistan)": [
    { "name": "伊斯蘭瑪巴德 (Islamabad)", "offset": -8 },
    { "name": "喀拉蚩 (Karachi)", "offset": -32 },
    { "name": "拉合爾 (Lahore)", "offset": -3 }
  ],
  "巴拉圭 (Paraguay)": [
    { "name": "亞松森 (Asuncion)", "offset": 9 }
  ],
  "秘魯 (Peru)": [
    { "name": "庫斯科 (Cusco)", "offset": 12 },
    { "name": "利馬 (Lima)", "offset": -8 }
  ],
  "菲律賓 (Philippines)": [
    { "name": "安吉利斯 (Angeles City)", "offset": 2 },
    { "name": "碧瑤 (Baguio)", "offset": 2 },
    { "name": "宿霧 (Cebu)", "offset": 16 },
    { "name": "納卯 (Davao)", "offset": 22 },
    { "name": "伊洛伊洛 (Iloilo)", "offset": 10 },
    { "name": "馬尼拉 (Manila)", "offset": 4 },
    { "name": "奎松市 (Quezon City)", "offset": 4 }
  ],
  "波蘭 (Poland)": [
    { "name": "克拉科夫 (Krakow)", "offset": 20 },
    { "name": "華沙 (Warsaw)", "offset": 24 },
    { "name": "弗羅茨瓦夫 (Wroclaw)", "offset": 8 }
  ],
  "葡萄牙 (Portugal)": [
    { "name": "里斯本 (Lisbon)", "offset": -37 },
    { "name": "波多 (Porto)", "offset": -34 }
  ],
  "卡達 (Qatar)": [
    { "name": "杜哈 (Doha)", "offset": 26 }
  ],
  "羅馬尼亞 (Romania)": [
    { "name": "布加勒斯特 (Bucharest)", "offset": -15 }
  ],
  "俄羅斯 (Russia)": [
    { "name": "莫斯科 (Moscow)", "offset": -30 },
    { "name": "新西伯利亞 (Novosibirsk)", "offset": -88 },
    { "name": "聖彼得堡 (St. Petersburg)", "offset": -59 }
  ],
  "沙烏地阿拉伯 (Saudi Arabia)": [
    { "name": "達曼 (Dammam)", "offset": 20 },
    { "name": "吉達 (Jeddah)", "offset": -23 },
    { "name": "麥加 (Mecca)", "offset": -21 },
    { "name": "利雅德 (Riyadh)", "offset": 7 }
  ],
  "塞爾維亞 (Serbia)": [
    { "name": "貝爾格勒 (Belgrade)", "offset": 21 }
  ],
  "新加坡 (Singapore)": [
    { "name": "新加坡 (Singapore)", "offset": -65 }
  ],
  "南非 (South Africa)": [
    { "name": "開普敦 (Cape Town)", "offset": -46 },
    { "name": "德班 (Durban)", "offset": 4 },
    { "name": "約翰尼斯堡 (Johannesburg)", "offset": -8 },
    { "name": "普利托利亞 (Pretoria)", "offset": -7 }
  ],
  "韓國 (South Korea)": [
    { "name": "釜山 (Busan)", "offset": -24 },
    { "name": "大邱 (Daegu)", "offset": -26 },
    { "name": "大田 (Daejeon)", "offset": -30 },
    { "name": "光州 (Gwangju)", "offset": -33 },
    { "name": "仁川 (Incheon)", "offset": -33 },
    { "name": "首爾 (Seoul)", "offset": -32 }
  ],
  "西班牙 (Spain)": [
    { "name": "巴塞隆納 (Barcelona)", "offset": -51 },
    { "name": "馬德里 (Madrid)", "offset": -75 },
    { "name": "塞維利亞 (Seville)", "offset": -84 },
    { "name": "瓦倫西亞 (Valencia)", "offset": -62 }
  ],
  "斯里蘭卡 (Sri Lanka)": [
    { "name": "可倫坡 (Colombo)", "offset": -11 }
  ],
  "瑞典 (Sweden)": [
    { "name": "哥德堡 (Gothenburg)", "offset": -12 },
    { "name": "斯德哥爾摩 (Stockholm)", "offset": 12 }
  ],
  "瑞士 (Switzerland)": [
    { "name": "巴塞爾 (Basel)", "offset": -30 },
    { "name": "日內瓦 (Geneva)", "offset": -35 },
    { "name": "蘇黎世 (Zurich)", "offset": -26 }
  ],
  "台灣 (Taiwan)": [
    { "name": "嘉義 (Chiayi)", "offset": 2 },
    { "name": "新竹 (Hsinchu)", "offset": 4 },
    { "name": "花蓮 (Hualien)", "offset": 6 },
    { "name": "高雄 (Kaohsiung)", "offset": 1 },
    { "name": "基隆 (Keelung)", "offset": 7 },
    { "name": "新北 (New Taipei)", "offset": 6 },
    { "name": "屏東 (Pingtung)", "offset": 2 },
    { "name": "台中 (Taichung)", "offset": 3 },
    { "name": "台南 (Tainan)", "offset": 1 },
    { "name": "台北 (Taipei)", "offset": 6 },
    { "name": "台東 (Taitung)", "offset": 4 },
    { "name": "桃園 (Taoyuan)", "offset": 5 }
  ],
  "泰國 (Thailand)": [
    { "name": "曼谷 (Bangkok)", "offset": -18 },
    { "name": "清邁 (Chiang Mai)", "offset": -24 },
    { "name": "芭達雅 (Pattaya)", "offset": -16 },
    { "name": "普吉島 (Phuket)", "offset": -26 }
  ],
  "土耳其 (Turkey)": [
    { "name": "安卡拉 (Ankara)", "offset": -49 },
    { "name": "伊斯坦堡 (Istanbul)", "offset": -64 },
    { "name": "伊茲密爾 (Izmir)", "offset": -71 }
  ],
  "阿拉伯聯合大公國 (United Arab Emirates)": [
    { "name": "阿布達比 (Abu Dhabi)", "offset": -23 },
    { "name": "杜拜 (Dubai)", "offset": -19 },
    { "name": "沙迦 (Sharjah)", "offset": -18 }
  ],
  "英國 (United Kingdom)": [
    { "name": "貝爾法斯特 (Belfast)", "offset": -24 },
    { "name": "伯明罕 (Birmingham)", "offset": -8 },
    { "name": "布里斯托 (Bristol)", "offset": -10 },
    { "name": "卡地夫 (Cardiff)", "offset": -13 },
    { "name": "愛丁堡 (Edinburgh)", "offset": -13 },
    { "name": "格拉斯哥 (Glasgow)", "offset": -17 },
    { "name": "里茲 (Leeds)", "offset": -6 },
    { "name": "利物浦 (Liverpool)", "offset": -12 },
    { "name": "倫敦 (London)", "offset": -1 },
    { "name": "曼徹斯特 (Manchester)", "offset": -9 }
  ],
  "美國 (United States)": [
    { "name": "亞特蘭大 (Atlanta)", "offset": -38 },
    { "name": "奧斯汀 (Austin)", "offset": -31 },
    { "name": "波士頓 (Boston)", "offset": 16 },
    { "name": "夏洛特 (Charlotte)", "offset": -23 },
    { "name": "芝加哥 (Chicago)", "offset": 9 },
    { "name": "辛辛那提 (Cincinnati)", "offset": -38 },
    { "name": "克里夫蘭 (Cleveland)", "offset": -26 },
    { "name": "哥倫布 (Columbus)", "offset": -32 },
    { "name": "達拉斯 (Dallas)", "offset": -27 },
    { "name": "丹佛 (Denver)", "offset": 0 },
    { "name": "底特律 (Detroit)", "offset": -32 },
    { "name": "檀香山 (Honolulu)", "offset": -31 },
    { "name": "休士頓 (Houston)", "offset": -21 },
    { "name": "印第安納波利斯 (Indianapolis)", "offset": -44 },
    { "name": "堪薩斯城 (Kansas City)", "offset": -18 },
    { "name": "拉斯維加斯 (Las Vegas)", "offset": 19 },
    { "name": "洛杉磯 (Los Angeles)", "offset": 7 },
    { "name": "邁阿密 (Miami)", "offset": -21 },
    { "name": "明尼亞波利斯 (Minneapolis)", "offset": -13 },
    { "name": "紐奧良 (New Orleans)", "offset": 0 },
    { "name": "紐約 (New York)", "offset": 4 },
    { "name": "奧蘭多 (Orlando)", "offset": -26 },
    { "name": "費城 (Philadelphia)", "offset": -1 },
    { "name": "鳳凰城 (Phoenix)", "offset": -28 },
    { "name": "波特蘭 (Portland)", "offset": -11 },
    { "name": "沙加緬度 (Sacramento)", "offset": -6 },
    { "name": "鹽湖城 (Salt Lake City)", "offset": -27 },
    { "name": "聖安東尼奧 (San Antonio)", "offset": -34 },
    { "name": "聖地牙哥 (San Diego)", "offset": 11 },
    { "name": "舊金山 (San Francisco)", "offset": -10 },
    { "name": "聖荷西 (San Jose)", "offset": -8 },
    { "name": "西雅圖 (Seattle)", "offset": -9 },
    { "name": "聖路易斯 (St. Louis)", "offset": -1 },
    { "name": "華盛頓特區 (Washington D.C.)", "offset": -8 }
  ],
  "烏拉圭 (Uruguay)": [
    { "name": "蒙特維多 (Montevideo)", "offset": -44 }
  ],
  "委內瑞拉 (Venezuela)": [
    { "name": "卡拉卡斯 (Caracas)", "offset": -27 }
  ],
  "越南 (Vietnam)": [
    { "name": "芹苴 (Can Tho)", "offset": 3 },
    { "name": "峴港 (Da Nang)", "offset": 13 },
    { "name": "海防 (Hai Phong)", "offset": 7 },
    { "name": "河內 (Hanoi)", "offset": 3 },
    { "name": "胡志明市 (Ho Chi Minh City)", "offset": 7 }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = locationsData;
}