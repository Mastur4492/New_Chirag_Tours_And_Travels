import mongoose from 'mongoose';
import {
  ITransportScheduleLockDocument,
  TransportScheduleLockModel,
} from '../models/transportScheduleLock.model';

export interface LockAcquisitionResult {
  success: boolean;
  conflictResource?: 'VEHICLE' | 'DRIVER';
  conflictResourceId?: string;
  conflictDate?: string;
  error?: string;
}

export class TransportScheduleLockRepository {
  /**
   * Acquires schedule locks for vehicle and driver across dates using the recoverable reservation protocol.
   * Crash-safe, preserves existing locks during failed reassignment, handles retries and concurrent competitors.
   */
  async acquireScheduleLocks(params: {
    assignmentId: string;
    bookingId: string;
    bookingNumber: string;
    vehicleId: string;
    driverId: string;
    dates: string[]; // YYYY-MM-DD
    reservationIntentId: string;
    currentLockIntentId?: string;
  }): Promise<LockAcquisitionResult> {
    const {
      assignmentId,
      bookingId,
      bookingNumber,
      vehicleId,
      driverId,
      dates,
      reservationIntentId,
      currentLockIntentId,
    } = params;

    const assignObjId = new mongoose.Types.ObjectId(assignmentId);
    const bookingObjId = new mongoose.Types.ObjectId(bookingId);

    // Step 0: Recovery of orphan/stale locks for this assignment from prior crashed attempts
    if (currentLockIntentId) {
      await TransportScheduleLockModel.deleteMany({
        assignmentId: assignObjId,
        reservationIntentId: { $nin: [currentLockIntentId, reservationIntentId] },
      }).exec();
    } else {
      await TransportScheduleLockModel.deleteMany({
        assignmentId: assignObjId,
        reservationIntentId: { $ne: reservationIntentId },
      }).exec();
    }

    // Step 1: Inspect existing locks currently committed to this assignment
    const existingLocks = await TransportScheduleLockModel.find({
      assignmentId: assignObjId,
      reservationIntentId: currentLockIntentId,
    }).exec();

    const existingLockKeys = new Set(
      existingLocks.map((l) => `${l.resourceType}_${l.resourceId.toString()}_${l.dateStr}`)
    );

    const targetSlots: Array<{ type: 'VEHICLE' | 'DRIVER'; id: string; dateStr: string }> = [];
    for (const dateStr of dates) {
      targetSlots.push({ type: 'VEHICLE', id: vehicleId, dateStr });
      targetSlots.push({ type: 'DRIVER', id: driverId, dateStr });
    }

    const slotsToAcquire: Array<{ type: 'VEHICLE' | 'DRIVER'; id: string; dateStr: string }> = [];
    const retainedSlots: Array<{ type: 'VEHICLE' | 'DRIVER'; id: string; dateStr: string }> = [];

    for (const slot of targetSlots) {
      const key = `${slot.type}_${slot.id}_${slot.dateStr}`;
      if (existingLockKeys.has(key)) {
        retainedSlots.push(slot);
      } else {
        slotsToAcquire.push(slot);
      }
    }

    const newlyCreatedLockIds: mongoose.Types.ObjectId[] = [];
    let currentAttemptingSlot: { type: 'VEHICLE' | 'DRIVER'; id: string; dateStr: string } | null = null;

    try {
      // Step 2: Tentatively acquire only the new slots with reservationIntentId
      for (const slot of slotsToAcquire) {
        currentAttemptingSlot = slot;
        const lockDoc = await TransportScheduleLockModel.create({
          resourceType: slot.type,
          resourceId: new mongoose.Types.ObjectId(slot.id),
          dateStr: slot.dateStr,
          slotType: 'FULL_DAY',
          assignmentId: assignObjId,
          bookingId: bookingObjId,
          bookingNumber,
          reservationIntentId,
        });
        newlyCreatedLockIds.push(lockDoc._id);
      }

      // Step 3: All new slots secured. Commit the reservation:
      // A) Update retained slots to the new reservationIntentId
      if (retainedSlots.length > 0) {
        await TransportScheduleLockModel.updateMany(
          {
            assignmentId: assignObjId,
            resourceId: {
              $in: [new mongoose.Types.ObjectId(vehicleId), new mongoose.Types.ObjectId(driverId)],
            },
            dateStr: { $in: dates },
          },
          { $set: { reservationIntentId } }
        ).exec();
      }

      // B) Safely release superseded locks (e.g. replaced vehicle or driver)
      await TransportScheduleLockModel.deleteMany({
        assignmentId: assignObjId,
        reservationIntentId: { $ne: reservationIntentId },
      }).exec();

      return { success: true };
    } catch (err: any) {
      // Step 4: Rollback only locks acquired in THIS attempt with reservationIntentId.
      // Retained locks from the previous valid assignment remain completely intact!
      await TransportScheduleLockModel.deleteMany({
        assignmentId: assignObjId,
        reservationIntentId,
      }).exec();

      const isDuplicateKey = err.code === 11000 || (err.message && err.message.includes('E11000'));

      return {
        success: false,
        conflictResource: currentAttemptingSlot?.type,
        conflictResourceId: currentAttemptingSlot?.id,
        conflictDate: currentAttemptingSlot?.dateStr,
        error: isDuplicateKey
          ? `${currentAttemptingSlot?.type || 'Resource'} is already reserved by another assignment on ${currentAttemptingSlot?.dateStr || 'the requested date'}`
          : err.message,
      };
    }
  }

  /**
   * Releases schedule locks owned by an assignment (e.g. on cancellation, completion, or reassignment).
   * If lockIntentId is specified, only releases locks matching that specific committed intent.
   */
  async releaseLocksForAssignment(assignmentId: string, lockIntentId?: string): Promise<number> {
    const filter: Record<string, unknown> = {
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
    };
    if (lockIntentId) {
      filter.reservationIntentId = lockIntentId;
    }

    const res = await TransportScheduleLockModel.deleteMany(filter).exec();
    return res.deletedCount;
  }

  /**
   * Diagnostic helper: checks if vehicle or driver is reserved on specified dates by other assignments.
   */
  async findConflictingLocks(
    resourceType: 'VEHICLE' | 'DRIVER',
    resourceId: string,
    dates: string[],
    excludeAssignmentId?: string
  ): Promise<ITransportScheduleLockDocument[]> {
    const query: Record<string, unknown> = {
      resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
      dateStr: { $in: dates },
      slotType: 'FULL_DAY',
    };

    if (excludeAssignmentId) {
      query.assignmentId = { $ne: new mongoose.Types.ObjectId(excludeAssignmentId) };
    }

    return TransportScheduleLockModel.find(query).exec();
  }

  /**
   * Counts active schedule locks for an assignment.
   */
  async countLocksForAssignment(assignmentId: string): Promise<number> {
    return TransportScheduleLockModel.countDocuments({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
    }).exec();
  }

  /**
   * Counts active schedule locks for a specific resource (vehicle or driver).
   */
  async countActiveLocksForResource(resourceId: string): Promise<number> {
    return TransportScheduleLockModel.countDocuments({
      resourceId: new mongoose.Types.ObjectId(resourceId),
    }).exec();
  }

  /**
   * Counts active schedule locks for multiple resources.
   */
  async countActiveLocksForResources(resourceIds: string[]): Promise<number> {
    if (!resourceIds.length) return 0;
    return TransportScheduleLockModel.countDocuments({
      resourceId: { $in: resourceIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).exec();
  }
}

export const transportScheduleLockRepository = new TransportScheduleLockRepository();
