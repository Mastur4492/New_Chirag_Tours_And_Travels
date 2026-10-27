import { connectDB, disconnectDB } from '../config/database';
import { DestinationModel } from '../models/destination.model';
import { HotelModel } from '../models/hotel.model';
import { RoomCategoryModel } from '../models/roomCategory.model';
import { SeasonModel } from '../models/season.model';
import { SeasonalRateCardModel } from '../models/seasonalRateCard.model';
import { logger } from '../utils/logger';

export async function seedRateCardsAndSeasons(): Promise<void> {
  await connectDB();
  logger.info('🚀 Starting comprehensive Rate Cards & Seasons seed for all destinations and rooms...');

  const destinations = await DestinationModel.find({ isActive: true });
  logger.info(`Found ${destinations.length} active destinations`);

  let seasonsCreated = 0;
  let rateCardsCreated = 0;

  for (const dest of destinations) {
    // 1. Ensure at least one comprehensive Regular Season exists for the destination
    let regularSeason = await SeasonModel.findOne({
      destinationId: dest._id,
      seasonType: 'REGULAR',
      startDate: { $lte: new Date('2026-06-01') },
      endDate: { $gte: new Date('2026-12-31') },
    });

    if (!regularSeason) {
      regularSeason = await SeasonModel.create({
        destinationId: dest._id,
        name: `${dest.name} Regular Season 2026-2027`,
        seasonType: 'REGULAR',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2027-12-31T23:59:59.000Z'),
        priority: 10,
        description: `Standard operating season for ${dest.name}`,
        isActive: true,
      });
      seasonsCreated++;
      logger.info(`Created Regular Season for: ${dest.name}`);
    }

    // 2. Find all hotels under this destination
    const hotels = await HotelModel.find({ destinationId: dest._id, isActive: true });

    for (const hotel of hotels) {
      const roomCategories = await RoomCategoryModel.find({ hotelId: hotel._id, isActive: true });

      const baseStartingPrice = (hotel as any).startingPrice || (hotel.starRating >= 5 ? 8500 : hotel.starRating === 4 ? 5500 : 3500);

      for (const room of roomCategories) {
        const mealPlans = ['CP', 'MAP', 'AP', 'RO'] as const;

        for (const mp of mealPlans) {
          const existingCard = await SeasonalRateCardModel.findOne({
            hotelId: hotel._id,
            roomCategoryId: room._id,
            seasonId: regularSeason._id,
            mealPlan: mp,
          });

          if (!existingCard) {
            let mpMultiplier = 1.0;
            if (mp === 'RO') mpMultiplier = 0.8;
            if (mp === 'CP') mpMultiplier = 0.9;
            if (mp === 'MAP') mpMultiplier = 1.0;
            if (mp === 'AP') mpMultiplier = 1.15;

            const baseCost = Math.round(baseStartingPrice * mpMultiplier);
            const sellingPrice = Math.round(baseCost * 1.25);

            await SeasonalRateCardModel.create({
              hotelId: hotel._id,
              roomCategoryId: room._id,
              seasonId: regularSeason._id,
              mealPlan: mp,
              baseCostPerNight: baseCost,
              extraAdultBedCost: Math.round(baseCost * 0.25),
              childWithBedCost: Math.round(baseCost * 0.18),
              childWithoutBedCost: Math.round(baseCost * 0.1),
              standardSellingPrice: sellingPrice,
              validFrom: new Date('2026-01-01T00:00:00.000Z'),
              validTo: new Date('2027-12-31T23:59:59.000Z'),
              isActive: true,
            });
            rateCardsCreated++;
          }
        }
      }
    }
  }

  logger.info(`✅ Seed complete! Seasons added: ${seasonsCreated}, Rate Cards created: ${rateCardsCreated}`);
}

if (require.main === module) {
  seedRateCardsAndSeasons()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Failed to seed rate cards and seasons:', err);
      await disconnectDB();
      process.exit(1);
    });
}
