/**
 * Geolocation & Timestamp Service
 * Provides high-accuracy GPS tracking, 3-tier hybrid reverse geocoding
 * (Nominatim OSM -> Embedded Sumsel Spatial DB -> Raw Coordinates),
 * and standard Indonesian timestamp formatting.
 */

import { findNearestSumselLocation } from '../data/sumselGeo.js';

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format timestamp in strict Indonesian locale format:
 * Baris 1: Sabtu, 21 November 2026
 * Baris 2: 11:56:30
 */
export function formatIndonesianTimestamp(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const pad = (n) => String(n).padStart(2, '0');

  const dayName = DAYS_ID[d.getDay()] || '';
  const dateNum = d.getDate();
  const monthName = MONTHS_ID[d.getMonth()] || '';
  const year = d.getFullYear();

  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return {
    dayName,
    dateNum,
    monthName,
    year,
    dateLine: `${dayName}, ${dateNum} ${monthName} ${year}`,
    timeLine: `${hours}:${minutes}:${seconds}`,
    fullText: `${dayName}, ${dateNum} ${monthName} ${year} ${hours}:${minutes}:${seconds}`
  };
}

class GeolocationService {
  constructor() {
    this.watchId = null;
    this.currentCoords = null;
    this.resolvedLocation = null;
    this.listeners = new Set();
    this.isWatching = false;
    this.lastGeocodeTime = 0;
    this.lastGeocodeCoords = null;
    this.hasPermission = false;
    this.errorMsg = null;
  }

  /**
   * Start tracking device position
   */
  start() {
    if (!('geolocation' in navigator)) {
      this.errorMsg = 'Perangkat tidak mendukung sensor Geolocation GPS.';
      this.notifyListeners();
      return;
    }

    if (this.isWatching) return;
    this.isWatching = true;

    const options = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 4000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePositionUpdate(pos),
      (err) => this.handlePositionError(err),
      options
    );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isWatching = false;
  }

  async handlePositionUpdate(position) {
    const { latitude, longitude, accuracy } = position.coords;
    this.hasPermission = true;
    this.errorMsg = null;
    this.currentCoords = { latitude, longitude, accuracy: Math.round(accuracy) };

    // Reverse geocode if moved > 60m or > 30s since last reverse geocode
    const now = Date.now();
    const shouldGeocode =
      !this.lastGeocodeCoords ||
      now - this.lastGeocodeTime > 30000 ||
      this.calculateDistance(
        latitude,
        longitude,
        this.lastGeocodeCoords.latitude,
        this.lastGeocodeCoords.longitude
      ) > 0.06;

    if (shouldGeocode) {
      this.lastGeocodeCoords = { latitude, longitude };
      this.lastGeocodeTime = now;
      await this.reverseGeocode(latitude, longitude, accuracy);
    } else if (this.resolvedLocation) {
      // Just update coordinate numbers and accuracy
      this.resolvedLocation.coordsText = `${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`;
      this.resolvedLocation.rawCoords = this.currentCoords;
      this.notifyListeners();
    }
  }

  handlePositionError(err) {
    console.warn('Geolocation position error:', err.message);
    if (err.code === 1) {
      this.errorMsg = 'Izin akses lokasi/GPS belum diberikan.';
    } else if (err.code === 2) {
      this.errorMsg = 'Sinyal GPS tidak tersedia.';
    } else {
      this.errorMsg = 'Mencari sinyal GPS...';
    }
    this.notifyListeners();
  }

  /**
   * 3-Tier Reverse Geocode:
   * 1. Online Nominatim OpenStreetMap (Indonesian locale)
   * 2. Embedded Sumsel & Palembang Spatial Database (100% offline)
   * 3. Raw GPS Coordinates
   */
  async reverseGeocode(lat, lng, accuracy) {
    const accuracyText = `±${Math.round(accuracy)}m`;
    const coordsStr = `${lat.toFixed(5)}, ${lng.toFixed(5)} (${accuracyText})`;

    // Tier 1: Try Online Nominatim OSM with 3.5s timeout
    if (navigator.onLine) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'MeGallery-Camera-App' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};

          const village = addr.village || addr.suburb || addr.hamlet || addr.quarter || addr.neighbourhood || '';
          const district = addr.city_district || addr.subdistrict || addr.district || '';
          const city = addr.city || addr.county || addr.municipality || addr.regency || '';
          const state = addr.state || 'Sumatera Selatan';

          let primaryText = '';
          if (village && district) {
            primaryText = `${village}, ${district}`;
          } else if (village || district) {
            primaryText = village || district;
          } else {
            primaryText = addr.road || 'Lokasi Terdeteksi';
          }

          let secondaryText = '';
          if (city && state) {
            secondaryText = `${city}, ${state}`;
          } else {
            secondaryText = city || state || '';
          }

          this.resolvedLocation = {
            primaryText,
            secondaryText,
            coordsText: coordsStr,
            shortLabel: village ? `${village}, ${city || 'Sumsel'}` : `${primaryText}`,
            source: 'online_osm',
            timestamp: Date.now(),
            rawCoords: { latitude: lat, longitude: lng, accuracy: Math.round(accuracy) }
          };

          this.notifyListeners();
          return;
        }
      } catch (err) {
        console.debug('Online reverse geocoding skipped, falling back to offline dataset:', err.message);
      }
    }

    // Tier 2: Embedded Offline Spatial Dataset for Sumatera Selatan / Palembang
    const offlineMatch = findNearestSumselLocation(lat, lng, 70); // within 70 km
    if (offlineMatch) {
      this.resolvedLocation = {
        primaryText: `${offlineMatch.village}, ${offlineMatch.district}`,
        secondaryText: `${offlineMatch.regency}, ${offlineMatch.province}`,
        coordsText: coordsStr,
        shortLabel: `${offlineMatch.village}, ${offlineMatch.regency}`,
        source: 'offline_sumsel_db',
        timestamp: Date.now(),
        rawCoords: { latitude: lat, longitude: lng, accuracy: Math.round(accuracy) }
      };
      this.notifyListeners();
      return;
    }

    // Tier 3: Coordinate Fallback (outside Sumsel and offline)
    this.resolvedLocation = {
      primaryText: 'Koordinat GPS Terdeteksi',
      secondaryText: coordsStr,
      coordsText: coordsStr,
      shortLabel: coordsStr,
      source: 'gps_raw',
      timestamp: Date.now(),
      rawCoords: { latitude: lat, longitude: lng, accuracy: Math.round(accuracy) }
    };
    this.notifyListeners();
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  getCurrentLocation() {
    return this.resolvedLocation;
  }

  getCurrentCoords() {
    return this.currentCoords;
  }

  getError() {
    return this.errorMsg;
  }

  onLocationChange(callback) {
    this.listeners.add(callback);
    if (this.resolvedLocation) {
      callback(this.resolvedLocation);
    }
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb(this.resolvedLocation, this.errorMsg);
      } catch (e) {
        console.error('Error in location listener:', e);
      }
    });
  }
}

export const geoService = new GeolocationService();
