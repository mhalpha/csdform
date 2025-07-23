import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { Box, Button, Typography } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Store } from '@/types/directory';

interface ServiceMapProps {
  stores: Store[];
  nearestStores: Store[];
  center: { lat: number; lng: number };
  zoom: number;
  showNearestMarkers: boolean;
  onMarkerClick: (store: Store, index: number) => void;
  onInfoWindowClose: () => void;
  onBoundsChanged: (bounds: google.maps.LatLngBounds | null, zoom: number) => void;
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

const ServiceMap = forwardRef((props: ServiceMapProps, ref) => {
  const { stores, nearestStores, center, zoom, showNearestMarkers, onMarkerClick, onInfoWindowClose, onBoundsChanged } = props;
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Handle view service button click in info window
  const handleViewServiceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedStore) {
      // Open service page in new tab
      window.open(`/service/${selectedStore.website}`, '_blank');
    }
  };

  // Expose methods to parent
  const handleBoundsChanged = useCallback(() => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      const currentZoom = mapRef.current.getZoom() || zoom;
      onBoundsChanged(bounds || null, currentZoom);
    }
  }, [onBoundsChanged, zoom]);

  useImperativeHandle(ref, () => ({
    handleStoreClick(store: Store) {
      setSelectedStore(store);
    },
    fitBounds(bounds: google.maps.LatLngBounds) {
      if (mapRef.current) {
        mapRef.current.fitBounds(bounds);
      }
    },
  }));

  // Memoize markers
  const allMarkers = useMemo(() => {
    if (showNearestMarkers) {
      const uniqueStores = new Map<string, Store>();
      stores.forEach(store => {
        const key = `${store.lat}-${store.lng}`;
        uniqueStores.set(key, store);
      });
      nearestStores.forEach(store => {
        const key = `${store.lat}-${store.lng}`;
        if (!uniqueStores.has(key)) {
          uniqueStores.set(key, store);
        }
      });
      return Array.from(uniqueStores.values());
    }
    return stores;
  }, [stores, nearestStores, showNearestMarkers]);

  // Handle map load
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapLoaded(true);
  }, []);

  // Update map when center/zoom changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  // Reset selected store when stores change
  useEffect(() => {
    setSelectedStore(null);
  }, [stores]);

  // Marker click handler
  const handleMarkerClick = useCallback((store: Store, index: number) => {
    setSelectedStore(store);
    onMarkerClick(store, index);
  }, [onMarkerClick]);

  // Map options
  const mapOptions = useMemo(() => ({
    gestureHandling: 'greedy' as const,
    disableDefaultUI: true,
    clickableIcons: false,
    zoomControl: true,
    maxZoom: 18,
    minZoom: 3,
    backgroundColor: '#f5f5f5',
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'transit',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }]
      }
    ]
  }), []);

  // Cluster options
  const clusterOptions = useMemo(() => ({
    gridSize: 60,
    maxZoom: 15,
    minimumClusterSize: 2,
    averageCenter: true,
    styles: [
      {
        textColor: 'white',
        textSize: 12,
        url: 'data:image/svg+xml;utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Ccircle cx="20" cy="20" r="18" fill="%23C8102E" stroke="%23ffffff" stroke-width="2"/%3E%3C/svg%3E',
        height: 40,
        width: 40,
        anchor: [20, 20],
        textLineHeight: 40,
        fontWeight: 'bold',
      },
      {
        textColor: 'white',
        textSize: 12,
        url: 'data:image/svg+xml;utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"%3E%3Ccircle cx="22" cy="22" r="20" fill="%23C8102E" stroke="%23ffffff" stroke-width="2"/%3E%3C/svg%3E',
        height: 44,
        width: 44,
        anchor: [22, 22],
        textLineHeight: 44,
        fontWeight: 'bold',
      },
      {
        textColor: 'white',
        textSize: 14,
        url: 'data:image/svg+xml;utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Ccircle cx="25" cy="25" r="23" fill="%23C8102E" stroke="%23ffffff" stroke-width="2"/%3E%3C/svg%3E',
        height: 50,
        width: 50,
        anchor: [25, 25],
        textLineHeight: 50,
        fontWeight: 'bold',
      },
      {
        textColor: 'white',
        textSize: 16,
        url: 'data:image/svg+xml;utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"%3E%3Ccircle cx="28" cy="28" r="25" fill="%23C8102E" stroke="%23ffffff" stroke-width="2"/%3E%3C/svg%3E',
        height: 56,
        width: 56,
        anchor: [28, 28],
        textLineHeight: 56,
        fontWeight: 'bold',
      }
    ],
    calculator: (markers: any[], numStyles: number) => {
      const count = markers.length;
      let index = 0;
      let dv = count;
      if (dv < 10) {
        index = 0;
      } else if (dv < 50) {
        index = 1;
      } else if (dv < 100) {
        index = 2;
      } else {
        index = 3;
      }
      return {
        text: count.toString(),
        index: index,
        title: `${count} locations`
      };
    }
  }), []);

  // Get marker icon based on program type
  const getMarkerIcon = useCallback((programType: 'Public' | 'Private') => {
    return {
      url: programType === 'Public' 
        ? 'data:image/svg+xml;utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36"%3E%3Cpath fill="%231976d2" d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24c0-6.6-5.4-12-12-12z"/%3E%3Ccircle cx="12" cy="12" r="8" fill="white"/%3E%3C/svg%3E'
        : 'data:image/svg+xml;utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36"%3E%3Cpath fill="%23C8102E" d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24c0-6.6-5.4-12-12-12z"/%3E%3Ccircle cx="12" cy="12" r="8" fill="white"/%3E%3C/svg%3E',
      scaledSize: new google.maps.Size(24, 36),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(12, 36)
    };
  }, []);

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      onLoad={(map) => {
        handleMapLoad(map);
        // Initial bounds after map loads
        setTimeout(() => {
          if (map.getBounds()) {
            onBoundsChanged(map.getBounds() || null, map.getZoom() || zoom);
          }
        }, 500);
      }}
      options={mapOptions}
      onUnmount={() => {
        if (mapRef.current) {
          google.maps.event.clearInstanceListeners(mapRef.current);
        }
      }}
      onBoundsChanged={handleBoundsChanged}
      onZoomChanged={handleBoundsChanged}
      onDragEnd={handleBoundsChanged}
    >
      {mapLoaded && (
        <MarkerClusterer options={clusterOptions}>
          {(clusterer) => {
            return (
              <>
                {allMarkers.map((store, index) => {
                  const lat = parseFloat(store.lat) || 0;
                  const lng = parseFloat(store.lng) || 0;
                  return (
                    <Marker
                      key={`${lat}-${lng}-${index}`}
                      position={{
                        lat: isNaN(lat) ? 0 : lat,
                        lng: isNaN(lng) ? 0 : lng
                      }}
                      onClick={() => handleMarkerClick(store, index)}
                      clusterer={clusterer}
                      zIndex={selectedStore?.lat === store.lat && selectedStore?.lng === store.lng ? 1000 : 1}
                      icon={getMarkerIcon(store.program_type)}
                    />
                  );
                })}
              </>
            );
          }}
        </MarkerClusterer>
      )}

      {selectedStore && (
        <InfoWindow
          position={{
            lat: parseFloat(selectedStore.lat) || 0,
            lng: parseFloat(selectedStore.lng) || 0
          }}
          onCloseClick={() => {
            setSelectedStore(null);
            onInfoWindowClose();
          }}
          options={{
            pixelOffset: new google.maps.Size(0, -30)
          }}
        >
          <Box sx={{ width: '250px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, pr: 1 }}>
                {selectedStore.service_name}
              </Typography>
              <Box 
                component="span"
                sx={{
                  fontSize: '0.75rem',
                  py: 0.25,
                  px: 1,
                  borderRadius: '4px',
                  backgroundColor: selectedStore.program_type === 'Public' ? 'rgba(25, 118, 210, 0.12)' : 'rgba(200, 16, 46, 0.12)',
                  color: selectedStore.program_type === 'Public' ? '#1976d2' : '#C8102E',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {selectedStore.program_type}
              </Box>
            </Box>
            <Box display="flex" alignItems="flex-start" mb={1}>
              <LocationOnIcon sx={{ mr: 1, color: '#C8102E', fontSize: '1.2rem', mt: 0.2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                {selectedStore.street_address}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={1}>
              <PhoneIcon sx={{ mr: 1, color: '#C8102E', fontSize: '1.2rem' }} />
              <Typography variant="body2">{selectedStore.phone_number}</Typography>
            </Box>
            <Box display="flex" alignItems="flex-start" mb={1.5}>
              <EmailIcon sx={{ mr: 1, color: '#C8102E', fontSize: '1.2rem', mt: 0.2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedStore.email}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="center">
              <Button
                variant="outlined"
                size="small"
                sx={{
                  width: 1,
                  borderColor: '#C8102E',
                  color: 'black',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.04)' }
                }}
                onClick={handleViewServiceClick}
              >
                View Service
              </Button>
            </Box>
          </Box>
        </InfoWindow>
      )}
    </GoogleMap>
  );
});

ServiceMap.displayName = 'ServiceMap';

export default React.memo(ServiceMap);