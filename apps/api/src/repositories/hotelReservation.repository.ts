import { HotelReservationModel, IHotelReservationDocument } from '../models/hotelReservation.model';

export class HotelReservationRepository {
  async findByBookingId(bookingId: string): Promise<IHotelReservationDocument[]> {
    return HotelReservationModel.find({ bookingId })
      .populate('hotelId')
      .populate('roomCategoryId')
      .sort({ hotelItemIndex: 1 })
      .exec();
  }

  async findById(id: string): Promise<IHotelReservationDocument | null> {
    return HotelReservationModel.findById(id)
      .populate('hotelId')
      .populate('roomCategoryId')
      .exec();
  }

  async findByBookingAndIndex(
    bookingId: string,
    hotelItemIndex: number
  ): Promise<IHotelReservationDocument | null> {
    return HotelReservationModel.findOne({ bookingId, hotelItemIndex }).exec();
  }

  async upsertInitial(
    data: Partial<IHotelReservationDocument>
  ): Promise<IHotelReservationDocument> {
    const updated = await HotelReservationModel.findOneAndUpdate(
      {
        bookingId: data.bookingId,
        hotelItemIndex: data.hotelItemIndex,
      },
      {
        $setOnInsert: data,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    ).exec();

    return updated!;
  }

  async update(
    id: string,
    data: Partial<IHotelReservationDocument>
  ): Promise<IHotelReservationDocument | null> {
    return HotelReservationModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .populate('hotelId')
      .populate('roomCategoryId')
      .exec();
  }

  async claimVoucherAllocation(id: string): Promise<IHotelReservationDocument | null> {
    const staleCutoff = new Date(Date.now() - 30 * 1000);
    return HotelReservationModel.findOneAndUpdate(
      {
        _id: id,
        voucherIssued: false,
        status: 'CONFIRMED',
        $or: [
          { voucherAllocationInProgress: { $ne: true } },
          { voucherAllocationClaimedAt: { $lt: staleCutoff } },
        ],
      },
      {
        $set: {
          voucherAllocationInProgress: true,
          voucherAllocationClaimedAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  async countByBookingId(bookingId: string): Promise<number> {
    return HotelReservationModel.countDocuments({ bookingId }).exec();
  }

  async countVoucherIssuedByBookingId(bookingId: string): Promise<number> {
    return HotelReservationModel.countDocuments({
      bookingId,
      voucherIssued: true,
      status: { $ne: 'CANCELLED' },
    }).exec();
  }

  async cancelActiveForBooking(
    bookingId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<number> {
    const res = await HotelReservationModel.updateMany(
      {
        bookingId,
        status: { $ne: 'CANCELLED' },
      },
      {
        $set: {
          status: 'CANCELLED',
          'supplierCancellation.status': 'PENDING_SUPPLIER_ACKNOWLEDGEMENT',
          'supplierCancellation.requestedAt': new Date(),
          'supplierCancellation.requestedBy': cancelledBy,
          'supplierCancellation.reason': reason || 'Booking cancelled',
        },
      }
    ).exec();

    return res.modifiedCount;
  }
}

export const hotelReservationRepository = new HotelReservationRepository();
