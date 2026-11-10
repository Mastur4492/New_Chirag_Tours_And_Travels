'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Car,
  Plus,
  Users,
  ShieldCheck,
  Tag,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Edit2,
  X,
  RefreshCw,
  Phone,
  MessageCircle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Check,
  Percent,
} from 'lucide-react';
import {
  DestinationDto,
  DriverDto,
  DriverStatus,
  SeasonType,
  TariffBasis,
  TransportTariffDto,
  VehicleCategory,
  VehicleDto,
  VehicleStatus,
  VehicleVendorDto,
} from '@chirag/types';
import { apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { sanitizeDisplayName } from '@/lib/labels';
import { SearchableSelect } from '@/components/SearchableSelect';

// Category definitions with friendly labels & passenger capacity defaults
const VEHICLE_CATEGORY_CONFIG: Record<
  VehicleCategory,
  { label: string; icon: string; defaultPax: number; color: string; bg: string }
> = {
  HATCHBACK: { label: 'Hatchback (WagonR / Swift)', icon: '🚗', defaultPax: 4, color: '#0369a1', bg: '#f0f9ff' },
  SEDAN: { label: 'Sedan (Dzire / Etios)', icon: '🚘', defaultPax: 4, color: '#0f766e', bg: '#f0fdfa' },
  SUV: { label: 'SUV (Ertiga / Innova)', icon: '🚙', defaultPax: 6, color: '#b45309', bg: '#fffbeb' },
  PREMIUM_SUV: { label: 'Premium SUV (Innova Crysta)', icon: '✨', defaultPax: 7, color: '#4338ca', bg: '#eef2ff' },
  TEMPO_TRAVELLER: { label: 'Tempo Traveller (12/17s)', icon: '🚐', defaultPax: 12, color: '#c026d3', bg: '#fdf4ff' },
  BUS: { label: 'Luxury Coach / Bus', icon: '🚌', defaultPax: 27, color: '#475569', bg: '#f8fafc' },
};

const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'SEDAN',
  'SUV',
  'PREMIUM_SUV',
  'TEMPO_TRAVELLER',
  'HATCHBACK',
  'BUS',
];

