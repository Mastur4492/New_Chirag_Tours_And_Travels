'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Building2,
  AlertCircle,
  Tag,
  CheckCircle,
  Trash2,
  Edit2,
  AlertTriangle,
  X,
  Search,
} from 'lucide-react';
import {
  DestinationDto,
  HotelDto,
  MealPlan,
  RoomCategoryDto,
  SeasonalRateCardDto,
  SeasonDto,
  SeasonType,
} from '@chirag/types';
import { apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { sanitizeDisplayName } from '@/lib/labels';

const SEASON_TYPES: SeasonType[] = [
  'REGULAR',
  'PEAK',
  'SUPER_PEAK',
  'OFF_SEASON',
  'FESTIVAL',
];

const MEAL_PLANS: MealPlan[] = ['RO', 'CP', 'MAP', 'AP'];

interface DeleteSeasonConfirmState {
  id: string;
  name: string;
}

export default function SeasonsPage() {
  const [activeTab, setActiveTab] = useState<'SEASONS' | 'RATE_CARDS'>('SEASONS');
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [rateCards, setRateCards] = useState<SeasonalRateCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [seasonPage, setSeasonPage] = useState(1);
  const [seasonPageSize, setSeasonPageSize] = useState(10);
  const [rateCardPage, setRateCardPage] = useState(1);
  const [rateCardPageSize, setRateCardPageSize] = useState(10);

  // Season Modal (Create & Edit)
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<SeasonDto | null>(null);
  const [seasonName, setSeasonName] = useState('');
  const [seasonType, setSeasonType] = useState<SeasonType>('PEAK');
  const [destinationId, setDestinationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState<number>(30);
  const [seasonDesc, setSeasonDesc] = useState('');
  const [submittingSeason, setSubmittingSeason] = useState(false);
  const [seasonModalError, setSeasonModalError] = useState<string | null>(null);

  // Delete Season Confirmation Modal
  const [deleteSeasonConfirm, setDeleteSeasonConfirm] = useState<DeleteSeasonConfirmState | null>(null);
  const [deletingSeason, setDeletingSeason] = useState(false);

  // Interactive Simulator
  const [simDestId, setSimDestId] = useState('');
  const [simDate, setSimDate] = useState('');
  const [simResult, setSimResult] = useState<{ seasonType: SeasonType; date: string } | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Rate Card Modal (Create & Edit)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState<SeasonalRateCardDto | null>(null);
  const [rcHotelId, setRcHotelId] = useState('');
  const [rcRooms, setRcRooms] = useState<RoomCategoryDto[]>([]);
  const [rcRoomId, setRcRoomId] = useState('');
  const [rcSeasonId, setRcSeasonId] = useState('');
  const [rcMealPlan, setRcMealPlan] = useState<MealPlan>('CP');
  const [rcBaseCost, setRcBaseCost] = useState<number>(3000);
  const [rcSellingPrice, setRcSellingPrice] = useState<number>(4500);
  const [rcExtraAdult, setRcExtraAdult] = useState<number>(800);
  const [rcChildWithBed, setRcChildWithBed] = useState<number>(500);
  const [rcChildNoBed, setRcChildNoBed] = useState<number>(300);
  const [rcValidFrom, setRcValidFrom] = useState('');
  const [rcValidTo, setRcValidTo] = useState('');
  const [submittingRate, setSubmittingRate] = useState(false);
  const [rateModalError, setRateModalError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const paginatedSeasons = useMemo(() => {
    const start = (seasonPage - 1) * seasonPageSize;
    return seasons.slice(start, start + seasonPageSize);
  }, [seasons, seasonPage, seasonPageSize]);

  const paginatedRateCards = useMemo(() => {
    const start = (rateCardPage - 1) * rateCardPageSize;
    return rateCards.slice(start, start + rateCardPageSize);
  }, [rateCards, rateCardPage, rateCardPageSize]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [destData, seasonData, hotelData, rateData] = await Promise.all([
        apiRequest<DestinationDto[]>('destinations?limit=150'),
        apiRequest<SeasonDto[]>('seasons?limit=150'),
        apiRequest<HotelDto[]>('hotels?limit=150'),
        apiRequest<SeasonalRateCardDto[]>('hotels/rate-cards?limit=150'),
      ]);

      const validDests = Array.isArray(destData) ? destData : [];
      setDestinations(validDests);
      setSeasons(Array.isArray(seasonData) ? seasonData : []);
      setHotels(Array.isArray(hotelData) ? hotelData : []);
      setRateCards(Array.isArray(rateData) ? rateData : []);

      if (validDests.length > 0 && !destinationId) {
        setDestinationId(validDests[0]!.id);
        setSimDestId(validDests[0]!.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch seasonal master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When hotel changes in Rate Card modal, load its rooms
  useEffect(() => {
    if (!rcHotelId) {
      setRcRooms([]);
      return;
    }
    apiRequest<RoomCategoryDto[]>(`hotels/${rcHotelId}/rooms`)
      .then((rooms) => {
        const arr = Array.isArray(rooms) ? rooms : [];
        setRcRooms(arr);
        if (arr.length > 0 && !editingRateCard) {
          setRcRoomId(arr[0]!.id);
        }
      })
      .catch((e) => console.error(e));
  }, [rcHotelId]);

  // Season Modals
  const openCreateSeasonModal = () => {
    setEditingSeason(null);
    setSeasonName('');
    setSeasonType('PEAK');
    if (destinations.length > 0) setDestinationId(destinations[0]!.id);
    setStartDate('');
    setEndDate('');
    setPriority(30);
    setSeasonDesc('');
    setSeasonModalError(null);
    setIsSeasonModalOpen(true);
  };

  const openEditSeasonModal = (season: SeasonDto) => {
    setEditingSeason(season);
    setSeasonName(season.name);
    setSeasonType(season.seasonType);
    setDestinationId(season.destinationId);
    setStartDate(season.startDate);
    setEndDate(season.endDate);
    setPriority(season.priority);
    setSeasonDesc(season.description || '');
    setSeasonModalError(null);
    setIsSeasonModalOpen(true);
  };

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setSeasonModalError('End date must be on or after start date.');
      return;
    }

    setSubmittingSeason(true);
    setSeasonModalError(null);

    try {
      if (editingSeason) {
        await apiRequest(`seasons/${editingSeason.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: seasonName.trim(),
            seasonType,
            destinationId,
            startDate,
            endDate,
            priority: Number(priority),
            description: seasonDesc.trim() || undefined,
          }),
        });
        showToast(`Season "${seasonName}" updated successfully`);
      } else {
        await apiRequest('seasons', {
          method: 'POST',
          body: JSON.stringify({
            name: seasonName.trim(),
            seasonType,
            destinationId,
            startDate,
            endDate,
            priority: Number(priority),
            description: seasonDesc.trim() || undefined,
          }),
        });
        showToast(`Season "${seasonName}" created successfully`);
      }

      setIsSeasonModalOpen(false);
      fetchData();
    } catch (err: any) {
      setSeasonModalError(err.message || 'Failed to save season');
    } finally {
      setSubmittingSeason(false);
    }
  };

  const handleConfirmDeleteSeason = async () => {
    if (!deleteSeasonConfirm) return;
    setDeletingSeason(true);
    try {
      await apiRequest(`seasons/${deleteSeasonConfirm.id}`, { method: 'DELETE' });
      showToast(`Season "${deleteSeasonConfirm.name}" deleted successfully`);
      setDeleteSeasonConfirm(null);
      fetchData();
    } catch (err: any) {
      showToast(`Error deleting season: ${err.message || 'Cannot delete'}`);
    } finally {
      setDeletingSeason(false);
    }
  };

  const runSimulation = async () => {
    if (!simDestId || !simDate) return;
    setSimLoading(true);
    try {
      const res = await apiRequest<{ seasonType: SeasonType; date: string }>(
        `seasons/resolve?destinationId=${simDestId}&date=${simDate}`
      );
      setSimResult(res);
    } catch (err: any) {
      showToast(`Simulation error: ${err.message || 'Resolver failed'}`);
    } finally {
      setSimLoading(false);
    }
  };

  // Rate Card Modals
  const openCreateRateModal = () => {
    setEditingRateCard(null);
    const initialHotelId = hotels.length > 0 ? hotels[0]!.id : '';
    setRcHotelId(initialHotelId);
    if (initialHotelId) {
      apiRequest<RoomCategoryDto[]>(`hotels/${initialHotelId}/rooms`)
        .then((rooms) => {
          const arr = Array.isArray(rooms) ? rooms : [];
          setRcRooms(arr);
          if (arr.length > 0) setRcRoomId(arr[0]!.id);
        })
        .catch(console.error);
    }
    if (seasons.length > 0) {
      setRcSeasonId(seasons[0]!.id);
      setRcValidFrom(seasons[0]!.startDate);
      setRcValidTo(seasons[0]!.endDate);
    }
    setRcMealPlan('CP');
    setRcBaseCost(3000);
    setRcSellingPrice(4500);
    setRcExtraAdult(800);
    setRcChildWithBed(500);
    setRcChildNoBed(300);
    setRateModalError(null);
    setIsRateModalOpen(true);
  };

  const openEditRateModal = (rc: SeasonalRateCardDto) => {
    setEditingRateCard(rc);
    setRcHotelId(rc.hotelId);
    setRcRoomId(rc.roomCategoryId);
    setRcSeasonId(rc.seasonId);
    setRcMealPlan(rc.mealPlan);
    setRcBaseCost(rc.baseCostPerNight);
    setRcSellingPrice(rc.standardSellingPrice);
    setRcExtraAdult(rc.extraAdultBedCost);
    setRcChildWithBed(rc.childWithBedCost);
    setRcChildNoBed(rc.childWithoutBedCost);
    setRcValidFrom(rc.validFrom);
    setRcValidTo(rc.validTo);
    setRateModalError(null);
    setIsRateModalOpen(true);
  };

  const handleSaveRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(rcValidTo).getTime() < new Date(rcValidFrom).getTime()) {
      setRateModalError('Validity end date must be on or after start date.');
      return;
    }

    setSubmittingRate(true);
    setRateModalError(null);

    try {
      if (editingRateCard) {
        await apiRequest(`hotels/rate-cards/${editingRateCard.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            mealPlan: rcMealPlan,
            baseCostPerNight: Number(rcBaseCost),
            standardSellingPrice: Number(rcSellingPrice),
            extraAdultBedCost: Number(rcExtraAdult),
            childWithBedCost: Number(rcChildWithBed),
            childWithoutBedCost: Number(rcChildNoBed),
            validFrom: rcValidFrom,
            validTo: rcValidTo,
          }),
        });
        showToast('Seasonal rate card updated successfully');
      } else {
        await apiRequest('hotels/rate-cards', {
          method: 'POST',
          body: JSON.stringify({
            hotelId: rcHotelId,
            roomCategoryId: rcRoomId,
            seasonId: rcSeasonId,
            mealPlan: rcMealPlan,
            baseCostPerNight: Number(rcBaseCost),
            standardSellingPrice: Number(rcSellingPrice),
            extraAdultBedCost: Number(rcExtraAdult),
            childWithBedCost: Number(rcChildWithBed),
            childWithoutBedCost: Number(rcChildNoBed),
            validFrom: rcValidFrom,
            validTo: rcValidTo,
            isActive: true,
          }),
        });
        showToast('Seasonal rate card created successfully');
      }

      setIsRateModalOpen(false);
      fetchData();
    } catch (err: any) {
      setRateModalError(err.message || 'Failed to save rate card');
    } finally {
      setSubmittingRate(false);
    }
  };

  const toggleRateCardStatus = async (rc: SeasonalRateCardDto) => {
    try {
      await apiRequest(`hotels/rate-cards/${rc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !rc.isActive }),
      });
      showToast(`Rate card marked as ${!rc.isActive ? 'Active' : 'Inactive'}`);
      fetchData();
    } catch (err: any) {
      showToast(`Error toggling rate card: ${err.message || 'Action failed'}`);
    }
  };

  const getDestinationName = (destId: string) => {
    const dest = destinations.find((d) => d.id === destId);
    return dest ? sanitizeDisplayName(dest.name) : 'Unknown';
  };

  const getHotelName = (hotelId: string) => {
    const h = hotels.find((x) => x.id === hotelId);
    return h ? sanitizeDisplayName(h.name) : 'Hotel';
  };

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div className="brand-badge">RATES & SEASONS</div>
          <h1 className="page-title">Hotel Rates & Travel Seasons</h1>
          <p className="page-subtitle">
            Configure peak & regular travel seasons, hotel room tariffs, extra bed charges, and meal plan rates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'SEASONS' ? (
            <button onClick={openCreateSeasonModal} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} />
              <span>Add Season</span>
            </button>
          ) : (
            <button onClick={openCreateRateModal} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} />
              <span>Add Rate Card</span>
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
        <button
          onClick={() => setActiveTab('SEASONS')}
          className={`tab-btn ${activeTab === 'SEASONS' ? 'active' : ''}`}
        >
          Calendar Seasons & Overlap Resolver ({seasons.length})
        </button>
        <button
          onClick={() => setActiveTab('RATE_CARDS')}
          className={`tab-btn ${activeTab === 'RATE_CARDS' ? 'active' : ''}`}
        >
          Seasonal Rate Cards ({rateCards.length})
        </button>
      </div>

      {activeTab === 'SEASONS' ? (
        <>
          {/* Overlap Resolution Simulator */}
          <div
            className="card"
            style={{
              marginBottom: '24px',
              background: '#f8fafc',
              border: '1.5px solid #ccfbf1',
              borderRadius: '14px',
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
              <Calendar size={16} />
              <span>Deterministic Overlap Resolver Simulator</span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
              Test how overlapping seasons resolve for any travel date using the authoritative backend pricing engine.
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="select-filter"
                style={{ flex: '0 1 220px' }}
                value={simDestId}
                onChange={(e) => setSimDestId(e.target.value)}
              >
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {sanitizeDisplayName(d.name)}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className="form-input"
                style={{ width: '170px' }}
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
              />

              <button
                type="button"
                onClick={runSimulation}
                className="btn btn-secondary btn-sm"
                disabled={!simDate || simLoading}
                style={{ whiteSpace: 'nowrap' }}
              >
                {simLoading ? 'Testing...' : 'Simulate Resolution'}
              </button>

              {simResult && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>Resolved Season:</span>
                  <span
                    className={`badge ${
                      simResult.seasonType === 'SUPER_PEAK'
                        ? 'badge-super-peak'
                        : simResult.seasonType === 'PEAK' || simResult.seasonType === 'FESTIVAL'
                        ? 'badge-peak'
                        : 'badge-regular'
                    }`}
                  >
                    {simResult.seasonType}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Seasons Table / Cards */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '840px' }}>
                  <thead>
                    <tr>
                      <th>Season Name</th>
                      <th>Category</th>
                      <th>Destination</th>
                      <th>Date Range</th>
                      <th>Priority (Precedence)</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <tr key={idx} className="skeleton-table-row">
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div className="skeleton" style={{ width: '140px', height: '16px', borderRadius: '4px' }} />
                            <div className="skeleton" style={{ width: '180px', height: '12px', borderRadius: '4px' }} />
                          </div>
                        </td>
                        <td><div className="skeleton skeleton-pill" style={{ width: '75px', height: '22px' }} /></td>
                        <td><div className="skeleton" style={{ width: '100px', height: '15px', borderRadius: '4px' }} /></td>
                        <td><div className="skeleton" style={{ width: '140px', height: '14px', borderRadius: '4px' }} /></td>
                        <td><div className="skeleton" style={{ width: '60px', height: '14px', borderRadius: '4px' }} /></td>
                        <td style={{ textAlign: 'right' }}><div className="skeleton" style={{ width: '80px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : seasons.length === 0 ? (
              <div className="state-box">
                <Calendar size={40} color="#64748b" />
                <div className="state-title">No Seasons Defined</div>
                <div className="state-desc">Configure date ranges for Peak, Super Peak, and Festival dates.</div>
              </div>
            ) : (
              <>
                {/* Desktop View (>= 768px) */}
                <div className="hidden md:block table-container" style={{ border: 'none' }}>
                  <table className="data-table" style={{ width: '100%', minWidth: '840px' }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: '180px' }}>Season Name</th>
                        <th style={{ minWidth: '110px' }}>Category</th>
                        <th style={{ minWidth: '150px' }}>Destination</th>
                        <th style={{ minWidth: '190px' }}>Date Range</th>
                        <th style={{ minWidth: '130px' }}>Priority (Precedence)</th>
                        <th style={{ textAlign: 'right', minWidth: '140px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSeasons.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                            {s.description && (
                              <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{s.description}</div>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                s.seasonType === 'SUPER_PEAK'
                                  ? 'badge-super-peak'
                                  : s.seasonType === 'PEAK' || s.seasonType === 'FESTIVAL'
                                  ? 'badge-peak'
                                  : 'badge-regular'
                              }`}
                            >
                              {s.seasonType}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#0f766e', fontWeight: 600 }}>{getDestinationName(s.destinationId)}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                              <Clock size={13} color="#94a3b8" />
                              <span>
                                {s.startDate} to {s.endDate}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.priority}</span>
                              <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                                <div
                                  style={{
                                    width: `${Math.min(100, s.priority)}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #14b8a6, #f59e0b)',
                                    borderRadius: '3px',
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => openEditSeasonModal(s)}
                                className="btn btn-secondary btn-sm"
                                title="Edit Season"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Edit2 size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteSeasonConfirm({ id: s.id, name: s.name })}
                                className="btn btn-danger btn-sm"
                                title="Delete Season"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (< 768px) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {paginatedSeasons.map((s) => (
                    <div key={s.id} style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{s.name}</div>
                          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 600 }}>{getDestinationName(s.destinationId)}</div>
                        </div>
                        <span
                          className={`badge ${
                            s.seasonType === 'SUPER_PEAK'
                              ? 'badge-super-peak'
                              : s.seasonType === 'PEAK' || s.seasonType === 'FESTIVAL'
                              ? 'badge-peak'
                              : 'badge-regular'
                          }`}
                        >
                          {s.seasonType}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#64748b', marginBottom: '8px' }}>
                        <Clock size={12} />
                        <span>{s.startDate} to {s.endDate}</span> • <span>Priority: {s.priority}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                        <button
                          onClick={() => openEditSeasonModal(s)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteSeasonConfirm({ id: s.id, name: s.name })}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {seasons.length > 0 && (
                  <Pagination
                    currentPage={seasonPage}
                    totalItems={seasons.length}
                    pageSize={seasonPageSize}
                    onPageChange={setSeasonPage}
                    onPageSizeChange={setSeasonPageSize}
                    itemName="seasons"
                  />
                )}
              </>
            )}
          </div>
        </>
      ) : (
        /* Seasonal Rate Cards Tab */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '920px' }}>
                <thead>
                  <tr>
                    <th>Hotel & Property</th>
                    <th>Meal Plan</th>
                    <th>Base Supplier Cost (Admin)</th>
                    <th>Standard Selling Rate</th>
                    <th>Extra Bed Rates</th>
                    <th>Validity Window</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <tr key={idx} className="skeleton-table-row">
                      <td><div className="skeleton" style={{ width: '150px', height: '16px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton skeleton-pill" style={{ width: '65px', height: '22px' }} /></td>
                      <td><div className="skeleton" style={{ width: '90px', height: '18px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '95px', height: '18px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '140px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} /></td>
                      <td><div className="skeleton skeleton-pill" style={{ width: '55px', height: '22px' }} /></td>
                      <td style={{ textAlign: 'right' }}><div className="skeleton" style={{ width: '90px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : rateCards.length === 0 ? (
            <div className="state-box">
              <Tag size={40} color="#64748b" />
              <div className="state-title">No Seasonal Rate Cards Configured</div>
              <div className="state-desc">
                Set contract buying costs and standard selling rates for room categories during specific seasons.
              </div>
            </div>
          ) : (
            <>
              {/* Desktop View (>= 768px) */}
              <div className="hidden md:block table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '920px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '180px' }}>Hotel & Property</th>
                      <th style={{ minWidth: '90px' }}>Meal Plan</th>
                      <th style={{ minWidth: '140px' }}>Base Supplier Cost (Admin)</th>
                      <th style={{ minWidth: '140px' }}>Standard Selling Rate</th>
                      <th style={{ minWidth: '180px' }}>Extra Bed Rates</th>
                      <th style={{ minWidth: '160px' }}>Validity Window</th>
                      <th style={{ minWidth: '90px' }}>Status</th>
                      <th style={{ textAlign: 'right', minWidth: '130px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRateCards.map((rc) => (
                      <tr key={rc.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{getHotelName(rc.hotelId)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                            Room ID: {rc.roomCategoryId.slice(-6)}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-regular">{rc.mealPlan === 'RO' ? 'EP' : rc.mealPlan}</span>
                        </td>
                        <td>
                          <strong style={{ color: '#d97706', fontSize: '14px' }}>
                            ₹{rc.baseCostPerNight?.toLocaleString('en-IN')}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'block' }}>Net Cost / night</span>
                        </td>
                        <td>
                          <strong style={{ color: '#0f766e', fontSize: '14px' }}>
                            ₹{rc.standardSellingPrice?.toLocaleString('en-IN')}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'block' }}>Selling Price / night</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Adult: +₹{rc.extraAdultBedCost} | Child: +₹{rc.childWithBedCost}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                            {rc.validFrom} to {rc.validTo}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${rc.isActive ? 'badge-active' : 'badge-inactive'}`}>
                            {rc.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => openEditRateModal(rc)}
                              className="btn btn-secondary btn-sm"
                              title="Edit Rate Card"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => toggleRateCardStatus(rc)}
                              className={`btn btn-sm ${rc.isActive ? 'btn-danger' : 'btn-primary'}`}
                              title={rc.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {rc.isActive ? 'Deact' : 'Act'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View (< 768px) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedRateCards.map((rc) => (
                  <div key={rc.id} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{getHotelName(rc.hotelId)}</div>
                        <span className="badge badge-regular" style={{ marginTop: '2px' }}>{rc.mealPlan === 'RO' ? 'EP' : rc.mealPlan}</span>
                      </div>
                      <span className={`badge ${rc.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {rc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '10px 0', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Base Net Cost</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#d97706' }}>
                          ₹{rc.baseCostPerNight?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Selling Price</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f766e' }}>
                          ₹{rc.standardSellingPrice?.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      Window: {rc.validFrom} to {rc.validTo}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                      <button
                        onClick={() => openEditRateModal(rc)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => toggleRateCardStatus(rc)}
                        className={`btn btn-sm ${rc.isActive ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        {rc.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {rateCards.length > 0 && (
                <Pagination
                  currentPage={rateCardPage}
                  totalItems={rateCards.length}
                  pageSize={rateCardPageSize}
                  onPageChange={setRateCardPage}
                  onPageSizeChange={setRateCardPageSize}
                  itemName="rate cards"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Season Confirmation Modal */}
      {deleteSeasonConfirm && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div
            className="modal-container"
            style={{
              maxWidth: '440px',
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
                  background: '#fff1f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e11d48',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Delete Travel Season?
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              Are you sure you want to delete season <strong>{deleteSeasonConfirm.name}</strong>?
              If any seasonal rate cards are associated with this season, the operation will be rejected to protect pricing integrity.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteSeasonConfirm(null)}
                className="btn btn-secondary"
                disabled={deletingSeason}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSeason}
                className="btn btn-danger"
                disabled={deletingSeason}
              >
                {deletingSeason ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Season Modal */}
      {isSeasonModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', background: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingSeason ? `Edit Season: ${editingSeason.name}` : 'Create Calendar Season'}
              </h3>
              <button onClick={() => setIsSeasonModalOpen(false)} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSeason} style={{ overflowY: 'auto', flex: 1 }}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {seasonModalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{seasonModalError}</span>
                  </div>
                )}

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Season Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Diwali Rush 2026, Christmas Super Peak"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={seasonName}
                      onChange={(e) => setSeasonName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Season Type *
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={seasonType}
                      onChange={(e) => setSeasonType(e.target.value as SeasonType)}
                    >
                      {SEASON_TYPES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Applicable Destination *
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                  >
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {sanitizeDisplayName(d.name)} ({d.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      style={{ width: '100%' }}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      style={{ width: '100%' }}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Priority (Higher number takes precedence in overlaps, 1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    className="form-input"
                    style={{ width: '100%' }}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    style={{ width: '100%' }}
                    value={seasonDesc}
                    onChange={(e) => setSeasonDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setIsSeasonModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submittingSeason}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingSeason}>
                  {submittingSeason ? 'Saving...' : editingSeason ? 'Update Season' : 'Create Season'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Rate Card Modal */}
      {isRateModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', background: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingRateCard ? 'Edit Seasonal Rate Card' : 'Create Seasonal Rate Card'}
              </h3>
              <button onClick={() => setIsRateModalOpen(false)} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRateCard} style={{ overflowY: 'auto', flex: 1 }}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {rateModalError && (
                  <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{rateModalError}</span>
                  </div>
                )}

                {!editingRateCard && (
                  <>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          Hotel Property *
                        </label>
                        <select
                          className="form-select"
                          style={{ width: '100%' }}
                          value={rcHotelId}
                          onChange={(e) => setRcHotelId(e.target.value)}
                        >
                          {hotels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {sanitizeDisplayName(h.name)} ({getDestinationName(h.destinationId)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          Room Category *
                        </label>
                        <select
                          className="form-select"
                          style={{ width: '100%' }}
                          value={rcRoomId}
                          onChange={(e) => setRcRoomId(e.target.value)}
                        >
                          {rcRooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Linked Travel Season *
                      </label>
                      <select
                        className="form-select"
                        style={{ width: '100%' }}
                        value={rcSeasonId}
                        onChange={(e) => {
                          const sId = e.target.value;
                          setRcSeasonId(sId);
                          const s = seasons.find((x) => x.id === sId);
                          if (s) {
                            setRcValidFrom(s.startDate);
                            setRcValidTo(s.endDate);
                          }
                        }}
                      >
                        {seasons.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.seasonType} • {getDestinationName(s.destinationId)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Meal Plan *
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={rcMealPlan}
                    onChange={(e) => setRcMealPlan(e.target.value as MealPlan)}
                  >
                    {MEAL_PLANS.map((mp) => (
                      <option key={mp} value={mp}>
                        {mp === 'RO' ? 'EP' : mp}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Base Supplier Buying Cost (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={rcBaseCost}
                      onChange={(e) => setRcBaseCost(Number(e.target.value))}
                    />
                  </div>
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
                      value={rcSellingPrice}
                      onChange={(e) => setRcSellingPrice(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Extra Adult Bed (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={rcExtraAdult}
                      onChange={(e) => setRcExtraAdult(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Child w/ Bed (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={rcChildWithBed}
                      onChange={(e) => setRcChildWithBed(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Child No Bed (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={rcChildNoBed}
                      onChange={(e) => setRcChildNoBed(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Valid From Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      style={{ width: '100%' }}
                      value={rcValidFrom}
                      onChange={(e) => setRcValidFrom(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Valid To Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      style={{ width: '100%' }}
                      value={rcValidTo}
                      onChange={(e) => setRcValidTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submittingRate}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingRate}>
                  {submittingRate ? 'Saving...' : editingRateCard ? 'Update Rate Card' : 'Save Rate Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
