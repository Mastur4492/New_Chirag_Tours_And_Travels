'use client';

import React, { useState, useRef } from 'react';
import { Upload, Plus, Trash2, Image as ImageIcon, Link as LinkIcon, Sparkles, Loader2, Check } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface ImageUploadWidgetProps {
  label: string;
  images: string[];
  onChange: (images: string[]) => void;
  category?: 'destination' | 'hotel' | 'package';
  maxImages?: number;
  helperText?: string;
}

// Curated high-resolution royalty-free presets for quick one-click setup
const CURATED_PRESETS: Record<string, { label: string; url: string }[]> = {
  destination: [
    { label: 'Kashmir Valley & Shikara', url: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Gulmarg Snow Peaks', url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Kerala Backwaters & Houseboat', url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Royal Rajasthan Palace', url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Himachal Pine Valley', url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Goa Coastal Sunset', url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80' },
  ],
  hotel: [
    { label: 'Luxury Pine Suite Resort', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Heritage Mountain Villa', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Traditional Dal Lake Houseboat', url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Palace Courtyard Resort', url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80' },
  ],
  package: [
    { label: 'Kashmir Luxury 6D5N Panorama', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Himalayan Escape Manali', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80' },
  ],
};

export function ImageUploadWidget({
  label,
  images,
  onChange,
  category = 'destination',
  maxImages = 6,
  helperText,
}: ImageUploadWidgetProps) {
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const presets = CURATED_PRESETS[category] || CURATED_PRESETS.destination;

  // Handle local file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= maxImages) {
      setUploadError(`Maximum of ${maxImages} images allowed.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be under 10MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Read file as Base64 data URL
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const dataUri = await base64Promise;

      // Upload to API
      const res = await apiRequest<{ url: string; relativeUrl: string }>('upload/image', {
        method: 'POST',
        body: JSON.stringify({
          image: dataUri,
          filename: file.name,
          category,
        }),
      });

      // If Cloudinary URL (https://res.cloudinary.com/...), use it directly.
      // If local server URL (http://127.0.0.1:5000/uploads/...), use relativeUrl so Next.js proxy rewrite handles it seamlessly.
      const uploadedUrl =
        res.url?.startsWith('https://res.cloudinary.com')
          ? res.url
          : res.relativeUrl || res.url || dataUri;

      onChange([...images, uploadedUrl]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image. Please check API connection.');
    } finally {
      setUploading(false);
    }
  };

  // Add image by URL
  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (images.length >= maxImages) {
      setUploadError(`Maximum of ${maxImages} images allowed.`);
      return;
    }

    if (images.includes(trimmed)) {
      setUploadError('This image URL is already added.');
      return;
    }

    onChange([...images, trimmed]);
    setUrlInput('');
    setUploadError(null);
  };

  // Add preset image
  const handleAddPreset = (url: string) => {
    if (images.length >= maxImages) {
      setUploadError(`Maximum of ${maxImages} images allowed.`);
      return;
    }
    if (images.includes(url)) return;
    onChange([...images, url]);
    setUploadError(null);
  };

  // Remove image
  const handleRemove = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index);
    onChange(updated);
    setUploadError(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-700">
          {label} ({images.length}/{maxImages})
        </label>
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{showPresets ? 'Hide Presets' : 'Choose from Curated Photos'}</span>
        </button>
      </div>

      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}

      {uploadError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          {uploadError}
        </div>
      )}

      {/* Quick Curated Preset Gallery */}
      {showPresets && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Curated High-Res Travel Photography (1-Click Add):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((preset, idx) => {
              const isAdded = images.includes(preset.url);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPreset(preset.url)}
                  disabled={isAdded || images.length >= maxImages}
                  className={`text-left p-1.5 rounded-lg border transition-all text-xs flex flex-col gap-1 ${
                    isAdded
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white hover:border-emerald-500 text-slate-700'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-16 object-cover rounded"
                  />
                  <div className="flex items-center justify-between font-medium truncate">
                    <span className="truncate">{preset.label}</span>
                    {isAdded && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload & URL Input Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Local File Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading to Server...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Upload Image from Device</span>
            </>
          )}
        </button>

        {/* Or URL input form */}
        <div className="flex-1 flex gap-1">
          <div className="relative flex-1">
            <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              placeholder="Or paste image URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            disabled={!urlInput.trim() || images.length >= maxImages}
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Add URL
          </button>
        </div>
      </div>

      {/* Thumbnail Gallery Display */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {images.map((imgUrl, index) => (
            <div
              key={index}
              className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs"
            >
              <img
                src={imgUrl}
                alt={`Uploaded image ${index + 1}`}
                className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  // Fallback on broken image
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=400&q=80';
                }}
              />

              {/* Tag / Badge */}
              <div className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                {index === 0 ? 'Cover Photo' : `Image ${index + 1}`}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center transition-colors shadow"
                title="Remove image"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
          <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300" />
          <span>No images uploaded yet. Click above to upload or choose a preset.</span>
        </div>
      )}
    </div>
  );
}
