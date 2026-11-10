import { AgencySettingsDto } from '@chirag/types';
import { AgencySettingsModel } from '../models/agencySettings.model';
import { logger } from '../utils/logger';
import { realtimeService } from './realtime.service';

export class AgencySettingsService {
  /**
   * Retrieves the current agency settings.
   * If no settings exist in MongoDB, initializes the document with verified default business & bank info.
   */
  async getSettings(): Promise<AgencySettingsDto> {
    let settings = await AgencySettingsModel.findOne();
    if (!settings) {
      logger.info('AgencySettings document not found; seeding default agency & banking profile.');
      settings = await AgencySettingsModel.create({
        agencyName: 'New Chirag Tours & Travels',
        founderName: 'Faisal Bikanerwala',
        tagline: 'Ahmedabad Travel Desk • Customized Holidays & Tour Packages',
        supportPhone: '+918866006640',
        supportPhoneDisplay: '+91 88660 06640',
        altPhone: '+917043046833',
        altPhoneDisplay: '+91 70430 46833',
        supportEmail: 'newchiragtoursandtravels@gmail.com',
        operatingHours: 'Daily 10:00 AM – 8:30 PM',
        headOfficeAddress:
          'Shop No 3, Al-Rehman Plaza, nr. Nagori Complex, opp. Alishan Complex, Shakti Society, Danilimda, Ahmedabad, Gujarat 382405',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '382405',
        websiteUrl: 'http://localhost:3000',
        bankName: 'HDFC Bank Ltd',
        accountHolderName: 'NEW CHIRAG TOURS AND TRAVELS',
        accountNumber: '50200084920194',
        ifscCode: 'HDFC0001842',
        branchName: 'Danilimda Branch, Ahmedabad',
        accountType: 'Current Account',
        upiId: '8866006640@upi',
        upiNumber: '+91 88660 06640',
        advancePercentage: 25,
        paymentTerms: '25% Advance to Lock Allotments • Balance 75% on Arrival / Prior to Hotel Check-in',
      });
    }
    const updatedDto = settings.toDto();
    realtimeService.broadcast({
      type: 'AGENCY_SETTINGS_UPDATE',
      title: 'Agency & Banking Settings Updated',
      message: 'New agency branding and bank details are now live',
      data: updatedDto,
    });

    return updatedDto;
  }

  /**
   * Updates agency information and official banking/UPI details.
   */
  async updateSettings(data: Partial<AgencySettingsDto>): Promise<AgencySettingsDto> {
    let settings = await AgencySettingsModel.findOne();
    if (!settings) {
      settings = new AgencySettingsModel();
    }

    // Allowed updatable fields
    const fields: (keyof AgencySettingsDto)[] = [
      'agencyName',
      'founderName',
      'tagline',
      'supportPhone',
      'supportPhoneDisplay',
      'supportEmail',
      'operatingHours',
      'headOfficeAddress',
      'city',
      'state',
      'pincode',
      'websiteUrl',
      'bankName',
      'accountHolderName',
      'accountNumber',
      'ifscCode',
      'branchName',
      'accountType',
      'upiId',
      'upiNumber',
      'advancePercentage',
      'paymentTerms',
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        (settings as any)[field] = data[field];
      }
    }

    await settings.save();
    logger.info('Agency & Banking settings successfully updated.', {
      agencyName: settings.agencyName,
      bankName: settings.bankName,
      accountNumber: settings.accountNumber,
    });

    const updatedDto = settings.toDto();
    realtimeService.broadcast({
      type: 'AGENCY_SETTINGS_UPDATE',
      title: 'Agency & Banking Settings Updated',
      message: 'New agency branding and bank details are now live',
      data: updatedDto,
    });

    return updatedDto;
  }
}

export const agencySettingsService = new AgencySettingsService();
