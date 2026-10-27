/**
 * Customer Portal Formatting & UI Utilities
 */

/**
 * Strips raw auto-generated timestamp suffixes (e.g., "Kashmir Valley 1791535855150" -> "Kashmir Valley")
 */
export function formatDisplayTitle(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/\s*\d{10,}\s*$/, '').trim();
}

/**
 * Format currency in Indian standard (e.g. ₹38,500)
 */
export function formatINR(amt?: number): string {
  if (!amt && amt !== 0) return 'Custom Quote';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amt);
}

export interface DestinationStyle {
  image: string;
  gradient: string;
  badge: string;
  accent: string;
  startingPrice: number;
  bestSeason: string;
  highlightTag: string;
  category: 'snow' | 'backwaters' | 'heritage' | 'beach' | 'lakes' | 'all';
  circuitPlaces: string[];
  hotelCount: number;
  stateCode: string;
  hotelSummary: string;
}

export interface CuratedHotel {
  id: string;
  name: string;
  city: string;
  starRating: number;
  propertyType: string;
  startingPrice: number;
  image: string;
  address: string;
  amenities: string[];
  mealPlans: string[];
  roomTypes: string[];
  highlight: string;
}

/**
 * Get distinct luxury nature photography, gradients, and pricing for travel destination cards
 */
