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
  Fuel,
  MapPin,
  Edit2,
  AlertTriangle,
  X,
  RefreshCw,
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

const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'HATCHBACK',
  'SEDAN',
  'SUV',
  'PREMIUM_SUV',
  'TEMPO_TRAVELLER',
  'BUS',
];

const TARIFF_BASES: TariffBasis[] = ['PER_DAY', 'PER_KM', 'FIXED_CIRCUIT'];

export default function TransportPage() {
  const [tab, setTab] = useState<'VENDORS' | 'VEHICLES' | 'DRIVERS' | 'TARIFFS'>('VENDORS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data sets
  const [vendors, setVendors] = useState<VehicleVendorDto[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [drivers, setDrivers] = useState<DriverDto[]>([]);
  const [tariffs, setTariffs] = useState<TransportTariffDto[]>([]);
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states for the 4 tabs
  const [pageVendors, setPageVendors] = useState(1);
  const [pageSizeVendors, setPageSizeVendors] = useState(10);
  const [pageVehicles, setPageVehicles] = useState(1);
  const [pageSizeVehicles, setPageSizeVehicles] = useState(10);
  const [pageDrivers, setPageDrivers] = useState(1);
  const [pageSizeDrivers, setPageSizeDrivers] = useState(10);
  const [pageTariffs, setPageTariffs] = useState(1);
  const [pageSizeTariffs, setPageSizeTariffs] = useState(10);

  // Modals Open State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VehicleVendorDto | null>(null);

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleDto | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverDto | null>(null);

  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<TransportTariffDto | null>(null);

  // Forms - Vendor
  const [vBusinessName, setVBusinessName] = useState('');
  const [vContactPerson, setVContactPerson] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vCity, setVCity] = useState('');
  const [vTerms, setVTerms] = useState('');

  // Forms - Vehicle
  const [vehVendorId, setVehVendorId] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehCategory, setVehCategory] = useState<VehicleCategory>('SUV');
  const [vehRegNo, setVehRegNo] = useState('');
  const [vehCapacity, setVehCapacity] = useState(6);
  const [vehHasAC, setVehHasAC] = useState(true);
  const [vehStatus, setVehStatus] = useState<VehicleStatus>('AVAILABLE');

  // Forms - Driver
  const [drVendorId, setDrVendorId] = useState('');
  const [drName, setDrName] = useState('');
  const [drMobile, setDrMobile] = useState('');
  const [drLicense, setDrLicense] = useState('');
  const [drStatus, setDrStatus] = useState<DriverStatus>('ACTIVE');

  // Forms - Tariff
  const [tfDestId, setTfDestId] = useState('');
  const [tfCategory, setTfCategory] = useState<VehicleCategory>('SUV');
  const [tfSeason, setTfSeason] = useState<SeasonType>('REGULAR');
  const [tfBasis, setTfBasis] = useState<TariffBasis>('PER_DAY');
  const [tfCircuitName, setTfCircuitName] = useState('');
  const [tfBaseCost, setTfBaseCost] = useState<number>(3000);
  const [tfDriverBhatta, setTfDriverBhatta] = useState<number>(400);
  const [tfSellingRate, setTfSellingRate] = useState<number>(4500);
  const [tfIncludedKm, setTfIncludedKm] = useState<number>(150);
  const [tfExtraKmRate, setTfExtraKmRate] = useState<number>(18);
  const [tfTollIncluded, setTfTollIncluded] = useState(false);
  const [tfNightCharge, setTfNightCharge] = useState<number>(500);

  // Toast & Modal Submitting
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const paginatedVendors = useMemo(() => {
    let list = vendors;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => v.businessName.toLowerCase().includes(q) || v.contactPerson?.toLowerCase().includes(q) || v.city?.toLowerCase().includes(q));
    }
    const start = (pageVendors - 1) * pageSizeVendors;
    return list.slice(start, start + pageSizeVendors);
  }, [vendors, pageVendors, pageSizeVendors, searchQuery]);

  const paginatedVehicles = useMemo(() => {
    let list = vehicles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => v.model.toLowerCase().includes(q) || v.registrationNumber.toLowerCase().includes(q));
    }
    const start = (pageVehicles - 1) * pageSizeVehicles;
    return list.slice(start, start + pageSizeVehicles);
  }, [vehicles, pageVehicles, pageSizeVehicles, searchQuery]);

  const paginatedDrivers = useMemo(() => {
    let list = drivers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => d.fullName.toLowerCase().includes(q) || d.licenseNumber.toLowerCase().includes(q) || d.mobile.includes(q));
    }
    const start = (pageDrivers - 1) * pageSizeDrivers;
    return list.slice(start, start + pageSizeDrivers);
  }, [drivers, pageDrivers, pageSizeDrivers, searchQuery]);

  const paginatedTariffs = useMemo(() => {
    let list = tariffs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => (t.circuitName && t.circuitName.toLowerCase().includes(q)) || t.vehicleCategory.toLowerCase().includes(q));
    }
    const start = (pageTariffs - 1) * pageSizeTariffs;
    return list.slice(start, start + pageSizeTariffs);
  }, [tariffs, pageTariffs, pageSizeTariffs, searchQuery]);

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
        setDrVendorId(vList[0]!.id);
      }
      if (dList.length > 0 && !tfDestId) {
        setTfDestId(dList[0]!.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transport inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportData();
  }, []);

  // VENDOR ACTIONS
  const openCreateVendorModal = () => {
    setEditingVendor(null);
    setVBusinessName('');
    setVContactPerson('');
    setVPhone('');
    setVEmail('');
    setVCity('');
    setVTerms('Standard 15 days');
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
    setVTerms(v.settlementTerms || 'Standard 15 days');
    setModalError(null);
    setIsVendorModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      if (editingVendor) {
        await apiRequest(`transport/vendors/${editingVendor.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            businessName: vBusinessName.trim(),
            contactPerson: vContactPerson.trim() || undefined,
            phone: vPhone.trim(),
            email: vEmail.trim() || undefined,
            city: vCity.trim() || undefined,
            settlementTerms: vTerms.trim() || undefined,
          }),
        });
        showToast(`Vendor "${vBusinessName}" updated successfully`);
      } else {
        await apiRequest('transport/vendors', {
          method: 'POST',
          body: JSON.stringify({
            businessName: vBusinessName.trim(),
            contactPerson: vContactPerson.trim() || undefined,
            phone: vPhone.trim(),
            email: vEmail.trim() || undefined,
            city: vCity.trim() || undefined,
            settlementTerms: vTerms.trim() || undefined,
            isActive: true,
          }),
        });
        showToast(`Vendor "${vBusinessName}" registered successfully`);
      }
      setIsVendorModalOpen(false);
      fetchTransportData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVendorStatus = async (v: VehicleVendorDto) => {
    try {
      await apiRequest(`transport/vendors/${v.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !v.isActive }),
      });
      showToast(`Vendor "${v.businessName}" marked as ${!v.isActive ? 'Active' : 'Inactive'}`);
      fetchTransportData();
    } catch (err: any) {
      showToast(`Conflict: ${err.message || 'Cannot deactivate vendor'}`);
    }
  };

  // VEHICLE ACTIONS
  const openCreateVehicleModal = () => {
    setEditingVehicle(null);
    if (vendors.length > 0) setVehVendorId(vendors[0]!.id);
    setVehModel('');
    setVehCategory('SUV');
    setVehRegNo('');
    setVehCapacity(6);
    setVehHasAC(true);
    setVehStatus('AVAILABLE');
    setModalError(null);
    setIsVehicleModalOpen(true);
  };

  const openEditVehicleModal = (veh: VehicleDto) => {
    setEditingVehicle(veh);
    setVehVendorId(veh.vendorId);
    setVehModel(veh.model);
    setVehCategory(veh.category);
    setVehRegNo(veh.registrationNumber);
    setVehCapacity(veh.seatingCapacity);
    setVehHasAC(veh.hasAC);
    setVehStatus(veh.status);
    setModalError(null);
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      if (editingVehicle) {
        await apiRequest(`transport/vehicles/${editingVehicle.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            vendorId: vehVendorId,
            model: vehModel.trim(),
            category: vehCategory,
            registrationNumber: vehRegNo.trim().toUpperCase(),
            seatingCapacity: Number(vehCapacity),
            hasAC: vehHasAC,
            status: vehStatus,
          }),
        });
        showToast(`Vehicle "${vehRegNo}" updated`);
      } else {
        await apiRequest('transport/vehicles', {
          method: 'POST',
          body: JSON.stringify({
            vendorId: vehVendorId,
            model: vehModel.trim(),
            category: vehCategory,
            registrationNumber: vehRegNo.trim().toUpperCase(),
            seatingCapacity: Number(vehCapacity),
            hasAC: vehHasAC,
            status: vehStatus,
          }),
        });
        showToast(`Vehicle "${vehRegNo}" added to inventory`);
      }
      setIsVehicleModalOpen(false);
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
      showToast(`Vehicle ${veh.registrationNumber} status updated to ${nextStatus}`);
      fetchTransportData();
    } catch (err: any) {
      showToast(`Conflict: ${err.message || 'Cannot update status'}`);
    }
  };

  // DRIVER ACTIONS
  const openCreateDriverModal = () => {
    setEditingDriver(null);
    if (vendors.length > 0) setDrVendorId(vendors[0]!.id);
    setDrName('');
    setDrMobile('');
    setDrLicense('');
    setDrStatus('ACTIVE');
    setModalError(null);
    setIsDriverModalOpen(true);
  };

  const openEditDriverModal = (d: DriverDto) => {
    setEditingDriver(d);
    setDrVendorId(d.vendorId);
    setDrName(d.fullName);
    setDrMobile(d.mobile);
    setDrLicense(d.licenseNumber);
    setDrStatus(d.status);
    setModalError(null);
    setIsDriverModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      if (editingDriver) {
        await apiRequest(`transport/drivers/${editingDriver.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            vendorId: drVendorId,
            fullName: drName.trim(),
            mobile: drMobile.trim(),
            licenseNumber: drLicense.trim().toUpperCase(),
            status: drStatus,
          }),
        });
        showToast(`Driver "${drName}" updated`);
      } else {
        await apiRequest('transport/drivers', {
          method: 'POST',
          body: JSON.stringify({
            vendorId: drVendorId,
            fullName: drName.trim(),
            mobile: drMobile.trim(),
            licenseNumber: drLicense.trim().toUpperCase(),
            status: drStatus,
          }),
        });
        showToast(`Driver "${drName}" registered`);
      }
      setIsDriverModalOpen(false);
      fetchTransportData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDriverStatus = async (d: DriverDto, nextStatus: DriverStatus) => {
    try {
      await apiRequest(`transport/drivers/${d.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      showToast(`Driver ${d.fullName} duty status updated to ${nextStatus}`);
      fetchTransportData();
    } catch (err: any) {
      showToast(`Conflict: ${err.message || 'Cannot update driver duty status'}`);
    }
  };

  // TARIFF ACTIONS
  const openCreateTariffModal = () => {
    setEditingTariff(null);
    if (destinations.length > 0) setTfDestId(destinations[0]!.id);
    setTfCategory('SUV');
    setTfSeason('REGULAR');
    setTfBasis('PER_DAY');
    setTfCircuitName('');
    setTfBaseCost(3000);
    setTfDriverBhatta(400);
    setTfSellingRate(4500);
    setTfIncludedKm(150);
    setTfExtraKmRate(18);
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
    setTfBasis(t.tariffBasis);
    setTfCircuitName(t.circuitName || '');
    setTfBaseCost(t.baseSupplierCost);
    setTfDriverBhatta(t.driverDailyAllowanceCost || 0);
    setTfSellingRate(t.standardSellingRate);
    setTfIncludedKm(t.includedKmPerDay || 150);
    setTfExtraKmRate(t.extraKmRate || 18);
    setTfTollIncluded(t.isTollParkingIncluded || false);
    setTfNightCharge(t.nightHaltCharge || 500);
    setModalError(null);
    setIsTariffModalOpen(true);
  };

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      if (editingTariff) {
        await apiRequest(`transport/tariffs/${editingTariff.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            destinationId: tfDestId,
            vehicleCategory: tfCategory,
            seasonType: tfSeason,
            tariffBasis: tfBasis,
            circuitName: tfCircuitName.trim() || undefined,
            baseSupplierCost: Number(tfBaseCost),
            driverDailyAllowanceCost: Number(tfDriverBhatta),
            standardSellingRate: Number(tfSellingRate),
            includedKmPerDay: Number(tfIncludedKm),
            extraKmRate: Number(tfExtraKmRate),
            isTollParkingIncluded: tfTollIncluded,
            nightHaltCharge: Number(tfNightCharge),
          }),
        });
        showToast('Transport tariff updated successfully');
      } else {
        await apiRequest('transport/tariffs', {
          method: 'POST',
          body: JSON.stringify({
            destinationId: tfDestId,
            vehicleCategory: tfCategory,
            seasonType: tfSeason,
            tariffBasis: tfBasis,
            circuitName: tfCircuitName.trim() || undefined,
            baseSupplierCost: Number(tfBaseCost),
            driverDailyAllowanceCost: Number(tfDriverBhatta),
            standardSellingRate: Number(tfSellingRate),
            includedKmPerDay: Number(tfIncludedKm),
            extraKmRate: Number(tfExtraKmRate),
            isTollParkingIncluded: tfTollIncluded,
            nightHaltCharge: Number(tfNightCharge),
            isActive: true,
          }),
        });
        showToast('Transport tariff created successfully');
      }
      setIsTariffModalOpen(false);
      fetchTransportData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save tariff');
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
      showToast(`Tariff marked as ${!t.isActive ? 'Active' : 'Inactive'}`);
      fetchTransportData();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to toggle tariff'}`);
    }
  };

  const getVendorName = (id: string) => {
    const v = vendors.find((x) => x.id === id);
    return v ? sanitizeDisplayName(v.businessName) : 'Unknown Vendor';
  };

  const getDestinationName = (id: string) => {
    const d = destinations.find((x) => x.id === id);
    return d ? sanitizeDisplayName(d.name) : 'Unknown';
  };

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div className="brand-badge">CABS & FLEET</div>
          <h1 className="page-title">Transport Fleet & Cab Tariffs</h1>
          <p className="page-subtitle">
            Manage car rental vendors, vehicle fleet (Sedan, Innova, Tempo Traveller), drivers, and daily / per-km rates.
          </p>
        </div>

        <div>
          {tab === 'VENDORS' && (
            <button onClick={openCreateVendorModal} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} />
              <span>Add Vendor</span>
            </button>
          )}
          {tab === 'VEHICLES' && (
            <button onClick={openCreateVehicleModal} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} />
              <span>Add Vehicle</span>
            </button>
          )}
          {tab === 'DRIVERS' && (
            <button onClick={openCreateDriverModal} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} />
              <span>Add Driver</span>
            </button>
          )}
          {tab === 'TARIFFS' && (
            <button onClick={openCreateTariffModal} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} />
              <span>Add Tariff Rule</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="toast toast-success" style={{ zIndex: 1200 }}>
          {toastMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button onClick={() => setTab('VENDORS')} className={`tab-btn ${tab === 'VENDORS' ? 'active' : ''}`}>
          Vehicle Vendors ({vendors.length})
        </button>
        <button onClick={() => setTab('VEHICLES')} className={`tab-btn ${tab === 'VEHICLES' ? 'active' : ''}`}>
          Fleet Vehicles ({vehicles.length})
        </button>
        <button onClick={() => setTab('DRIVERS')} className={`tab-btn ${tab === 'DRIVERS' ? 'active' : ''}`}>
          Chauffeurs / Drivers ({drivers.length})
        </button>
        <button onClick={() => setTab('TARIFFS')} className={`tab-btn ${tab === 'TARIFFS' ? 'active' : ''}`}>
          Transport Tariffs ({tariffs.length})
        </button>
      </div>

      {/* TAB 1: VENDORS */}
      {tab === 'VENDORS' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '840px' }}>
                <thead>
                  <tr>
                    <th>Vendor Business</th>
                    <th>Contact Person</th>
                    <th>Phone / Email</th>
                    <th>Location</th>
                    <th>Settlement Terms</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <tr key={idx} className="skeleton-table-row">
                      <td><div className="skeleton" style={{ width: '150px', height: '16px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '90px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '130px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton skeleton-pill" style={{ width: '60px', height: '22px' }} /></td>
                      <td style={{ textAlign: 'right' }}><div className="skeleton" style={{ width: '90px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : vendors.length === 0 ? (
            <div className="state-box">
              <Users size={36} color="#64748b" />
              <div className="state-title">No Transport Vendors Registered</div>
              <div className="state-desc">Register local vehicle operators, taxi unions, and fleet owners.</div>
            </div>
          ) : (
            <>
              {/* Desktop Table (>= 768px) */}
              <div className="hidden md:block table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '840px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '180px' }}>Vendor Business</th>
                      <th style={{ minWidth: '140px' }}>Contact Person</th>
                      <th style={{ minWidth: '160px' }}>Phone / Email</th>
                      <th style={{ minWidth: '130px' }}>Location</th>
                      <th style={{ minWidth: '150px' }}>Settlement Terms</th>
                      <th style={{ minWidth: '90px' }}>Status</th>
                      <th style={{ textAlign: 'right', minWidth: '160px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVendors.map((v) => (
                      <tr key={v.id}>
                        <td><strong style={{ color: '#0f172a', fontWeight: 700 }}>{sanitizeDisplayName(v.businessName)}</strong></td>
                        <td>{v.contactPerson || '—'}</td>
                        <td>
                          <div>{v.phone}</div>
                          {v.email && <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{v.email}</div>}
                        </td>
                        <td>{v.city ? `${v.city}${v.state ? `, ${v.state}` : ''}` : '—'}</td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: '#d97706', fontWeight: 600 }}>
                            {v.settlementTerms || 'Standard 15 days'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${v.isActive ? 'badge-active' : 'badge-inactive'}`}>
                            {v.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => openEditVendorModal(v)}
                              className="btn btn-secondary btn-sm"
                              title="Edit Vendor"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => toggleVendorStatus(v)}
                              className={`btn btn-sm ${v.isActive ? 'btn-danger' : 'btn-primary'}`}
                              title={v.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {v.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards (< 768px) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedVendors.map((v) => (
                  <div key={v.id} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>{sanitizeDisplayName(v.businessName)}</strong>
                      <span className={`badge ${v.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {v.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '4px' }}>
                      Contact: {v.contactPerson || '—'} • {v.phone}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      {v.city ? `${v.city}${v.state ? `, ${v.state}` : ''}` : 'Location unlisted'} • Terms: {v.settlementTerms || 'Standard 15 days'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                      <button
                        onClick={() => openEditVendorModal(v)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => toggleVendorStatus(v)}
                        className={`btn btn-sm ${v.isActive ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        {v.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {vendors.length > 0 && (
                <Pagination
                  currentPage={pageVendors}
                  totalItems={vendors.length}
                  pageSize={pageSizeVendors}
                  onPageChange={setPageVendors}
                  onPageSizeChange={setPageSizeVendors}
                  itemName="vendors"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: VEHICLES */}
      {tab === 'VEHICLES' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '920px' }}>
                <thead>
                  <tr>
                    <th>Vehicle Model</th>
                    <th>Registration No</th>
                    <th>Category</th>
                    <th>Capacity</th>
                    <th>AC Status</th>
                    <th>Assigned Vendor</th>
                    <th>Operational Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <tr key={idx} className="skeleton-table-row">
                      <td><div className="skeleton" style={{ width: '140px', height: '16px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '110px', height: '22px', borderRadius: '6px' }} /></td>
                      <td><div className="skeleton skeleton-pill" style={{ width: '70px', height: '22px' }} /></td>
                      <td><div className="skeleton" style={{ width: '65px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '110px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton skeleton-pill" style={{ width: '60px', height: '22px' }} /></td>
                      <td style={{ textAlign: 'right' }}><div className="skeleton" style={{ width: '90px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="state-box">
              <Car size={36} color="#64748b" />
              <div className="state-title">No Vehicles Registered</div>
              <div className="state-desc">Add Innovas, Sedans, Tempo Travellers, or luxury coaches to inventory.</div>
            </div>
          ) : (
            <>
              {/* Desktop Table (>= 768px) */}
              <div className="hidden md:block table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '920px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '160px' }}>Vehicle Model</th>
                      <th style={{ minWidth: '140px' }}>Registration No</th>
                      <th style={{ minWidth: '110px' }}>Category</th>
                      <th style={{ minWidth: '90px' }}>Capacity</th>
                      <th style={{ minWidth: '90px' }}>AC Status</th>
                      <th style={{ minWidth: '150px' }}>Assigned Vendor</th>
                      <th style={{ minWidth: '120px' }}>Status</th>
                      <th style={{ textAlign: 'right', minWidth: '140px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVehicles.map((veh) => (
                      <tr key={veh.id}>
                        <td><strong style={{ color: '#0f172a', fontWeight: 700 }}>{veh.model}</strong></td>
                        <td>
                          <code style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            {veh.registrationNumber}
                          </code>
                        </td>
                        <td><span className="badge badge-regular">{veh.category}</span></td>
                        <td>{veh.seatingCapacity} Seater</td>
                        <td>{veh.hasAC ? <span style={{ color: '#0f766e', fontWeight: 600 }}>AC Included</span> : 'Non-AC'}</td>
                        <td><span style={{ color: 'var(--text-muted)' }}>{getVendorName(veh.vendorId)}</span></td>
                        <td>
                          <span className={`badge ${veh.status === 'AVAILABLE' ? 'badge-active' : veh.status === 'ON_TRIP' ? 'badge-peak' : 'badge-inactive'}`}>
                            {veh.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => openEditVehicleModal(veh)}
                              className="btn btn-secondary btn-sm"
                              title="Edit Vehicle"
                            >
                              <Edit2 size={12} />
                            </button>
                            {veh.status === 'AVAILABLE' ? (
                              <button
                                onClick={() => handleUpdateVehicleStatus(veh, 'MAINTENANCE')}
                                className="btn btn-danger btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                title="Mark Under Maintenance"
                              >
                                Service
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateVehicleStatus(veh, 'AVAILABLE')}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                title="Mark Available"
                              >
                                Ready
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards (< 768px) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedVehicles.map((veh) => (
                  <div key={veh.id} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>{veh.model}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {getVendorName(veh.vendorId)} • {veh.seatingCapacity} Seats
                        </div>
                      </div>
                      <span className={`badge ${veh.status === 'AVAILABLE' ? 'badge-active' : veh.status === 'ON_TRIP' ? 'badge-peak' : 'badge-inactive'}`}>
                        {veh.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <code style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' }}>
                        {veh.registrationNumber}
                      </code>
                      <span className="badge badge-regular">{veh.category}</span>
                      <span style={{ fontSize: '12px', color: '#0f766e', fontWeight: 600 }}>{veh.hasAC ? 'AC' : 'Non-AC'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                      <button
                        onClick={() => openEditVehicleModal(veh)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleUpdateVehicleStatus(veh, veh.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE')}
                        className={`btn btn-sm ${veh.status === 'AVAILABLE' ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        {veh.status === 'AVAILABLE' ? 'Service' : 'Set Ready'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {vehicles.length > 0 && (
                <Pagination
                  currentPage={pageVehicles}
                  totalItems={vehicles.length}
                  pageSize={pageSizeVehicles}
                  onPageChange={setPageVehicles}
                  onPageSizeChange={setPageSizeVehicles}
                  itemName="vehicles"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: DRIVERS */}
      {tab === 'DRIVERS' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '880px' }}>
                <thead>
                  <tr>
                    <th>Driver Full Name</th>
                    <th>Mobile Contact</th>
                    <th>License Number</th>
                    <th>Vendor Affiliation</th>
                    <th>Duty Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <tr key={idx} className="skeleton-table-row">
                      <td><div className="skeleton" style={{ width: '130px', height: '16px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '120px', height: '22px', borderRadius: '6px' }} /></td>
                      <td><div className="skeleton" style={{ width: '110px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton skeleton-pill" style={{ width: '60px', height: '22px' }} /></td>
                      <td style={{ textAlign: 'right' }}><div className="skeleton" style={{ width: '90px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : drivers.length === 0 ? (
            <div className="state-box">
              <ShieldCheck size={36} color="#64748b" />
              <div className="state-title">No Drivers Registered</div>
              <div className="state-desc">Maintain validated chauffeurs with commercial driving licences.</div>
            </div>
          ) : (
            <>
              {/* Desktop Table (>= 768px) */}
              <div className="hidden md:block table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '880px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '160px' }}>Driver Full Name</th>
                      <th style={{ minWidth: '130px' }}>Mobile Contact</th>
                      <th style={{ minWidth: '160px' }}>License Number</th>
                      <th style={{ minWidth: '150px' }}>Vendor Affiliation</th>
                      <th style={{ minWidth: '110px' }}>Duty Status</th>
                      <th style={{ textAlign: 'right', minWidth: '140px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDrivers.map((d) => (
                      <tr key={d.id}>
                        <td><strong style={{ color: '#0f172a', fontWeight: 700 }}>{d.fullName}</strong></td>
                        <td>{d.mobile}</td>
                        <td>
                          <code style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px' }}>
                            {d.licenseNumber}
                          </code>
                        </td>
                        <td>{getVendorName(d.vendorId)}</td>
                        <td>
                          <span className={`badge ${d.status === 'ACTIVE' ? 'badge-active' : d.status === 'ON_DUTY' ? 'badge-peak' : 'badge-inactive'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => openEditDriverModal(d)}
                              className="btn btn-secondary btn-sm"
                              title="Edit Driver"
                            >
                              <Edit2 size={12} />
                            </button>
                            {d.status === 'ACTIVE' ? (
                              <button
                                onClick={() => handleUpdateDriverStatus(d, 'OFF_DUTY')}
                                className="btn btn-danger btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                title="Mark Off Duty"
                              >
                                Off Duty
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateDriverStatus(d, 'ACTIVE')}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                title="Mark Active"
                              >
                                Active
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards (< 768px) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedDrivers.map((d) => (
                  <div key={d.id} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>{d.fullName}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{d.mobile}</div>
                      </div>
                      <span className={`badge ${d.status === 'ACTIVE' ? 'badge-active' : d.status === 'ON_DUTY' ? 'badge-peak' : 'badge-inactive'}`}>
                        {d.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                      Vendor: {getVendorName(d.vendorId)} • License: {d.licenseNumber}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                      <button
                        onClick={() => openEditDriverModal(d)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleUpdateDriverStatus(d, d.status === 'ACTIVE' ? 'OFF_DUTY' : 'ACTIVE')}
                        className={`btn btn-sm ${d.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        {d.status === 'ACTIVE' ? 'Off Duty' : 'Set Active'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {drivers.length > 0 && (
                <Pagination
                  currentPage={pageDrivers}
                  totalItems={drivers.length}
                  pageSize={pageSizeDrivers}
                  onPageChange={setPageDrivers}
                  onPageSizeChange={setPageSizeDrivers}
                  itemName="drivers"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 4: TARIFFS */}
      {tab === 'TARIFFS' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '920px' }}>
                <thead>
                  <tr>
                    <th>Destination & Category</th>
                    <th>Tariff Basis / Circuit</th>
                    <th>Base Supplier Cost</th>
                    <th>Driver Bhatta</th>
                    <th>Selling Rate</th>
                    <th>Tolls / Night Rules</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <tr key={idx} className="skeleton-table-row">
                      <td><div className="skeleton" style={{ width: '140px', height: '16px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '90px', height: '16px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '70px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '90px', height: '16px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '110px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton skeleton-pill" style={{ width: '55px', height: '22px' }} /></td>
                      <td style={{ textAlign: 'right' }}><div className="skeleton" style={{ width: '90px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : tariffs.length === 0 ? (
            <div className="state-box">
              <Tag size={36} color="#64748b" />
              <div className="state-title">No Transport Tariffs Configured</div>
              <div className="state-desc">Configure buying rates and standard selling prices for cabs.</div>
            </div>
          ) : (
            <>
              {/* Desktop Table (>= 768px) */}
              <div className="hidden md:block table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '920px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '180px' }}>Destination & Category</th>
                      <th style={{ minWidth: '150px' }}>Tariff Basis / Circuit</th>
                      <th style={{ minWidth: '140px' }}>Base Supplier Cost</th>
                      <th style={{ minWidth: '110px' }}>Driver Bhatta</th>
                      <th style={{ minWidth: '130px' }}>Selling Rate</th>
                      <th style={{ minWidth: '140px' }}>Tolls / Night Rules</th>
                      <th style={{ minWidth: '90px' }}>Status</th>
                      <th style={{ textAlign: 'right', minWidth: '160px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTariffs.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{getDestinationName(t.destinationId)}</div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                            <span className="badge badge-regular">{t.vehicleCategory}</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>({t.seasonType})</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: '#0f766e', fontWeight: 600 }}>
                            {t.tariffBasis.replace('_', ' ')}
                          </span>
                          {t.circuitName && (
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{t.circuitName}</div>
                          )}
                        </td>
                        <td>
                          <strong style={{ color: '#d97706', fontSize: '13.5px' }}>
                            ₹{t.baseSupplierCost?.toLocaleString('en-IN')}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'block' }}>Net Cost / day</span>
                        </td>
                        <td>₹{t.driverDailyAllowanceCost ?? 0}</td>
                        <td>
                          <strong style={{ color: '#0f766e', fontSize: '13.5px' }}>
                            ₹{t.standardSellingRate?.toLocaleString('en-IN')}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'block' }}>Selling Rate</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {t.isTollParkingIncluded ? 'Tolls Included' : 'Tolls Extra'} • Night: ₹{t.nightHaltCharge ?? 0}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${t.isActive ? 'badge-active' : 'badge-inactive'}`}>
                            {t.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => openEditTariffModal(t)}
                              className="btn btn-secondary btn-sm"
                              title="Edit Tariff"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => toggleTariffStatus(t)}
                              className={`btn btn-sm ${t.isActive ? 'btn-danger' : 'btn-primary'}`}
                              title={t.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {t.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards (< 768px) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedTariffs.map((t) => (
                  <div key={t.id} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>{getDestinationName(t.destinationId)}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {t.vehicleCategory} • {t.tariffBasis.replace('_', ' ')}
                        </div>
                      </div>
                      <span className={`badge ${t.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Supplier Net Cost</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#d97706' }}>
                          ₹{t.baseSupplierCost?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Selling Price</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f766e' }}>
                          ₹{t.standardSellingRate?.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                      <button
                        onClick={() => openEditTariffModal(t)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => toggleTariffStatus(t)}
                        className={`btn btn-sm ${t.isActive ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        {t.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {tariffs.length > 0 && (
                <Pagination
                  currentPage={pageTariffs}
                  totalItems={tariffs.length}
                  pageSize={pageSizeTariffs}
                  onPageChange={setPageTariffs}
                  onPageSizeChange={setPageSizeTariffs}
                  itemName="tariffs"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Modal: Vendor (Create & Edit) */}
      {isVendorModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', background: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingVendor ? `Edit Vendor: ${editingVendor.businessName}` : 'Register Transport Vendor'}
              </h3>
              <button onClick={() => setIsVendorModalOpen(false)} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} style={{ overflowY: 'auto', flex: 1 }}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {modalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Vendor Business / Fleet Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gulmarg Taxi Union, Kashmir Cab Network"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={vBusinessName}
                    onChange={(e) => setVBusinessName(e.target.value)}
                  />
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Manzoor Ahmed"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={vContactPerson}
                      onChange={(e) => setVContactPerson(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Phone Contact *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={vPhone}
                      onChange={(e) => setVPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="vendor@transport.in"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={vEmail}
                      onChange={(e) => setVEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      City / Hub
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Srinagar, Manali"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={vCity}
                      onChange={(e) => setVCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Settlement Terms (Admin Confidential)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50% advance, balance on trip completion"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={vTerms}
                    onChange={(e) => setVTerms(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vehicle (Create & Edit) */}
      {isVehicleModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', background: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingVehicle ? `Edit Vehicle: ${editingVehicle.registrationNumber}` : 'Add Vehicle to Fleet'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} style={{ overflowY: 'auto', flex: 1 }}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {modalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Owner Vendor *
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={vehVendorId}
                    onChange={(e) => setVehVendorId(e.target.value)}
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {sanitizeDisplayName(v.businessName)} ({v.city || 'Vendor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Model & Make *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Toyota Innova Crysta, Dzire"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={vehModel}
                      onChange={(e) => setVehModel(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. JK01AB1234"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={vehRegNo}
                      onChange={(e) => setVehRegNo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Category *
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={vehCategory}
                      onChange={(e) => setVehCategory(e.target.value as VehicleCategory)}
                    >
                      {VEHICLE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Seats *
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="60"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={vehCapacity}
                      onChange={(e) => setVehCapacity(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Operational Status
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={vehStatus}
                      onChange={(e) => setVehStatus(e.target.value as VehicleStatus)}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={vehHasAC}
                      onChange={(e) => setVehHasAC(e.target.checked)}
                    />
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Air Conditioning (AC) Equipped</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Driver (Create & Edit) */}
      {isDriverModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', background: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingDriver ? `Edit Driver: ${editingDriver.fullName}` : 'Register New Chauffeur / Driver'}
              </h3>
              <button onClick={() => setIsDriverModalOpen(false)} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} style={{ overflowY: 'auto', flex: 1 }}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {modalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Affiliated Vendor *
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={drVendorId}
                    onChange={(e) => setDrVendorId(e.target.value)}
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {sanitizeDisplayName(v.businessName)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Driver Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tariq Ahmad Khan"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={drName}
                      onChange={(e) => setDrName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Mobile Contact *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={drMobile}
                      onChange={(e) => setDrMobile(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Commercial License Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. JK-0120220004567"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={drLicense}
                      onChange={(e) => setDrLicense(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Duty Status
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={drStatus}
                      onChange={(e) => setDrStatus(e.target.value as DriverStatus)}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="OFF_DUTY">OFF_DUTY</option>
                      <option value="BLACKLISTED">BLACKLISTED</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingDriver ? 'Update Driver' : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tariff (Create & Edit) */}
      {isTariffModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', background: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingTariff ? 'Edit Transport Tariff Rule' : 'Add Transport Tariff Rule'}
              </h3>
              <button onClick={() => setIsTariffModalOpen(false)} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTariff} style={{ overflowY: 'auto', flex: 1 }}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {modalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Destination *
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={tfDestId}
                      onChange={(e) => setTfDestId(e.target.value)}
                    >
                      {destinations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {sanitizeDisplayName(d.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Vehicle Category *
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={tfCategory}
                      onChange={(e) => setTfCategory(e.target.value as VehicleCategory)}
                    >
                      {VEHICLE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Season Classification *
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={tfSeason}
                      onChange={(e) => setTfSeason(e.target.value as SeasonType)}
                    >
                      <option value="REGULAR">REGULAR</option>
                      <option value="PEAK">PEAK</option>
                      <option value="SUPER_PEAK">SUPER_PEAK</option>
                      <option value="OFF_SEASON">OFF_SEASON</option>
                      <option value="FESTIVAL">FESTIVAL</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Tariff Basis *
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={tfBasis}
                      onChange={(e) => setTfBasis(e.target.value as TariffBasis)}
                    >
                      {TARIFF_BASES.map((b) => (
                        <option key={b} value={b}>
                          {b.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Circuit Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Srinagar - Gulmarg - Pahalgam 5D Circuit"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={tfCircuitName}
                    onChange={(e) => setTfCircuitName(e.target.value)}
                  />
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Base Supplier Net Cost (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={tfBaseCost}
                      onChange={(e) => setTfBaseCost(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Driver Daily Bhatta (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={tfDriverBhatta}
                      onChange={(e) => setTfDriverBhatta(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Standard Selling Rate (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={tfSellingRate}
                      onChange={(e) => setTfSellingRate(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Included Km per Day
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={tfIncludedKm}
                      onChange={(e) => setTfIncludedKm(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Extra Km Rate (₹/km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={tfExtraKmRate}
                      onChange={(e) => setTfExtraKmRate(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Night Halt Charge (₹/night)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={tfNightCharge}
                      onChange={(e) => setTfNightCharge(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tfTollIncluded}
                      onChange={(e) => setTfTollIncluded(e.target.checked)}
                    />
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Tolls & Parking Charges Included</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setIsTariffModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingTariff ? 'Update Tariff' : 'Save Tariff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
