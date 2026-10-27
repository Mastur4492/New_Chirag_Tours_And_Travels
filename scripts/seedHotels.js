const mongoose = require('mongoose');

const hotelsData = [
  // KASHMIR
  {
    destSlug: 'kashmir-valley-circuit',
    name: 'The Lalit Grand Palace Srinagar',
    starRating: 5,
    propertyType: 'HOTEL',
    city: 'Srinagar',
    address: 'Gupkar Road, Dal Lake, Srinagar, Kashmir',
    amenities: ['Free Wi-Fi', 'Dal Lake View', 'Heritage Architecture', 'Heated Indoor Pool', 'Fine Dining Restaurant', 'Spa & Sauna', '24/7 Room Service'],
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', '/images/destinations/kashmir.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 8500,
    rooms: [
      { name: 'Palace Deluxe Room', allowedMealPlans: ['EP', 'CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 },
      { name: 'Heritage Lake View Suite', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'kashmir-valley-circuit',
    name: 'The Khyber Himalayan Resort & Spa',
    starRating: 5,
    propertyType: 'RESORT',
    city: 'Gulmarg',
    address: 'Near Gondola Phase 1, Gulmarg, Kashmir',
    amenities: ['Pine Forest View', 'Ski-in/Ski-out Access', 'Central Heating', 'Luxury Heated Pool', 'Multi-Cuisine Buffet', 'LOccitane Spa'],
    images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', '/images/destinations/kashmir.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 14500,
    rooms: [
      { name: 'Premier Pine View Room', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 1 },
      { name: 'Luxury Himalayan Cottage', allowedMealPlans: ['MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'kashmir-valley-circuit',
    name: 'Kolahoi Green Resort Pahalgam',
    starRating: 4,
    propertyType: 'RESORT',
    city: 'Pahalgam',
    address: 'KP Road, Near Lidder River, Pahalgam',
    amenities: ['Lidder River View', 'Bonfire & Lawn', 'Heated Blankets', 'Pure Veg & Jain Meals Available', 'Free Wi-Fi', 'In-House Bakery'],
    images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80', '/images/destinations/kashmir.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 5500,
    rooms: [
      { name: 'Deluxe Pine Room', allowedMealPlans: ['EP', 'CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 },
      { name: 'Executive River Suite', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'kashmir-valley-circuit',
    name: 'Royal Dal Heritage Luxury Houseboats',
    starRating: 4,
    propertyType: 'HOUSEBOAT',
    city: 'Srinagar',
    address: 'Ghat No. 7, Boulevard Road, Dal Lake, Srinagar',
    amenities: ['Private Shikara Transfers', 'Hand-Carved Walnut Wood Suites', 'Traditional Kashmiri Kahwa & Meals', 'Lakefront Balcony', 'Hot Water & Wi-Fi'],
    images: ['https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80', '/images/destinations/kashmir.jpg'],
    checkInTime: '12:00',
    checkOutTime: '10:00',
    startingPrice: 4800,
    rooms: [
      { name: 'Royal Cedar Suite', allowedMealPlans: ['CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 },
      { name: 'Presidential Water Suite', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },

  // KERALA
  {
    destSlug: 'kerala-serene-backwaters',
    name: 'Blanket Luxury Hotel & Spa Munnar',
    starRating: 5,
    propertyType: 'RESORT',
    city: 'Munnar',
    address: 'Attukad Waterfalls Road, Pallivasal, Munnar, Kerala',
    amenities: ['Waterfall & Tea Garden View', 'Infinity Pool', 'Ayurvedic Spa', 'Campfire & Barbecue', 'Multi-Cuisine Restaurant', 'Recreation Club'],
    images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80', '/images/destinations/kerala.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 7200,
    rooms: [
      { name: 'Camellia Valley View Suite', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 },
      { name: 'Blanket Presidential Suite', allowedMealPlans: ['MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'kerala-serene-backwaters',
    name: 'Kumarakom Lake Resort',
    starRating: 5,
    propertyType: 'RESORT',
    city: 'Kumarakom / Alleppey',
    address: 'Vembanad Lake, Kumarakom, Kerala',
    amenities: ['Meandering Pool Villa', 'Vembanad Lake View', 'Authentic Seafood Dining', 'Ayurvedic Healing', 'Sunset Boat Cruise'],
    images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', '/images/destinations/kerala.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 12500,
    rooms: [
      { name: 'Heritage Villa with Private Pool', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 },
      { name: 'Meandering Pool Duplex Villa', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'kerala-serene-backwaters',
    name: 'Rainbow Cruises Premium Houseboat',
    starRating: 4,
    propertyType: 'HOUSEBOAT',
    city: 'Alleppey',
    address: 'Punnamada Finishing Point, Alleppey, Kerala',
    amenities: ['Fully Air-Conditioned Glass Cruise', 'Private Chef on Board', 'Traditional Kerala Sadya & Karimeen', 'Upper Sun Deck', 'Backwater Serenity'],
    images: ['https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80', '/images/destinations/kerala.jpg'],
    checkInTime: '12:00',
    checkOutTime: '09:00',
    startingPrice: 6500,
    rooms: [
      { name: 'Luxury 1-Bedroom Cruise Suite', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 },
      { name: 'Grand 2-Bedroom Family Cruiser', allowedMealPlans: ['MAP', 'AP'], baseOccupancy: 4, maxAdults: 6, maxChildren: 3 }
    ]
  },

  // HIMACHAL
  {
    destSlug: 'himachal-hills-and-snow',
    name: 'The Himalayan Luxury Castle & Resort Manali',
    starRating: 5,
    propertyType: 'RESORT',
    city: 'Manali',
    address: 'Hadimba Road, Manali, Himachal Pradesh',
    amenities: ['Snow Peak Views', 'Heated Swimming Pool', 'Victorian Castle Ambiance', 'Bar & Fireplace Lounge', 'Orchard Gardens'],
    images: ['https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80', '/images/destinations/himachal.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 7800,
    rooms: [
      { name: 'Castle Chamber Suite', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 },
      { name: 'Luxury Orchard Cottage', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'himachal-hills-and-snow',
    name: 'Wildflower Hall, An Oberoi Resort Shimla',
    starRating: 5,
    propertyType: 'RESORT',
    city: 'Shimla',
    address: 'Chharabra, Shimla, Himachal Pradesh',
    amenities: ['Panoramic Cedar Forest View', 'Outdoor Heated Jacuzzi', 'Gourmet Pan-Asian & Indian Cuisine', 'Luxury Spa', 'Nature Sanctuary Walks'],
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', '/images/destinations/himachal.jpg'],
    checkInTime: '14:00',
    checkOutTime: '12:00',
    startingPrice: 16500,
    rooms: [
      { name: 'Premier Mountain View Room', allowedMealPlans: ['CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 1 },
      { name: 'Lord Kitchener Suite', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'himachal-hills-and-snow',
    name: 'Solang Valley Alpine Resort',
    starRating: 4,
    propertyType: 'RESORT',
    city: 'Solang / Manali',
    address: 'Solang Valley, Palchan, Manali',
    amenities: ['Direct Adventure Valley Access', 'Riverside Dining', 'Snow View Balconies', 'Nightly Bonfires', 'Free Parking'],
    images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', '/images/destinations/himachal.jpg'],
    checkInTime: '13:00',
    checkOutTime: '11:00',
    startingPrice: 4600,
    rooms: [
      { name: 'Glacier Point Deluxe', allowedMealPlans: ['EP', 'CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 }
    ]
  },

  // RAJASTHAN
  {
    destSlug: 'royal-rajasthan-heritage',
    name: 'Taj Lake Palace Udaipur',
    starRating: 5,
    propertyType: 'HERITAGE_HAVELI',
    city: 'Udaipur',
    address: 'Lake Pichola, Udaipur, Rajasthan',
    amenities: ['Island Palace in Lake', 'Private Boat Transfer', 'Royal Butler Service', 'Heritage Marble Architecture', 'Jiva Spa on Boat'],
    images: ['https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=800&q=80', '/images/destinations/rajasthan.jpg'],
    checkInTime: '14:00',
    checkOutTime: '12:00',
    startingPrice: 18000,
    rooms: [
      { name: 'Palace Room Lake View', allowedMealPlans: ['CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 1 },
      { name: 'Royal Grand Presidential Suite', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'royal-rajasthan-heritage',
    name: 'ITC Rajputana Luxury Collection Jaipur',
    starRating: 5,
    propertyType: 'HOTEL',
    city: 'Jaipur',
    address: 'Palace Road, Near Station, Jaipur, Rajasthan',
    amenities: ['Traditional Rajasthani Architecture', 'Swimming Pool', 'Kaya Kalp Spa', 'Peshawri Fine Dining', 'Cultural Evening Folk Dance'],
    images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80', '/images/destinations/rajasthan.jpg'],
    checkInTime: '14:00',
    checkOutTime: '12:00',
    startingPrice: 6900,
    rooms: [
      { name: 'Rajputana Royale Chamber', allowedMealPlans: ['EP', 'CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 },
      { name: 'Thikana Heritage Suite', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'royal-rajasthan-heritage',
    name: 'Chokhi Dhani Ethnic Resort Jaipur',
    starRating: 4,
    propertyType: 'RESORT',
    city: 'Jaipur',
    address: '12 Miles Tonk Road, Via Vatika, Jaipur',
    amenities: ['Ethnic Village Ambiance', 'Rajasthani Royal Thali', 'Folk Music & Puppet Shows', 'Ayurvedic Village Spa', 'Swimming Pool'],
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', '/images/destinations/rajasthan.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 4200,
    rooms: [
      { name: 'Ethnic Cottage Suite', allowedMealPlans: ['CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 }
    ]
  },

  // GOA
  {
    destSlug: 'goa-coastal-leisure',
    name: 'The Leela Goa Resort & Beach Villas',
    starRating: 5,
    propertyType: 'RESORT',
    city: 'South Goa',
    address: 'Mobor Beach, Cavelossim, Goa',
    amenities: ['Private Pristine Beach Access', '12-Hole Golf Course', 'Lagoon Suites', 'World-Class Seafood Grills', 'Ayurvedic Spa'],
    images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', '/images/destinations/goa.jpg'],
    checkInTime: '14:00',
    checkOutTime: '12:00',
    startingPrice: 11000,
    rooms: [
      { name: 'Lagoon Terrace Suite', allowedMealPlans: ['CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 },
      { name: 'Royal Beach Villa with Private Plunge Pool', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 4, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'goa-coastal-leisure',
    name: 'Taj Fort Aguada Resort & Spa Candolim',
    starRating: 5,
    propertyType: 'RESORT',
    city: 'North Goa',
    address: 'Sinquerim Beach, Candolim, Goa',
    amenities: ['Cliff-Top Arabian Sea View', 'Historic Fort Backdrop', 'Infinity Beach Pool', 'Water Sports Desk', 'Sunset Cocktail Lounge'],
    images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80', '/images/destinations/goa.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 8900,
    rooms: [
      { name: 'Sea View Superior Room', allowedMealPlans: ['EP', 'CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'goa-coastal-leisure',
    name: 'Santana Beach Boutique Resort Candolim',
    starRating: 3,
    propertyType: 'RESORT',
    city: 'Candolim',
    address: 'Shop No. 1, Quinta Costa Frias Complex, Candolim, Goa',
    amenities: ['Direct Walk to Beach', '2 Swimming Pools', 'Olegarios Poolside Bistro', 'Tropical Gardens', 'Free Wi-Fi'],
    images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', '/images/destinations/goa.jpg'],
    checkInTime: '13:00',
    checkOutTime: '11:00',
    startingPrice: 3200,
    rooms: [
      { name: 'Standard Garden Pool Room', allowedMealPlans: ['EP', 'CP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 1 }
    ]
  },

  // ANDAMAN
  {
    destSlug: 'andaman-tropical-islands',
    name: 'Taj Exotica Resort & Spa Havelock',
    starRating: 5,
    propertyType: 'RESORT',
    city: 'Havelock Island',
    address: 'Radhanagar Beach No. 7, Havelock Island, Andaman',
    amenities: ['Exclusive Radhanagar Beach Access', 'Private Luxury Stilt Villas', 'Olympic Size Infinity Pool', 'Scuba Diving & Coral Safari', 'Fine Coastal Dining'],
    images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80', '/images/destinations/andaman.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 15500,
    rooms: [
      { name: 'Grand Luxury Villa', allowedMealPlans: ['CP', 'MAP', 'AP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'andaman-tropical-islands',
    name: 'Symphony Palms Beach Resort Havelock',
    starRating: 4,
    propertyType: 'RESORT',
    city: 'Havelock Island',
    address: 'Govind Nagar Beach No. 3, Havelock Island',
    amenities: ['Private Beach Front', 'Ocean View Wooden Cottages', 'Beachside Candlelight Dinner', 'Snorkeling Equipment', 'Ayurvedic Spa'],
    images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', '/images/destinations/andaman.jpg'],
    checkInTime: '13:00',
    checkOutTime: '10:00',
    startingPrice: 5800,
    rooms: [
      { name: 'Lagoon Suite Cottage', allowedMealPlans: ['CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 }
    ]
  },

  // UTTARAKHAND
  {
    destSlug: 'uttarakhand-lakes-and-hills',
    name: 'Aloha On The Ganges Resort Rishikesh',
    starRating: 4,
    propertyType: 'RESORT',
    city: 'Rishikesh',
    address: 'Tapovan, Rishikesh, Uttarakhand',
    amenities: ['Holy River Ganga View', 'Infinity Pool Overlooking Hills', 'Morning Yoga Sessions', 'Ayurvedic Spa', 'Pure Vegetarian Multi-Cuisine'],
    images: ['https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80', '/images/destinations/uttarakhand.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 5900,
    rooms: [
      { name: 'Ganga View Superior Suite', allowedMealPlans: ['EP', 'CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 }
    ]
  },
  {
    destSlug: 'uttarakhand-lakes-and-hills',
    name: 'The Naini Retreat Heritage Hotel Nainital',
    starRating: 4,
    propertyType: 'HERITAGE_HAVELI',
    city: 'Nainital',
    address: 'Ayarpatta Slopes, Nainital, Uttarakhand',
    amenities: ['Naini Lake Panorama', 'Colonial Heritage Decor', 'Bonfire Evenings', 'Gurney House Fine Dining', 'Indoor Games & Library'],
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', '/images/destinations/uttarakhand.jpg'],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    startingPrice: 5200,
    rooms: [
      { name: 'Heritage Lake View Chamber', allowedMealPlans: ['CP', 'MAP'], baseOccupancy: 2, maxAdults: 3, maxChildren: 2 }
    ]
  }
];

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/chirag_travels');
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;
  const dests = await db.collection('destinations').find({}).toArray();
  const slugToId = {};
  dests.forEach(d => { slugToId[d.slug] = d._id; });

  let insertedHotels = 0;
  let insertedRooms = 0;

  for (const h of hotelsData) {
    const destId = slugToId[h.destSlug];
    if (!destId) {
      console.log('Skipping destination slug not found:', h.destSlug);
      continue;
    }

    const existing = await db.collection('hotels').findOne({ name: h.name });
    let hotelId;
    if (existing) {
      hotelId = existing._id;
      await db.collection('hotels').updateOne({ _id: hotelId }, {
        $set: {
          destinationId: destId,
          starRating: h.starRating,
          propertyType: h.propertyType,
          city: h.city,
          address: h.address,
          amenities: h.amenities,
          images: h.images,
          checkInTime: h.checkInTime,
          checkOutTime: h.checkOutTime,
          isActive: true,
          updatedAt: new Date()
        }
      });
      console.log('Updated existing hotel:', h.name);
    } else {
      const res = await db.collection('hotels').insertOne({
        name: h.name,
        destinationId: destId,
        starRating: h.starRating,
        propertyType: h.propertyType,
        city: h.city,
        address: h.address,
        amenities: h.amenities,
        images: h.images,
        checkInTime: h.checkInTime,
        checkOutTime: h.checkOutTime,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      hotelId = res.insertedId;
      insertedHotels++;
      console.log('Inserted new hotel:', h.name);
    }

    for (const r of (h.rooms || [])) {
      const existingRoom = await db.collection('roomcategories').findOne({ hotelId, name: r.name });
      if (!existingRoom) {
        await db.collection('roomcategories').insertOne({
          hotelId,
          name: r.name,
          baseOccupancy: r.baseOccupancy || 2,
          maxAdults: r.maxAdults || 3,
          maxChildren: r.maxChildren || 2,
          extraBedSupported: true,
          maxExtraBeds: 1,
          allowedMealPlans: r.allowedMealPlans || ['EP', 'CP', 'MAP', 'AP'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        insertedRooms++;
      }
    }
  }

  console.log(`Seeding complete! Inserted: ${insertedHotels} hotels, ${insertedRooms} rooms.`);
  const total = await db.collection('hotels').countDocuments({});
  console.log('Total hotels in DB now:', total);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
