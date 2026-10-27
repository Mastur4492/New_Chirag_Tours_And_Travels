import { connectDB, disconnectDB } from '../config/database';
import { DestinationModel } from '../models/destination.model';
import { logger } from '../utils/logger';

const SEED_DESTINATIONS = [
  {
    name: 'Kashmir Valley Circuit (Srinagar, Gulmarg, Pahalgam)',
    slug: 'kashmir-valley-circuit',
    country: 'India',
    state: 'Jammu & Kashmir',
    region: 'NORTH',
    description: 'Paradise on earth featuring Dal Lake houseboats, Gulmarg Gondola snow rides, and scenic Lidder river meadows in Pahalgam.',
    coverImages: ['/images/destinations/kashmir.jpg'],
    highlights: ['Srinagar Dal Lake Shikara', 'Gulmarg Apharwat Peak Gondola', 'Pahalgam Betaab & Aru Valley', 'Mughal Gardens'],
    isActive: true,
  },
  {
    name: 'Kerala Serene Backwaters (Munnar, Thekkady, Alleppey)',
    slug: 'kerala-serene-backwaters',
    country: 'India',
    state: 'Kerala',
    region: 'SOUTH',
    description: "God's Own Country with mist-covered tea gardens of Munnar, Periyar wildlife in Thekkady, and luxury overnight houseboat cruises in Alleppey.",
    coverImages: ['/images/destinations/kerala.jpg'],
    highlights: ['Alleppey Private Luxury Houseboat', 'Munnar Tea Plantations', 'Thekkady Periyar Wildlife', 'Kathakali & Kalaripayattu'],
    isActive: true,
  },
  {
    name: 'Himachal Hills & Snow (Manali, Shimla, Solang Valley)',
    slug: 'himachal-hills-and-snow',
    country: 'India',
    state: 'Himachal Pradesh',
    region: 'NORTH',
    description: 'Majestic snow-clad peaks, Solang Valley adventure sports, Atal Tunnel, Mall Road walks in Shimla, and pine forest chalets.',
    coverImages: ['/images/destinations/himachal.jpg'],
    highlights: ['Solang Valley Snow Point', 'Atal Tunnel & Sissu Waterfall', 'Shimla Mall Road & Ridge', 'Kullu River Rafting'],
    isActive: true,
  },
  {
    name: 'Royal Rajasthan Heritage (Jaipur, Jodhpur, Udaipur)',
    slug: 'royal-rajasthan-heritage',
    country: 'India',
    state: 'Rajasthan',
    region: 'WEST',
    description: 'Land of royalty, grandiose forts, Lake Pichola boat rides, Mehrangarh Fort, desert camel safaris, and authentic Rajasthani hospitality.',
    coverImages: ['/images/destinations/rajasthan.jpg'],
    highlights: ['Jaipur Amer Fort & Hawa Mahal', 'Udaipur Lake Pichola Cruise', 'Jodhpur Mehrangarh Citadel', 'Royal Heritage Havelis'],
    isActive: true,
  },
  {
    name: 'Goa Coastal Leisure (Calangute, Baga, South Goa)',
    slug: 'goa-coastal-leisure',
    country: 'India',
    state: 'Goa',
    region: 'WEST',
    description: 'Tropical sun, golden sandy beaches, historic Portuguese churches, vibrant beach shacks, water sports, and sunset cruises.',
    coverImages: ['/images/destinations/goa.jpg'],
    highlights: ['Calangute & Baga Watersports', 'Old Goa Basilica of Bom Jesus', 'Dudhsagar Waterfall Tour', 'Mandovi River Sunset Cruise'],
    isActive: true,
  },
  {
    name: 'Andaman Tropical Islands (Port Blair, Havelock)',
    slug: 'andaman-tropical-islands',
    country: 'India',
    state: 'Andaman and Nicobar',
    region: 'ISLANDS',
    description: 'Exotic tropical paradise featuring Radhanagar white sand beach, scuba diving, coral reefs, and Cellular Jail light & sound show.',
    coverImages: ['/images/destinations/andaman.jpg'],
    highlights: ['Havelock Island Radhanagar Beach', 'Elephant Beach Snorkeling', 'Cellular Jail National Memorial', 'Coral Reef Scuba Dive'],
    isActive: true,
  },
  {
    name: 'Uttarakhand Lakes & Hills (Nainital, Mussoorie, Rishikesh)',
    slug: 'uttarakhand-lakes-and-hills',
    country: 'India',
    state: 'Uttarakhand',
    region: 'NORTH',
    description: 'Serene Himalayan lakes in Nainital, Queen of the Hills Mussoorie, holy Ganga Aarti, and adventure river rafting in Rishikesh.',
    coverImages: ['/images/destinations/uttarakhand.jpg'],
    highlights: ['Naini Lake Yachting & Boating', 'Mussoorie Kempty Falls', 'Rishikesh Ganga Aarti & Rafting', 'Himalayan Viewpoints'],
    isActive: true,
  },
];

async function seedDestinations() {
  await connectDB();
  logger.info('Connected to MongoDB. Seeding verified destinations...');

  for (const item of SEED_DESTINATIONS) {
    const existing = await DestinationModel.findOne({
      $or: [{ slug: item.slug }, { name: item.name }],
    });

    if (existing) {
      existing.name = item.name;
      existing.country = item.country;
      existing.state = item.state;
      existing.region = item.region as any;
      existing.description = item.description;
      existing.coverImages = item.coverImages;
      existing.highlights = item.highlights;
      existing.isActive = true;
      await existing.save();
      logger.info(`Updated destination: ${item.name} (${existing.id})`);
    } else {
      const created = await DestinationModel.create(item);
      logger.info(`Created destination: ${item.name} (${created.id})`);
    }
  }

  logger.info('Destination seeding completed successfully.');
  await disconnectDB();
}

seedDestinations().catch((err) => {
  logger.error('Failed to seed destinations:', err);
  process.exit(1);
});
