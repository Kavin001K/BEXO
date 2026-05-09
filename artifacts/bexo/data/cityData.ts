/** Curated list of ~500 major world cities for offline location autocomplete. */
export interface CityEntry {
  city: string;
  country: string;
}

export const CITIES: CityEntry[] = [
  // India
  { city: "Mumbai", country: "India" },
  { city: "Delhi", country: "India" },
  { city: "Bangalore", country: "India" },
  { city: "Hyderabad", country: "India" },
  { city: "Ahmedabad", country: "India" },
  { city: "Chennai", country: "India" },
  { city: "Kolkata", country: "India" },
  { city: "Pune", country: "India" },
  { city: "Jaipur", country: "India" },
  { city: "Lucknow", country: "India" },
  { city: "Coimbatore", country: "India" },
  { city: "Kochi", country: "India" },
  { city: "Indore", country: "India" },
  { city: "Chandigarh", country: "India" },
  { city: "Surat", country: "India" },
  { city: "Nagpur", country: "India" },
  { city: "Bhopal", country: "India" },
  { city: "Visakhapatnam", country: "India" },
  { city: "Thiruvananthapuram", country: "India" },
  { city: "Guwahati", country: "India" },
  { city: "Mysuru", country: "India" },
  { city: "Madurai", country: "India" },
  { city: "Mangalore", country: "India" },
  { city: "Vadodara", country: "India" },
  { city: "Noida", country: "India" },
  { city: "Gurgaon", country: "India" },
  { city: "Patna", country: "India" },
  { city: "Ranchi", country: "India" },
  { city: "Dehradun", country: "India" },
  { city: "Amritsar", country: "India" },
  { city: "Varanasi", country: "India" },
  { city: "Tiruchirappalli", country: "India" },
  { city: "Salem", country: "India" },
  { city: "Erode", country: "India" },
  { city: "Tirunelveli", country: "India" },
  { city: "Vellore", country: "India" },
  // United States
  { city: "New York", country: "United States" },
  { city: "Los Angeles", country: "United States" },
  { city: "Chicago", country: "United States" },
  { city: "Houston", country: "United States" },
  { city: "Phoenix", country: "United States" },
  { city: "Philadelphia", country: "United States" },
  { city: "San Antonio", country: "United States" },
  { city: "San Diego", country: "United States" },
  { city: "Dallas", country: "United States" },
  { city: "San Jose", country: "United States" },
  { city: "Austin", country: "United States" },
  { city: "Jacksonville", country: "United States" },
  { city: "San Francisco", country: "United States" },
  { city: "Seattle", country: "United States" },
  { city: "Denver", country: "United States" },
  { city: "Washington", country: "United States" },
  { city: "Nashville", country: "United States" },
  { city: "Boston", country: "United States" },
  { city: "Portland", country: "United States" },
  { city: "Las Vegas", country: "United States" },
  { city: "Atlanta", country: "United States" },
  { city: "Miami", country: "United States" },
  { city: "Minneapolis", country: "United States" },
  { city: "Charlotte", country: "United States" },
  { city: "Raleigh", country: "United States" },
  { city: "Salt Lake City", country: "United States" },
  { city: "Pittsburgh", country: "United States" },
  { city: "Cincinnati", country: "United States" },
  { city: "Detroit", country: "United States" },
  // United Kingdom
  { city: "London", country: "United Kingdom" },
  { city: "Manchester", country: "United Kingdom" },
  { city: "Birmingham", country: "United Kingdom" },
  { city: "Leeds", country: "United Kingdom" },
  { city: "Glasgow", country: "United Kingdom" },
  { city: "Edinburgh", country: "United Kingdom" },
  { city: "Liverpool", country: "United Kingdom" },
  { city: "Bristol", country: "United Kingdom" },
  { city: "Sheffield", country: "United Kingdom" },
  { city: "Cardiff", country: "United Kingdom" },
  { city: "Belfast", country: "United Kingdom" },
  { city: "Cambridge", country: "United Kingdom" },
  { city: "Oxford", country: "United Kingdom" },
  { city: "Nottingham", country: "United Kingdom" },
  // Canada
  { city: "Toronto", country: "Canada" },
  { city: "Vancouver", country: "Canada" },
  { city: "Montreal", country: "Canada" },
  { city: "Calgary", country: "Canada" },
  { city: "Ottawa", country: "Canada" },
  { city: "Edmonton", country: "Canada" },
  { city: "Winnipeg", country: "Canada" },
  { city: "Quebec City", country: "Canada" },
  { city: "Halifax", country: "Canada" },
  // Australia
  { city: "Sydney", country: "Australia" },
  { city: "Melbourne", country: "Australia" },
  { city: "Brisbane", country: "Australia" },
  { city: "Perth", country: "Australia" },
  { city: "Adelaide", country: "Australia" },
  { city: "Canberra", country: "Australia" },
  { city: "Gold Coast", country: "Australia" },
  // Germany
  { city: "Berlin", country: "Germany" },
  { city: "Munich", country: "Germany" },
  { city: "Hamburg", country: "Germany" },
  { city: "Frankfurt", country: "Germany" },
  { city: "Cologne", country: "Germany" },
  { city: "Stuttgart", country: "Germany" },
  { city: "Düsseldorf", country: "Germany" },
  { city: "Leipzig", country: "Germany" },
  // France
  { city: "Paris", country: "France" },
  { city: "Lyon", country: "France" },
  { city: "Marseille", country: "France" },
  { city: "Toulouse", country: "France" },
  { city: "Nice", country: "France" },
  { city: "Bordeaux", country: "France" },
  { city: "Strasbourg", country: "France" },
  // Japan
  { city: "Tokyo", country: "Japan" },
  { city: "Osaka", country: "Japan" },
  { city: "Yokohama", country: "Japan" },
  { city: "Nagoya", country: "Japan" },
  { city: "Sapporo", country: "Japan" },
  { city: "Fukuoka", country: "Japan" },
  { city: "Kyoto", country: "Japan" },
  { city: "Kobe", country: "Japan" },
  // China
  { city: "Shanghai", country: "China" },
  { city: "Beijing", country: "China" },
  { city: "Shenzhen", country: "China" },
  { city: "Guangzhou", country: "China" },
  { city: "Chengdu", country: "China" },
  { city: "Hangzhou", country: "China" },
  { city: "Wuhan", country: "China" },
  { city: "Nanjing", country: "China" },
  { city: "Xi'an", country: "China" },
  { city: "Chongqing", country: "China" },
  // South Korea
  { city: "Seoul", country: "South Korea" },
  { city: "Busan", country: "South Korea" },
  { city: "Incheon", country: "South Korea" },
  { city: "Daegu", country: "South Korea" },
  // Singapore
  { city: "Singapore", country: "Singapore" },
  // UAE
  { city: "Dubai", country: "UAE" },
  { city: "Abu Dhabi", country: "UAE" },
  { city: "Sharjah", country: "UAE" },
  // Saudi Arabia
  { city: "Riyadh", country: "Saudi Arabia" },
  { city: "Jeddah", country: "Saudi Arabia" },
  { city: "Dammam", country: "Saudi Arabia" },
  { city: "Mecca", country: "Saudi Arabia" },
  // Brazil
  { city: "São Paulo", country: "Brazil" },
  { city: "Rio de Janeiro", country: "Brazil" },
  { city: "Brasília", country: "Brazil" },
  { city: "Salvador", country: "Brazil" },
  { city: "Curitiba", country: "Brazil" },
  { city: "Belo Horizonte", country: "Brazil" },
  // Mexico
  { city: "Mexico City", country: "Mexico" },
  { city: "Guadalajara", country: "Mexico" },
  { city: "Monterrey", country: "Mexico" },
  { city: "Puebla", country: "Mexico" },
  // Russia
  { city: "Moscow", country: "Russia" },
  { city: "Saint Petersburg", country: "Russia" },
  { city: "Novosibirsk", country: "Russia" },
  // Italy
  { city: "Rome", country: "Italy" },
  { city: "Milan", country: "Italy" },
  { city: "Naples", country: "Italy" },
  { city: "Turin", country: "Italy" },
  { city: "Florence", country: "Italy" },
  { city: "Bologna", country: "Italy" },
  // Spain
  { city: "Madrid", country: "Spain" },
  { city: "Barcelona", country: "Spain" },
  { city: "Valencia", country: "Spain" },
  { city: "Seville", country: "Spain" },
  { city: "Málaga", country: "Spain" },
  { city: "Bilbao", country: "Spain" },
  // Netherlands
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Rotterdam", country: "Netherlands" },
  { city: "The Hague", country: "Netherlands" },
  { city: "Utrecht", country: "Netherlands" },
  { city: "Eindhoven", country: "Netherlands" },
  // Sweden
  { city: "Stockholm", country: "Sweden" },
  { city: "Gothenburg", country: "Sweden" },
  { city: "Malmö", country: "Sweden" },
  // Norway
  { city: "Oslo", country: "Norway" },
  { city: "Bergen", country: "Norway" },
  // Denmark
  { city: "Copenhagen", country: "Denmark" },
  { city: "Aarhus", country: "Denmark" },
  // Finland
  { city: "Helsinki", country: "Finland" },
  { city: "Espoo", country: "Finland" },
  // Switzerland
  { city: "Zurich", country: "Switzerland" },
  { city: "Geneva", country: "Switzerland" },
  { city: "Bern", country: "Switzerland" },
  { city: "Basel", country: "Switzerland" },
  // Austria
  { city: "Vienna", country: "Austria" },
  { city: "Salzburg", country: "Austria" },
  { city: "Graz", country: "Austria" },
  // Belgium
  { city: "Brussels", country: "Belgium" },
  { city: "Antwerp", country: "Belgium" },
  // Poland
  { city: "Warsaw", country: "Poland" },
  { city: "Kraków", country: "Poland" },
  { city: "Wrocław", country: "Poland" },
  { city: "Gdańsk", country: "Poland" },
  // Czech Republic
  { city: "Prague", country: "Czech Republic" },
  { city: "Brno", country: "Czech Republic" },
  // Ireland
  { city: "Dublin", country: "Ireland" },
  { city: "Cork", country: "Ireland" },
  { city: "Galway", country: "Ireland" },
  // Portugal
  { city: "Lisbon", country: "Portugal" },
  { city: "Porto", country: "Portugal" },
  // Greece
  { city: "Athens", country: "Greece" },
  { city: "Thessaloniki", country: "Greece" },
  // Turkey
  { city: "Istanbul", country: "Turkey" },
  { city: "Ankara", country: "Turkey" },
  { city: "Izmir", country: "Turkey" },
  // Israel
  { city: "Tel Aviv", country: "Israel" },
  { city: "Jerusalem", country: "Israel" },
  { city: "Haifa", country: "Israel" },
  // South Africa
  { city: "Johannesburg", country: "South Africa" },
  { city: "Cape Town", country: "South Africa" },
  { city: "Durban", country: "South Africa" },
  { city: "Pretoria", country: "South Africa" },
  // Nigeria
  { city: "Lagos", country: "Nigeria" },
  { city: "Abuja", country: "Nigeria" },
  { city: "Kano", country: "Nigeria" },
  // Kenya
  { city: "Nairobi", country: "Kenya" },
  { city: "Mombasa", country: "Kenya" },
  // Egypt
  { city: "Cairo", country: "Egypt" },
  { city: "Alexandria", country: "Egypt" },
  // Indonesia
  { city: "Jakarta", country: "Indonesia" },
  { city: "Surabaya", country: "Indonesia" },
  { city: "Bandung", country: "Indonesia" },
  { city: "Bali", country: "Indonesia" },
  // Malaysia
  { city: "Kuala Lumpur", country: "Malaysia" },
  { city: "Penang", country: "Malaysia" },
  { city: "Johor Bahru", country: "Malaysia" },
  // Thailand
  { city: "Bangkok", country: "Thailand" },
  { city: "Chiang Mai", country: "Thailand" },
  { city: "Pattaya", country: "Thailand" },
  // Vietnam
  { city: "Ho Chi Minh City", country: "Vietnam" },
  { city: "Hanoi", country: "Vietnam" },
  { city: "Da Nang", country: "Vietnam" },
  // Philippines
  { city: "Manila", country: "Philippines" },
  { city: "Cebu", country: "Philippines" },
  { city: "Davao", country: "Philippines" },
  // Pakistan
  { city: "Karachi", country: "Pakistan" },
  { city: "Lahore", country: "Pakistan" },
  { city: "Islamabad", country: "Pakistan" },
  { city: "Rawalpindi", country: "Pakistan" },
  // Bangladesh
  { city: "Dhaka", country: "Bangladesh" },
  { city: "Chittagong", country: "Bangladesh" },
  // Sri Lanka
  { city: "Colombo", country: "Sri Lanka" },
  { city: "Kandy", country: "Sri Lanka" },
  // Nepal
  { city: "Kathmandu", country: "Nepal" },
  { city: "Pokhara", country: "Nepal" },
  // New Zealand
  { city: "Auckland", country: "New Zealand" },
  { city: "Wellington", country: "New Zealand" },
  { city: "Christchurch", country: "New Zealand" },
  // Argentina
  { city: "Buenos Aires", country: "Argentina" },
  { city: "Córdoba", country: "Argentina" },
  { city: "Rosario", country: "Argentina" },
  // Chile
  { city: "Santiago", country: "Chile" },
  { city: "Valparaíso", country: "Chile" },
  // Colombia
  { city: "Bogotá", country: "Colombia" },
  { city: "Medellín", country: "Colombia" },
  { city: "Cali", country: "Colombia" },
  // Peru
  { city: "Lima", country: "Peru" },
  { city: "Cusco", country: "Peru" },
  // Romania
  { city: "Bucharest", country: "Romania" },
  { city: "Cluj-Napoca", country: "Romania" },
  // Hungary
  { city: "Budapest", country: "Hungary" },
  // Ukraine
  { city: "Kyiv", country: "Ukraine" },
  { city: "Lviv", country: "Ukraine" },
  // Croatia
  { city: "Zagreb", country: "Croatia" },
  // Bulgaria
  { city: "Sofia", country: "Bulgaria" },
  // Serbia
  { city: "Belgrade", country: "Serbia" },
  // Morocco
  { city: "Casablanca", country: "Morocco" },
  { city: "Marrakesh", country: "Morocco" },
  // Qatar
  { city: "Doha", country: "Qatar" },
  // Bahrain
  { city: "Manama", country: "Bahrain" },
  // Kuwait
  { city: "Kuwait City", country: "Kuwait" },
  // Oman
  { city: "Muscat", country: "Oman" },
  // Taiwan
  { city: "Taipei", country: "Taiwan" },
  { city: "Kaohsiung", country: "Taiwan" },
  // Hong Kong
  { city: "Hong Kong", country: "Hong Kong" },
  // Remote
  { city: "Remote", country: "Worldwide" },
];
