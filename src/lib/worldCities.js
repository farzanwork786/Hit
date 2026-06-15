// Offline fallback list of world cities & towns (1,000+) used for location
// autocomplete when no Google Places API key is configured. Intentionally
// includes many smaller towns/suburbs so demo mode finds "unpopular" places.
// Format: "City, Region/Country".

const RAW_WORLD_CITIES = [
  // --- United States (major + many smaller towns/suburbs) ---
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
  'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
  'Boston, MA', 'El Paso, TX', 'Nashville, TN', 'Detroit, MI', 'Oklahoma City, OK',
  'Portland, OR', 'Las Vegas, NV', 'Memphis, TN', 'Louisville, KY', 'Baltimore, MD',
  'Milwaukee, WI', 'Albuquerque, NM', 'Tucson, AZ', 'Fresno, CA', 'Sacramento, CA',
  'Kansas City, MO', 'Mesa, AZ', 'Atlanta, GA', 'Omaha, NE', 'Colorado Springs, CO',
  'Raleigh, NC', 'Long Beach, CA', 'Virginia Beach, VA', 'Miami, FL', 'Oakland, CA',
  'Minneapolis, MN', 'Tulsa, OK', 'Bakersfield, CA', 'Wichita, KS', 'Arlington, TX',
  'Aurora, CO', 'Tampa, FL', 'New Orleans, LA', 'Cleveland, OH', 'Honolulu, HI',
  'Anaheim, CA', 'Lexington, KY', 'Stockton, CA', 'Corpus Christi, TX', 'Henderson, NV',
  'Riverside, CA', 'Newark, NJ', 'Saint Paul, MN', 'Santa Ana, CA', 'Cincinnati, OH',
  'Irvine, CA', 'Orlando, FL', 'Pittsburgh, PA', 'St. Louis, MO', 'Greensboro, NC',
  'Jersey City, NJ', 'Anchorage, AK', 'Lincoln, NE', 'Plano, TX', 'Durham, NC',
  'Buffalo, NY', 'Chandler, AZ', 'Chula Vista, CA', 'Toledo, OH', 'Madison, WI',
  'Gilbert, AZ', 'Reno, NV', 'Fort Wayne, IN', 'North Las Vegas, NV', 'St. Petersburg, FL',
  'Lubbock, TX', 'Irving, TX', 'Laredo, TX', 'Winston-Salem, NC', 'Chesapeake, VA',
  'Glendale, AZ', 'Garland, TX', 'Scottsdale, AZ', 'Norfolk, VA', 'Boise, ID',
  'Fremont, CA', 'Spokane, WA', 'Santa Clarita, CA', 'Baton Rouge, LA', 'Richmond, VA',
  'Hialeah, FL', 'San Bernardino, CA', 'Tacoma, WA', 'Modesto, CA', 'Huntsville, AL',
  'Des Moines, IA', 'Yonkers, NY', 'Rochester, NY', 'Moreno Valley, CA', 'Fayetteville, NC',
  'Fontana, CA', 'Columbus, GA', 'Worcester, MA', 'Port St. Lucie, FL', 'Little Rock, AR',
  'Augusta, GA', 'Oxnard, CA', 'Birmingham, AL', 'Montgomery, AL', 'Frisco, TX',
  'Amarillo, TX', 'Salt Lake City, UT', 'Grand Rapids, MI', 'Huntington Beach, CA', 'Overland Park, KS',
  'Glendale, CA', 'Tallahassee, FL', 'Grand Prairie, TX', 'McKinney, TX', 'Cape Coral, FL',
  'Sioux Falls, SD', 'Peoria, AZ', 'Providence, RI', 'Vancouver, WA', 'Knoxville, TN',
  'Fort Lauderdale, FL', 'Chattanooga, TN', 'Brownsville, TX', 'Newport News, VA', 'Santa Rosa, CA',
  'Round Rock, TX', 'Cedar Park, TX', 'Pflugerville, TX', 'Georgetown, TX', 'Leander, TX',
  'Kyle, TX', 'San Marcos, TX', 'Buda, TX', 'Lakeway, TX', 'Bee Cave, TX',
  'Dripping Springs, TX', 'Tempe, AZ', 'Surprise, AZ', 'Goodyear, AZ', 'Flagstaff, AZ',
  'Sedona, AZ', 'Boulder, CO', 'Fort Collins, CO', 'Aspen, CO', 'Telluride, CO',
  'Berkeley, CA', 'Palo Alto, CA', 'Mountain View, CA', 'Santa Monica, CA', 'Pasadena, CA',
  'Santa Barbara, CA', 'Napa, CA', 'Carmel-by-the-Sea, CA', 'Ann Arbor, MI', 'Savannah, GA',
  'Asheville, NC', 'Charleston, SC', 'Myrtle Beach, SC', 'Greenville, SC', 'Columbia, SC',
  'Bend, OR', 'Eugene, OR', 'Salem, OR', 'Bellevue, WA', 'Olympia, WA',
  'Boca Raton, FL', 'Naples, FL', 'Sarasota, FL', 'Key West, FL', 'Gainesville, FL',
  'Pensacola, FL', 'Clearwater, FL', 'Ann Arbor, MI', 'Burlington, VT', 'Portland, ME',
  'Bangor, ME', 'Manchester, NH', 'Cambridge, MA', 'Salem, MA', 'Provincetown, MA',
  'Hartford, CT', 'New Haven, CT', 'Stamford, CT', 'Princeton, NJ', 'Hoboken, NJ',
  'Albany, NY', 'Syracuse, NY', 'Ithaca, NY', 'Saratoga Springs, NY', 'Bozeman, MT',
  'Missoula, MT', 'Billings, MT', 'Jackson, WY', 'Cheyenne, WY', 'Coeur d\'Alene, ID',
  'Park City, UT', 'Provo, UT', 'Ogden, UT', 'Moab, UT', 'Santa Fe, NM',
  'Taos, NM', 'Las Cruces, NM', 'Fargo, ND', 'Bismarck, ND', 'Rapid City, SD',
  'Cedar Rapids, IA', 'Iowa City, IA', 'Ames, IA', 'Lawrence, KS', 'Topeka, KS',
  'Springfield, MO', 'Columbia, MO', 'Branson, MO', 'Bentonville, AR', 'Fayetteville, AR',
  'Hot Springs, AR', 'Lafayette, LA', 'Shreveport, LA', 'Biloxi, MS', 'Jackson, MS',
  'Oxford, MS', 'Tuscaloosa, AL', 'Mobile, AL', 'Gulf Shores, AL', 'Athens, GA',
  'Macon, GA', 'Marietta, GA', 'Alpharetta, GA', 'Decatur, GA', 'Clarksville, TN',
  'Franklin, TN', 'Murfreesboro, TN', 'Gatlinburg, TN', 'Bowling Green, KY', 'Lexington, KY',
  'Dayton, OH', 'Akron, OH', 'Columbus, OH', 'Toledo, OH', 'Youngstown, OH',
  'Fort Mitchell, KY', 'Carmel, IN', 'Bloomington, IN', 'South Bend, IN', 'Evansville, IN',
  'Naperville, IL', 'Evanston, IL', 'Springfield, IL', 'Peoria, IL', 'Rockford, IL',
  'Green Bay, WI', 'Appleton, WI', 'Eau Claire, WI', 'Kenosha, WI', 'Duluth, MN',
  'Rochester, MN', 'St. Cloud, MN', 'Bloomington, MN', 'Eden Prairie, MN', 'Sioux City, IA',

  // --- Canada ---
  'Toronto, ON', 'Montreal, QC', 'Vancouver, BC', 'Calgary, AB', 'Edmonton, AB',
  'Ottawa, ON', 'Winnipeg, MB', 'Quebec City, QC', 'Hamilton, ON', 'Kitchener, ON',
  'London, ON', 'Victoria, BC', 'Halifax, NS', 'Saskatoon, SK', 'Regina, SK',
  'St. John\'s, NL', 'Kelowna, BC', 'Barrie, ON', 'Guelph, ON', 'Kingston, ON',
  'Burnaby, BC', 'Richmond, BC', 'Surrey, BC', 'Mississauga, ON', 'Brampton, ON',
  'Markham, ON', 'Laval, QC', 'Gatineau, QC', 'Whistler, BC', 'Banff, AB',

  // --- Mexico, Central & South America ---
  'Mexico City, Mexico', 'Guadalajara, Mexico', 'Monterrey, Mexico', 'Cancun, Mexico', 'Tijuana, Mexico',
  'Puebla, Mexico', 'Mérida, Mexico', 'Querétaro, Mexico', 'Oaxaca, Mexico', 'Playa del Carmen, Mexico',
  'San Miguel de Allende, Mexico', 'Guatemala City, Guatemala', 'San Salvador, El Salvador', 'Tegucigalpa, Honduras', 'Managua, Nicaragua',
  'San José, Costa Rica', 'Panama City, Panama', 'Bogotá, Colombia', 'Medellín, Colombia', 'Cali, Colombia',
  'Cartagena, Colombia', 'Caracas, Venezuela', 'Quito, Ecuador', 'Guayaquil, Ecuador', 'Lima, Peru',
  'Cusco, Peru', 'Arequipa, Peru', 'La Paz, Bolivia', 'Santa Cruz, Bolivia', 'Santiago, Chile',
  'Valparaíso, Chile', 'Buenos Aires, Argentina', 'Córdoba, Argentina', 'Mendoza, Argentina', 'Rosario, Argentina',
  'Montevideo, Uruguay', 'Asunción, Paraguay', 'São Paulo, Brazil', 'Rio de Janeiro, Brazil', 'Brasília, Brazil',
  'Salvador, Brazil', 'Fortaleza, Brazil', 'Belo Horizonte, Brazil', 'Curitiba, Brazil', 'Porto Alegre, Brazil',
  'Recife, Brazil', 'Florianópolis, Brazil', 'Manaus, Brazil', 'Havana, Cuba', 'Santo Domingo, Dominican Republic',
  'San Juan, Puerto Rico', 'Kingston, Jamaica', 'Nassau, Bahamas', 'Bridgetown, Barbados', 'Port of Spain, Trinidad and Tobago',

  // --- United Kingdom & Ireland ---
  'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Leeds, UK', 'Glasgow, UK',
  'Edinburgh, UK', 'Liverpool, UK', 'Bristol, UK', 'Sheffield, UK', 'Newcastle, UK',
  'Nottingham, UK', 'Cardiff, UK', 'Belfast, UK', 'Brighton, UK', 'Oxford, UK',
  'Cambridge, UK', 'York, UK', 'Bath, UK', 'Aberdeen, UK', 'Inverness, UK',
  'Dublin, Ireland', 'Cork, Ireland', 'Galway, Ireland', 'Limerick, Ireland', 'Belfast, UK',

  // --- Western & Central Europe ---
  'Paris, France', 'Marseille, France', 'Lyon, France', 'Toulouse, France', 'Nice, France',
  'Nantes, France', 'Bordeaux, France', 'Lille, France', 'Strasbourg, France', 'Cannes, France',
  'Madrid, Spain', 'Barcelona, Spain', 'Valencia, Spain', 'Seville, Spain', 'Málaga, Spain',
  'Bilbao, Spain', 'Granada, Spain', 'Palma, Spain', 'San Sebastián, Spain', 'Lisbon, Portugal',
  'Porto, Portugal', 'Faro, Portugal', 'Funchal, Portugal', 'Rome, Italy', 'Milan, Italy',
  'Naples, Italy', 'Turin, Italy', 'Florence, Italy', 'Venice, Italy', 'Bologna, Italy',
  'Palermo, Italy', 'Verona, Italy', 'Berlin, Germany', 'Hamburg, Germany', 'Munich, Germany',
  'Cologne, Germany', 'Frankfurt, Germany', 'Stuttgart, Germany', 'Düsseldorf, Germany', 'Dortmund, Germany',
  'Leipzig, Germany', 'Dresden, Germany', 'Nuremberg, Germany', 'Amsterdam, Netherlands', 'Rotterdam, Netherlands',
  'The Hague, Netherlands', 'Utrecht, Netherlands', 'Eindhoven, Netherlands', 'Brussels, Belgium', 'Antwerp, Belgium',
  'Ghent, Belgium', 'Bruges, Belgium', 'Zurich, Switzerland', 'Geneva, Switzerland', 'Bern, Switzerland',
  'Basel, Switzerland', 'Lausanne, Switzerland', 'Lucerne, Switzerland', 'Vienna, Austria', 'Salzburg, Austria',
  'Innsbruck, Austria', 'Graz, Austria', 'Luxembourg City, Luxembourg', 'Monaco, Monaco',

  // --- Nordics ---
  'Stockholm, Sweden', 'Gothenburg, Sweden', 'Malmö, Sweden', 'Oslo, Norway', 'Bergen, Norway',
  'Trondheim, Norway', 'Copenhagen, Denmark', 'Aarhus, Denmark', 'Helsinki, Finland', 'Tampere, Finland',
  'Reykjavik, Iceland',

  // --- Eastern & Southern Europe ---
  'Warsaw, Poland', 'Kraków, Poland', 'Gdańsk, Poland', 'Wrocław, Poland', 'Poznań, Poland',
  'Prague, Czech Republic', 'Brno, Czech Republic', 'Bratislava, Slovakia', 'Budapest, Hungary', 'Bucharest, Romania',
  'Cluj-Napoca, Romania', 'Sofia, Bulgaria', 'Belgrade, Serbia', 'Zagreb, Croatia', 'Split, Croatia',
  'Dubrovnik, Croatia', 'Ljubljana, Slovenia', 'Sarajevo, Bosnia and Herzegovina', 'Skopje, North Macedonia', 'Tirana, Albania',
  'Athens, Greece', 'Thessaloniki, Greece', 'Heraklion, Greece', 'Istanbul, Turkey', 'Ankara, Turkey',
  'Izmir, Turkey', 'Antalya, Turkey', 'Kyiv, Ukraine', 'Lviv, Ukraine', 'Odesa, Ukraine',
  'Moscow, Russia', 'Saint Petersburg, Russia', 'Vilnius, Lithuania', 'Riga, Latvia', 'Tallinn, Estonia',
  'Valletta, Malta', 'Nicosia, Cyprus',

  // --- Middle East ---
  'Dubai, UAE', 'Abu Dhabi, UAE', 'Sharjah, UAE', 'Doha, Qatar', 'Riyadh, Saudi Arabia',
  'Jeddah, Saudi Arabia', 'Manama, Bahrain', 'Kuwait City, Kuwait', 'Muscat, Oman', 'Amman, Jordan',
  'Beirut, Lebanon', 'Tel Aviv, Israel', 'Jerusalem, Israel', 'Haifa, Israel', 'Baghdad, Iraq',
  'Tehran, Iran',

  // --- Africa ---
  'Cairo, Egypt', 'Alexandria, Egypt', 'Casablanca, Morocco', 'Marrakech, Morocco', 'Rabat, Morocco',
  'Tunis, Tunisia', 'Algiers, Algeria', 'Lagos, Nigeria', 'Abuja, Nigeria', 'Accra, Ghana',
  'Nairobi, Kenya', 'Mombasa, Kenya', 'Addis Ababa, Ethiopia', 'Dar es Salaam, Tanzania', 'Kampala, Uganda',
  'Kigali, Rwanda', 'Dakar, Senegal', 'Abidjan, Ivory Coast', 'Johannesburg, South Africa', 'Cape Town, South Africa',
  'Durban, South Africa', 'Pretoria, South Africa', 'Port Elizabeth, South Africa', 'Windhoek, Namibia', 'Gaborone, Botswana',
  'Harare, Zimbabwe', 'Lusaka, Zambia', 'Maputo, Mozambique', 'Luanda, Angola', 'Port Louis, Mauritius',

  // --- South Asia ---
  'Mumbai, India', 'Delhi, India', 'Bengaluru, India', 'Hyderabad, India', 'Chennai, India',
  'Kolkata, India', 'Pune, India', 'Ahmedabad, India', 'Jaipur, India', 'Surat, India',
  'Lucknow, India', 'Kochi, India', 'Goa, India', 'Chandigarh, India', 'Karachi, Pakistan',
  'Lahore, Pakistan', 'Islamabad, Pakistan', 'Dhaka, Bangladesh', 'Chittagong, Bangladesh', 'Colombo, Sri Lanka',
  'Kathmandu, Nepal', 'Thimphu, Bhutan', 'Malé, Maldives',

  // --- East & Southeast Asia ---
  'Tokyo, Japan', 'Osaka, Japan', 'Kyoto, Japan', 'Yokohama, Japan', 'Nagoya, Japan',
  'Sapporo, Japan', 'Fukuoka, Japan', 'Seoul, South Korea', 'Busan, South Korea', 'Incheon, South Korea',
  'Beijing, China', 'Shanghai, China', 'Guangzhou, China', 'Shenzhen, China', 'Chengdu, China',
  'Hangzhou, China', 'Xi\'an, China', 'Hong Kong', 'Macau', 'Taipei, Taiwan',
  'Kaohsiung, Taiwan', 'Bangkok, Thailand', 'Chiang Mai, Thailand', 'Phuket, Thailand', 'Singapore',
  'Kuala Lumpur, Malaysia', 'Penang, Malaysia', 'Jakarta, Indonesia', 'Bali, Indonesia', 'Surabaya, Indonesia',
  'Manila, Philippines', 'Cebu, Philippines', 'Hanoi, Vietnam', 'Ho Chi Minh City, Vietnam', 'Da Nang, Vietnam',
  'Phnom Penh, Cambodia', 'Vientiane, Laos', 'Yangon, Myanmar', 'Ulaanbaatar, Mongolia',

  // --- Oceania ---
  'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia', 'Perth, Australia', 'Adelaide, Australia',
  'Gold Coast, Australia', 'Canberra, Australia', 'Hobart, Australia', 'Darwin, Australia', 'Cairns, Australia',
  'Auckland, New Zealand', 'Wellington, New Zealand', 'Christchurch, New Zealand', 'Queenstown, New Zealand', 'Suva, Fiji',

  // --- Additional US towns & suburbs (breadth for smaller places) ---
  'Cary, NC', 'Apex, NC', 'Wake Forest, NC', 'Chapel Hill, NC', 'Wilmington, NC',
  'Concord, NC', 'Huntersville, NC', 'Matthews, NC', 'Mooresville, NC', 'Hickory, NC',
  'Sugar Land, TX', 'The Woodlands, TX', 'Katy, TX', 'Pearland, TX', 'League City, TX',
  'Conroe, TX', 'New Braunfels, TX', 'Waco, TX', 'College Station, TX', 'Tyler, TX',
  'Denton, TX', 'Allen, TX', 'Richardson, TX', 'Carrollton, TX', 'Lewisville, TX',
  'Flower Mound, TX', 'Mansfield, TX', 'Cedar Hill, TX', 'Rockwall, TX', 'Wylie, TX',
  'Naperville, IL', 'Aurora, IL', 'Joliet, IL', 'Elgin, IL', 'Schaumburg, IL',
  'Bolingbrook, IL', 'Arlington Heights, IL', 'Oak Park, IL', 'Skokie, IL', 'Cicero, IL',
  'Pomona, CA', 'Escondido, CA', 'Sunnyvale, CA', 'Torrance, CA', 'Fullerton, CA',
  'Orange, CA', 'Thousand Oaks, CA', 'Visalia, CA', 'Roseville, CA', 'Concord, CA',
  'Santa Clara, CA', 'Vallejo, CA', 'Victorville, CA', 'El Monte, CA', 'Berkeley, CA',
  'Downey, CA', 'Costa Mesa, CA', 'Carlsbad, CA', 'Temecula, CA', 'Murrieta, CA',
  'Daly City, CA', 'Burbank, CA', 'San Mateo, CA', 'Rialto, CA', 'Clovis, CA',
  'Redwood City, CA', 'Folsom, CA', 'Cupertino, CA', 'Milpitas, CA', 'Tustin, CA',
  'Pleasanton, CA', 'Davis, CA', 'Mountain View, CA', 'Walnut Creek, CA', 'San Rafael, CA',
  'Petaluma, CA', 'Novato, CA', 'Encinitas, CA', 'Laguna Beach, CA', 'Manhattan Beach, CA',
  'Hermosa Beach, CA', 'Redondo Beach, CA', 'Newport Beach, CA', 'Half Moon Bay, CA', 'Monterey, CA',
  'Scottsdale, AZ', 'Chandler, AZ', 'Gilbert, AZ', 'Tempe, AZ', 'Peoria, AZ',
  'Avondale, AZ', 'Buckeye, AZ', 'Casa Grande, AZ', 'Maricopa, AZ', 'Prescott, AZ',
  'Lakewood, CO', 'Thornton, CO', 'Arvada, CO', 'Westminster, CO', 'Centennial, CO',
  'Pueblo, CO', 'Longmont, CO', 'Loveland, CO', 'Broomfield, CO', 'Castle Rock, CO',
  'Parker, CO', 'Littleton, CO', 'Greeley, CO', 'Durango, CO', 'Steamboat Springs, CO',
  'Vail, CO', 'Breckenridge, CO', 'Estes Park, CO', 'Grand Junction, CO', 'Golden, CO',
  'Bellingham, WA', 'Everett, WA', 'Kent, WA', 'Renton, WA', 'Federal Way, WA',
  'Kirkland, WA', 'Redmond, WA', 'Sammamish, WA', 'Issaquah, WA', 'Bothell, WA',
  'Puyallup, WA', 'Bremerton, WA', 'Wenatchee, WA', 'Yakima, WA', 'Walla Walla, WA',
  'Beaverton, OR', 'Hillsboro, OR', 'Gresham, OR', 'Medford, OR', 'Corvallis, OR',
  'Ashland, OR', 'Hood River, OR', 'Tigard, OR', 'Lake Oswego, OR', 'McMinnville, OR',
  'Sandy Springs, GA', 'Roswell, GA', 'Johns Creek, GA', 'Smyrna, GA', 'Kennesaw, GA',
  'Duluth, GA', 'Sandy, UT', 'Orem, UT', 'Lehi, UT', 'St. George, UT',
  'Logan, UT', 'Layton, UT', 'Draper, UT', 'Bountiful, UT', 'Cedar City, UT',
  'Spring, TX', 'Cypress, TX', 'Mission, TX', 'McAllen, TX', 'Edinburg, TX',
  'Harlingen, TX', 'Pharr, TX', 'Temple, TX', 'Killeen, TX', 'San Angelo, TX',
  'Midland, TX', 'Odessa, TX', 'Abilene, TX', 'Wichita Falls, TX', 'Beaumont, TX',
  'Galveston, TX', 'Texas City, TX', 'Port Arthur, TX', 'Longview, TX', 'Marshall, TX',
  'Bellevue, NE', 'Grand Island, NE', 'Kearney, NE', 'Fremont, NE', 'Norman, OK',
  'Edmond, OK', 'Broken Arrow, OK', 'Stillwater, OK', 'Lawton, OK', 'Moore, OK',
  'Boca Raton, FL', 'Delray Beach, FL', 'Boynton Beach, FL', 'West Palm Beach, FL', 'Jupiter, FL',
  'Coral Gables, FL', 'Coral Springs, FL', 'Pompano Beach, FL', 'Hollywood, FL', 'Pembroke Pines, FL',
  'Miami Beach, FL', 'Doral, FL', 'Kendall, FL', 'Fort Myers, FL', 'Bonita Springs, FL',
  'Estero, FL', 'Lakeland, FL', 'Ocala, FL', 'Daytona Beach, FL', 'Melbourne, FL',
  'Vero Beach, FL', 'Stuart, FL', 'Bradenton, FL', 'Venice, FL', 'St. Augustine, FL',
  'Tallahassee, FL', 'Panama City, FL', 'Destin, FL', 'Fort Walton Beach, FL', 'Winter Park, FL',
  'Kissimmee, FL', 'Sanford, FL', 'Lake Mary, FL', 'Altamonte Springs, FL', 'Brandon, FL',
  'Quincy, MA', 'Newton, MA', 'Somerville, MA', 'Brookline, MA', 'Framingham, MA',
  'Lowell, MA', 'Lynn, MA', 'Waltham, MA', 'Medford, MA', 'Plymouth, MA',
  'Nashua, NH', 'Concord, NH', 'Portsmouth, NH', 'Dover, NH', 'Burlington, VT',
  'Stowe, VT', 'Montpelier, VT', 'Brattleboro, VT', 'Bar Harbor, ME', 'Augusta, ME',
  'Lewiston, ME', 'Kennebunkport, ME', 'Newport, RI', 'Warwick, RI', 'Cranston, RI',
  'Norwalk, CT', 'Greenwich, CT', 'Danbury, CT', 'Waterbury, CT', 'Bristol, CT',
  'Trenton, NJ', 'Camden, NJ', 'Edison, NJ', 'Paterson, NJ', 'Elizabeth, NJ',
  'Clifton, NJ', 'Cherry Hill, NJ', 'Atlantic City, NJ', 'Asbury Park, NJ', 'Morristown, NJ',
  'White Plains, NY', 'New Rochelle, NY', 'Mount Vernon, NY', 'Schenectady, NY', 'Utica, NY',
  'Binghamton, NY', 'Poughkeepsie, NY', 'Niagara Falls, NY', 'Troy, NY', 'Kingston, NY',
  'Allentown, PA', 'Erie, PA', 'Scranton, PA', 'Reading, PA', 'Bethlehem, PA',
  'Lancaster, PA', 'Harrisburg, PA', 'York, PA', 'State College, PA', 'Doylestown, PA',
  'Bellevue, KY', 'Covington, KY', 'Louisville, KY', 'Owensboro, KY', 'Paducah, KY',
  'Murfreesboro, TN', 'Johnson City, TN', 'Kingsport, TN', 'Cookeville, TN', 'Jackson, TN',
  'Hendersonville, TN', 'Brentwood, TN', 'Smyrna, TN', 'Spring Hill, TN', 'Germantown, TN',

  // --- Additional international towns ---
  'Bristol, UK', 'Reading, UK', 'Plymouth, UK', 'Southampton, UK', 'Portsmouth, UK',
  'Coventry, UK', 'Leicester, UK', 'Derby, UK', 'Norwich, UK', 'Exeter, UK',
  'Bournemouth, UK', 'Swansea, UK', 'Dundee, UK', 'Stirling, UK', 'Galway, Ireland',
  'Lyon, France', 'Grenoble, France', 'Montpellier, France', 'Rennes, France', 'Dijon, France',
  'Annecy, France', 'Avignon, France', 'Aix-en-Provence, France', 'Biarritz, France', 'Chamonix, France',
  'Girona, Spain', 'Marbella, Spain', 'Alicante, Spain', 'Santander, Spain', 'Salamanca, Spain',
  'Genoa, Italy', 'Pisa, Italy', 'Siena, Italy', 'Bari, Italy', 'Catania, Italy',
  'Como, Italy', 'Sorrento, Italy', 'Bergamo, Italy', 'Padua, Italy', 'Parma, Italy',
  'Bonn, Germany', 'Mannheim, Germany', 'Freiburg, Germany', 'Heidelberg, Germany', 'Augsburg, Germany',
  'Wiesbaden, Germany', 'Bremen, Germany', 'Hannover, Germany', 'Karlsruhe, Germany', 'Münster, Germany',
  'Groningen, Netherlands', 'Maastricht, Netherlands', 'Haarlem, Netherlands', 'Delft, Netherlands', 'Leiden, Netherlands',
  'Bordeaux, France', 'Tampere, Finland', 'Turku, Finland', 'Odense, Denmark', 'Aalborg, Denmark',
  'Stavanger, Norway', 'Tromsø, Norway', 'Uppsala, Sweden', 'Lund, Sweden', 'Linköping, Sweden',
  'Katowice, Poland', 'Łódź, Poland', 'Lublin, Poland', 'Szczecin, Poland', 'Ostrava, Czech Republic',
  'Debrecen, Hungary', 'Szeged, Hungary', 'Timișoara, Romania', 'Iași, Romania', 'Constanța, Romania',
  'Plovdiv, Bulgaria', 'Varna, Bulgaria', 'Novi Sad, Serbia', 'Rijeka, Croatia', 'Zadar, Croatia',
  'Patras, Greece', 'Larissa, Greece', 'Bursa, Turkey', 'Adana, Turkey', 'Konya, Turkey',
  'Kharkiv, Ukraine', 'Dnipro, Ukraine', 'Kazan, Russia', 'Novosibirsk, Russia', 'Yekaterinburg, Russia',
  'Pune, India', 'Nagpur, India', 'Indore, India', 'Bhopal, India', 'Coimbatore, India',
  'Visakhapatnam, India', 'Vadodara, India', 'Mysuru, India', 'Thiruvananthapuram, India', 'Amritsar, India',
  'Faisalabad, Pakistan', 'Rawalpindi, Pakistan', 'Multan, Pakistan', 'Peshawar, Pakistan', 'Kandy, Sri Lanka',
  'Sendai, Japan', 'Hiroshima, Japan', 'Kobe, Japan', 'Nara, Japan', 'Okinawa, Japan',
  'Daegu, South Korea', 'Daejeon, South Korea', 'Gwangju, South Korea', 'Jeju, South Korea', 'Suwon, South Korea',
  'Nanjing, China', 'Wuhan, China', 'Suzhou, China', 'Qingdao, China', 'Tianjin, China',
  'Dalian, China', 'Xiamen, China', 'Kunming, China', 'Guilin, China', 'Tainan, Taiwan',
  'Pattaya, Thailand', 'Krabi, Thailand', 'Hua Hin, Thailand', 'George Town, Malaysia', 'Johor Bahru, Malaysia',
  'Bandung, Indonesia', 'Yogyakarta, Indonesia', 'Medan, Indonesia', 'Davao, Philippines', 'Quezon City, Philippines',
  'Hue, Vietnam', 'Nha Trang, Vietnam', 'Hoi An, Vietnam', 'Siem Reap, Cambodia', 'Mandalay, Myanmar',
  'Newcastle, Australia', 'Wollongong, Australia', 'Geelong, Australia', 'Townsville, Australia', 'Sunshine Coast, Australia',
  'Ballarat, Australia', 'Bendigo, Australia', 'Byron Bay, Australia', 'Noosa, Australia', 'Fremantle, Australia',
  'Dunedin, New Zealand', 'Tauranga, New Zealand', 'Hamilton, New Zealand', 'Napier, New Zealand', 'Rotorua, New Zealand',
  'León, Mexico', 'Puerto Vallarta, Mexico', 'Tulum, Mexico', 'San José del Cabo, Mexico', 'Mazatlán, Mexico',
  'Antigua, Guatemala', 'Tamarindo, Costa Rica', 'Boquete, Panama', 'Barranquilla, Colombia', 'Trujillo, Peru',
  'Niterói, Brazil', 'Campinas, Brazil', 'Santos, Brazil', 'Búzios, Brazil', 'Mar del Plata, Argentina',
  'Bariloche, Argentina', 'Punta del Este, Uruguay', 'Viña del Mar, Chile', 'Cuenca, Ecuador', 'Mérida, Venezuela',
];

// Deduplicate (the raw list above has some repeats across regions) and sort
// alphabetically so every city appears exactly once and suggestions are tidy.
export const WORLD_CITIES = Array.from(new Set(RAW_WORLD_CITIES)).sort((a, b) =>
  a.localeCompare(b)
);

// Case-insensitive prefix-then-substring match, prefix matches ranked first.
// WORLD_CITIES is already deduped + sorted, so results are unique.
export function searchWorldCities(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const c of WORLD_CITIES) {
    const lc = c.toLowerCase();
    if (lc.startsWith(q)) starts.push(c);
    else if (lc.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}

export default { WORLD_CITIES, searchWorldCities };
