import {
  ITransportAssignmentDocument,
  TransportAssignmentModel,
} from '../models/transportAssignment.model';

export class TransportAssignmentRepository {
  async findByBookingId(bookingId: string): Promise<ITransportAssignmentDocument[]> {
    return TransportAssignmentModel.find({ bookingId })
      .populate('assignedVehicleId')
      .populate('assignedDriverId')
      .populate('assignedVendorId')
      .sort({ transportItemIndex: 1 })
      .exec();
  }

  async findById(id: string): Promise<ITransportAssignmentDocument | null> {
    return TransportAssignmentModel.findById(id)
      .populate('assignedVehicleId')
      .populate('assignedDriverId')
      .populate('assignedVendorId')
      .exec();
  }

  async findByBookingAndIndex(
    bookingId: string,
    transportItemIndex: number
  ): Promise<ITransportAssignmentDocument | null> {
    return TransportAssignmentModel.findOne({ bookingId, transportItemIndex }).exec();
  }

  async upsertInitial(
    data: Partial<ITransportAssignmentDocument>
  ): Promise<ITransportAssignmentDocument> {
    const updated = await TransportAssignmentModel.findOneAndUpdate(
      {
        bookingId: data.bookingId,
        transportItemIndex: data.transportItemIndex,
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
    data: Partial<ITransportAssignmentDocument>,
    conditions?: Record<string, any>
  ): Promise<ITransportAssignmentDocument | null> {
    const filter = { _id: id, ...(conditions || {}) };
    return TransportAssignmentModel.findOneAndUpdate(
      filter,
      { $set: data },
      { new: true, runValidators: true }
    )
      .populate('assignedVehicleId')
      .populate('assignedDriverId')
      .populate('assignedVendorId')
      .exec();
  }

  async claimDutySlipAllocation(id: string): Promise<ITransportAssignmentDocument | null> {
    const staleCutoff = new Date(Date.now() - 30 * 1000);
    return TransportAssignmentModel.findOneAndUpdate(
      {
        _id: id,
        dutySlipIssued: false,
        status: { $in: ['ASSIGNED', 'DISPATCHED', 'IN_TRANSIT'] },
        $or: [
          { dutySlipAllocationInProgress: { $ne: true } },
          { dutySlipAllocationClaimedAt: { $lt: staleCutoff } },
        ],
      },
      {
        $set: {
          dutySlipAllocationInProgress: true,
          dutySlipAllocationClaimedAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  async countByBookingId(bookingId: string): Promise<number> {
    return TransportAssignmentModel.countDocuments({ bookingId }).exec();
  }

  async countDutySlipIssuedByBookingId(bookingId: string): Promise<number> {
    return TransportAssignmentModel.countDocuments({
      bookingId,
      dutySlipIssued: true,
      status: { $ne: 'CANCELLED' },
    }).exec();
  }

  async cancelActiveForBooking(
    bookingId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<ITransportAssignmentDocument[]> {
    const active = await TransportAssignmentModel.find({
      bookingId,
      status: { $in: ['UNASSIGNED', 'ASSIGNED', 'DISPATCHED'] },
    }).exec();

    for (const a of active) {
      a.status = 'CANCELLED';
      a.supplierCancellation = {
        status: 'PENDING_SUPPLIER_ACKNOWLEDGEMENT',
        requestedAt: new Date(),
        requestedBy: cancelledBy as any,
        reason: reason || 'Booking cancelled',
      };
      await a.save();
    }

    return active;
  }
}

export const transportAssignmentRepository = new TransportAssignmentRepository();
