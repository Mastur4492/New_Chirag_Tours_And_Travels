'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Star,
  Bed,
  MapPin,
  Edit2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  X,
  Check,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  DestinationDto,
  HotelDto,
  HotelPropertyType,
  MealPlan,
  RoomCategoryDto,
} from '@chirag/types';
import { apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { sanitizeDisplayName } from '@/lib/labels';
import { ImageUploadWidget } from '@/components/ImageUploadWidget';
import { SearchableSelect } from '@/components/SearchableSelect';

const PROPERTY_TYPES: HotelPropertyType[] = [
  'HOTEL',
  'RESORT',
  'HOUSEBOAT',
  'HOMESTAY',
  'LUXURY_CAMP',
  'HERITAGE_HAVELI',
];

const MEAL_PLANS: MealPlan[] = ['RO', 'CP', 'MAP', 'AP'];

interface HotelConfirmState {
  hotel: HotelDto;
  targetActive: boolean;
}

export default function HotelsPage() {
  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Hotel Modal
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelDto | null>(null);
  const [submittingHotel, setSubmittingHotel] = useState(false);
  const [hotelModalError, setHotelModalError] = useState<string | null>(null);

  // Hotel Form Fields
  const [name, setName] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [starRating, setStarRating] = useState<number>(3);
  const [propertyType, setPropertyType] = useState<HotelPropertyType>('HOTEL');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [amenitiesInput, setAmenitiesInput] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [hotelImages, setHotelImages] = useState<string[]>([]);

  // Hotel Status Confirmation Modal
  const [hotelConfirm, setHotelConfirm] = useState<HotelConfirmState | null>(null);
  const [togglingHotel, setTogglingHotel] = useState(false);

  // Rooms Modal
  const [selectedHotelForRooms, setSelectedHotelForRooms] = useState<HotelDto | null>(null);
  const [rooms, setRooms] = useState<RoomCategoryDto[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomCategoryDto | null>(null);

  // Room Form Fields
  const [roomName, setRoomName] = useState('');
  const [baseOccupancy, setBaseOccupancy] = useState(2);
  const [maxAdults, setMaxAdults] = useState(3);
  const [maxChildren, setMaxChildren] = useState(2);
  const [extraBedSupported, setExtraBedSupported] = useState(true);
  const [maxExtraBeds, setMaxExtraBeds] = useState(1);
  const [allowedPlans, setAllowedPlans] = useState<MealPlan[]>(['RO', 'CP', 'MAP', 'AP']);
  const [totalRooms, setTotalRooms] = useState<number>(10);
  const [pricePerNight, setPricePerNight] = useState<number>(4500);
  const [extraBedPricePerNight, setExtraBedPricePerNight] = useState<number>(1200);
  const [submittingRoom, setSubmittingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDestinations = async () => {
    try {
      const data = await apiRequest<DestinationDto[]>('destinations?limit=150');
      setDestinations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load destinations', err);
    }
  };

  const fetchHotels = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = `hotels?page=1&limit=150`;
      if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;
      if (destFilter) query += `&destinationId=${destFilter}`;
      if (starFilter) query += `&starRating=${starFilter}`;
      if (typeFilter) query += `&propertyType=${typeFilter}`;
      if (statusFilter !== '') query += `&isActive=${statusFilter === 'true'}`;

      const data = await apiRequest<HotelDto[]>(query);
      setHotels(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchHotels();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, destFilter, starFilter, typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchHotels();
  };

  const paginatedHotels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return hotels.slice(start, start + pageSize);
  }, [hotels, currentPage, pageSize]);

  const openCreateHotelModal = () => {
    setEditingHotel(null);
    setName('');
    setDestinationId(destinations[0]?.id || '');
    setStarRating(3);
    setPropertyType('HOTEL');
    setAddress('');
    setCity('');
    setVendorName('');
    setContactPhone('');
    setContactEmail('');
    setAmenitiesInput('WiFi, Room Service, AC');
    setCheckInTime('14:00');
    setCheckOutTime('11:00');
    setHotelImages([]);
    setHotelModalError(null);
    setIsHotelModalOpen(true);
  };

  const openEditHotelModal = (hotel: HotelDto) => {
    setEditingHotel(hotel);
    setName(sanitizeDisplayName(hotel.name));
    setDestinationId(hotel.destinationId);
    setStarRating(hotel.starRating);
    setPropertyType(hotel.propertyType);
    setAddress(hotel.address || '');
    setCity(hotel.city || '');
    setVendorName(hotel.vendorName || '');
    setContactPhone(hotel.contactPhone || '');
    setContactEmail(hotel.contactEmail || '');
    setAmenitiesInput((hotel.amenities || []).join(', '));
    setCheckInTime(hotel.checkInTime || '14:00');
    setCheckOutTime(hotel.checkOutTime || '11:00');
    setHotelImages(hotel.images || []);
    setHotelModalError(null);
    setIsHotelModalOpen(true);
  };

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingHotel(true);
    setHotelModalError(null);

    const amenities = amenitiesInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      if (editingHotel) {
        await apiRequest(`hotels/${editingHotel.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            destinationId,
            starRating: Number(starRating),
            propertyType,
            address: address || undefined,
            city: city || undefined,
            vendorName: vendorName || undefined,
            contactPhone: contactPhone || undefined,
            contactEmail: contactEmail || undefined,
            amenities,
            images: hotelImages,
            checkInTime,
            checkOutTime,
          }),
        });
        showToast(`Hotel "${sanitizeDisplayName(name)}" updated successfully`);
      } else {
        await apiRequest('hotels', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            destinationId,
            starRating: Number(starRating),
            propertyType,
            address: address || undefined,
            city: city || undefined,
            vendorName: vendorName || undefined,
            contactPhone: contactPhone || undefined,
            contactEmail: contactEmail || undefined,
            amenities,
            images: hotelImages,
            checkInTime,
            checkOutTime,
            isActive: true,
          }),
        });
        showToast(`Hotel "${sanitizeDisplayName(name)}" created successfully`);
      }

      setIsHotelModalOpen(false);
      fetchHotels();
    } catch (err: any) {
      setHotelModalError(err.message || 'Failed to save hotel');
    } finally {
      setSubmittingHotel(false);
    }
  };

  const handleConfirmHotelToggle = async () => {
    if (!hotelConfirm) return;
    setTogglingHotel(true);
    try {
      await apiRequest(`hotels/${hotelConfirm.hotel.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: hotelConfirm.targetActive }),
      });
      showToast(
        `Hotel "${sanitizeDisplayName(hotelConfirm.hotel.name)}" marked as ${
          hotelConfirm.targetActive ? 'Active' : 'Inactive'
        }`
      );
      setHotelConfirm(null);
      fetchHotels();
    } catch (err: any) {
      showToast(`Error toggling hotel status: ${err.message || 'Action failed'}`);
    } finally {
      setTogglingHotel(false);
    }
  };

  // ROOM CATEGORIES DRAWER
  const openRoomsModal = async (hotel: HotelDto) => {
    setSelectedHotelForRooms(hotel);
    setIsRoomFormOpen(false);
    setEditingRoom(null);
    setRoomError(null);
    setLoadingRooms(true);

    try {
      const data = await apiRequest<RoomCategoryDto[]>(`hotels/${hotel.id}/rooms`);
      setRooms(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setRoomError(err.message || 'Failed to load room categories');
    } finally {
      setLoadingRooms(false);
    }
  };

  const openCreateRoomForm = () => {
    setEditingRoom(null);
    setRoomName('');
    setBaseOccupancy(2);
    setMaxAdults(3);
    setMaxChildren(2);
    setExtraBedSupported(true);
    setMaxExtraBeds(1);
    setAllowedPlans(['RO', 'CP', 'MAP', 'AP']);
    setTotalRooms(10);
    setPricePerNight(4500);
    setExtraBedPricePerNight(1200);
    setRoomError(null);
    setIsRoomFormOpen(true);
  };

  const openEditRoomForm = (room: RoomCategoryDto) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setBaseOccupancy(room.baseOccupancy);
    setMaxAdults(room.maxAdults);
    setMaxChildren(room.maxChildren);
    setExtraBedSupported(room.extraBedSupported);
    setMaxExtraBeds(room.maxExtraBeds);
    setAllowedPlans(room.allowedMealPlans || ['RO', 'CP', 'MAP', 'AP']);
    setTotalRooms(room.totalRooms || 10);
    setPricePerNight(room.pricePerNight || 4500);
    setExtraBedPricePerNight(room.extraBedPricePerNight ?? 1200);
    setRoomError(null);
    setIsRoomFormOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotelForRooms) return;

    setSubmittingRoom(true);
    setRoomError(null);

    try {
      if (editingRoom) {
        await apiRequest(`hotels/rooms/${editingRoom.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: roomName.trim(),
            baseOccupancy: Number(baseOccupancy),
            maxAdults: Number(maxAdults),
            maxChildren: Number(maxChildren),
            extraBedSupported,
            maxExtraBeds: Number(maxExtraBeds),
            extraBedPricePerNight: Number(extraBedPricePerNight),
            allowedMealPlans: allowedPlans,
            pricePerNight: Number(pricePerNight),
            totalRooms: totalRooms ? Number(totalRooms) : undefined,
          }),
        });
        showToast(`Room category "${roomName}" updated`);
      } else {
        await apiRequest(`hotels/${selectedHotelForRooms.id}/rooms`, {
          method: 'POST',
          body: JSON.stringify({
            name: roomName.trim(),
            baseOccupancy: Number(baseOccupancy),
            maxAdults: Number(maxAdults),
            maxChildren: Number(maxChildren),
            extraBedSupported,
            maxExtraBeds: Number(maxExtraBeds),
            extraBedPricePerNight: Number(extraBedPricePerNight),
            allowedMealPlans: allowedPlans,
            pricePerNight: Number(pricePerNight),
            totalRooms: totalRooms ? Number(totalRooms) : undefined,
            isActive: true,
          }),
        });
        showToast(`Room category "${roomName}" created`);
      }

      setIsRoomFormOpen(false);
      setEditingRoom(null);
      setRoomName('');

      // Refresh room list
      const refreshed = await apiRequest<RoomCategoryDto[]>(
        `hotels/${selectedHotelForRooms.id}/rooms`
      );
      setRooms(Array.isArray(refreshed) ? refreshed : []);
    } catch (err: any) {
      setRoomError(err.message || 'Failed to save room category');
    } finally {
      setSubmittingRoom(false);
    }
  };

  const toggleRoomStatus = async (room: RoomCategoryDto) => {
    if (!selectedHotelForRooms) return;
    try {
      await apiRequest(`hotels/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !room.isActive }),
      });
      showToast(`Room category "${room.name}" marked as ${!room.isActive ? 'Active' : 'Inactive'}`);
      const refreshed = await apiRequest<RoomCategoryDto[]>(
        `hotels/${selectedHotelForRooms.id}/rooms`
      );
      setRooms(Array.isArray(refreshed) ? refreshed : []);
    } catch (err: any) {
      setRoomError(err.message || 'Failed to update room category status');
    }
  };

  const toggleMealPlan = (mp: MealPlan) => {
    if (allowedPlans.includes(mp)) {
      if (allowedPlans.length === 1) return; // Keep at least one
      setAllowedPlans(allowedPlans.filter((p) => p !== mp));
    } else {
      setAllowedPlans([...allowedPlans, mp]);
    }
  };

  const getDestinationName = (destId: string) => {
    const dest = destinations.find((d) => d.id === destId);
    return dest ? sanitizeDisplayName(dest.name) : 'Unknown Destination';
  };

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div className="brand-badge">HOTEL PARTNERS & STAYS</div>
          <h1 className="page-title">Hotels & Room Categories</h1>
          <p className="page-subtitle">
            Manage partnered hotels, star ratings, amenities, and room types for package quotations.
          </p>
        </div>
        <button id="btn-add-hotel" onClick={openCreateHotelModal} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
          <Plus size={16} />
          <span>Add New Hotel</span>
        </button>
      </div>

      {toastMessage && (
        <div className="toast toast-success" style={{ zIndex: 1200 }}>
          {toastMessage}
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <form onSubmit={handleSearchSubmit} className="filter-bar" style={{ margin: 0, flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-subtle)' }}
            />
            <input
              type="text"
              placeholder="Search hotel name, city..."
              className="search-input"
              style={{ width: '100%', paddingLeft: '36px', paddingRight: search ? '32px' : '12px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '2px 4px',
                  lineHeight: 1,
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ flex: '0 1 200px' }}>
            <SearchableSelect
              options={[
                { value: '', label: 'All Destinations' },
                ...destinations.map((d) => ({
                  value: d.id,
                  label: sanitizeDisplayName(d.name),
                  subLabel: d.region,
                })),
              ]}
              value={destFilter}
              onChange={(val) => setDestFilter(val)}
              placeholder="All Destinations"
              searchPlaceholder="Search destination (type letter to jump)..."
              clearable
            />
          </div>

          <select
            className="select-filter"
            style={{ flex: '0 1 140px' }}
            value={starFilter}
            onChange={(e) => setStarFilter(e.target.value)}
          >
            <option value="">All Stars</option>
            <option value="5">5 Star Luxury</option>
            <option value="4">4 Star Premium</option>
            <option value="3">3 Star Standard</option>
            <option value="2">2 Star Economy</option>
            <option value="1">1 Star Basic</option>
          </select>

          <select
            className="select-filter"
            style={{ flex: '0 1 160px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Property Types</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            className="select-filter"
            style={{ flex: '0 1 130px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setDestFilter('');
              setStarFilter('');
              setTypeFilter('');
              setStatusFilter('');
            }}
            className="btn btn-secondary btn-sm"
            style={{ whiteSpace: 'nowrap' }}
          >
            <RefreshCw size={13} />
            Reset
          </button>
        </form>
      </div>

      {/* Hotel Table / Cards */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '940px' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '170px' }}>Hotel Name & Type</th>
                  <th style={{ minWidth: '120px' }}>Destination</th>
                  <th style={{ minWidth: '95px' }}>Star Rating</th>
                  <th style={{ minWidth: '110px' }}>Location</th>
                  <th style={{ minWidth: '130px' }}>Supplier Info (Admin)</th>
                  <th style={{ minWidth: '80px' }}>Status</th>
                  <th style={{ textAlign: 'right', minWidth: '230px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="skeleton-table-row">
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="skeleton" style={{ width: '150px', height: '16px', borderRadius: '4px' }} />
                        <div className="skeleton" style={{ width: '85px', height: '12px', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td><div className="skeleton" style={{ width: '105px', height: '15px', borderRadius: '4px' }} /></td>
                    <td><div className="skeleton" style={{ width: '80px', height: '15px', borderRadius: '4px' }} /></td>
                    <td><div className="skeleton" style={{ width: '110px', height: '14px', borderRadius: '4px' }} /></td>
                    <td><div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} /></td>
                    <td><div className="skeleton skeleton-pill" style={{ width: '60px', height: '22px' }} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="skeleton" style={{ width: '140px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="state-box">
            <AlertCircle size={36} color="#f43f5e" />
            <div className="state-title" style={{ color: '#fb7185' }}>Error Loading Hotels</div>
            <div className="state-desc">{error}</div>
            <button onClick={fetchHotels} className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>
              Retry
            </button>
          </div>
        ) : hotels.length === 0 ? (
          <div className="state-box">
            <Building2 size={40} color="#64748b" />
            <div className="state-title">No Hotels Found</div>
            <div className="state-desc">
              {search || destFilter || starFilter
                ? 'No hotels match the filter criteria.'
                : 'No hotel properties added yet. Click "Add Hotel" to create one.'}
            </div>
            <button onClick={openCreateHotelModal} className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
              Add Hotel
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block table-container" style={{ border: 'none' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '940px' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '170px' }}>Hotel Name & Type</th>
                    <th style={{ minWidth: '120px' }}>Destination</th>
                    <th style={{ minWidth: '95px' }}>Star Rating</th>
                    <th style={{ minWidth: '110px' }}>Location</th>
                    <th style={{ minWidth: '130px' }}>Supplier Info (Admin)</th>
                    <th style={{ minWidth: '80px' }}>Status</th>
                    <th style={{ textAlign: 'right', minWidth: '230px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHotels.map((hotel) => (
                    <tr key={hotel.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{sanitizeDisplayName(hotel.name)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                          {hotel.propertyType.replace('_', ' ')}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#0d9488', fontWeight: 600 }}>
                          <MapPin size={13} />
                          <span>{getDestinationName(hotel.destinationId)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {Array.from({ length: hotel.starRating }).map((_, i) => (
                            <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />
                          ))}
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            ({hotel.starRating}★)
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                          {hotel.city ? `${hotel.city}` : hotel.address || '—'}
                        </span>
                      </td>
                      <td>
                        {hotel.vendorName ? (
                          <div style={{ fontSize: '12px' }}>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>{hotel.vendorName}</span>
                            {hotel.contactPhone && (
                              <div style={{ color: 'var(--text-subtle)' }}>{hotel.contactPhone}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>Direct Contract</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${hotel.isActive ? 'badge-active' : 'badge-inactive'}`}>
                          {hotel.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => openRoomsModal(hotel)}
                            className="btn btn-primary btn-sm"
                            style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Manage Room Categories"
                          >
                            <Bed size={13} />
                            <span>Rooms</span>
                          </button>
                          <button
                            onClick={() => openEditHotelModal(hotel)}
                            className="btn btn-secondary btn-sm"
                            title="Edit Hotel"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setHotelConfirm({ hotel, targetActive: !hotel.isActive })}
                            className={`btn btn-sm ${hotel.isActive ? 'btn-danger' : 'btn-primary'}`}
                            title={hotel.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {hotel.isActive ? 'Deactivate' : 'Activate'}
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
              {paginatedHotels.map((hotel) => (
                <div key={hotel.id} style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{sanitizeDisplayName(hotel.name)}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={12} color="#0d9488" />
                        <span>{getDestinationName(hotel.destinationId)}</span> • <span>{hotel.propertyType.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <span className={`badge ${hotel.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {hotel.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '8px' }}>
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />
                    ))}
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>
                      ({hotel.starRating}★)
                    </span>
                    {hotel.city && (
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                        • {hotel.city}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {hotel.vendorName || 'Direct Contract'}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => openRoomsModal(hotel)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px', background: '#0f766e' }}
                      >
                        <Bed size={12} />
                        <span>Rooms</span>
                      </button>
                      <button
                        onClick={() => openEditHotelModal(hotel)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setHotelConfirm({ hotel, targetActive: !hotel.isActive })}
                        className={`btn btn-sm ${hotel.isActive ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        {hotel.isActive ? 'Deact' : 'Act'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {hotels.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={hotels.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemName="hotels"
              />
            )}
          </>
        )}
      </div>

      {/* Hotel Status Confirmation Modal */}
      {hotelConfirm && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div
            className="modal-container"
            style={{
              maxWidth: '460px',
              padding: '24px',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: hotelConfirm.targetActive ? '#f0fdf4' : '#fff1f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: hotelConfirm.targetActive ? '#16a34a' : '#e11d48',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {hotelConfirm.targetActive ? 'Activate Hotel Property?' : 'Deactivate Hotel Property?'}
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              {hotelConfirm.targetActive ? (
                <>
                  Are you sure you want to activate{' '}
                  <strong>{sanitizeDisplayName(hotelConfirm.hotel.name)}</strong>? It will immediately become selectable in quotation building and rate card planning.
                </>
              ) : (
                <>
                  Are you sure you want to deactivate{' '}
                  <strong>{sanitizeDisplayName(hotelConfirm.hotel.name)}</strong>? New quotations cannot book this hotel. All previously issued quotations, bookings, vouchers, and rate cards will preserve their historical links.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setHotelConfirm(null)}
                className="btn btn-secondary"
                disabled={togglingHotel}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHotelToggle}
                className={`btn ${hotelConfirm.targetActive ? 'btn-primary' : 'btn-danger'}`}
                disabled={togglingHotel}
              >
                {togglingHotel ? 'Updating...' : hotelConfirm.targetActive ? 'Confirm Activation' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Hotel Modal */}
      {isHotelModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', background: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingHotel ? `Edit Hotel: ${sanitizeDisplayName(editingHotel.name)}` : 'Add Hotel Property'}
              </h3>
              <button onClick={() => setIsHotelModalOpen(false)} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHotel} style={{ overflowY: 'auto', flex: 1 }}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {hotelModalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{hotelModalError}</span>
                  </div>
                )}

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Hotel Name *
                    </label>
                    <input
                      id="hotel-input-name"
                      type="text"
                      required
                      placeholder="e.g. The Grand Dragon, Taj Exotica"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Destination *
                    </label>
                    <SearchableSelect
                      id="hotel-select-destination"
                      options={destinations.map((d) => ({
                        value: d.id,
                        label: `${sanitizeDisplayName(d.name)} (${d.region})`,
                        subLabel: d.region,
                      }))}
                      value={destinationId}
                      onChange={(val) => setDestinationId(val)}
                      placeholder="Choose Destination..."
                      searchPlaceholder="Search destination (type letter to jump)..."
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Star Rating *
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={starRating}
                      onChange={(e) => setStarRating(Number(e.target.value))}
                    >
                      <option value="5">5 Star (Luxury)</option>
                      <option value="4">4 Star (Premium)</option>
                      <option value="3">3 Star (Standard)</option>
                      <option value="2">2 Star (Budget)</option>
                      <option value="1">1 Star (Economy)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Property Type *
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as HotelPropertyType)}
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      City / Town
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Srinagar, Candolim, Pahalgam"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Full Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street, area, landmarks"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '10px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Confidential Supplier Contact (Admin Eyes Only)
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Vendor / Property Owner
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bikanerwala Hospitality Group"
                        className="form-input"
                        style={{ width: '100%' }}
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Supplier Phone
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 9876543210"
                        className="form-input"
                        style={{ width: '100%' }}
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Amenities (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Swimming Pool, Spa, Free WiFi, Mountain View, Heating"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={amenitiesInput}
                    onChange={(e) => setAmenitiesInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <ImageUploadWidget
                    label="Hotel Property Photos & Suites"
                    images={hotelImages}
                    onChange={setHotelImages}
                    category="hotel"
                    helperText="Upload photos of rooms, resort grounds, dining halls, or scenic views."
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setIsHotelModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submittingHotel}
                >
                  Cancel
                </button>
                <button id="hotel-btn-submit" type="submit" className="btn btn-primary" disabled={submittingHotel}>
                  {submittingHotel ? 'Saving...' : editingHotel ? 'Update Hotel' : 'Create Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Rooms Modal */}
      {selectedHotelForRooms && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '1200px', width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Room Categories: {sanitizeDisplayName(selectedHotelForRooms.name)}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Room inventory records with occupancy, extra beds, and meal plans.
                </div>
              </div>
              <button onClick={() => setSelectedHotelForRooms(null)} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {roomError && (
                <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{roomError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Configured Room Categories ({rooms.length})
                </div>
                {!isRoomFormOpen && (
                  <button id="btn-add-room-category" onClick={openCreateRoomForm} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} />
                    <span>Add Room Category</span>
                  </button>
                )}
              </div>

              {/* Add / Edit Room Sub-Form */}
              {isRoomFormOpen && (
                <div className="card" style={{ background: '#f8fafc', border: '1.5px solid #ccfbf1', boxShadow: 'none', padding: '18px', borderRadius: '14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ fontWeight: 800, color: '#0f766e', fontSize: '14px' }}>
                      {editingRoom ? `Edit Category: ${editingRoom.name}` : 'New Room Category'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRoomFormOpen(false);
                        setEditingRoom(null);
                      }}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRoom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Category Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Deluxe Room, Heritage Suite, Lake View"
                          className="form-input"
                          style={{ width: '100%' }}
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f766e', marginBottom: '4px' }}>
                          Price / Night (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="100"
                          placeholder="e.g. 4500"
                          className="form-input"
                          style={{ width: '100%', borderColor: '#0d9488', fontWeight: 700 }}
                          value={pricePerNight}
                          onChange={(e) => setPricePerNight(Number(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Total Rooms
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          style={{ width: '100%' }}
                          value={totalRooms}
                          onChange={(e) => setTotalRooms(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Base Adults
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className="form-input"
                          style={{ width: '100%' }}
                          value={baseOccupancy}
                          onChange={(e) => setBaseOccupancy(Number(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Max Adults
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          className="form-input"
                          style={{ width: '100%' }}
                          value={maxAdults}
                          onChange={(e) => setMaxAdults(Number(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Max Children
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          className="form-input"
                          style={{ width: '100%' }}
                          value={maxChildren}
                          onChange={(e) => setMaxChildren(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={extraBedSupported}
                          onChange={(e) => setExtraBedSupported(e.target.checked)}
                        />
                        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Extra Bed Supported</span>
                      </label>
                      {extraBedSupported && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Max Extra Beds:</label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              className="form-input"
                              style={{ width: '70px', padding: '4px 8px' }}
                              value={maxExtraBeds}
                              onChange={(e) => setMaxExtraBeds(Number(e.target.value))}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#047857' }}>
                              Extra Bed Price / Night (₹):
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              className="form-input"
                              style={{ width: '120px', padding: '4px 8px', fontWeight: 700, color: '#047857' }}
                              value={extraBedPricePerNight}
                              onChange={(e) => setExtraBedPricePerNight(Number(e.target.value))}
                              placeholder="1200"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                        Allowed Meal Plans
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {MEAL_PLANS.map((mp) => {
                          const active = allowedPlans.includes(mp);
                          return (
                            <button
                              key={mp}
                              type="button"
                              onClick={() => toggleMealPlan(mp)}
                              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', padding: '4px 10px' }}
                            >
                              {active && <Check size={12} />}
                              <span>{mp === 'RO' ? 'EP' : mp}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRoomFormOpen(false);
                          setEditingRoom(null);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                      <button id="room-btn-submit" type="submit" className="btn btn-primary btn-sm" disabled={submittingRoom}>
                        {submittingRoom ? 'Saving...' : editingRoom ? 'Update Category' : 'Save Room Category'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Room list */}
              {loadingRooms ? (
                <div className="state-box">
                  <div className="spinner"></div>
                </div>
              ) : rooms.length === 0 ? (
                <div className="state-box" style={{ padding: '30px' }}>
                  <Bed size={32} color="#64748b" />
                  <div className="state-title">No Room Categories Yet</div>
                  <div className="state-desc">Add Deluxe, Executive, or Suite categories to configure seasonal rate cards.</div>
                </div>
              ) : (
                <div className="table-container" style={{ border: 'none', width: '100%', overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '22%' }}>Category Name</th>
                        <th style={{ width: '14%' }}>Price / Night</th>
                        <th style={{ width: '20%' }}>Occupancy</th>
                        <th style={{ width: '12%' }}>Extra Bed</th>
                        <th style={{ width: '14%' }}>Meal Plans</th>
                        <th style={{ width: '8%' }}>Status</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room.id}>
                          <td>
                            <strong style={{ color: '#0f172a', fontWeight: 700 }}>{room.name}</strong>
                            {room.totalRooms !== undefined && (
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                Total: {room.totalRooms} rooms
                              </div>
                            )}
                          </td>
                          <td>
                            <strong style={{ color: '#0d9488', fontSize: '13px', fontWeight: 800 }}>
                              {room.pricePerNight ? `₹${room.pricePerNight.toLocaleString('en-IN')}` : '₹0'}
                            </strong>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>per room/night</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12.5px' }}>
                              Base: {room.baseOccupancy} | Adults: {room.maxAdults} | Kids: {room.maxChildren}
                            </span>
                          </td>
                          <td>
                            {room.extraBedSupported ? (
                              <div>
                                <span style={{ color: '#0f766e', fontSize: '12px', fontWeight: 700 }}>
                                  Up to {room.maxExtraBeds} bed(s)
                                </span>
                                <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600, marginTop: '2px' }}>
                                  ₹{(room.extraBedPricePerNight ?? 1200).toLocaleString('en-IN')}/night
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>Not Supported</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(room.allowedMealPlans || []).map((mp) => (
                                <span key={mp} className="badge badge-regular" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                                  {mp === 'RO' ? 'EP' : mp}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${room.isActive ? 'badge-active' : 'badge-inactive'}`}>
                              {room.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => openEditRoomForm(room)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11.5px' }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleRoomStatus(room)}
                                className={`btn btn-sm ${room.isActive ? 'btn-danger' : 'btn-primary'}`}
                                style={{ padding: '3px 8px', fontSize: '11.5px' }}
                              >
                                {room.isActive ? 'Deact' : 'Act'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button onClick={() => setSelectedHotelForRooms(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