export function getDestinationStyle(name: string, index: number = 0): DestinationStyle {
  const lower = (name || '').toLowerCase();

  if (lower.includes('kashmir') || lower.includes('valley') || lower.includes('srinagar')) {
    return {
      image: '/images/destinations/kashmir.jpg',
      gradient: 'linear-gradient(180deg, rgba(5, 23, 15, 0.2) 0%, rgba(5, 23, 15, 0.85) 100%)',
      badge: 'Paradise on Earth · North India',
      accent: '#34D399',
      startingPrice: 24500,
      bestSeason: 'Apr – Oct & Dec (Snow)',
      highlightTag: 'Dal Lake & Gulmarg',
      category: 'snow',
      circuitPlaces: ['Srinagar', 'Gulmarg Gondola', 'Pahalgam Valley', 'Sonamarg Glacier'],
      hotelCount: 4,
      stateCode: 'JK',
      hotelSummary: 'Luxury Lakefront Palaces, Alpine Ski Chalets & Heritage Houseboats',
    };
  }

  if (lower.includes('kerala') || lower.includes('backwater') || lower.includes('munnar') || lower.includes('alleppey')) {
    return {
      image: '/images/destinations/kerala.jpg',
      gradient: 'linear-gradient(180deg, rgba(6, 26, 17, 0.2) 0%, rgba(6, 26, 17, 0.85) 100%)',
      badge: "God's Own Country · South India",
      accent: '#10B981',
      startingPrice: 21500,
      bestSeason: 'Sep – Mar (Peak Season)',
      highlightTag: 'Luxury Houseboat Stay',
      category: 'backwaters',
      circuitPlaces: ['Munnar Tea Hills', 'Alleppey Backwaters', 'Thekkady Sanctuary', 'Kochi Port'],
      hotelCount: 4,
      stateCode: 'KL',
      hotelSummary: 'Waterfall View Tea Resorts, Lake Villas & Private Glass Houseboats',
    };
  }

  if (lower.includes('himachal') || lower.includes('manali') || lower.includes('shimla') || lower.includes('dharamshala')) {
    return {
      image: '/images/destinations/himachal.jpg',
      gradient: 'linear-gradient(180deg, rgba(15, 45, 58, 0.2) 0%, rgba(15, 45, 58, 0.85) 100%)',
      badge: 'Snow Peaks & Valleys · North India',
      accent: '#2DD4BF',
      startingPrice: 18500,
      bestSeason: 'Year-Round Escapes',
      highlightTag: 'Solang Valley & Rohtang',
      category: 'snow',
      circuitPlaces: ['Manali Solang', 'Shimla Ridge', 'Atal Tunnel', 'Kasol Parvati'],
      hotelCount: 3,
      stateCode: 'HP',
      hotelSummary: 'Victorian Castle Chalets, Cedar Forest Oberoi Lodges & Riverfront Resorts',
    };
  }

  if (lower.includes('rajasthan') || lower.includes('desert') || lower.includes('jaipur') || lower.includes('udaipur')) {
    return {
      image: '/images/destinations/rajasthan.jpg',
      gradient: 'linear-gradient(180deg, rgba(45, 20, 5, 0.2) 0%, rgba(45, 20, 5, 0.85) 100%)',
      badge: 'Royal Forts & Palaces · West India',
      accent: '#FBBF24',
      startingPrice: 19500,
      bestSeason: 'Oct – Mar (Heritage Weather)',
      highlightTag: 'Lake Pichola & Amer Fort',
      category: 'heritage',
      circuitPlaces: ['Jaipur Pink City', 'Udaipur Lake Palace', 'Jodhpur Mehrangarh', 'Jaisalmer Dunes'],
      hotelCount: 3,
      stateCode: 'RJ',
      hotelSummary: 'Palaces in Lake Pichola, Royal Havelis & Ethnic Cultural Resorts',
    };
  }

  if (lower.includes('goa') || lower.includes('beach') || lower.includes('calangute')) {
    return {
      image: '/images/destinations/goa.jpg',
      gradient: 'linear-gradient(180deg, rgba(12, 35, 50, 0.2) 0%, rgba(12, 35, 50, 0.85) 100%)',
      badge: 'Sun, Sand & Coastal Luxury · West Coast',
      accent: '#38BDF8',
      startingPrice: 16500,
      bestSeason: 'Nov – Feb (Tropical Sun)',
      highlightTag: 'Private Beach Cabana',
      category: 'beach',
      circuitPlaces: ['Cavelossim Beach', 'Candolim Fort Aguada', 'Baga & Calangute', 'Dudhsagar Falls'],
      hotelCount: 3,
      stateCode: 'GA',
      hotelSummary: 'Private Beachfront Villas, Fort Aguada Sea Cliff Resorts & Boutique Lodges',
    };
  }

  if (lower.includes('andaman') || lower.includes('havelock') || lower.includes('port blair')) {
    return {
      image: '/images/destinations/andaman.jpg',
      gradient: 'linear-gradient(180deg, rgba(8, 40, 50, 0.2) 0%, rgba(8, 40, 50, 0.85) 100%)',
      badge: 'Exotic Coral Lagoons · Bay of Bengal',
      accent: '#06B6D4',
      startingPrice: 28500,
      bestSeason: 'Oct – May (Crystal Waters)',
      highlightTag: 'Radhanagar White Sands',
      category: 'beach',
      circuitPlaces: ['Radhanagar Beach', 'Elephant Beach Scuba', 'Cellular Jail', 'Neil Island Coral'],
      hotelCount: 2,
      stateCode: 'AN',
      hotelSummary: 'Radhanagar Stilt Eco-Villas & Beachfront Wooden Cottages',
    };
  }

  if (lower.includes('uttarakhand') || lower.includes('rishikesh') || lower.includes('nainital')) {
    return {
      image: '/images/destinations/uttarakhand.jpg',
      gradient: 'linear-gradient(180deg, rgba(15, 35, 25, 0.2) 0%, rgba(15, 35, 25, 0.85) 100%)',
      badge: 'Holy Ganga & Alpine Lakes · North India',
      accent: '#34D399',
      startingPrice: 17500,
      bestSeason: 'Mar – Jun & Sep – Nov',
      highlightTag: 'River Rafting & Serenity',
      category: 'lakes',
      circuitPlaces: ['Rishikesh Ganga Ghats', 'Nainital Naini Lake', 'Mussoorie Kempty', 'Jim Corbett'],
      hotelCount: 2,
      stateCode: 'UK',
      hotelSummary: 'Ganges Riverfront Wellness Resorts & Lakeview Colonial Heritage Hotels',
    };
  }

  // Fallback rotating luxury visual presets with real photography
  const presets: DestinationStyle[] = [
    {
      image: '/images/destinations/kashmir.jpg',
      gradient: 'linear-gradient(180deg, rgba(5, 23, 15, 0.2) 0%, rgba(5, 23, 15, 0.85) 100%)',
      badge: 'Curated Circuit · Verified Stay',
      accent: '#34D399',
      startingPrice: 22000,
      bestSeason: 'Year-Round',
      highlightTag: 'Scenic Mountain Trail',
      category: 'snow',
      circuitPlaces: ['Scenic Valley', 'Lake Promenade', 'Hilltop Viewpoint'],
      hotelCount: 3,
      stateCode: 'IN',
      hotelSummary: 'Handpicked 4★ & 5★ Premium Partner Hotels',
    },
    {
      image: '/images/destinations/kerala.jpg',
      gradient: 'linear-gradient(180deg, rgba(6, 26, 17, 0.2) 0%, rgba(6, 26, 17, 0.85) 100%)',
      badge: 'Scenic Getaway · Verified Stay',
      accent: '#10B981',
      startingPrice: 20000,
      bestSeason: 'Year-Round',
      highlightTag: 'Backwater Retreat',
      category: 'backwaters',
      circuitPlaces: ['Backwaters', 'Tea Plantations', 'Spice Gardens'],
      hotelCount: 3,
      stateCode: 'IN',
      hotelSummary: 'Handpicked 4★ & 5★ Premium Partner Hotels',
    },
    {
      image: '/images/destinations/himachal.jpg',
      gradient: 'linear-gradient(180deg, rgba(15, 45, 58, 0.2) 0%, rgba(15, 45, 58, 0.85) 100%)',
      badge: 'Bespoke Experience · Verified Stay',
      accent: '#2DD4BF',
      startingPrice: 19000,
      bestSeason: 'Year-Round',
      highlightTag: 'Alpine Chalet Stay',
      category: 'snow',
      circuitPlaces: ['Snow Peaks', 'Alpine Valleys', 'Pine Trails'],
      hotelCount: 3,
      stateCode: 'IN',
      hotelSummary: 'Handpicked 4★ & 5★ Premium Partner Hotels',
    },
  ];

  return presets[index % presets.length]!;
}

