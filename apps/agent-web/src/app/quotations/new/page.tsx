'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Building2,
  Car,
  Plus,
  Trash2,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  FileCheck,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  DestinationDto,
  HotelDto,
  LeadDto,
  MealPlan,
  RoomCategoryDto,
  TourPackageDto,
  TransportTariffDto,
} from '@chirag/types';
import {
  quotationsApi,
  leadsApi,
  customersApi,
  inventoryApi,
  getAgentUser,
} from '@/lib/api';
import {
  MEAL_PLAN_LABELS,
  formatCurrency,
  formatDate,
  sanitizeDisplayName,
} from '@/lib/labels';
import { InfoBadge } from '@/components/InfoBadge';
import { SearchableSelect } from '@/components/SearchableSelect';

interface HotelStayFormItem {
  id: string; // client temporary id
  hotelId: string;
  roomCategoryId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfRooms: number;
  adultsCount: number;
  childrenWithBedCount: number;
  childrenWithoutBedCount: number;
  mealPlan: MealPlan;
  availableRooms: RoomCategoryDto[];
  loadingRooms: boolean;
}

interface TransportFormItem {
  id: string; // client temporary id
  tariffId: string;
  vehicleId?: string;
  pricingBasis: 'PER_DAY' | 'PER_KM' | 'FIXED_CIRCUIT';
  numberOfDays: number;
  estimatedKm?: number;
  driverAllowanceDays?: number;
  nightHaltDays?: number;
  tollsAndParking?: number;
  notes?: string;
}

function QuotationBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLeadId = searchParams?.get('leadId') || '';
  const reviseQuoteId = searchParams?.get('reviseQuoteId') || '';
  const [revisingQuoteData, setRevisingQuoteData] = useState<any | null>(null);
  const [changeReason, setChangeReason] = useState<string>('Client requested updated itinerary and travel options');

  // Auth & Policy
  const agentUser = getAgentUser();
  const maxDiscountPercent = agentUser?.agentProfile?.maxDiscountPercent ?? 5;
  const maxMarkupPercent = agentUser?.agentProfile?.maxMarkupPercent ?? 20;

  // Master Data
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [packages, setPackages] = useState<TourPackageDto[]>([]);
  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [tariffs, setTariffs] = useState<TransportTariffDto[]>([]);
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState<string>(preselectedLeadId);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [travelStartDate, setTravelStartDate] = useState<string>('');
  const [travelEndDate, setTravelEndDate] = useState<string>('');
  const [numberOfAdults, setNumberOfAdults] = useState<number>(2);
  const [numberOfChildren, setNumberOfChildren] = useState<number>(0);
  const [numberOfInfants, setNumberOfInfants] = useState<number>(0);
  const [validityDays, setValidityDays] = useState<number>(7);

  // Line items
  const [hotelItems, setHotelItems] = useState<HotelStayFormItem[]>([]);
  const [transportItems, setTransportItems] = useState<TransportFormItem[]>([]);

  // Commercial Pricing & Guards
  const [markupType, setMarkupType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [markupPercent, setMarkupPercent] = useState<number>(10);
  const [markupAmount, setMarkupAmount] = useState<number>(0);

  const [discountType, setDiscountType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isTaxApplicable, setIsTaxApplicable] = useState<boolean>(true);

  // Terms & Notes
  const [inclusionsText, setInclusionsText] = useState<string>(
    'Hotel Accommodations on specified meal plan\nPrivate vehicle for airport transfers & sightseeing\nAll toll taxes, parking fees, and driver allowances\nComplimentary Shikara ride in Srinagar'
  );
  const [exclusionsText, setExclusionsText] = useState<string>(
    'Airfare / Train tickets to/from destination\nPersonal expenses, tips, and laundry\nEntry tickets to monuments, gardens, or Gondola rides\nTravel insurance'
  );
  const [termsText, setTermsText] = useState<string>(
    '50% advance payment required upon proposal acceptance to block hotel and transport inventory.\nBalance 50% payable 7 days prior to travel date.\nSubject to standard cancellation policy of New Chirag Tours & Travels.'
  );
  const [agentNotes, setAgentNotes] = useState<string>('');

  // Calculation State
  const [calculatedSummary, setCalculatedSummary] = useState<any | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Memoized Searchable Options
  const leadOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Assigned Lead --' },
      ...leads.map((l) => ({
        value: l.id,
        label: `${l.leadNumber} · ${sanitizeDisplayName(l.customerName)}`,
        subLabel: `${l.customerMobile || 'No mobile'} • ${l.destinationName || 'Tour Lead'}`,
        badge: l.status,
      })),
    ];
  }, [leads]);

  const destinationOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Destination --' },
      ...destinations.map((d) => ({
        value: d.id,
        label: `${d.name} (${d.state})`,
        subLabel: `${d.region} Circuit`,
      })),
    ];
  }, [destinations]);

  const packageOptions = useMemo(() => {
    return [
      { value: '', label: '-- Custom Customization (No Package) --' },
      ...packages.map((p) => ({
        value: p.id,
        label: `${p.title}`,
        subLabel: `${p.durationNights}N / ${p.durationDays}D Circuit`,
        badge: `From ₹${p.startingPrice ? p.startingPrice.toLocaleString('en-IN') : 'N/A'}`,
      })),
    ];
  }, [packages]);

  // Initial Data Load
  useEffect(() => {
    async function init() {
      try {
        const [destRes, leadRes, custRes] = await Promise.all([
          inventoryApi.getDestinations(),
          leadsApi.list({ limit: 100 }),
          customersApi.list({ limit: 100 }),
        ]);

        setDestinations(destRes.data || []);
        setLeads(leadRes.data || []);
        setCustomers(custRes.data || []);

        // If preselected lead exists, populate initial parameters
        if (preselectedLeadId) {
          const lead = (leadRes.data || []).find((l: LeadDto) => l.id === preselectedLeadId);
          if (lead) {
            setSelectedLeadId(lead.id);
            if (lead.destinationId) {
              const destId = typeof lead.destinationId === 'object' ? (lead.destinationId as any)._id : lead.destinationId;
              setSelectedDestinationId(destId);
            }
            if (lead.numberOfAdults) setNumberOfAdults(lead.numberOfAdults);
            if (lead.numberOfChildren) setNumberOfChildren(lead.numberOfChildren);
            if (lead.tentativeTravelDate) {
              const start = new Date(lead.tentativeTravelDate).toISOString().split('T')[0];
              setTravelStartDate(start);
              const nights = lead.durationNights || 4;
              const end = new Date(new Date(start).getTime() + nights * 86400000).toISOString().split('T')[0];
              setTravelEndDate(end);
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to load initial master data:', err);
      }
    }
    init();
  }, [preselectedLeadId]);

  // Load quote to revise if reviseQuoteId is present in query parameters
  useEffect(() => {
    if (!reviseQuoteId) return;
    async function loadQuoteToRevise() {
      try {
        const res = await quotationsApi.getById(reviseQuoteId);
        const q = res.data;
        if (q) {
          setRevisingQuoteData(q);
          if (q.leadId) setSelectedLeadId(q.leadId);
          if (q.destinationId) setSelectedDestinationId(q.destinationId);
          if (q.packageId) setSelectedPackageId(q.packageId);
          if (q.travelStartDate) setTravelStartDate(q.travelStartDate.split('T')[0]);
          if (q.travelEndDate) setTravelEndDate(q.travelEndDate.split('T')[0]);
          if (q.numberOfAdults) setNumberOfAdults(q.numberOfAdults);
          if (q.numberOfChildren) setNumberOfChildren(q.numberOfChildren);
          if (q.numberOfInfants) setNumberOfInfants(q.numberOfInfants);
          if (q.notes) setAgentNotes(q.notes);
          if (q.pricingSummary) {
            setMarkupType(q.pricingSummary.markupType || 'PERCENT');
            setMarkupPercent(q.pricingSummary.markupPercent ?? 10);
            setMarkupAmount(q.pricingSummary.totalMarkupAmount ?? 0);
            setDiscountType(q.pricingSummary.discountType || 'PERCENT');
            setDiscountPercent(q.pricingSummary.discountPercent ?? 0);
            setDiscountAmount(q.pricingSummary.discountAmount ?? 0);
          }
          const normalizeRefId = (raw: any): string => {
            if (!raw) return '';
            if (typeof raw === 'object') return String(raw._id || raw.id || '');
            const s = String(raw).trim();
            const objMatch = s.match(/ObjectId\('([a-f\d]{24})'\)/i);
            if (objMatch) return objMatch[1];
            return s;
          };

          if (q.hotels && q.hotels.length > 0) {
            setHotelItems(
              q.hotels.map((h: any, i: number) => {
                const normHotelId = normalizeRefId(h.hotelId);
                const normRoomId = normalizeRefId(h.roomCategoryId);
                return {
                  id: `h-rev-${i}`,
                  hotelId: normHotelId,
                  roomCategoryId: normRoomId,
                  checkInDate: (h.checkInDate || q.travelStartDate).split('T')[0],
                  checkOutDate: (h.checkOutDate || q.travelEndDate).split('T')[0],
                  numberOfRooms: h.numberOfRooms || 1,
                  adultsCount: h.adultsCount || q.numberOfAdults || 2,
                  childrenWithBedCount: h.childrenWithBedCount || 0,
                  childrenWithoutBedCount: h.childrenWithoutBedCount || 0,
                  mealPlan: h.mealPlan || 'CP',
                  availableRooms: [],
                  loadingRooms: false,
                };
              })
            );

            // Fetch room categories for all existing hotel lines
            q.hotels.forEach((h: any, i: number) => {
              const normHotelId = normalizeRefId(h.hotelId);
              if (normHotelId) {
                fetchRoomCategories(`h-rev-${i}`, normHotelId);
              }
            });
          }
          if (q.transports && q.transports.length > 0) {
            setTransportItems(
              q.transports.map((t: any, i: number) => ({
                id: `t-rev-${i}`,
                vehicleId: normalizeRefId(t.vehicleId),
                tariffId: normalizeRefId(t.tariffId),
                pricingBasis: t.pricingBasis || 'PER_DAY',
                numberOfDays: t.numberOfDays || 1,
                estimatedKm: t.estimatedKm || 0,
                driverAllowanceDays: t.driverAllowanceDays || 0,
                nightHaltDays: t.nightHaltDays || 0,
                tollsAndParking: t.tollsAndParking || 0,
                notes: t.notes || '',
              }))
            );
          }
        }
      } catch (err: any) {
        console.error('Failed to load quotation for revision:', err);
      }
    }
    loadQuoteToRevise();
  }, [reviseQuoteId]);

  // When Destination Changes, load packages, hotels, and tariffs
  useEffect(() => {
    if (!selectedDestinationId) {
      setPackages([]);
      setHotels([]);
      setTariffs([]);
      return;
    }

    async function loadDestinationInventory() {
      try {
        const [pkgRes, hotelRes, tariffRes] = await Promise.all([
          inventoryApi.getPackages(selectedDestinationId),
          inventoryApi.getHotels(selectedDestinationId),
          inventoryApi.getTariffs(selectedDestinationId),
        ]);
        setPackages(pkgRes.data || []);
        setHotels(hotelRes.data || []);
        setTariffs(tariffRes.data || []);
      } catch (err) {
        console.error('Failed to load destination inventory:', err);
      }
    }
    loadDestinationInventory();
  }, [selectedDestinationId]);

  // When Lead is selected from dropdown, fill in defaults
  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    if (lead.destinationId) {
      const destId = typeof lead.destinationId === 'object' ? (lead.destinationId as any)._id : lead.destinationId;
      setSelectedDestinationId(destId);
    }
    if (lead.numberOfAdults) setNumberOfAdults(lead.numberOfAdults);
    if (lead.numberOfChildren) setNumberOfChildren(lead.numberOfChildren);
    if (lead.tentativeTravelDate) {
      const start = new Date(lead.tentativeTravelDate).toISOString().split('T')[0];
      setTravelStartDate(start);
      const nights = lead.durationNights || 4;
      const end = new Date(new Date(start).getTime() + nights * 86400000).toISOString().split('T')[0];
      setTravelEndDate(end);
    }
  };

  // Add Hotel Line Item
  const handleAddHotelStay = () => {
    const newItem: HotelStayFormItem = {
      id: `stay_${Date.now()}_${Math.random()}`,
      hotelId: hotels[0]?.id || '',
      roomCategoryId: '',
      checkInDate: travelStartDate || '',
      checkOutDate: travelEndDate || '',
      numberOfRooms: 1,
      adultsCount: numberOfAdults || 2,
      childrenWithBedCount: 0,
      childrenWithoutBedCount: 0,
      mealPlan: 'CP',
      availableRooms: [],
      loadingRooms: false,
    };

    setHotelItems((prev) => [...prev, newItem]);

    if (hotels[0]?.id) {
      fetchRoomCategories(newItem.id, hotels[0].id);
    }
  };

  // Remove Hotel Line Item
  const handleRemoveHotelStay = (itemId: string) => {
    setHotelItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Fetch Rooms for Hotel
  const fetchRoomCategories = async (itemId: string, hotelId: string) => {
    setHotelItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, loadingRooms: true, availableRooms: [] } : item))
    );
    try {
      const res = await inventoryApi.getRoomCategories(hotelId);
      const rooms: RoomCategoryDto[] = res.data || [];
      setHotelItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                availableRooms: rooms,
                roomCategoryId:
                  item.roomCategoryId && rooms.some((r) => r.id === item.roomCategoryId)
                    ? item.roomCategoryId
                    : rooms[0]?.id || '',
                loadingRooms: false,
              }
            : item
        )
      );
    } catch {
      setHotelItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, loadingRooms: false, availableRooms: [] } : item))
      );
    }
  };

  // Add Transport Line Item
  const handleAddTransport = () => {
    const initialTariff = tariffs[0];
    const nights = calculateNights();
    const days = Math.max(1, nights + 1);

    const newItem: TransportFormItem = {
      id: `transport_${Date.now()}_${Math.random()}`,
      tariffId: initialTariff?.id || '',
      pricingBasis: (initialTariff?.tariffBasis as any) || 'PER_DAY',
      numberOfDays: days,
      estimatedKm: 300,
      driverAllowanceDays: days,
      nightHaltDays: 0,
      tollsAndParking: 500,
      notes: 'Dedicated AC vehicle for all transfers and sightseeing',
    };

    setTransportItems((prev) => [...prev, newItem]);
  };

  // Remove Transport Line Item
  const handleRemoveTransport = (itemId: string) => {
    setTransportItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Calculate Duration
  const calculateNights = () => {
    if (!travelStartDate || !travelEndDate) return 0;
    const start = new Date(travelStartDate).getTime();
    const end = new Date(travelEndDate).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.round((end - start) / (1000 * 60 * 60 * 24));
  };

  const calculatedNights = calculateNights();
  const calculatedDays = calculatedNights > 0 ? calculatedNights + 1 : 0;

  // Run Server-Side Calculation Preview
  const runCalculation = async () => {
    if (!selectedLeadId || !selectedDestinationId || !travelStartDate || !travelEndDate) {
      setCalculatedSummary(null);
      return;
    }

    setCalculating(true);
    setCalcError(null);

    const payload = {
      leadId: selectedLeadId,
      destinationId: selectedDestinationId,
      packageId: selectedPackageId || undefined,
      travelStartDate,
      travelEndDate,
      numberOfAdults: Number(numberOfAdults),
      numberOfChildren: Number(numberOfChildren) || 0,
      numberOfInfants: Number(numberOfInfants) || 0,
      hotels: hotelItems
        .filter((h) => h.hotelId && h.roomCategoryId)
        .map((h) => ({
          hotelId: h.hotelId,
          roomCategoryId: h.roomCategoryId,
          checkInDate: h.checkInDate || travelStartDate,
          checkOutDate: h.checkOutDate || travelEndDate,
          numberOfRooms: Number(h.numberOfRooms) || 1,
          adultsCount: Number(h.adultsCount) || 2,
          childrenWithBedCount: Number(h.childrenWithBedCount) || 0,
          childrenWithoutBedCount: Number(h.childrenWithoutBedCount) || 0,
          mealPlan: h.mealPlan,
        })),
      transports: transportItems
        .filter((t) => t.tariffId)
        .map((t) => ({
          vehicleId: t.vehicleId,
          tariffId: t.tariffId,
          pricingBasis: t.pricingBasis,
          numberOfDays: Number(t.numberOfDays) || 1,
          estimatedKm: t.estimatedKm ? Number(t.estimatedKm) : undefined,
          driverAllowanceDays: t.driverAllowanceDays ? Number(t.driverAllowanceDays) : undefined,
          nightHaltDays: t.nightHaltDays ? Number(t.nightHaltDays) : undefined,
          tollsAndParking: t.tollsAndParking ? Number(t.tollsAndParking) : undefined,
          notes: t.notes,
        })),
      markupType,
      markupPercent: markupType === 'PERCENT' ? (Number(markupPercent) || 0) : undefined,
      markupAmount: markupType === 'FLAT' ? (Number(markupAmount) || 0) : undefined,
      discountType,
      discountPercent: discountType === 'PERCENT' ? (Number(discountPercent) || 0) : undefined,
      discountAmount: discountType === 'FLAT' ? (Number(discountAmount) || 0) : undefined,
      isTaxApplicable,
    };

    try {
      const res = await quotationsApi.calculate(payload);
      setCalculatedSummary(res.data.pricingSummary);
    } catch (err: any) {
      setCalcError(err?.message || 'Calculation failed. Please verify dates and rates.');
      setCalculatedSummary(null);
    } finally {
      setCalculating(false);
    }
  };

  // Debounced auto-calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      runCalculation();
    }, 400);
    return () => clearTimeout(timer);
  }, [
    selectedLeadId,
    selectedDestinationId,
    selectedPackageId,
    travelStartDate,
    travelEndDate,
    numberOfAdults,
    numberOfChildren,
    hotelItems,
    transportItems,
    markupType,
    markupPercent,
    markupAmount,
    discountType,
    discountPercent,
    discountAmount,
    isTaxApplicable,
  ]);

  // Submit and Create Quotation
  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLeadId) {
      setSubmitError('Please select a customer enquiry / lead.');
      return;
    }
    if (!selectedDestinationId) {
      setSubmitError('Please select a tour destination.');
      return;
    }
    if (!travelStartDate || !travelEndDate) {
      setSubmitError('Please specify valid travel start and end dates.');
      return;
    }
    if (new Date(travelEndDate) <= new Date(travelStartDate)) {
      setSubmitError('Travel end date must be after travel start date.');
      return;
    }
    if (numberOfAdults < 1) {
      setSubmitError('At least 1 adult passenger is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const inclusions = inclusionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const exclusions = exclusionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const terms = termsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      leadId: selectedLeadId,
      destinationId: selectedDestinationId,
      packageId: selectedPackageId || undefined,
      travelStartDate,
      travelEndDate,
      numberOfAdults: Number(numberOfAdults),
      numberOfChildren: Number(numberOfChildren) || 0,
      numberOfInfants: Number(numberOfInfants) || 0,
      hotels: hotelItems
        .filter((h) => h.hotelId && h.roomCategoryId)
        .map((h) => ({
          hotelId: h.hotelId,
          roomCategoryId: h.roomCategoryId,
          checkInDate: h.checkInDate || travelStartDate,
          checkOutDate: h.checkOutDate || travelEndDate,
          numberOfRooms: Number(h.numberOfRooms) || 1,
          adultsCount: Number(h.adultsCount) || 2,
          childrenWithBedCount: Number(h.childrenWithBedCount) || 0,
          childrenWithoutBedCount: Number(h.childrenWithoutBedCount) || 0,
          mealPlan: h.mealPlan,
        })),
      transports: transportItems
        .filter((t) => t.tariffId)
        .map((t) => ({
          vehicleId: t.vehicleId,
          tariffId: t.tariffId,
          pricingBasis: t.pricingBasis,
          numberOfDays: Number(t.numberOfDays) || 1,
          estimatedKm: t.estimatedKm ? Number(t.estimatedKm) : undefined,
          driverAllowanceDays: t.driverAllowanceDays ? Number(t.driverAllowanceDays) : undefined,
          nightHaltDays: t.nightHaltDays ? Number(t.nightHaltDays) : undefined,
          tollsAndParking: t.tollsAndParking ? Number(t.tollsAndParking) : undefined,
          notes: t.notes,
        })),
      markupType,
      markupPercent: markupType === 'PERCENT' ? (Number(markupPercent) || 0) : undefined,
      markupAmount: markupType === 'FLAT' ? (Number(markupAmount) || 0) : undefined,
      discountType,
      discountPercent: discountType === 'PERCENT' ? (Number(discountPercent) || 0) : undefined,
      discountAmount: discountType === 'FLAT' ? (Number(discountAmount) || 0) : undefined,
      isTaxApplicable,
      inclusions,
      exclusions,
      terms,
      notes: agentNotes.trim() || undefined,
      validityDays: Number(validityDays) || 7,
    };

    try {
      if (reviseQuoteId) {
        const revisePayload = {
          ...payload,
          changeReason: changeReason.trim() || 'Client requested itinerary update',
        };
        const res = await quotationsApi.revise(reviseQuoteId, revisePayload);
        router.push(`/quotations?revised=${res.data.quoteNumber || 'true'}`);
        return;
      }
      const res = await quotationsApi.create(payload);
      router.push(`/quotations?created=${res.data.quoteNumber}`);
    } catch (err: any) {
      setSubmitError(err?.message || (reviseQuoteId ? 'Failed to revise quotation proposal' : 'Failed to create quotation proposal'));
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveDiscountPercent =
    calculatedSummary?.discountPercent ?? (discountType === 'PERCENT' ? discountPercent : 0);
  const isAutonomous = agentUser?.agentProfile?.pricingModel !== 'COMMISSION_BASED';
  const isDiscountOverCap = !isAutonomous && effectiveDiscountPercent > maxDiscountPercent;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link
          href="/quotations"
          className="btn btn-secondary"
          style={{ width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {revisingQuoteData
              ? `Revise Quotation: ${revisingQuoteData.quoteNumber} (v${(revisingQuoteData.currentVersion || 1) + 1})`
              : 'Create Quotation Proposal'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '2px 0 0 0' }}>
            {revisingQuoteData
              ? `Editing full itinerary, hotel properties, vehicles, and terms for revision v${(revisingQuoteData.currentVersion || 1) + 1}. Previous version will be archived.`
              : 'Build a custom itinerary proposal, calculate rates with live server rules, and prepare traveler pricing.'}
          </p>
        </div>
      </div>

      {submitError && (
        <div style={{ padding: '14px 18px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, color: '#be123c', marginBottom: 24, fontSize: '0.92rem' }}>
          <strong>Error creating proposal:</strong> {submitError}
        </div>
      )}

      <form onSubmit={handleSubmitQuotation}>
        {/* =========================================================================
            SECTION 1: TRAVELER & DESTINATION
            ========================================================================= */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--primary)" />
            <span>1. Traveler & Tour Destination</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Select Lead */}
            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Enquiry / Lead <span style={{ color: '#be123c' }}>*</span>
              </label>
              <SearchableSelect
                options={leadOptions}
                value={selectedLeadId}
                onChange={(val) => handleLeadChange(val)}
                placeholder="-- Select Assigned Lead --"
                searchPlaceholder="Search lead name, ID, or mobile..."
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                Shows enquiries currently assigned to your travel desk. Type to filter instantly.
              </span>
            </div>

            {/* Destination */}
            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Destination <span style={{ color: '#be123c' }}>*</span>
              </label>
              <SearchableSelect
                options={destinationOptions}
                value={selectedDestinationId}
                onChange={(val) => setSelectedDestinationId(val)}
                placeholder="-- Select Destination --"
                searchPlaceholder="Search destination or state..."
              />
            </div>

            {/* Optional Tour Package */}
            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Package Blueprint (Optional)
              </label>
              <SearchableSelect
                options={packageOptions}
                value={selectedPackageId}
                onChange={(val) => setSelectedPackageId(val)}
                placeholder="-- Custom Customization (No Package) --"
                searchPlaceholder="Search package title or duration..."
                disabled={packages.length === 0}
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: TRAVEL DATES & PASSENGER OCCUPANCY
            ========================================================================= */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="var(--primary)" />
            <span>2. Schedule & Passenger Occupancy</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* Travel Start Date */}
            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Travel Start Date <span style={{ color: '#be123c' }}>*</span>
              </label>
              <input
                type="date"
                required
                value={travelStartDate}
                onChange={(e) => setTravelStartDate(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Travel End Date */}
            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Travel End Date <span style={{ color: '#be123c' }}>*</span>
              </label>
              <input
                type="date"
                required
                value={travelEndDate}
                onChange={(e) => setTravelEndDate(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Adults */}
            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Adults (Age 12+) <span style={{ color: '#be123c' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={numberOfAdults === 0 ? '' : numberOfAdults}
                placeholder="2"
                onChange={(e) => setNumberOfAdults(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Children */}
            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Children (Age 5–11)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={numberOfChildren === 0 ? '' : numberOfChildren}
                placeholder="0"
                onChange={(e) => setNumberOfChildren(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Validity Days */}
            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Proposal Validity (Days)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={validityDays === 0 ? '' : validityDays}
                placeholder="7"
                onChange={(e) => setValidityDays(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {calculatedNights > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#f0fdf4', border: '1px solid #99f6e4', borderRadius: 9999, color: '#0f766e', fontSize: '0.85rem', fontWeight: 700 }}>
              <Clock size={15} />
              <span>Itinerary Duration: {calculatedNights} Nights / {calculatedDays} Days</span>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 3: ACCOMMODATIONS & HOTEL STAYS
            ========================================================================= */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} color="var(--primary)" />
              <span>3. Accommodations & Stays ({hotelItems.length})</span>
            </h2>
            <button
              type="button"
              onClick={handleAddHotelStay}
              disabled={hotels.length === 0}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '6px 12px' }}
            >
              <Plus size={15} />
              <span>Add Hotel Stay</span>
            </button>
          </div>

          {hotelItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', border: '1px dashed var(--border-subtle)', borderRadius: 8, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No hotel stays configured yet. Click "Add Hotel Stay" to add properties and room rate cards.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {hotelItems.map((item, index) => (
                <div key={item.id} style={{ padding: 18, border: '1px solid var(--border-subtle)', borderRadius: 8, background: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Stay #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHotelStay(item.id)}
                      style={{ background: 'transparent', border: 'none', color: '#be123c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {/* Hotel */}
                    <div>
                      <label className="label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Hotel Property</label>
                      <SearchableSelect
                        options={hotels.map((h) => {
                          const details = [h.city, h.starRating ? `${h.starRating}★` : null].filter(Boolean).join(' • ');
                          return {
                            value: h.id,
                            label: h.name,
                            subLabel: details,
                            badge: h.propertyType,
                          };
                        })}
                        value={item.hotelId}
                        onChange={(hId) => {
                          setHotelItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, hotelId: hId } : it))
                          );
                          fetchRoomCategories(item.id, hId);
                        }}
                        placeholder="Select hotel..."
                        searchPlaceholder="Type hotel name or city..."
                      />
                    </div>

                    {/* Room Category */}
                    <div>
                      <label className="label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Room Category</label>
                      <SearchableSelect
                        options={(item.availableRooms || []).map((r) => ({
                          value: r.id,
                          label: r.name,
                          subLabel: `Base Occupancy: ${r.baseOccupancy || 2}${r.pricePerNight ? ` • ₹${r.pricePerNight}/nt` : ''}`,
                          badge: r.extraBedSupported ? '+Extra Bed' : undefined,
                        }))}
                        value={item.roomCategoryId}
                        onChange={(rId) => {
                          setHotelItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, roomCategoryId: rId } : it))
                          );
                        }}
                        disabled={item.loadingRooms || (item.availableRooms || []).length === 0}
                        placeholder={item.loadingRooms ? 'Loading rooms...' : (item.availableRooms || []).length === 0 ? 'No rooms available' : 'Select room...'}
                        searchPlaceholder="Search room category..."
                      />
                    </div>

                    {/* Meal Plan */}
                    <div>
                      <label className="label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Meal Plan</label>
                      <SearchableSelect
                        options={[
                          { value: 'EP', label: 'EP Plan (Room Only)', subLabel: 'No Meals Included' },
                          { value: 'CP', label: 'CP Plan (Breakfast)', subLabel: 'Daily Breakfast Included' },
                          { value: 'MAP', label: 'MAP Plan (Breakfast + Dinner)', subLabel: 'Daily Breakfast & Dinner' },
                          { value: 'AP', label: 'AP Plan (All Meals)', subLabel: 'Daily Breakfast, Lunch & Dinner' },
                        ]}
                        value={item.mealPlan}
                        onChange={(mp) => {
                          setHotelItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, mealPlan: mp as MealPlan } : it))
                          );
                        }}
                        placeholder="Select meal plan..."
                        searchPlaceholder="Search EP, CP, MAP, AP..."
                      />
                    </div>

                    {/* Number of Rooms */}
                    <div>
                      <label className="label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rooms Count</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={item.numberOfRooms === 0 ? '' : item.numberOfRooms}
                        placeholder="1"
                        onChange={(e) => {
                          const count = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                          setHotelItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, numberOfRooms: count } : it))
                          );
                        }}
                        className="input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 4: TRANSPORT LOGISTICS & TARIFFS
            ========================================================================= */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={18} color="var(--primary)" />
              <span>4. Sightseeing Vehicle & Transport ({transportItems.length})</span>
            </h2>
            <button
              type="button"
              onClick={handleAddTransport}
              disabled={tariffs.length === 0}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '6px 12px' }}
            >
              <Plus size={15} />
              <span>Add Vehicle</span>
            </button>
          </div>

          {transportItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', border: '1px dashed var(--border-subtle)', borderRadius: 8, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No vehicle configured yet. Click "Add Vehicle" to select a transport tariff.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {transportItems.map((item, index) => (
                <div key={item.id} style={{ padding: 18, border: '1px solid var(--border-subtle)', borderRadius: 8, background: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Vehicle Line #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTransport(item.id)}
                      style={{ background: 'transparent', border: 'none', color: '#be123c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {/* Tariff / Vehicle */}
                    <div>
                      <label className="label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Transport Tariff</label>
                      <SearchableSelect
                        options={tariffs.map((t) => ({
                          value: t.id,
                          label: `${t.circuitName ? `${t.circuitName} · ` : ''}${t.vehicleCategory}`,
                          subLabel: `₹${t.standardSellingRate} / ${t.tariffBasis}`,
                        }))}
                        value={item.tariffId}
                        onChange={(tId) => {
                          const t = tariffs.find((x) => x.id === tId);
                          setTransportItems((prev) =>
                            prev.map((it) =>
                              it.id === item.id
                                ? {
                                    ...it,
                                    tariffId: tId,
                                    pricingBasis: (t?.tariffBasis as any) || 'PER_DAY',
                                  }
                                : it
                            )
                          );
                        }}
                        placeholder="Select transport tariff..."
                        searchPlaceholder="Search cab or circuit..."
                      />
                    </div>

                    {/* Days */}
                    <div>
                      <label className="label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Service Days</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={item.numberOfDays === 0 ? '' : item.numberOfDays}
                        placeholder="1"
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                          setTransportItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, numberOfDays: val } : it))
                          );
                        }}
                        className="input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>

                    {/* Tolls & Parking */}
                    <div>
                      <label className="label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span>Tolls & Parking (₹)</span>
                        <InfoBadge text="Estimated toll taxes, state permits, and airport/monument parking charges." />
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.tollsAndParking === 0 || item.tollsAndParking == null ? '' : item.tollsAndParking}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                          setTransportItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, tollsAndParking: val } : it))
                          );
                        }}
                        className="input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 5: COMMERCIAL SAFEGUARDS & SERVER PRICING PREVIEW
            ========================================================================= */}
        <div className="card" style={{ padding: 24, marginBottom: 24, border: '1.5px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--primary)" />
            <span>5. Commercial Policies & Authoritative Pricing</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>
            {/* Markup Slider & Input with % / ₹ Toggle */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ fontWeight: 600, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Agent Markup {markupType === 'PERCENT' ? '(%)' : '(₹)'}</span>
                  <InfoBadge text="Commission markup added above net base cost." />
                </label>
                <div style={{ display: 'inline-flex', background: 'var(--border-subtle)', borderRadius: 6, padding: 2, gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => setMarkupType('PERCENT')}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: markupType === 'PERCENT' ? 'var(--primary)' : 'transparent',
                      color: markupType === 'PERCENT' ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkupType('FLAT')}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: markupType === 'FLAT' ? 'var(--primary)' : 'transparent',
                      color: markupType === 'FLAT' ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    ₹
                  </button>
                </div>
              </div>

              {markupType === 'PERCENT' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Percent</span>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{markupPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Recommended partner markup: 10%–15%
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    min="0"
                    value={markupAmount === 0 ? '' : markupAmount}
                    onChange={(e) => setMarkupAmount(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                    placeholder="0"
                    className="input"
                    style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Effective Margin: {calculatedSummary?.markupPercent ? `${calculatedSummary.markupPercent}%` : 'Calculating...'}
                  </div>
                </>
              )}
            </div>

            {/* Discount Slider & Input with % / ₹ Toggle */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ fontWeight: 600, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Agent Discount {discountType === 'PERCENT' ? '(%)' : '(₹)'}</span>
                  <InfoBadge text="Concession given to customer. Capped at authorized agency policy limit." />
                </label>
                <div style={{ display: 'inline-flex', background: 'var(--border-subtle)', borderRadius: 6, padding: 2, gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => setDiscountType('PERCENT')}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: discountType === 'PERCENT' ? 'var(--primary)' : 'transparent',
                      color: discountType === 'PERCENT' ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('FLAT')}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: discountType === 'FLAT' ? 'var(--primary)' : 'transparent',
                      color: discountType === 'FLAT' ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    ₹
                  </button>
                </div>
              </div>

              {discountType === 'PERCENT' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Percent</span>
                    <span style={{ fontWeight: 800, color: isDiscountOverCap ? '#b91c1c' : 'var(--text-main)' }}>
                      {discountPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    style={{ width: '100%', accentColor: isDiscountOverCap ? '#ef4444' : 'var(--primary)' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: isDiscountOverCap ? '#b91c1c' : '#059669', marginTop: 4, fontWeight: 600 }}>
                    {isAutonomous ? '💎 Wholesale Net Autonomy: 100% Agent Pricing Freedom' : `Authorized Cap: ${maxDiscountPercent}%`}
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount === 0 ? '' : discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                    placeholder="0"
                    className="input"
                    style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                  />
                  <div style={{ fontSize: '0.75rem', color: isDiscountOverCap ? '#b91c1c' : '#059669', marginTop: 4, fontWeight: 600 }}>
                    {isAutonomous
                      ? `Effective Client Discount: ${calculatedSummary?.discountPercent ? `${calculatedSummary.discountPercent}%` : '0%'} (Full Autonomy)`
                      : `Effective Discount: ${calculatedSummary?.discountPercent ? `${calculatedSummary.discountPercent}%` : '0%'} (Cap: ${maxDiscountPercent}%)`}
                  </div>
                </>
              )}
            </div>

            {/* Tax Applicable Checkbox (Statutory GST strictly %) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <input
                type="checkbox"
                id="isTaxApplicable"
                checked={isTaxApplicable}
                onChange={(e) => setIsTaxApplicable(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <label htmlFor="isTaxApplicable" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span>Apply Standard GST (5%)</span>
                <InfoBadge text="Statutory 5% GST under SAC 998555 for Tour Operator services (non-negotiable government tax)." />
              </label>
            </div>
          </div>

          {/* Discount Exceeds Cap Warning */}
          {isDiscountOverCap && (
            <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309', fontWeight: 700, fontSize: '0.88rem' }}>
                <AlertTriangle size={18} />
                <span>Admin Price Override Required</span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#92400e' }}>
                Your requested discount of <strong>{discountPercent}%</strong> exceeds your authorized policy limit of <strong>{maxDiscountPercent}%</strong>.
                Upon submission, this quotation will be placed into <strong>PENDING ADMIN APPROVAL</strong> status and will require review by Faisal Bikanerwala before issuance.
              </p>
            </div>
          )}

          {/* Live Pricing Summary Box */}
          <div style={{ background: '#f8fafc', border: '1.5px solid var(--border-subtle)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calculator size={18} color="var(--primary)" />
                <span>Authoritative Price Breakdown</span>
              </div>
              {calculating && (
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={12} className="animate-spin" />
                  Calculating...
                </span>
              )}
            </div>

            {calcError ? (
              <div style={{ padding: 12, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 6, color: '#be123c', fontSize: '0.85rem' }}>
                {calcError}
              </div>
            ) : calculatedSummary ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>Itinerary Services Base Total</span>
                    <InfoBadge text="Combined wholesale cost of hotels, vehicles, and itinerary services." />
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {formatCurrency(
                      (calculatedSummary.taxableAmount || 0) +
                        (calculatedSummary.discountAmount || 0) -
                        (calculatedSummary.totalMarkupAmount || 0)
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>Markup ({calculatedSummary.markupPercent}%)</span>
                    <InfoBadge text="Partner margin earned on this quote." />
                  </span>
                  <span style={{ fontWeight: 600, color: '#0f766e' }}>
                    +{formatCurrency(calculatedSummary.totalMarkupAmount)}
                  </span>
                </div>

                {calculatedSummary.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>Discount ({calculatedSummary.discountPercent}%)</span>
                      <InfoBadge text="Discount deducted from customer price." />
                    </span>
                    <span style={{ fontWeight: 600, color: '#b91c1c' }}>
                      -{formatCurrency(calculatedSummary.discountAmount)}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px dashed var(--border-subtle)', fontSize: '0.88rem', fontWeight: 600 }}>
                  <span>Taxable Subtotal</span>
                  <span>{formatCurrency(calculatedSummary.taxableAmount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>GST / Tax ({calculatedSummary.taxRatePercent}%)</span>
                      <InfoBadge text="Statutory 5% GST liability payable to government under SAC 998555." />
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontWeight: 700,
                        background: calculatedSummary.isTaxConfirmed ? '#ecfdf5' : '#fffbeb',
                        color: calculatedSummary.isTaxConfirmed ? '#047857' : '#b45309',
                      }}
                    >
                      {calculatedSummary.isTaxConfirmed ? 'Verified GST' : 'Pending CA Sign-off'}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(calculatedSummary.taxAmount)}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 0 6px 0',
                    borderTop: '2px solid var(--border-subtle)',
                    marginTop: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>Total Customer Payable</span>
                      <InfoBadge text="All-inclusive final payable amount shown on traveler proposal." />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Inclusive of all taxes & accommodations
                    </div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                    {formatCurrency(calculatedSummary.finalSellingPrice)}
                  </div>
                </div>

                {/* Apna Net Profit Card */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    border: '1.5px solid #6ee7b7',
                    borderRadius: 8,
                    marginTop: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={15} color="#059669" />
                      <span>Apna Net Profit</span>
                      <InfoBadge text="Pure retained net margin after all vendor bills (hotels, cabs, tolls) and GST are deducted." />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: 2 }}>
                      All supplier expenses & GST minus karne ke baad
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857' }}>
                      {formatCurrency(
                        calculatedSummary.projectedGrossProfit !== undefined
                          ? calculatedSummary.projectedGrossProfit
                          : Math.max(0, (calculatedSummary.totalMarkupAmount || 0) - (calculatedSummary.discountAmount || 0))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Configure destination, travel dates, and hotel/vehicle items to view live price calculation.
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION 6: TERMS, INCLUSIONS & NOTES
            ========================================================================= */}
        <div className="card" style={{ padding: 24, marginBottom: 30 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCheck size={18} color="var(--primary)" />
            <span>6. Inclusions, Exclusions & Client Terms</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Inclusions (One per line)
              </label>
              <textarea
                rows={4}
                value={inclusionsText}
                onChange={(e) => setInclusionsText(e.target.value)}
                className="input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div>
              <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Exclusions (One per line)
              </label>
              <textarea
                rows={4}
                value={exclusionsText}
                onChange={(e) => setExclusionsText(e.target.value)}
                className="input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          <div>
            <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Booking Terms & Payment Schedule (One per line)
            </label>
            <textarea
              rows={3}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        {reviseQuoteId && (
          <div className="card" style={{ padding: 24, marginBottom: 24, border: '2px solid #0f766e', background: '#f0fdfa' }}>
            <label className="label" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f766e', display: 'block', marginBottom: 6 }}>
              Reason for Revision (Audit Trail) <span style={{ color: '#be123c' }}>*</span>
            </label>
            <textarea
              required
              rows={2}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Explain why this quotation is being revised (e.g. client requested different hotels, dates, or negotiated rate)..."
              className="input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        )}

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14 }}>
          <Link href="/quotations" className="btn btn-secondary">
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', fontSize: '0.95rem' }}
          >
            {submitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>{reviseQuoteId ? 'Saving Revision...' : 'Creating Proposal...'}</span>
              </>
            ) : isDiscountOverCap ? (
              <>
                <ShieldAlert size={18} />
                <span>Submit for Owner Approval</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>{revisingQuoteData ? `Save Revision v${(revisingQuoteData.currentVersion || 1) + 1}` : 'Create Quotation Proposal'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div>Loading quotation builder...</div>}>
      <QuotationBuilderContent />
    </Suspense>
  );
}
