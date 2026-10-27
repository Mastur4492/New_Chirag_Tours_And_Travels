import { connectDB, disconnectDB } from '../config/database';
import { DestinationModel } from '../models/destination.model';
import { TourPackageModel } from '../models/tourPackage.model';
import { logger } from '../utils/logger';

const SEED_PACKAGES = [
  {
    destSlug: 'kashmir-valley-circuit',
    title: 'Kashmir Paradise Express (Srinagar, Gulmarg, Pahalgam)',
    slug: 'kashmir-paradise-express-5n6d',
    durationNights: 5,
    durationDays: 6,
    startingPrice: 24500,
    defaultMealPlan: 'MAP',
    defaultVehicleCategory: 'SUV',
    overview: 'Experience the crown jewel of India with shikara rides on Dal Lake, snow thrills at Gulmarg Gondola, and scenic Lidder Valley in Pahalgam.',
    featuredImage: '/images/destinations/kashmir.jpg',
    inclusions: [
      '5 Nights Deluxe / Luxury Hotel & Houseboat Accommodation',
      'Daily Buffet Breakfast and Dinner (MAP Plan)',
      'Dedicated Chauffeur-Driven AC SUV for entire circuit',
      '1 Hour Complimentary Shikara Ride on Dal Lake',
      'All Toll Taxes, Parking, Fuel, and Driver Night Allowances',
      '24/7 Ahmedabad Desk Support & Local On-Ground Assistance',
    ],
    exclusions: [
      'Airfare to/from Srinagar',
      'Gulmarg Gondola Phase 1 & 2 Cable Car Tickets',
      'Pony rides or local union cabs in Pahalgam/Gulmarg',
      'Personal expenses, laundry, and tips',
    ],
    dayWiseItinerary: [
      {
        dayNumber: 1,
        title: 'Arrival in Srinagar & Dal Lake Shikara Ride',
        description: 'Warm welcome at Srinagar Airport by our chauffeur. Check-in to luxury houseboat on Dal Lake. Enjoy a 1-hour sunset Shikara ride across floating gardens and Char Chinar.',
        nightStayDestination: 'Srinagar Houseboat',
        mealsIncluded: ['Dinner'],
        activities: ['Airport pickup', 'Dal Lake Shikara ride', 'Floating market visit'],
      },
      {
        dayNumber: 2,
        title: 'Srinagar to Gulmarg Day Excursion (Meadow of Flowers)',
        description: 'Morning drive to Gulmarg (2,730m). Take the world famous Gondola cable car ride to Apharwat peak for panoramic snow peaks. Evening return to Srinagar hotel.',
        nightStayDestination: 'Srinagar',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Gulmarg Gondola Ride', 'Snow activities', 'Golf course view'],
      },
      {
        dayNumber: 3,
        title: 'Srinagar to Pahalgam Valley (Valley of Shepherds)',
        description: 'Drive along saffron fields of Pampore and pine forests to Pahalgam. Check-in to riverfront resort beside Lidder River. Relax in nature and explore local market.',
        nightStayDestination: 'Pahalgam',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Saffron fields stop', 'Lidder river walk', 'Pahalgam bazaar'],
      },
      {
        dayNumber: 4,
        title: 'Pahalgam Betaab Valley & Aru Valley Exploration',
        description: 'Visit the scenic Betaab Valley, named after the Bollywood film, and pristine alpine meadows of Aru Valley and Chandanwari. Evening campfire at resort.',
        nightStayDestination: 'Pahalgam',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Betaab Valley', 'Aru Valley scenic viewpoint', 'Riverside photography'],
      },
      {
        dayNumber: 5,
        title: 'Pahalgam to Srinagar & Mughal Gardens Tour',
        description: 'Return to Srinagar. Visit historic Mughal gardens including Nishat Bagh (Garden of Pleasure), Shalimar Bagh, and Shankaracharya Temple atop Gopadari hill.',
        nightStayDestination: 'Srinagar',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Nishat Bagh', 'Shalimar Bagh', 'Shankaracharya Temple', 'Dry fruit shopping'],
      },
      {
        dayNumber: 6,
        title: 'Departure from Srinagar Airport',
        description: 'After breakfast, transfer to Srinagar International Airport with unforgettable memories of Kashmir paradise.',
        nightStayDestination: 'Departure',
        mealsIncluded: ['Breakfast'],
        activities: ['Hotel checkout', 'Airport transfer'],
      },
    ],
  },
  {
    destSlug: 'kerala-serene-backwaters',
    title: 'Kerala Backwaters & Mist Tea Hills (Munnar, Thekkady, Alleppey)',
    slug: 'kerala-backwaters-tea-hills-6n7d',
    durationNights: 6,
    durationDays: 7,
    startingPrice: 21500,
    defaultMealPlan: 'MAP',
    defaultVehicleCategory: 'SUV',
    overview: 'Unwind in Gods Own Country: lush mist-shrouded tea plantations of Munnar, spice gardens and Periyar wildlife in Thekkady, and private houseboat cruise in Alleppey.',
    featuredImage: '/images/destinations/kerala.jpg',
    inclusions: [
      '6 Nights Stays (Munnar 2N, Thekkady 1N, Alleppey 1N Houseboat, Cochin 2N)',
      'Daily Breakfast & Dinner at Resorts + All Meals on Houseboat',
      'Exclusive Air-Conditioned Private Cab for entire transfer and sightseeing',
      'Private Backwater Houseboat Cruise through narrow canals',
      'All driver beta, toll, parking and permit fees',
    ],
    exclusions: [
      'Flight / Train tickets to Kochi (COK)',
      'Periyar Boating & Kathakali show tickets',
      'Personal laundry, beverages and porterage',
    ],
    dayWiseItinerary: [
      {
        dayNumber: 1,
        title: 'Arrival in Kochi & Scenic Drive to Munnar',
        description: 'Arrive at Kochi airport/station. Drive through misty hills with stops at Cheeyappara and Valara waterfalls. Check-in to tea garden resort in Munnar.',
        nightStayDestination: 'Munnar',
        mealsIncluded: ['Dinner'],
        activities: ['Waterfall viewpoint', 'Spice plantation aroma tour'],
      },
      {
        dayNumber: 2,
        title: 'Munnar Tea Gardens & Eravikulam National Park',
        description: 'Explore tea museum, Mattupetty Dam, Echo Point, and Eravikulam National Park to spot the rare Nilgiri Tahr mountain goat.',
        nightStayDestination: 'Munnar',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Tea Museum visit', 'Mattupetty Dam boat ride', 'Echo Point'],
      },
      {
        dayNumber: 3,
        title: 'Munnar to Thekkady (Periyar Tiger Sanctuary)',
        description: 'Scenic hill drive to Thekkady. Visit spice plantations of cardamom, pepper, and cinnamon. Optional evening Periyar Lake boat safari and martial arts show.',
        nightStayDestination: 'Thekkady',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Spice plantation walk', 'Periyar wildlife cruise', 'Kalaripayattu show'],
      },
      {
        dayNumber: 4,
        title: 'Thekkady to Alleppey Private Houseboat Cruise',
        description: 'Drive down to Alleppey jetty. Board your traditional Kerala Kettuvallam houseboat. Cruise through emerald palm-fringed backwaters with traditional freshly cooked meals on board.',
        nightStayDestination: 'Alleppey Houseboat',
        mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
        activities: ['Backwater cruise', 'Village canal sightseeing', 'Sunset over Vembanad Lake'],
      },
      {
        dayNumber: 5,
        title: 'Alleppey to Kochi Coastal Heritage',
        description: 'Disembark after breakfast. Drive to historic Fort Kochi. Visit Chinese Fishing Nets, St. Francis Church, and colorful Jew Town with spice markets.',
        nightStayDestination: 'Kochi',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Fort Kochi heritage walk', 'Chinese fishing nets', 'Jew Town shopping'],
      },
      {
        dayNumber: 6,
        title: 'Kochi Leisure & Marine Drive Sunset',
        description: 'Enjoy leisurely shopping for Kerala spices, banana chips, and handicrafts. Evening Marine Drive promenade stroll and Arabian Sea sunset view.',
        nightStayDestination: 'Kochi',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Marine Drive stroll', 'Lulu Mall shopping', 'Sunset view'],
      },
      {
        dayNumber: 7,
        title: 'Departure from Kochi Airport',
        description: 'Transfer to Cochin International Airport (COK) for your flight back home.',
        nightStayDestination: 'Departure',
        mealsIncluded: ['Breakfast'],
        activities: ['Airport transfer'],
      },
    ],
  },
  {
    destSlug: 'himachal-hills-and-snow',
    title: 'Himachal Hills & Snow Circuit (Shimla, Manali, Solang Valley)',
    slug: 'himachal-hills-snow-5n6d',
    durationNights: 5,
    durationDays: 6,
    startingPrice: 18500,
    defaultMealPlan: 'MAP',
    defaultVehicleCategory: 'SUV',
    overview: 'Discover high mountain passes, Solang Valley snow sports, Rohtang / Atal Tunnel, and British colonial charm along Shimla Mall Road.',
    featuredImage: '/images/destinations/himachal.jpg',
    inclusions: [
      '5 Nights Hotel Stays (Shimla 2N, Manali 3N)',
      'Daily Buffet Breakfast and Dinner (MAP Plan)',
      'Dedicated Chauffeur AC SUV for hill terrain',
      'Excursion to Solang Valley & Atal Tunnel Sissu',
      'All interstate road taxes, toll and driver allowances',
    ],
    exclusions: [
      'Rohtang Pass green permit vehicle (booked locally)',
      'Adventure activities (paragliding, skiing, zorbing)',
      'Personal expenses & monument entry fees',
    ],
    dayWiseItinerary: [
      {
        dayNumber: 1,
        title: 'Chandigarh / Delhi to Shimla Queen of Hills',
        description: 'Pickup from Chandigarh or Delhi. Scenic uphill drive past pinewoods to Shimla. Evening stroll on Mall Road, Christ Church, and The Ridge.',
        nightStayDestination: 'Shimla',
        mealsIncluded: ['Dinner'],
        activities: ['Mall Road walk', 'Christ Church photo stop', 'The Ridge sunset'],
      },
      {
        dayNumber: 2,
        title: 'Shimla & Kufri Himalayan Nature Excursion',
        description: 'Excursion to Kufri for breathtaking snow-covered Himalayan views, yak rides, and pine forests. Afternoon visit to Jakhoo Temple and Lakkar Bazaar.',
        nightStayDestination: 'Shimla',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Kufri snow viewpoint', 'Jakhoo Temple ropeway', 'Lakkar Bazaar handicrafts'],
      },
      {
        dayNumber: 3,
        title: 'Shimla to Manali via Kullu Valley',
        description: 'Drive along Beas River through Pandoh Dam, Sundernagar Lake, and Kullu Shawl weaving centers. Arrive in Manali and check-in to mountain resort.',
        nightStayDestination: 'Manali',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Pandoh Dam stop', 'Kullu shawl factory', 'River rafting point'],
      },
      {
        dayNumber: 4,
        title: 'Solang Valley & Atal Tunnel Snow Wonderland',
        description: 'Full day adventure at Solang Valley. Drive through the engineering marvel of Atal Tunnel to Lahaul Valley and Sissu waterfall. Enjoy snow adventures.',
        nightStayDestination: 'Manali',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Solang Valley snow point', 'Atal Tunnel drive', 'Sissu waterfall'],
      },
      {
        dayNumber: 5,
        title: 'Manali Local Sightseeing & Old Manali Cafes',
        description: 'Visit 500-year-old wooden Hadimba Temple, Vashisht hot water sulphur springs, Tibetan Monastery, and charming bohemian cafes of Old Manali.',
        nightStayDestination: 'Manali',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Hadimba Temple', 'Vashisht hot springs', 'Mall Road shopping'],
      },
      {
        dayNumber: 6,
        title: 'Manali to Chandigarh / Delhi Departure',
        description: 'After breakfast, picturesque descent back to Chandigarh or Delhi airport for return journey.',
        nightStayDestination: 'Departure',
        mealsIncluded: ['Breakfast'],
        activities: ['Checkout and transfer'],
      },
    ],
  },
  {
    destSlug: 'royal-rajasthan-heritage',
    title: 'Royal Rajasthan Heritage Circuit (Jaipur, Jodhpur, Udaipur)',
    slug: 'royal-rajasthan-heritage-6n7d',
    durationNights: 6,
    durationDays: 7,
    startingPrice: 19500,
    defaultMealPlan: 'MAP',
    defaultVehicleCategory: 'SUV',
    overview: 'Step into royal grandeur: Jaipur Amer Fort, Jodhpur Blue City Mehrangarh Fort, and Udaipur City of Lakes with Lake Pichola palace cruises.',
    featuredImage: '/images/destinations/rajasthan.jpg',
    inclusions: [
      '6 Nights Heritage Stays (Jaipur 2N, Jodhpur 2N, Udaipur 2N)',
      'Daily Royal Breakfast and Authentic Dinner',
      'Private Dedicated Air-Conditioned SUV throughout Rajasthan',
      'Complimentary Boat Cruise on Lake Pichola, Udaipur',
      'All toll taxes, parking, driver night allowances included',
    ],
    exclusions: [
      'Monument entry fees and camera charges',
      'Camel safari or elephant ride fees',
      'Personal expenses and shopping',
    ],
    dayWiseItinerary: [
      {
        dayNumber: 1,
        title: 'Arrival in Pink City Jaipur',
        description: 'Chauffeur pickup from Jaipur Airport / Railway Station. Check-in to hotel. Evening visit to Birla Temple and authentic Rajasthani dinner at Chokhi Dhani.',
        nightStayDestination: 'Jaipur',
        mealsIncluded: ['Dinner'],
        activities: ['Pickup', 'Birla Temple', 'Chokhi Dhani cultural village'],
      },
      {
        dayNumber: 2,
        title: 'Jaipur Grand Forts & Palaces',
        description: 'Full day sightseeing of Amer Fort perched high on hills, Hawa Mahal (Palace of Winds), City Palace museum, and historic Jantar Mantar observatory.',
        nightStayDestination: 'Jaipur',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Amer Fort tour', 'Hawa Mahal photography', 'City Palace museum', 'Johari Bazaar'],
      },
      {
        dayNumber: 3,
        title: 'Jaipur to Jodhpur (The Sun City)',
        description: 'Drive westward to Jodhpur. Visit the massive Mehrangarh Fort overlooking the blue city, Jaswant Thada marble cenotaph, and clock tower bazaar.',
        nightStayDestination: 'Jodhpur',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Mehrangarh Fort citadel', 'Jaswant Thada', 'Clock Tower spice market'],
      },
      {
        dayNumber: 4,
        title: 'Jodhpur to Udaipur via Ranakpur Jain Temples',
        description: 'Drive towards the City of Lakes with a stop at the architectural marvel of Ranakpur with its 1,444 intricately carved marble pillars. Arrive in Udaipur.',
        nightStayDestination: 'Udaipur',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Ranakpur Temple marvel', 'Aravalli mountain drive', 'Check-in beside lake'],
      },
      {
        dayNumber: 5,
        title: 'Udaipur City Palace & Lake Pichola Boat Cruise',
        description: 'Visit the sprawling City Palace complex, Jagdish Temple, Saheliyon Ki Bari royal fountains, and enjoy a romantic sunset boat cruise on Lake Pichola.',
        nightStayDestination: 'Udaipur',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['City Palace tour', 'Saheliyon Ki Bari', 'Lake Pichola sunset boat ride'],
      },
      {
        dayNumber: 6,
        title: 'Udaipur Heritage Leisure & Bagore Ki Haveli',
        description: 'Explore Udaipur art galleries, miniature painting studios, and evening Dharohar folk dance show at Bagore Ki Haveli overlooking the ghats.',
        nightStayDestination: 'Udaipur',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Old city craft walk', 'Bagore Ki Haveli folk dance', 'Gangaur Ghat sunset'],
      },
      {
        dayNumber: 7,
        title: 'Departure from Udaipur',
        description: 'Transfer to Udaipur Maharana Pratap Airport (UDR) for departure.',
        nightStayDestination: 'Departure',
        mealsIncluded: ['Breakfast'],
        activities: ['Airport transfer'],
      },
    ],
  },
  {
    destSlug: 'goa-coastal-leisure',
    title: 'Goa Coastal Leisure & Heritage Escape (North & South Goa)',
    slug: 'goa-coastal-leisure-4n5d',
    durationNights: 4,
    durationDays: 5,
    startingPrice: 16500,
    defaultMealPlan: 'CP',
    defaultVehicleCategory: 'SEDAN',
    overview: 'Soak in coastal sunshine, vibrant beach clubs of North Goa, historic Latin Quarter of Fontainhas, and pristine white sands of South Goa resorts.',
    featuredImage: '/images/destinations/goa.jpg',
    inclusions: [
      '4 Nights Beach Resort Accommodation',
      'Daily Buffet Breakfast',
      'Dedicated AC Sedan / SUV for transfers and tours',
      'Mandovi River Sunset Cruise Tickets Included',
      'All toll, parking, airport transfers included',
    ],
    exclusions: [
      'Flight tickets to Dabolim / Mopa (GOX/GOI)',
      'Water sports equipment rentals (jet ski, parasailing)',
      'Nightclub covers and alcoholic beverages',
    ],
    dayWiseItinerary: [
      {
        dayNumber: 1,
        title: 'Arrival in Goa & Beachside Leisure',
        description: 'Warm welcome at Goa Airport. Transfer to your beach resort in Candolim/Calangute. Relax on the sands and watch the Arabian Sea sunset.',
        nightStayDestination: 'Goa',
        mealsIncluded: ['Breakfast'],
        activities: ['Airport pickup', 'Beach sunset walk', 'Shack dining'],
      },
      {
        dayNumber: 2,
        title: 'North Goa Forts & Watersports Circuit',
        description: 'Visit 17th-century Fort Aguada, Candolim Beach, Baga Beach, Anjuna cliff viewpoint, and vibrant flea markets. Enjoy water sports.',
        nightStayDestination: 'Goa',
        mealsIncluded: ['Breakfast'],
        activities: ['Fort Aguada lighthouse', 'Baga water sports', 'Anjuna cliff walk'],
      },
      {
        dayNumber: 3,
        title: 'South Goa Heritage Churches & Mandovi Cruise',
        description: 'Explore UNESCO World Heritage Basilica of Bom Jesus and Se Cathedral in Old Goa. Walk through colorful Portuguese Latin Quarter of Fontainhas. Evening sunset cruise on Mandovi River.',
        nightStayDestination: 'Goa',
        mealsIncluded: ['Breakfast'],
        activities: ['Old Goa Basilica', 'Fontainhas colorful alleys', 'Mandovi sunset cruise'],
      },
      {
        dayNumber: 4,
        title: 'South Goa Pristine Beaches & Spice Plantation',
        description: 'Visit Sahakari Spice Farm for an organic tour and buffet lunch, followed by Colva Beach and Palolem crescent bay for tranquility.',
        nightStayDestination: 'Goa',
        mealsIncluded: ['Breakfast'],
        activities: ['Spice plantation tour', 'South Goa quiet beaches', 'Seafood dinner'],
      },
      {
        dayNumber: 5,
        title: 'Departure from Goa',
        description: 'Check out from resort and transfer to Goa airport for return flight.',
        nightStayDestination: 'Departure',
        mealsIncluded: ['Breakfast'],
        activities: ['Airport transfer'],
      },
    ],
  },
  {
    destSlug: 'andaman-tropical-islands',
    title: 'Andaman Coral Islands & Radhanagar White Sands (Port Blair, Havelock)',
    slug: 'andaman-coral-islands-5n6d',
    durationNights: 5,
    durationDays: 6,
    startingPrice: 28500,
    defaultMealPlan: 'MAP',
    defaultVehicleCategory: 'SUV',
    overview: 'Discover India exotic tropical jewel: Port Blair Cellular Jail sound & light, Havelock Radhanagar Beach (Asia best beach), and coral reef snorkeling.',
    featuredImage: '/images/destinations/andaman.jpg',
    inclusions: [
      '5 Nights Island Resort Stays (Port Blair 2N, Havelock Island 3N)',
      'Daily Breakfast and Dinner (MAP Plan)',
      'High-Speed Premium Catamaran Ferry Tickets (Port Blair - Havelock - Port Blair)',
      'Dedicated AC Cabs on both islands for private sightseeing',
      'Cellular Jail Entry & Light & Sound Show Tickets Included',
    ],
    exclusions: [
      'Airfare to Veer Savarkar Airport (IXZ)',
      'Scuba diving, sea walk, or glass-bottom boat charges',
      'Personal expenditures & water sports photography',
    ],
    dayWiseItinerary: [
      {
        dayNumber: 1,
        title: 'Arrival in Port Blair & Cellular Jail Light & Sound',
        description: 'Arrival at Port Blair airport. Transfer to hotel. In the afternoon, visit historic Cellular Jail followed by the moving patriotic Light & Sound show.',
        nightStayDestination: 'Port Blair',
        mealsIncluded: ['Dinner'],
        activities: ['Airport transfer', 'Cellular Jail visit', 'Sound & light show'],
      },
      {
        dayNumber: 2,
        title: 'Port Blair to Havelock Island via High-Speed Cruise',
        description: 'Board premium private cruise (Makruzz / Nautika) to Havelock Island. Check-in to beach resort. Afternoon visit to world-famous Radhanagar Beach (Beach No 7).',
        nightStayDestination: 'Havelock Island',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['High speed catamaran cruise', 'Radhanagar white sand beach', 'Sunset view'],
      },
      {
        dayNumber: 3,
        title: 'Havelock Elephant Beach Coral Reef Excursion',
        description: 'Speedboat ride to Elephant Beach known for crystal clear turquoise waters and vibrant coral reef life. Optional snorkeling, jet ski, and glass-bottom boats.',
        nightStayDestination: 'Havelock Island',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Speedboat ride', 'Elephant beach snorkeling', 'Water sports'],
      },
      {
        dayNumber: 4,
        title: 'Kalapathar Beach & Island Relaxation',
        description: 'Morning visit to picturesque Kalapathar Beach with black rocks and azure water. Afternoon at leisure to cycle along island roads or indulge in resort spa.',
        nightStayDestination: 'Havelock Island',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Kalapathar beach photography', 'Cafe hopping', 'Resort leisure'],
      },
      {
        dayNumber: 5,
        title: 'Havelock to Port Blair & Local Souvenir Shopping',
        description: 'Cruise back to Port Blair. Visit Sagarika Govt Emporium for handmade seashell souvenirs and Andaman wood carvings. Evening sunset at Corbyns Cove.',
        nightStayDestination: 'Port Blair',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Return ferry to Port Blair', 'Corbyn Cove beach', 'Sagarika emporium'],
      },
      {
        dayNumber: 6,
        title: 'Departure from Port Blair',
        description: 'Transfer to Veer Savarkar International Airport with treasured tropical memories.',
        nightStayDestination: 'Departure',
        mealsIncluded: ['Breakfast'],
        activities: ['Airport transfer'],
      },
    ],
  },
  {
    destSlug: 'uttarakhand-lakes-and-hills',
    title: 'Uttarakhand Lakes & Divine Hills (Nainital, Mussoorie, Rishikesh)',
    slug: 'uttarakhand-lakes-hills-5n6d',
    durationNights: 5,
    durationDays: 6,
    startingPrice: 17500,
    defaultMealPlan: 'MAP',
    defaultVehicleCategory: 'SEDAN',
    overview: 'Naini Lake boating in Nainital, breathtaking Kempty Falls in Mussoorie, and spiritual evening Ganga Aarti at Triveni Ghat in Rishikesh.',
    featuredImage: '/images/destinations/uttarakhand.jpg',
    inclusions: [
      '5 Nights Stays (Nainital 2N, Mussoorie 2N, Rishikesh 1N)',
      'Daily Breakfast and Dinner (MAP Plan)',
      'Dedicated AC Sedan / SUV for mountain journeys',
      'Naini Lake Boating & Ganga Aarti Experience',
      'All toll, driver night charges, and state taxes included',
    ],
    exclusions: [
      'Train / Air tickets to Dehradun (DED) / Delhi',
      'Ropeway tickets and adventure sports (Rishikesh Rafting)',
      'Personal expenses and porter charges',
    ],
    dayWiseItinerary: [
      {
        dayNumber: 1,
        title: 'Delhi to Nainital (City of Lakes)',
        description: 'Drive from Delhi/Pantnagar uphill to Nainital (1,938m). Check-in to resort overlooking Naini Lake. Evening Mall Road walk and Naini Devi Temple.',
        nightStayDestination: 'Nainital',
        mealsIncluded: ['Dinner'],
        activities: ['Scenic uphill drive', 'Mall Road stroll', 'Naini Devi Temple'],
      },
      {
        dayNumber: 2,
        title: 'Nainital Lake Tour & Viewpoints',
        description: 'Visit Bhimtal, Sattal, and Naukuchiatal lakes. Enjoy rowing on Naini Lake and take the ropeway to Snow View Point for Himalayan views.',
        nightStayDestination: 'Nainital',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Bhimtal lake visit', 'Snow View point cable car', 'Boating on Naini Lake'],
      },
      {
        dayNumber: 3,
        title: 'Nainital to Mussoorie via Dehradun',
        description: 'Picturesque drive past Himalayan foothills to Mussoorie (Queen of Hills). Stop at Dehradun Robbers Cave. Check-in and evening walk on Kulri Mall Road.',
        nightStayDestination: 'Mussoorie',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Robbers Cave stop', 'Kulri Mall Road', 'Camel Back Road sunset walk'],
      },
      {
        dayNumber: 4,
        title: 'Mussoorie Kempty Falls & Gun Hill',
        description: 'Excursion to the cascading Kempty Falls. Afternoon ropeway ride to Gun Hill viewpoint and visit Lal Tibba for snow mountain vistas.',
        nightStayDestination: 'Mussoorie',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Kempty Falls', 'Gun Hill ropeway', 'Lal Tibba viewpoint'],
      },
      {
        dayNumber: 5,
        title: 'Mussoorie to Rishikesh Divine Ganga Aarti',
        description: 'Drive down to spiritual yoga capital Rishikesh. Visit Ram Jhula, Laxman Jhula, and experience the mesmerizing evening Ganga Aarti at Triveni Ghat.',
        nightStayDestination: 'Rishikesh',
        mealsIncluded: ['Breakfast', 'Dinner'],
        activities: ['Ram Jhula walk', 'Ashram visit', 'Triveni Ghat grand Ganga Aarti'],
      },
      {
        dayNumber: 6,
        title: 'Departure from Dehradun / Delhi',
        description: 'Transfer to Dehradun Airport (Jolly Grant) or Delhi for your flight home.',
        nightStayDestination: 'Departure',
        mealsIncluded: ['Breakfast'],
        activities: ['Airport transfer'],
      },
    ],
  },
];