/**
 * Returns curated partner hotels for any state/destination name
 */
export function getCuratedHotelsForDestination(name: string): CuratedHotel[] {
  const lower = (name || '').toLowerCase();

  if (lower.includes('kashmir') || lower.includes('srinagar')) {
    return [
      {
        id: 'kash-1',
        name: 'The Lalit Grand Palace Srinagar',
        city: 'Srinagar',
        starRating: 5,
        propertyType: 'Palace Hotel',
        startingPrice: 8500,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        address: 'Gupkar Road, Overlooking Dal Lake, Srinagar',
        amenities: ['Dal Lake View', 'Heated Indoor Pool', 'Heritage Royal Suites', 'Fine Dining', 'Free Wi-Fi', '24/7 Room Service'],
        mealPlans: ['EP (Room Only)', 'CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Palace Deluxe Room', 'Heritage Lake View Suite'],
        highlight: 'Maharaja Royal Residence overlooking Dal Lake with private apple orchards.',
      },
      {
        id: 'kash-2',
        name: 'The Khyber Himalayan Resort & Spa',
        city: 'Gulmarg',
        starRating: 5,
        propertyType: 'Luxury Resort',
        startingPrice: 14500,
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
        address: 'Near Gondola Phase 1, Gulmarg, Kashmir',
        amenities: ['Ski-in/Ski-out Access', 'Heated Indoor Pool', 'Pine Forest View', 'L\'Occitane Spa', 'Central Underfloor Heating', 'Multi-Cuisine Buffet'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Premier Pine View Room', 'Luxury Himalayan Cottage'],
        highlight: 'World-famous Alpine luxury resort situated 8,825 ft above sea level near Gondola.',
      },
      {
        id: 'kash-3',
        name: 'Kolahoi Green Resort Pahalgam',
        city: 'Pahalgam',
        starRating: 4,
        propertyType: 'Mountain Resort',
        startingPrice: 5500,
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
        address: 'KP Road, Near Lidder River, Pahalgam',
        amenities: ['Lidder River View', 'Heated Electric Blankets', 'Nightly Bonfire', 'Pure Veg & Jain Meals', 'In-House Bakery', 'Free Wi-Fi'],
        mealPlans: ['EP (Room Only)', 'CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
        roomTypes: ['Deluxe Pine Room', 'Executive River Suite'],
        highlight: 'Nestled on the banks of roaring Lidder River with lush cedar tree forest.',
      },
      {
        id: 'kash-4',
        name: 'Royal Dal Heritage Luxury Houseboats',
        city: 'Srinagar',
        starRating: 4,
        propertyType: 'Heritage Houseboat',
        startingPrice: 4800,
        image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
        address: 'Ghat No. 7, Boulevard Road, Dal Lake, Srinagar',
        amenities: ['Private Shikara Transfers', 'Handcrafted Walnut Wood', 'Traditional Kashmiri Wazwan & Kahwa', 'Lakefront Sun Deck', 'Hot Water & Wi-Fi'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Royal Cedar Suite', 'Presidential Water Suite'],
        highlight: 'Authentic floating cedar wood palace anchored on serene waters of Dal Lake.',
      },
    ];
  }

  if (lower.includes('kerala') || lower.includes('backwater') || lower.includes('munnar')) {
    return [
      {
        id: 'ker-1',
        name: 'Blanket Luxury Hotel & Spa Munnar',
        city: 'Munnar',
        starRating: 5,
        propertyType: 'Luxury Hill Resort',
        startingPrice: 7200,
        image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
        address: 'Attukad Waterfalls Road, Pallivasal, Munnar',
        amenities: ['Attukad Waterfall View', 'Valley-Facing Infinity Pool', 'Ayurvedic Wellness Spa', 'Campfire & Live Music', 'Multi-Cuisine Dining'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Camellia Valley View Suite', 'Blanket Presidential Suite'],
        highlight: 'Uninterrupted views of misty tea plantations and cascading Attukad waterfalls.',
      },
      {
        id: 'ker-2',
        name: 'Kumarakom Lake Resort',
        city: 'Kumarakom / Alleppey',
        starRating: 5,
        propertyType: 'Heritage Lake Resort',
        startingPrice: 12500,
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
        address: 'Vembanad Lake, Kumarakom, Kerala',
        amenities: ['Meandering Pool Access', 'Vembanad Lakefront', 'Seafood Specialty Dining', 'Ayurvedic Healing', 'Sunset Cruise on Lake'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Heritage Villa with Private Pool', 'Meandering Pool Duplex Villa'],
        highlight: 'Prince Charles preferred heritage sanctuary recreated from 16th-century homesteads.',
      },
      {
        id: 'ker-3',
        name: 'Rainbow Cruises Premium Houseboat',
        city: 'Alleppey',
        starRating: 4,
        propertyType: 'Luxury Houseboat',
        startingPrice: 6500,
        image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
        address: 'Punnamada Finishing Point, Alleppey, Kerala',
        amenities: ['Glass-Enclosed AC Cruise', 'Private On-Board Chef', 'Fresh Kerala Karimeen Fry & Sadya', 'Upper Sun Deck', 'Lakeside Mooring'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Luxury 1-Bedroom Cruise Suite', 'Grand 2-Bedroom Family Cruiser'],
        highlight: 'Glide through palm-fringed backwater canals with bespoke chef-curated meals.',
      },
    ];
  }

  if (lower.includes('himachal') || lower.includes('manali') || lower.includes('shimla')) {
    return [
      {
        id: 'him-1',
        name: 'The Himalayan Luxury Castle & Resort',
        city: 'Manali',
        starRating: 5,
        propertyType: 'Castle Resort',
        startingPrice: 7800,
        image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
        address: 'Hadimba Road, Manali, Himachal Pradesh',
        amenities: ['Snow Peak Panorama', 'Heated Outdoor Pool', 'Victorian Gothic Castle', 'Fireplace Lounge', 'Apple Orchards'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Castle Chamber Suite', 'Luxury Orchard Cottage'],
        highlight: 'Premier Gothic revival castle surrounded by towering deodar trees and snow peaks.',
      },
      {
        id: 'him-2',
        name: 'Wildflower Hall, An Oberoi Resort',
        city: 'Shimla',
        starRating: 5,
        propertyType: 'Heritage Luxury Resort',
        startingPrice: 16500,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        address: 'Chharabra, Shimla, Himachal Pradesh',
        amenities: ['Cedar Forest Views', 'Outdoor Heated Open-Air Jacuzzi', 'Luxury Spa Pavilions', 'Fine Pan-Asian & Himachali Dining', 'Nature Sanctuary Trails'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
        roomTypes: ['Premier Mountain View Room', 'Lord Kitchener Suite'],
        highlight: 'Former residence of Lord Kitchener set amidst 22 acres of protected cedar forest.',
      },
      {
        id: 'him-3',
        name: 'Solang Valley Alpine Resort',
        city: 'Solang / Manali',
        starRating: 4,
        propertyType: 'Alpine Resort',
        startingPrice: 4600,
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
        address: 'Solang Valley, Palchan, Manali',
        amenities: ['Direct Snow Valley Access', 'Riverside Deck', 'Glacier Views', 'Nightly Bonfire', 'Adventure Desk'],
        mealPlans: ['EP (Room Only)', 'CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
        roomTypes: ['Glacier Point Deluxe Room'],
        highlight: 'Closest premium property to Solang Ski Slopes and Atal Tunnel gateway.',
      },
    ];
  }

  if (lower.includes('rajasthan') || lower.includes('jaipur') || lower.includes('udaipur')) {
    return [
      {
        id: 'raj-1',
        name: 'Taj Lake Palace Udaipur',
        city: 'Udaipur',
        starRating: 5,
        propertyType: 'Heritage Palace',
        startingPrice: 18000,
        image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=800&q=80',
        address: 'Lake Pichola, Udaipur, Rajasthan',
        amenities: ['Floating Island Palace', 'Private Royal Boat Arrival', 'Dedicated Butler Service', 'Pure White Marble Architecture', 'Jiva Boat Spa'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Palace Room Lake View', 'Royal Grand Presidential Suite'],
        highlight: 'Floating marble palace on Lake Pichola built in 1746 by Maharana Jagat Singh II.',
      },
      {
        id: 'raj-2',
        name: 'ITC Rajputana Luxury Collection',
        city: 'Jaipur',
        starRating: 5,
        propertyType: 'Luxury Heritage Hotel',
        startingPrice: 6900,
        image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
        address: 'Palace Road, Near Station, Jaipur',
        amenities: ['Haveli Courtyards', 'Swimming Pool', 'Kaya Kalp Spa', 'Peshawri Fine Dining', 'Evening Folk Music & Dance'],
        mealPlans: ['EP (Room Only)', 'CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
        roomTypes: ['Rajputana Royale Chamber', 'Thikana Heritage Suite'],
        highlight: 'Recreation of royal Rajasthani havelis with intricate stone jalis and water courtyards.',
      },
      {
        id: 'raj-3',
        name: 'Chokhi Dhani Ethnic Resort',
        city: 'Jaipur',
        starRating: 4,
        propertyType: 'Ethnic Heritage Resort',
        startingPrice: 4200,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        address: '12 Miles Tonk Road, Via Vatika, Jaipur',
        amenities: ['Ethnic Village Setup', 'Royal Rajasthani Thali Dining', 'Folk Performances & Camel Rides', 'Ayurvedic Spa', 'Swimming Pool'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
        roomTypes: ['Ethnic Cottage Suite'],
        highlight: 'Celebrated cultural oasis bringing alive ancient Rajasthani art, hospitality, and cuisine.',
      },
    ];
  }

  if (lower.includes('goa')) {
    return [
      {
        id: 'goa-1',
        name: 'The Leela Goa Resort & Beach Villas',
        city: 'South Goa',
        starRating: 5,
        propertyType: 'Beach Resort',
        startingPrice: 11000,
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
        address: 'Mobor Beach, Cavelossim, Goa',
        amenities: ['Direct Mobor Beach Access', '12-Hole Golf Course', 'Lagoon Suites', 'Seafood Beach Grill', 'Ayurvedic Spa & Pool'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Lagoon Terrace Suite', 'Royal Beach Villa with Plunge Pool'],
        highlight: '75-acre tropical paradise blending Vijayanagara palace architecture and Portuguese styling.',
      },
      {
        id: 'goa-2',
        name: 'Taj Fort Aguada Resort & Spa',
        city: 'North Goa',
        starRating: 5,
        propertyType: 'Heritage Beach Resort',
        startingPrice: 8900,
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
        address: 'Sinquerim Beach, Candolim, Goa',
        amenities: ['Cliff-Top Arabian Sea View', 'Historic Portuguese Fort', 'Infinity Pool', 'Water Sports Activities', 'Sunset Cocktail Bar'],
        mealPlans: ['EP (Room Only)', 'CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
        roomTypes: ['Sea View Superior Room'],
        highlight: 'India’s first luxury beach resort built on ramparts of 16th-century Portuguese fortress.',
      },
      {
        id: 'goa-3',
        name: 'Santana Beach Boutique Resort',
        city: 'Candolim',
        starRating: 3,
        propertyType: 'Boutique Resort',
        startingPrice: 3200,
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
        address: 'Quinta Costa Frias, Candolim, Goa',
        amenities: ['200m Walk to Beach', '2 Swimming Pools', 'Olegario’s Pool Bistro', 'Tropical Gardens', 'Free Wi-Fi'],
        mealPlans: ['EP (Room Only)', 'CP (Breakfast)'],
        roomTypes: ['Standard Garden Pool Room'],
        highlight: 'Cozy Portuguese-style garden retreat located minutes away from golden Candolim sands.',
      },
    ];
  }

  if (lower.includes('andaman')) {
    return [
      {
        id: 'and-1',
        name: 'Taj Exotica Resort & Spa Havelock',
        city: 'Havelock Island',
        starRating: 5,
        propertyType: 'Eco Luxury Resort',
        startingPrice: 15500,
        image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
        address: 'Radhanagar Beach No. 7, Havelock Island',
        amenities: ['Private Radhanagar Beach Trail', 'Luxury Wooden Stilt Villas', 'Olympic Size Pool', 'Coral Reef Scuba & Snorkel', 'Fine Coastal Dining'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'],
        roomTypes: ['Grand Luxury Stilt Villa'],
        highlight: '46-acre sanctuary on Asia’s best beach with indigenous padauk wood stilt architecture.',
      },
      {
        id: 'and-2',
        name: 'Symphony Palms Beach Resort',
        city: 'Havelock Island',
        starRating: 4,
        propertyType: 'Beachfront Resort',
        startingPrice: 5800,
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
        address: 'Govind Nagar Beach No. 3, Havelock Island',
        amenities: ['Private Beachfront Access', 'Ocean View Wooden Cottages', 'Candlelight Beach Dinners', 'Snorkeling & Scuba Desk', 'Ayurvedic Spa'],
        mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
        roomTypes: ['Lagoon Suite Cottage'],
        highlight: 'Direct barefoot access to turquoise waters and private coconut palm beachfront.',
      },
    ];
  }

  // Uttarakhand
  return [
    {
      id: 'uk-1',
      name: 'Aloha On The Ganges Resort',
      city: 'Rishikesh',
      starRating: 4,
      propertyType: 'Riverfront Resort',
      startingPrice: 5900,
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
      address: 'Tapovan, Rishikesh, Uttarakhand',
      amenities: ['Holy Ganges River View', 'Infinity Pool Overlooking Hills', 'Morning Ganga Yoga', 'Ayurvedic Spa', 'Pure Veg & Jain Kitchen'],
      mealPlans: ['EP (Room Only)', 'CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
      roomTypes: ['Ganga View Superior Suite'],
      highlight: 'Perched on the tranquil banks of sacred River Ganga with panoramic Himalayan foothills.',
    },
    {
      id: 'uk-2',
      name: 'The Naini Retreat Heritage Hotel',
      city: 'Nainital',
      starRating: 4,
      propertyType: 'Heritage Hotel',
      startingPrice: 5200,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      address: 'Ayarpatta Slopes, Nainital, Uttarakhand',
      amenities: ['Naini Lake Panorama', 'Colonial British Architecture', 'Nightly Bonfires', 'Gurney House Fine Dining', 'Free Wi-Fi'],
      mealPlans: ['CP (Breakfast)', 'MAP (Breakfast + Dinner)'],
      roomTypes: ['Heritage Lake View Chamber'],
      highlight: 'Historic residence of the Maharaja of Pilibhit overlooking the crescent of Naini Lake.',
    },
  ];
}


