// 全球主要城市真太陽時誤差資料庫 (單位：分鐘)
// 運算原理：(該城市經度 - 其所在標準時區中央經度) * 4 分鐘
// 正值代表太陽升起較早（手錶要加上此分鐘數），負值代表太陽升起較晚（手錶要扣除此分鐘數）

const locationsData = {
  "Argentina": [
    { "name": "Buenos Aires", "offset": -54 },
    { "name": "Cordoba", "offset": -77 },
    { "name": "Mendoza", "offset": -95 },
    { "name": "Rosario", "offset": -63 }
  ],
  "Australia": [
    { "name": "Adelaide", "offset": -16 },
    { "name": "Brisbane", "offset": 12 },
    { "name": "Canberra", "offset": -3 },
    { "name": "Darwin", "offset": -47 },
    { "name": "Gold Coast", "offset": 14 },
    { "name": "Hobart", "offset": -11 },
    { "name": "Melbourne", "offset": -20 },
    { "name": "Perth", "offset": -17 },
    { "name": "Sydney", "offset": 5 }
  ],
  "Austria": [
    { "name": "Salzburg", "offset": -8 },
    { "name": "Vienna", "offset": 5 }
  ],
  "Bangladesh": [
    { "name": "Chittagong", "offset": 7 },
    { "name": "Dhaka", "offset": 2 }
  ],
  "Belgium": [
    { "name": "Antwerp", "offset": -42 },
    { "name": "Brussels", "offset": -43 }
  ],
  "Brazil": [
    { "name": "Brasilia", "offset": -12 },
    { "name": "Curitiba", "offset": -17 },
    { "name": "Fortaleza", "offset": 26 },
    { "name": "Manaus", "offset": 0 },
    { "name": "Rio de Janeiro", "offset": 7 },
    { "name": "Salvador", "offset": 26 },
    { "name": "Sao Paulo", "offset": -7 }
  ],
  "Canada": [
    { "name": "Calgary", "offset": -36 },
    { "name": "Edmonton", "offset": -34 },
    { "name": "Halifax", "offset": -14 },
    { "name": "Kelowna", "offset": 2 },
    { "name": "Markham", "offset": -17 },
    { "name": "Montreal", "offset": 6 },
    { "name": "Ottawa", "offset": -3 },
    { "name": "Quebec City", "offset": 15 },
    { "name": "Regina", "offset": -58 },
    { "name": "Richmond", "offset": -13 },
    { "name": "Richmond Hill", "offset": -18 },
    { "name": "Saskatoon", "offset": -67 },
    { "name": "St. John's", "offset": -1 },
    { "name": "Toronto", "offset": -18 },
    { "name": "Vancouver", "offset": -12 },
    { "name": "Victoria", "offset": -13 },
    { "name": "Whitehorse", "offset": -120 },
    { "name": "Winnipeg", "offset": -29 },
    { "name": "Yellowknife", "offset": -37 }
  ],
  "Chile": [
    { "name": "Santiago", "offset": -43 },
    { "name": "Valparaiso", "offset": -47 }
  ],
  "China": [
    { "name": "Beijing", "offset": -14 },
    { "name": "Changsha", "offset": -28 },
    { "name": "Chengdu", "offset": -64 },
    { "name": "Chongqing", "offset": -54 },
    { "name": "Dalian", "offset": 6 },
    { "name": "Dongguan", "offset": -25 },
    { "name": "Fuzhou", "offset": -3 },
    { "name": "Guangzhou", "offset": -27 },
    { "name": "Hangzhou", "offset": 1 },
    { "name": "Harbin", "offset": 26 },
    { "name": "Hong Kong", "offset": -23 },
    { "name": "Jinan", "offset": -12 },
    { "name": "Kunming", "offset": -69 },
    { "name": "Macau", "offset": -26 },
    { "name": "Nanjing", "offset": -5 },
    { "name": "Qingdao", "offset": 2 },
    { "name": "Shanghai", "offset": 6 },
    { "name": "Shenyang", "offset": 14 },
    { "name": "Shenzhen", "offset": -24 },
    { "name": "Suzhou", "offset": 2 },
    { "name": "Tianjin", "offset": -11 },
    { "name": "Urumqi", "offset": -130 },
    { "name": "Wuhan", "offset": -23 },
    { "name": "Xi'an", "offset": -44 },
    { "name": "Xiamen", "offset": -8 }
  ],
  "Colombia": [
    { "name": "Bogota", "offset": 4 },
    { "name": "Medellin", "offset": -2 }
  ],
  "Czech Republic": [
    { "name": "Brno", "offset": 6 },
    { "name": "Prague", "offset": -2 }
  ],
  "Denmark": [
    { "name": "Aarhus", "offset": -19 },
    { "name": "Copenhagen", "offset": -10 }
  ],
  "Egypt": [
    { "name": "Alexandria", "offset": 0 },
    { "name": "Cairo", "offset": 5 }
  ],
  "Finland": [
    { "name": "Helsinki", "offset": -20 }
  ],
  "France": [
    { "name": "Bordeaux", "offset": -62 },
    { "name": "Lille", "offset": -48 },
    { "name": "Lyon", "offset": -41 },
    { "name": "Marseille", "offset": -39 },
    { "name": "Nice", "offset": -31 },
    { "name": "Paris", "offset": -51 },
    { "name": "Strasbourg", "offset": -29 },
    { "name": "Toulouse", "offset": -54 }
  ],
  "Germany": [
    { "name": "Berlin", "offset": -6 },
    { "name": "Cologne", "offset": -32 },
    { "name": "Dusseldorf", "offset": -33 },
    { "name": "Frankfurt", "offset": -25 },
    { "name": "Hamburg", "offset": -20 },
    { "name": "Leipzig", "offset": -11 },
    { "name": "Munich", "offset": -14 },
    { "name": "Stuttgart", "offset": -23 }
  ],
  "Greece": [
    { "name": "Athens", "offset": -25 },
    { "name": "Thessaloniki", "offset": -28 }
  ],
  "India": [
    { "name": "Ahmedabad", "offset": -40 },
    { "name": "Bangalore", "offset": -20 },
    { "name": "Chennai", "offset": -9 },
    { "name": "Delhi", "offset": -21 },
    { "name": "Hyderabad", "offset": -16 },
    { "name": "Jaipur", "offset": -27 },
    { "name": "Kolkata", "offset": 23 },
    { "name": "Mumbai", "offset": -38 },
    { "name": "Pune", "offset": -35 },
    { "name": "Surat", "offset": -39 }
  ],
  "Indonesia": [
    { "name": "Bandung", "offset": 10 },
    { "name": "Denpasar (Bali)", "offset": -19 },
    { "name": "Jakarta", "offset": 7 },
    { "name": "Medan", "offset": -25 },
    { "name": "Surabaya", "offset": 31 }
  ],
  "Ireland": [
    { "name": "Cork", "offset": -34 },
    { "name": "Dublin", "offset": -25 }
  ],
  "Israel": [
    { "name": "Jerusalem", "offset": 21 },
    { "name": "Tel Aviv", "offset": 19 }
  ],
  "Italy": [
    { "name": "Bologna", "offset": -15 },
    { "name": "Florence", "offset": -15 },
    { "name": "Milan", "offset": -23 },
    { "name": "Naples", "offset": -3 },
    { "name": "Rome", "offset": -10 },
    { "name": "Turin", "offset": -29 },
    { "name": "Venice", "offset": -11 }
  ],
  "Japan": [
    { "name": "Fukuoka", "offset": -18 },
    { "name": "Hiroshima", "offset": -10 },
    { "name": "Kobe", "offset": 1 },
    { "name": "Kyoto", "offset": 3 },
    { "name": "Nagoya", "offset": 8 },
    { "name": "Naha (Okinawa)", "offset": -29 },
    { "name": "Osaka", "offset": 2 },
    { "name": "Sapporo", "offset": 25 },
    { "name": "Sendai", "offset": 23 },
    { "name": "Tokyo", "offset": 19 },
    { "name": "Yokohama", "offset": 19 }
  ],
  "Kenya": [
    { "name": "Mombasa", "offset": -21 },
    { "name": "Nairobi", "offset": -33 }
  ],
  "Malaysia": [
    { "name": "George Town", "offset": -79 },
    { "name": "Ipoh", "offset": -76 },
    { "name": "Johor Bahru", "offset": -65 },
    { "name": "Kuala Lumpur", "offset": -73 },
    { "name": "Kuching", "offset": -39 },
    { "name": "Malacca", "offset": -71 },
    { "name": "Penang", "offset": -79 }
  ],
  "Mexico": [
    { "name": "Cancun", "offset": -47 },
    { "name": "Guadalajara", "offset": -53 },
    { "name": "Mexico City", "offset": -37 },
    { "name": "Monterrey", "offset": -41 },
    { "name": "Tijuana", "offset": 12 }
  ],
  "Netherlands": [
    { "name": "Amsterdam", "offset": -40 },
    { "name": "Eindhoven", "offset": -38 },
    { "name": "Rotterdam", "offset": -42 },
    { "name": "The Hague", "offset": -43 }
  ],
  "New Zealand": [
    { "name": "Auckland", "offset": -21 },
    { "name": "Christchurch", "offset": -29 },
    { "name": "Dunedin", "offset": -38 },
    { "name": "Hamilton", "offset": -19 },
    { "name": "Wellington", "offset": -21 }
  ],
  "Nigeria": [
    { "name": "Abuja", "offset": -30 },
    { "name": "Lagos", "offset": -46 }
  ],
  "Norway": [
    { "name": "Bergen", "offset": -39 },
    { "name": "Oslo", "offset": -17 }
  ],
  "Pakistan": [
    { "name": "Islamabad", "offset": -8 },
    { "name": "Karachi", "offset": -32 },
    { "name": "Lahore", "offset": -3 }
  ],
  "Peru": [
    { "name": "Cusco", "offset": 12 },
    { "name": "Lima", "offset": -8 }
  ],
  "Philippines": [
    { "name": "Angeles City", "offset": 2 },
    { "name": "Baguio", "offset": 2 },
    { "name": "Cebu", "offset": 16 },
    { "name": "Davao", "offset": 22 },
    { "name": "Iloilo", "offset": 10 },
    { "name": "Manila", "offset": 4 },
    { "name": "Quezon City", "offset": 4 }
  ],
  "Poland": [
    { "name": "Krakow", "offset": 20 },
    { "name": "Warsaw", "offset": 24 },
    { "name": "Wroclaw", "offset": 8 }
  ],
  "Portugal": [
    { "name": "Lisbon", "offset": -37 },
    { "name": "Porto", "offset": -34 }
  ],
  "Russia": [
    { "name": "Moscow", "offset": -30 },
    { "name": "Novosibirsk", "offset": -88 },
    { "name": "St. Petersburg", "offset": -59 }
  ],
  "Saudi Arabia": [
    { "name": "Jeddah", "offset": -23 },
    { "name": "Mecca", "offset": -21 },
    { "name": "Riyadh", "offset": 7 }
  ],
  "Singapore": [
    { "name": "Singapore", "offset": -65 }
  ],
  "South Africa": [
    { "name": "Cape Town", "offset": -46 },
    { "name": "Durban", "offset": 4 },
    { "name": "Johannesburg", "offset": -8 },
    { "name": "Pretoria", "offset": -7 }
  ],
  "South Korea": [
    { "name": "Busan", "offset": -24 },
    { "name": "Daegu", "offset": -26 },
    { "name": "Daejeon", "offset": -30 },
    { "name": "Gwangju", "offset": -33 },
    { "name": "Incheon", "offset": -33 },
    { "name": "Seoul", "offset": -32 }
  ],
  "Spain": [
    { "name": "Barcelona", "offset": -51 },
    { "name": "Madrid", "offset": -75 },
    { "name": "Seville", "offset": -84 },
    { "name": "Valencia", "offset": -62 }
  ],
  "Sweden": [
    { "name": "Gothenburg", "offset": -12 },
    { "name": "Stockholm", "offset": 12 }
  ],
  "Switzerland": [
    { "name": "Basel", "offset": -30 },
    { "name": "Geneva", "offset": -35 },
    { "name": "Zurich", "offset": -26 }
  ],
  "Taiwan": [
    { "name": "Chiayi", "offset": 2 },
    { "name": "Hsinchu", "offset": 4 },
    { "name": "Hualien", "offset": 6 },
    { "name": "Kaohsiung", "offset": 1 },
    { "name": "Keelung", "offset": 7 },
    { "name": "New Taipei", "offset": 6 },
    { "name": "Pingtung", "offset": 2 },
    { "name": "Taichung", "offset": 3 },
    { "name": "Tainan", "offset": 1 },
    { "name": "Taipei", "offset": 6 },
    { "name": "Taitung", "offset": 4 },
    { "name": "Taoyuan", "offset": 5 }
  ],
  "Thailand": [
    { "name": "Bangkok", "offset": -18 },
    { "name": "Chiang Mai", "offset": -24 },
    { "name": "Pattaya", "offset": -16 },
    { "name": "Phuket", "offset": -26 }
  ],
  "Turkey": [
    { "name": "Ankara", "offset": -49 },
    { "name": "Istanbul", "offset": -64 },
    { "name": "Izmir", "offset": -71 }
  ],
  "United Arab Emirates": [
    { "name": "Abu Dhabi", "offset": -23 },
    { "name": "Dubai", "offset": -19 },
    { "name": "Sharjah", "offset": -18 }
  ],
  "United Kingdom": [
    { "name": "Belfast", "offset": -24 },
    { "name": "Birmingham", "offset": -8 },
    { "name": "Bristol", "offset": -10 },
    { "name": "Cardiff", "offset": -13 },
    { "name": "Edinburgh", "offset": -13 },
    { "name": "Glasgow", "offset": -17 },
    { "name": "Leeds", "offset": -6 },
    { "name": "Liverpool", "offset": -12 },
    { "name": "London", "offset": -1 },
    { "name": "Manchester", "offset": -9 }
  ],
  "United States": [
    { "name": "Atlanta", "offset": -38 },
    { "name": "Austin", "offset": -31 },
    { "name": "Boston", "offset": 16 },
    { "name": "Charlotte", "offset": -23 },
    { "name": "Chicago", "offset": 9 },
    { "name": "Dallas", "offset": -27 },
    { "name": "Denver", "offset": 0 },
    { "name": "Detroit", "offset": -32 },
    { "name": "Honolulu", "offset": -31 },
    { "name": "Houston", "offset": -21 },
    { "name": "Las Vegas", "offset": 19 },
    { "name": "Los Angeles", "offset": 7 },
    { "name": "Miami", "offset": -21 },
    { "name": "Minneapolis", "offset": -13 },
    { "name": "New York", "offset": 4 },
    { "name": "Orlando", "offset": -26 },
    { "name": "Philadelphia", "offset": -1 },
    { "name": "Phoenix", "offset": -28 },
    { "name": "Portland", "offset": -11 },
    { "name": "San Antonio", "offset": -34 },
    { "name": "San Diego", "offset": 11 },
    { "name": "San Francisco", "offset": -10 },
    { "name": "San Jose", "offset": -8 },
    { "name": "Seattle", "offset": -9 },
    { "name": "Washington D.C.", "offset": -8 }
  ],
  "Vietnam": [
    { "name": "Can Tho", "offset": 3 },
    { "name": "Da Nang", "offset": 13 },
    { "name": "Hai Phong", "offset": 7 },
    { "name": "Hanoi", "offset": 3 },
    { "name": "Ho Chi Minh City", "offset": 7 }
  ]
};

// 支援 Node.js 後端 (ragService) 與瀏覽器前端 (index.html) 共用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = locationsData;
}