async function seedPackages() {
  try {
    await connectDB();
    logger.info('Connected to MongoDB. Starting tour package seeding...');

    for (const item of SEED_PACKAGES) {
      const dest = await DestinationModel.findOne({ slug: item.destSlug });
      if (!dest) {
        logger.warn(`Destination with slug "${item.destSlug}" not found. Skipping package "${item.title}".`);
        continue;
      }

      const existing = await TourPackageModel.findOne({ slug: item.slug });
      if (existing) {
        existing.destinationId = dest._id as any;
        existing.title = item.title;
        existing.durationNights = item.durationNights;
        existing.durationDays = item.durationDays;
        existing.startingPrice = item.startingPrice;
        existing.defaultMealPlan = item.defaultMealPlan as any;
        existing.defaultVehicleCategory = item.defaultVehicleCategory as any;
        existing.overview = item.overview;
        existing.featuredImage = item.featuredImage;
        existing.inclusions = item.inclusions;
        existing.exclusions = item.exclusions;
        existing.dayWiseItinerary = item.dayWiseItinerary;
        existing.isPublished = true;
        await existing.save();
        logger.info(`Updated existing package: ${item.title}`);
      } else {
        await TourPackageModel.create({
          destinationId: dest._id,
          title: item.title,
          slug: item.slug,
          durationNights: item.durationNights,
          durationDays: item.durationDays,
          startingPrice: item.startingPrice,
          defaultMealPlan: item.defaultMealPlan,
          defaultVehicleCategory: item.defaultVehicleCategory,
          overview: item.overview,
          featuredImage: item.featuredImage,
          inclusions: item.inclusions,
          exclusions: item.exclusions,
          dayWiseItinerary: item.dayWiseItinerary,
          isPublished: true,
        });
        logger.info(`Created new package: ${item.title}`);
      }
    }

    logger.info('Tour packages seeded successfully!');
  } catch (err) {
    logger.error('Error seeding packages:', err);
  } finally {
    await disconnectDB();
  }
}

seedPackages();