export default function TransportPage() {
  const [tab, setTab] = useState<'TARIFFS' | 'FLEET' | 'VENDORS'>('TARIFFS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data Sets
  const [vendors, setVendors] = useState<VehicleVendorDto[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [drivers, setDrivers] = useState<DriverDto[]>([]);
  const [tariffs, setTariffs] = useState<TransportTariffDto[]>([]);
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestinationFilter, setSelectedDestinationFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Pagination states
  const [pageTariffs, setPageTariffs] = useState(1);
  const [pageSizeTariffs, setPageSizeTariffs] = useState(12);
  const [pageFleet, setPageFleet] = useState(1);
  const [pageSizeFleet, setPageSizeFleet] = useState(10);
  const [pageVendors, setPageVendors] = useState(1);
  const [pageSizeVendors, setPageSizeVendors] = useState(10);

  // Modals Open State
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<TransportTariffDto | null>(null);

  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleDto | null>(null);

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VehicleVendorDto | null>(null);

  // Toast & Submitting
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State: Rate Card (Tariff)
  const [tfDestId, setTfDestId] = useState('');
  const [tfCategory, setTfCategory] = useState<VehicleCategory>('SUV');
  const [tfSeason, setTfSeason] = useState<SeasonType>('REGULAR');
  const [tfSellingRate, setTfSellingRate] = useState<number>(3800);
  const [tfBaseCost, setTfBaseCost] = useState<number>(2800);
  const [tfDriverBhatta, setTfDriverBhatta] = useState<number>(400);
  const [tfTollIncluded, setTfTollIncluded] = useState(false);
  const [tfNightCharge, setTfNightCharge] = useState<number>(500);

  // Form State: Unified Fleet Cab & Driver
  const [vehVendorId, setVehVendorId] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehCategory, setVehCategory] = useState<VehicleCategory>('SUV');
  const [vehRegNo, setVehRegNo] = useState('');
  const [vehCapacity, setVehCapacity] = useState(6);
  const [vehHasAC, setVehHasAC] = useState(true);
  const [vehStatus, setVehStatus] = useState<VehicleStatus>('AVAILABLE');
  // Chauffeur fields inside unified modal
  const [drName, setDrName] = useState('');
  const [drMobile, setDrMobile] = useState('');
  const [drLicense, setDrLicense] = useState('');

  // Form State: Vendor
  const [vBusinessName, setVBusinessName] = useState('');
  const [vContactPerson, setVContactPerson] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vCity, setVCity] = useState('');
  const [vTerms, setVTerms] = useState('15 Days Post Departure');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchTransportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, vehRes, drRes, tfRes, dRes] = await Promise.all([
        apiRequest<VehicleVendorDto[]>('transport/vendors?limit=150'),
        apiRequest<VehicleDto[]>('transport/vehicles?limit=150'),
        apiRequest<DriverDto[]>('transport/drivers?limit=150'),
        apiRequest<TransportTariffDto[]>('transport/tariffs?limit=150'),
        apiRequest<DestinationDto[]>('destinations?limit=150'),
      ]);

      const vList = Array.isArray(vRes) ? vRes : [];
      const dList = Array.isArray(dRes) ? dRes : [];

      setVendors(vList);
      setVehicles(Array.isArray(vehRes) ? vehRes : []);
      setDrivers(Array.isArray(drRes) ? drRes : []);
      setTariffs(Array.isArray(tfRes) ? tfRes : []);
      setDestinations(dList);

      if (vList.length > 0 && !vehVendorId) {
        setVehVendorId(vList[0]!.id);
      }
      if (dList.length > 0 && !tfDestId) {
        setTfDestId(dList[0]!.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transport data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportData();
  }, []);

  // Filtered Tariffs
  const filteredTariffs = useMemo(() => {
    return tariffs.filter((t) => {
      const matchesDest =
        selectedDestinationFilter === 'ALL' || t.destinationId === selectedDestinationFilter;
      const matchesCat =
        selectedCategoryFilter === 'ALL' || t.vehicleCategory === selectedCategoryFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        t.vehicleCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        destinations
          .find((d) => d.id === t.destinationId)
          ?.name.toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesDest && matchesCat && matchesSearch;
    });
  }, [tariffs, selectedDestinationFilter, selectedCategoryFilter, searchQuery, destinations]);

  const paginatedTariffs = useMemo(() => {
    const start = (pageTariffs - 1) * pageSizeTariffs;
    return filteredTariffs.slice(start, start + pageSizeTariffs);
  }, [filteredTariffs, pageTariffs, pageSizeTariffs]);

  // Unified Fleet items (Vehicle + Linked Driver + Linked Vendor)
  const unifiedFleetList = useMemo(() => {
    return vehicles.map((veh) => {
      const linkedDriver = drivers.find(
        (d) => d.assignedVehicleId === veh.id || d.vendorId === veh.vendorId
      );
      const linkedVendor = vendors.find((v) => v.id === veh.vendorId);
      return {
        vehicle: veh,
        driver: linkedDriver,
        vendor: linkedVendor,
      };
    });
  }, [vehicles, drivers, vendors]);

  const filteredFleet = useMemo(() => {
    return unifiedFleetList.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const vehMatch =
        item.vehicle.model.toLowerCase().includes(q) ||
        item.vehicle.registrationNumber.toLowerCase().includes(q) ||
        item.vehicle.category.toLowerCase().includes(q);
      const drMatch =
        item.driver &&
        (item.driver.fullName.toLowerCase().includes(q) || item.driver.mobile.includes(q));
      const vnMatch = item.vendor && item.vendor.businessName.toLowerCase().includes(q);
      return vehMatch || drMatch || vnMatch;
    });
  }, [unifiedFleetList, searchQuery]);

  const paginatedFleet = useMemo(() => {
    const start = (pageFleet - 1) * pageSizeFleet;
    return filteredFleet.slice(start, start + pageSizeFleet);
  }, [filteredFleet, pageFleet, pageSizeFleet]);

  // Filtered Vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.businessName.toLowerCase().includes(q) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q)) ||
        v.phone.includes(q)
      );
    });
  }, [vendors, searchQuery]);

  const paginatedVendors = useMemo(() => {
    const start = (pageVendors - 1) * pageSizeVendors;
    return filteredVendors.slice(start, start + pageSizeVendors);
  }, [filteredVendors, pageVendors, pageSizeVendors]);

  // Helpers
  const getDestinationName = (id: string) => {
    const d = destinations.find((x) => x.id === id);
    return d ? sanitizeDisplayName(d.name) : 'Destination';
  };

  const getVendorName = (id: string) => {
    const v = vendors.find((x) => x.id === id);
    return v ? sanitizeDisplayName(v.businessName) : 'Standard Fleet Partner';
  };

  // --- TARIFF ACTIONS ---
  const openCreateTariffModal = () => {
    setEditingTariff(null);
    if (destinations.length > 0) setTfDestId(destinations[0]!.id);
    setTfCategory('SUV');
    setTfSeason('REGULAR');
    setTfSellingRate(3800);
    setTfBaseCost(2800);
    setTfDriverBhatta(400);
    setTfTollIncluded(false);
    setTfNightCharge(500);
    setModalError(null);
    setIsTariffModalOpen(true);
  };

  const openEditTariffModal = (t: TransportTariffDto) => {
    setEditingTariff(t);
    setTfDestId(t.destinationId);
    setTfCategory(t.vehicleCategory);
    setTfSeason(t.seasonType);
    setTfSellingRate(t.standardSellingRate);
    setTfBaseCost(t.baseSupplierCost);
    setTfDriverBhatta(t.driverDailyAllowanceCost ?? 400);
    setTfTollIncluded(Boolean(t.isTollParkingIncluded));
    setTfNightCharge(t.nightHaltCharge ?? 500);
    setModalError(null);
    setIsTariffModalOpen(true);
  };

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tfDestId) {
      setModalError('Please select a destination');
      return;
    }
    setSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        destinationId: tfDestId,
        vehicleCategory: tfCategory,
        seasonType: tfSeason,
        tariffBasis: 'PER_DAY' as TariffBasis,
        standardSellingRate: Number(tfSellingRate),
        baseSupplierCost: Number(tfBaseCost),
        driverDailyAllowanceCost: Number(tfDriverBhatta),
        isTollParkingIncluded: tfTollIncluded,
        nightHaltCharge: Number(tfNightCharge),
        isActive: true,
      };

      if (editingTariff) {
        await apiRequest(`transport/tariffs/${editingTariff.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('Cab rate card updated successfully!');
      } else {
        await apiRequest('transport/tariffs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('New cab rate card created successfully!');
      }
      setIsTariffModalOpen(false);
      fetchTransportData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save cab rate card');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTariffStatus = async (t: TransportTariffDto) => {
    try {
      await apiRequest(`transport/tariffs/${t.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      showToast(`Rate marked as ${!t.isActive ? 'Active' : 'Inactive'}`);
      fetchTransportData();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to update rate status'}`);
    }
  };

  // --- UNIFIED FLEET ACTIONS ---
  const openCreateFleetModal = () => {
    setEditingVehicle(null);
    if (vendors.length > 0) setVehVendorId(vendors[0]!.id);
    setVehModel('Toyota Innova Crysta');
    setVehCategory('PREMIUM_SUV');
    setVehRegNo('');
    setVehCapacity(7);
    setVehHasAC(true);
    setVehStatus('AVAILABLE');
    setDrName('');
    setDrMobile('');
    setDrLicense('');
    setModalError(null);
    setIsFleetModalOpen(true);
  };

  const openEditFleetModal = (item: { vehicle: VehicleDto; driver?: DriverDto; vendor?: VehicleVendorDto }) => {
    setEditingVehicle(item.vehicle);
    setVehVendorId(item.vehicle.vendorId);
    setVehModel(item.vehicle.model);
    setVehCategory(item.vehicle.category);
    setVehRegNo(item.vehicle.registrationNumber);
    setVehCapacity(item.vehicle.seatingCapacity);
    setVehHasAC(item.vehicle.hasAC);
    setVehStatus(item.vehicle.status);
    if (item.driver) {
      setDrName(item.driver.fullName);
      setDrMobile(item.driver.mobile);
      setDrLicense(item.driver.licenseNumber);
    } else {
      setDrName('');
      setDrMobile('');
      setDrLicense('');
    }
    setModalError(null);
    setIsFleetModalOpen(true);
  };

  const handleSaveFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehModel.trim() || !vehRegNo.trim()) {
      setModalError('Vehicle model and registration number are required');
      return;
    }
    if (!vehVendorId && vendors.length > 0) {
      setVehVendorId(vendors[0]!.id);
    }
    setSubmitting(true);
    setModalError(null);
    try {
      const activeVendorId = vehVendorId || (vendors[0] ? vendors[0].id : '');

      let savedVehicleId = editingVehicle?.id;
      if (editingVehicle) {
        await apiRequest(`transport/vehicles/${editingVehicle.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            vendorId: activeVendorId,
            model: vehModel.trim(),
            category: vehCategory,
            registrationNumber: vehRegNo.trim().toUpperCase(),
            seatingCapacity: Number(vehCapacity),
            hasAC: vehHasAC,
            status: vehStatus,
          }),
        });
      } else {
        const vRes = await apiRequest<VehicleDto>('transport/vehicles', {
          method: 'POST',
          body: JSON.stringify({
            vendorId: activeVendorId,
            model: vehModel.trim(),
            category: vehCategory,
            registrationNumber: vehRegNo.trim().toUpperCase(),
            seatingCapacity: Number(vehCapacity),
            hasAC: vehHasAC,
            status: vehStatus,
          }),
        });
        savedVehicleId = vRes.id;
      }

      // If Chauffeur name is provided, create/update driver
      if (drName.trim() && drMobile.trim() && activeVendorId) {
        const existingDriver = drivers.find(
          (d) =>
            (savedVehicleId && d.assignedVehicleId === savedVehicleId) ||
            d.mobile === drMobile.trim()
        );

        if (existingDriver) {
          await apiRequest(`transport/drivers/${existingDriver.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              fullName: drName.trim(),
              mobile: drMobile.trim(),
              licenseNumber: drLicense.trim().toUpperCase() || 'LIC-VERIFIED',
              assignedVehicleId: savedVehicleId,
            }),
          });
        } else {
          await apiRequest('transport/drivers', {
            method: 'POST',
            body: JSON.stringify({
              vendorId: activeVendorId,
              assignedVehicleId: savedVehicleId,
              fullName: drName.trim(),
              mobile: drMobile.trim(),
              licenseNumber: drLicense.trim().toUpperCase() || 'LIC-VERIFIED',
              status: 'ACTIVE',
            }),
          });
        }
      }

      showToast(editingVehicle ? 'Vehicle & chauffeur updated!' : 'New cab & chauffeur added to fleet!');
      setIsFleetModalOpen(false);
      fetchTransportData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVehicleStatus = async (veh: VehicleDto, nextStatus: VehicleStatus) => {
    try {
      await apiRequest(`transport/vehicles/${veh.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      showToast(`Vehicle ${veh.registrationNumber} status: ${nextStatus}`);
      fetchTransportData();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to update vehicle status'}`);
    }
  };

  // --- VENDOR ACTIONS ---
  const openCreateVendorModal = () => {
    setEditingVendor(null);
    setVBusinessName('');
    setVContactPerson('');
    setVPhone('');
    setVEmail('');
    setVCity('');
    setVTerms('15 Days Post Departure');
    setModalError(null);
    setIsVendorModalOpen(true);
  };

  const openEditVendorModal = (v: VehicleVendorDto) => {
    setEditingVendor(v);
    setVBusinessName(v.businessName);
    setVContactPerson(v.contactPerson || '');
    setVPhone(v.phone || '');
    setVEmail(v.email || '');
    setVCity(v.city || '');
    setVTerms(v.settlementTerms || '15 Days Post Departure');
    setModalError(null);
    setIsVendorModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vBusinessName.trim() || !vPhone.trim()) {
      setModalError('Business name and phone number are required');
      return;
    }
    setSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        businessName: vBusinessName.trim(),
        contactPerson: vContactPerson.trim() || 'Manager',
        phone: vPhone.trim(),
        email: vEmail.trim() || undefined,
        city: vCity.trim() || undefined,
        settlementTerms: vTerms.trim() || '15 Days Post Departure',
        isActive: true,
      };

      if (editingVendor) {
        await apiRequest(`transport/vendors/${editingVendor.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('Transporter vendor updated successfully');
      } else {
        await apiRequest('transport/vendors', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('New transporter vendor registered!');
      }
      setIsVendorModalOpen(false);
      fetchTransportData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Toast Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: '#064E3B',
            color: '#ECFDF5',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: '0.88rem',
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ECFDF5',
              color: '#047857',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 8,
            }}
          >
            <Car size={13} />
            <span>Transport & Cab Fleet Operations</span>
          </div>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: '0 0 6px',
            }}
          >
            Transport & Fleet Management
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
            Configure destination cab rate cards (₹/day), manage vehicles & chauffeurs, and track partner transporters.
          </p>
        </div>

        {/* Action Button depending on Active Tab */}
        <div>
          {tab === 'TARIFFS' && (
            <button
              onClick={openCreateTariffModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                padding: '11px 20px',
                borderRadius: 10,
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              }}
            >
              <Plus size={16} />
              <span>+ Set New Cab Rate</span>
            </button>
          )}

          {tab === 'FLEET' && (
            <button
              onClick={openCreateFleetModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                padding: '11px 20px',
                borderRadius: 10,
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              }}
            >
              <Plus size={16} />
              <span>+ Add Cab & Chauffeur</span>
            </button>
          )}

          {tab === 'VENDORS' && (
            <button
              onClick={openCreateVendorModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                padding: '11px 20px',
                borderRadius: 10,
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              }}
            >
              <Plus size={16} />
              <span>+ Add Transporter</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Cab Rate Cards
            </span>
            <span style={{ background: '#ECFDF5', color: '#059669', padding: '4px 8px', borderRadius: 6 }}>
              <Tag size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginTop: 8 }}>
            {tariffs.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: 4 }}>
            Across {destinations.length} Active Destinations
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Fleet Cabs
            </span>
            <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 8px', borderRadius: 6 }}>
              <Car size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginTop: 8 }}>
            {vehicles.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#2563EB', fontWeight: 700, marginTop: 4 }}>
            {vehicles.filter((v) => v.status === 'AVAILABLE').length} Cabs Available Right Now
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Active Chauffeurs
            </span>
            <span style={{ background: '#FEF3C7', color: '#D97706', padding: '4px 8px', borderRadius: 6 }}>
              <Users size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginTop: 8 }}>
            {drivers.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#D97706', fontWeight: 700, marginTop: 4 }}>
            Verified Commercial Drivers
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Transporter Partners
            </span>
            <span style={{ background: '#F5F3FF', color: '#7C3AED', padding: '4px 8px', borderRadius: 6 }}>
              <Building2 size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginTop: 8 }}>
            {vendors.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#7C3AED', fontWeight: 700, marginTop: 4 }}>
            Local Taxi Unions & Operators
          </div>
        </div>
      </div>

      {/* Main 3 Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          borderBottom: '2px solid #E2E8F0',
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        <button
          onClick={() => {
            setTab('TARIFFS');
            setSearchQuery('');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            borderBottom: tab === 'TARIFFS' ? '3px solid #059669' : '3px solid transparent',
            color: tab === 'TARIFFS' ? '#059669' : '#64748B',
            fontWeight: tab === 'TARIFFS' ? 800 : 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Tag size={17} />
          <span>Cab Rate Cards & Tariffs ({tariffs.length})</span>
        </button>

        <button
          onClick={() => {
            setTab('FLEET');
            setSearchQuery('');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            borderBottom: tab === 'FLEET' ? '3px solid #059669' : '3px solid transparent',
            color: tab === 'FLEET' ? '#059669' : '#64748B',
            fontWeight: tab === 'FLEET' ? 800 : 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Car size={17} />
          <span>Fleet & Chauffeurs Directory ({vehicles.length})</span>
        </button>

        <button
          onClick={() => {
            setTab('VENDORS');
            setSearchQuery('');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            borderBottom: tab === 'VENDORS' ? '3px solid #059669' : '3px solid transparent',
            color: tab === 'VENDORS' ? '#059669' : '#64748B',
            fontWeight: tab === 'VENDORS' ? 800 : 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Building2 size={17} />
          <span>Transporters & Taxi Unions ({vendors.length})</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '16px 20px',
          border: '1px solid #E2E8F0',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1, minWidth: 280 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search
              size={16}
              color="#94A3B8"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder={
                tab === 'TARIFFS'
                  ? 'Search rates by vehicle category or destination...'
                  : tab === 'FLEET'
                  ? 'Search by vehicle model, number plate, driver name...'
                  : 'Search transporters by business name, city, phone...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Destination Dropdown Filter (For Tariffs Tab) */}
          {tab === 'TARIFFS' && (
            <div style={{ minWidth: 200 }}>
              <SearchableSelect
                options={[
                  { value: 'ALL', label: `All Destinations (${destinations.length})` },
                  ...destinations.map((d) => ({
                    value: d.id,
                    label: sanitizeDisplayName(d.name),
                    subLabel: d.region,
                  })),
                ]}
                value={selectedDestinationFilter}
                onChange={(val) => setSelectedDestinationFilter(val)}
                placeholder="All Destinations"
                searchPlaceholder="Search destination (type letter to jump)..."
              />
            </div>
          )}

          {/* Category Dropdown Filter (For Tariffs & Fleet) */}
          {tab !== 'VENDORS' && (
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#334155',
                background: '#F8FAFC',
              }}
            >
              <option value="ALL">All Vehicle Categories</option>
              {VEHICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {VEHICLE_CATEGORY_CONFIG[c]?.label || c}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={fetchTransportData}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#F1F5F9',
            color: '#475569',
            border: 'none',
            padding: '9px 14px',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Refresh Data"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TAB 1: CAB RATE CARDS (TARIFFS) */}
      {tab === 'TARIFFS' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Loading cab rate cards...</div>
            </div>
          ) : filteredTariffs.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                border: '1.5px dashed #CBD5E1',
                padding: '60px 20px',
                textAlign: 'center',
              }}
            >
              <Tag size={40} color="#94A3B8" style={{ margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', margin: '0 0 6px' }}>
                No Cab Rates Found
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '0 0 20px' }}>
                Set up per-day selling prices and supplier costs for Sedan, Ertiga, Innova, and Tempo Traveller.
              </p>
              <button
                onClick={openCreateTariffModal}
                style={{
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                + Set Your First Cab Rate Card
              </button>
            </div>
          ) : (
            <>
              {/* Modern Responsive Rate Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 18,
                  marginBottom: 24,
                }}
              >
                {paginatedTariffs.map((t) => {
                  const catCfg = VEHICLE_CATEGORY_CONFIG[t.vehicleCategory] || {
                    label: t.vehicleCategory,
                    icon: '🚗',
                    defaultPax: 4,
                    color: '#0f766e',
                    bg: '#f0fdfa',
                  };
                  const dailyMargin = (t.standardSellingRate || 0) - (t.baseSupplierCost || 0);

                  return (
                    <div
                      key={t.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 14,
                        border: t.isActive ? '1px solid #E2E8F0' : '1px solid #F1F5F9',
                        opacity: t.isActive ? 1 : 0.65,
                        padding: '20px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      <div>
                        {/* Top Destination & Season */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                              <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                              {getDestinationName(t.destinationId)}
                            </div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '4px 0 0' }}>
                              {catCfg.label}
                            </h3>
                          </div>
                          <span
                            style={{
                              background: t.isActive ? '#ECFDF5' : '#F1F5F9',
                              color: t.isActive ? '#059669' : '#64748B',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.70rem',
                              fontWeight: 800,
                            }}
                          >
                            {t.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>

                        {/* Category Badge & Season */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                          <span
                            style={{
                              background: catCfg.bg,
                              color: catCfg.color,
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {catCfg.icon} Up to {catCfg.defaultPax} Pax
                          </span>
                          <span
                            style={{
                              background: '#F1F5F9',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {t.seasonType || 'REGULAR'} SEASON
                          </span>
                        </div>

                        {/* Pricing Highlight Box */}
                        <div
                          style={{
                            background: '#F8FAFC',
                            borderRadius: 10,
                            padding: '12px 14px',
                            marginBottom: 14,
                            border: '1px solid #EDF2F7',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                              <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                                Selling Price / Day
                              </div>
                              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0F766E' }}>
                                ₹{t.standardSellingRate?.toLocaleString('en-IN')}
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}> / day</span>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                                Net Cost / Day
                              </div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#D97706' }}>
                                ₹{t.baseSupplierCost?.toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              borderTop: '1px dashed #CBD5E1',
                              marginTop: 10,
                              paddingTop: 8,
                              fontSize: '0.74rem',
                            }}
                          >
                            <span style={{ color: '#64748B' }}>Agency Margin / Day:</span>
                            <strong style={{ color: dailyMargin >= 0 ? '#059669' : '#DC2626' }}>
                              ₹{dailyMargin.toLocaleString('en-IN')} / day
                            </strong>
                          </div>
                        </div>

                        {/* Inclusions summary */}
                        <div style={{ fontSize: '0.74rem', color: '#64748B', lineHeight: 1.5, marginBottom: 14 }}>
                          <div>
                            • <strong>Driver Bhatta:</strong> ₹{t.driverDailyAllowanceCost ?? 400}/day included
                          </div>
                          <div>
                            • <strong>Tolls & Parking:</strong>{' '}
                            {t.isTollParkingIncluded ? 'Included in Quote' : 'Payable by Guest on Duty'}
                          </div>
                          <div>
                            • <strong>Night Halt:</strong> ₹{t.nightHaltCharge ?? 500} per night
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          paddingTop: 12,
                          borderTop: '1px solid #F1F5F9',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTariffStatus(t)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: t.isActive ? '#64748B' : '#059669',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '4px 8px',
                          }}
                        >
                          {t.isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditTariffModal(t)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#0F766E',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: 8,
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Edit Rate</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTariffs.length > pageSizeTariffs && (
                <Pagination
                  currentPage={pageTariffs}
                  totalItems={filteredTariffs.length}
                  pageSize={pageSizeTariffs}
                  onPageChange={setPageTariffs}
                  onPageSizeChange={setPageSizeTariffs}
                  itemName="cab rates"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: FLEET & CHAUFFEURS DIRECTORY (UNIFIED VIEW) */}
      {tab === 'FLEET' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Loading fleet inventory & drivers...</div>
            </div>
          ) : filteredFleet.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                border: '1.5px dashed #CBD5E1',
                padding: '60px 20px',
                textAlign: 'center',
              }}
            >
              <Car size={40} color="#94A3B8" style={{ margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', margin: '0 0 6px' }}>
                No Fleet Cabs Registered
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '0 0 20px' }}>
                Register commercial vehicles and attach their assigned chauffeur for smooth dispatch and itinerary allotment.
              </p>
              <button
                onClick={openCreateFleetModal}
                style={{
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                + Register First Cab & Chauffeur
              </button>
            </div>
          ) : (
            <>
              {/* Unified Table */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  marginBottom: 20,
                }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800 }}>
                        <th style={{ padding: '14px 18px' }}>Cab / Vehicle Model</th>
                        <th style={{ padding: '14px 18px' }}>Category & Seating</th>
                        <th style={{ padding: '14px 18px' }}>Plate Number</th>
                        <th style={{ padding: '14px 18px' }}>Assigned Chauffeur</th>
                        <th style={{ padding: '14px 18px' }}>Transporter / Vendor</th>
                        <th style={{ padding: '14px 18px' }}>Duty Status</th>
                        <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.86rem', color: '#1E293B' }}>
                      {paginatedFleet.map((item) => {
                        const { vehicle: v, driver: d, vendor: vn } = item;
                        const catCfg = VEHICLE_CATEGORY_CONFIG[v.category] || {
                          label: v.category,
                          icon: '🚗',
                          color: '#0f766e',
                          bg: '#f0fdfa',
                        };

                        const cleanPhone = d?.mobile ? d.mobile.replace(/\D/g, '') : '';

                        return (
                          <tr
                            key={v.id}
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '16px 18px' }}>
                              <strong style={{ fontSize: '0.94rem', color: '#0F172A', display: 'block' }}>
                                {v.model}
                              </strong>
                              <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                                {v.hasAC ? 'Air-Conditioned' : 'Non-AC'}
                              </span>
                            </td>

                            <td style={{ padding: '16px 18px' }}>
                              <span
                                style={{
                                  background: catCfg.bg,
                                  color: catCfg.color,
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                }}
                              >
                                {catCfg.icon} {v.category}
                              </span>
                              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 3 }}>
                                {v.seatingCapacity} Passengers
                              </div>
                            </td>

                            <td style={{ padding: '16px 18px' }}>
                              <span
                                style={{
                                  background: '#FFFBEB',
                                  border: '1px solid #FDE68A',
                                  color: '#92400E',
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  fontSize: '0.84rem',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {v.registrationNumber}
                              </span>
                            </td>

                            <td style={{ padding: '16px 18px' }}>
                              {d ? (
                                <div>
                                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{d.fullName}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <span style={{ fontSize: '0.78rem', color: '#475569', fontFamily: 'monospace' }}>
                                      {d.mobile}
                                    </span>
                                    {cleanPhone && (
                                      <a
                                        href={`https://wa.me/91${cleanPhone.slice(-10)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          color: '#059669',
                                          background: '#ECFDF5',
                                          padding: '2px 6px',
                                          borderRadius: 4,
                                          fontSize: '0.70rem',
                                          fontWeight: 700,
                                          textDecoration: 'none',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 3,
                                        }}
                                        title="Chat on WhatsApp"
                                      >
                                        <MessageCircle size={11} />
                                        <span>WA</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.76rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                  No Driver Assigned
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '16px 18px' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                                {vn ? sanitizeDisplayName(vn.businessName) : 'Standard Fleet'}
                              </div>
                              {vn?.city && (
                                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{vn.city}</div>
                              )}
                            </td>

                            <td style={{ padding: '16px 18px' }}>
                              <select
                                value={v.status}
                                onChange={(e) => handleUpdateVehicleStatus(v, e.target.value as VehicleStatus)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  border: '1px solid #CBD5E1',
                                  background:
                                    v.status === 'AVAILABLE'
                                      ? '#ECFDF5'
                                      : v.status === 'ON_TRIP'
                                      ? '#EFF6FF'
                                      : '#FFFBEB',
                                  color:
                                    v.status === 'AVAILABLE'
                                      ? '#047857'
                                      : v.status === 'ON_TRIP'
                                      ? '#1D4ED8'
                                      : '#B45309',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="AVAILABLE">AVAILABLE</option>
                                <option value="ON_TRIP">ON TRIP</option>
                                <option value="MAINTENANCE">MAINTENANCE</option>
                                <option value="INACTIVE">INACTIVE</option>
                              </select>
                            </td>

                            <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => openEditFleetModal(item)}
                                style={{
                                  background: '#F1F5F9',
                                  color: '#334155',
                                  border: '1px solid #CBD5E1',
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Edit2 size={12} />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredFleet.length > pageSizeFleet && (
                <Pagination
                  currentPage={pageFleet}
                  totalItems={filteredFleet.length}
                  pageSize={pageSizeFleet}
                  onPageChange={setPageFleet}
                  onPageSizeChange={setPageSizeFleet}
                  itemName="vehicles"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: TRANSPORTERS & TAXI VENDORS */}
      {tab === 'VENDORS' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Loading transporter vendors...</div>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                border: '1.5px dashed #CBD5E1',
                padding: '60px 20px',
                textAlign: 'center',
              }}
            >
              <Building2 size={40} color="#94A3B8" style={{ margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', margin: '0 0 6px' }}>
                No Transporters Registered
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '0 0 20px' }}>
                Add local taxi unions, fleet providers, and travel partner transporters.
              </p>
              <button
                onClick={openCreateVendorModal}
                style={{
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                + Register Transporter
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 18,
                  marginBottom: 24,
                }}
              >
                {paginatedVendors.map((v) => {
                  const cabCount = vehicles.filter((veh) => veh.vendorId === v.id).length;
                  return (
                    <div
                      key={v.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 14,
                        border: '1px solid #E2E8F0',
                        padding: '20px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                              {sanitizeDisplayName(v.businessName)}
                            </h3>
                            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                              Contact: {v.contactPerson || 'Fleet Manager'}
                            </div>
                          </div>
                          <span
                            style={{
                              background: v.isActive ? '#ECFDF5' : '#F1F5F9',
                              color: v.isActive ? '#059669' : '#64748B',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.70rem',
                              fontWeight: 800,
                            }}
                          >
                            {v.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>

                        <div
                          style={{
                            background: '#F8FAFC',
                            borderRadius: 8,
                            padding: '12px',
                            margin: '14px 0',
                            fontSize: '0.80rem',
                            color: '#334155',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <Phone size={14} color="#059669" />
                            <strong>{v.phone}</strong>
                          </div>
                          {v.city && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <MapPin size={14} color="#64748B" />
                              <span>{v.city}{v.state ? `, ${v.state}` : ''}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Car size={14} color="#2563EB" />
                            <span><strong>{cabCount} Cabs</strong> registered under this operator</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          <strong>Payment Terms:</strong> {v.settlementTerms || '15 Days Post Departure'}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: 8,
                          paddingTop: 14,
                          marginTop: 14,
                          borderTop: '1px solid #F1F5F9',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openEditVendorModal(v)}
                          style={{
                            background: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #CBD5E1',
                            padding: '6px 14px',
                            borderRadius: 8,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Edit Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredVendors.length > pageSizeVendors && (
                <Pagination
                  currentPage={pageVendors}
                  totalItems={filteredVendors.length}
                  pageSize={pageSizeVendors}
                  onPageChange={setPageVendors}
                  onPageSizeChange={setPageSizeVendors}
                  itemName="transporters"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL 1: SET / EDIT CAB RATE CARD (TARIFF) */}
      {isTariffModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  {editingTariff ? 'Edit Cab Rate Card' : 'Set New Cab Rate Card'}
                </h3>
                <p style={{ fontSize: '0.80rem', color: '#64748B', margin: '4px 0 0' }}>
                  Daily per-day cab pricing for tour packages and quotations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTariffModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  marginBottom: 16,
                }}
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveTariff}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                {/* Destination */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Destination *
                  </label>
                  <select
                    value={tfDestId}
                    onChange={(e) => setTfDestId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', fontWeight: 600 }}
                  >
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {sanitizeDisplayName(d.name)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Category */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Vehicle Category *
                  </label>
                  <select
                    value={tfCategory}
                    onChange={(e) => setTfCategory(e.target.value as VehicleCategory)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', fontWeight: 600 }}
                  >
                    {VEHICLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {VEHICLE_CATEGORY_CONFIG[c]?.label || c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selling Rate vs Supplier Cost (2 Columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0F766E', marginBottom: 6 }}>
                      Customer Selling Price / Day (₹) *
                    </label>
                    <input
                      type="number"
                      value={tfSellingRate}
                      onChange={(e) => setTfSellingRate(Number(e.target.value))}
                      required
                      min={0}
                      step={50}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '2px solid #0F766E',
                        fontSize: '0.96rem',
                        fontWeight: 800,
                        color: '#0F766E',
                      }}
                    />
                    <span style={{ fontSize: '0.70rem', color: '#64748B' }}>Rate included in customer quotation</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#D97706', marginBottom: 6 }}>
                      Supplier Net Buying Cost / Day (₹) *
                    </label>
                    <input
                      type="number"
                      value={tfBaseCost}
                      onChange={(e) => setTfBaseCost(Number(e.target.value))}
                      required
                      min={0}
                      step={50}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.96rem',
                        fontWeight: 800,
                        color: '#D97706',
                      }}
                    />
                    <span style={{ fontSize: '0.70rem', color: '#64748B' }}>Actual payout to cab transporter</span>
                  </div>
                </div>

                {/* Driver Bhatta & Night Halt */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Driver Allowance / Bhatta (₹/Day)
                    </label>
                    <input
                      type="number"
                      value={tfDriverBhatta}
                      onChange={(e) => setTfDriverBhatta(Number(e.target.value))}
                      min={0}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Season
                    </label>
                    <select
                      value={tfSeason}
                      onChange={(e) => setTfSeason(e.target.value as SeasonType)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    >
                      <option value="REGULAR">Regular Season</option>
                      <option value="PEAK">Peak Season</option>
                      <option value="OFF">Off Season</option>
                    </select>
                  </div>
                </div>

                {/* Toll Inclusions Checkbox */}
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 700, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tfTollIncluded}
                      onChange={(e) => setTfTollIncluded(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <span>State Toll Taxes & Parking Charges Included in this rate</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setIsTariffModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 8,
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: 8,
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : editingTariff ? 'Update Rate Card' : 'Save Rate Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT FLEET CAB & DRIVER */}
      {isFleetModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 580,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  {editingVehicle ? 'Edit Cab & Chauffeur' : 'Register Cab & Chauffeur'}
                </h3>
                <p style={{ fontSize: '0.80rem', color: '#64748B', margin: '4px 0 0' }}>
                  Assign driver, vehicle registration number, and operating vendor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFleetModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  marginBottom: 16,
                }}
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveFleet}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                {/* Transporter / Vendor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Transporter / Taxi Union *
                  </label>
                  <select
                    value={vehVendorId}
                    onChange={(e) => setVehVendorId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', fontWeight: 600 }}
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {sanitizeDisplayName(v.businessName)} ({v.city || 'Standard'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Vehicle Model (e.g. Innova Crysta, Dzire) *
                    </label>
                    <input
                      type="text"
                      value={vehModel}
                      onChange={(e) => setVehModel(e.target.value)}
                      required
                      placeholder="e.g. Toyota Innova Crysta"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Category *
                    </label>
                    <select
                      value={vehCategory}
                      onChange={(e) => {
                        const nextCat = e.target.value as VehicleCategory;
                        setVehCategory(nextCat);
                        setVehCapacity(VEHICLE_CATEGORY_CONFIG[nextCat]?.defaultPax || 6);
                      }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    >
                      {VEHICLE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {VEHICLE_CATEGORY_CONFIG[c]?.label || c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Registration Number & Capacity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Plate Registration Number *
                    </label>
                    <input
                      type="text"
                      value={vehRegNo}
                      onChange={(e) => setVehRegNo(e.target.value.toUpperCase())}
                      required
                      placeholder="e.g. JK01AB1101"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', fontFamily: 'monospace', fontWeight: 800 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Passenger Capacity (Pax)
                    </label>
                    <input
                      type="number"
                      value={vehCapacity}
                      onChange={(e) => setVehCapacity(Number(e.target.value))}
                      min={1}
                      max={60}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    />
                  </div>
                </div>

                {/* Chauffeur Section Card inside Modal */}
                <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, border: '1px solid #E2E8F0', marginTop: 4 }}>
                  <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0F172A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} color="#059669" />
                    <span>Assigned Chauffeur / Driver Details</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        Driver Full Name
                      </label>
                      <input
                        type="text"
                        value={drName}
                        onChange={(e) => setDrName(e.target.value)}
                        placeholder="e.g. Tariq Ahmad"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        Driver Mobile (WhatsApp)
                      </label>
                      <input
                        type="tel"
                        value={drMobile}
                        onChange={(e) => setDrMobile(e.target.value)}
                        placeholder="e.g. 9876543210"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Driving License Number
                    </label>
                    <input
                      type="text"
                      value={drLicense}
                      onChange={(e) => setDrLicense(e.target.value.toUpperCase())}
                      placeholder="e.g. JK0120190001234"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                {/* Status and AC */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={vehHasAC}
                      onChange={(e) => setVehHasAC(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <span>Air Conditioned (AC)</span>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Status:</span>
                    <select
                      value={vehStatus}
                      onChange={(e) => setVehStatus(e.target.value as VehicleStatus)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.80rem', fontWeight: 700 }}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="ON_TRIP">ON TRIP</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setIsFleetModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 8,
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: 8,
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : editingVehicle ? 'Update Cab' : 'Save Cab to Fleet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT TRANSPORTER VENDOR */}
      {isVendorModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  {editingVendor ? 'Edit Transporter Operator' : 'Register Transporter / Taxi Union'}
                </h3>
                <p style={{ fontSize: '0.80rem', color: '#64748B', margin: '4px 0 0' }}>
                  Local vehicle suppliers, unions, and chauffeur providers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  marginBottom: 16,
                }}
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveVendor}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Transporter Business / Union Name *
                  </label>
                  <input
                    type="text"
                    value={vBusinessName}
                    onChange={(e) => setVBusinessName(e.target.value)}
                    required
                    placeholder="e.g. Kashmir Valley Taxi Operators Union"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={vContactPerson}
                      onChange={(e) => setVContactPerson(e.target.value)}
                      placeholder="e.g. Bashir Ahmad"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Phone / Mobile *
                    </label>
                    <input
                      type="tel"
                      value={vPhone}
                      onChange={(e) => setVPhone(e.target.value)}
                      required
                      placeholder="e.g. 9876543210"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      City / Operating Hub
                    </label>
                    <input
                      type="text"
                      value={vCity}
                      onChange={(e) => setVCity(e.target.value)}
                      placeholder="e.g. Srinagar"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Settlement Terms
                    </label>
                    <input
                      type="text"
                      value={vTerms}
                      onChange={(e) => setVTerms(e.target.value)}
                      placeholder="e.g. 15 Days Post Departure"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={vEmail}
                    onChange={(e) => setVEmail(e.target.value)}
                    placeholder="e.g. taxiunion@kashmir.com"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 8,
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: 8,
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : editingVendor ? 'Update Transporter' : 'Save Transporter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
