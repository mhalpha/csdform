import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Box, TextField, MenuItem, Select, FormControl, SelectChangeEvent, Typography, Button, IconButton,
InputAdornment, Paper, useMediaQuery, useTheme, Menu, Fade } from '@mui/material';
import { useJsApiLoader, Autocomplete, Libraries } from '@react-google-maps/api';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckIcon from '@mui/icons-material/Check';
import ServiceCard from './ServiceCard';
import ServiceMap from './ServiceMap';
import { Virtuoso } from 'react-virtuoso';
import LoadingAnimation from './LoadingAnimation';
import { Store, ProgramTypeFilter } from '@/types/directory';

// Define libraries as Libraries type
const libraries: Libraries = ['places', 'geometry'];

// Google Maps configuration
const googleMapsConfig = {
  id: 'google-map-script',
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAm-eP8b7-FH2A8nzYucTG9NcPTz0OiAX0",
  libraries,
  language: 'en',
  region: 'AU',
  version: 'weekly'
};

// Web Worker for distance calculations
const createWorker = () => {
  const workerCode = `
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
     if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const toRad = value => value * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
    };
    onmessage = (e) => {
    const { lat1, lon1, stores } = e.data;
    const results = stores.map(store => ({
    ...store,
    distance: calculateDistance(lat1, lon1, parseFloat(store.lat), parseFloat(store.lng))
    }));
    postMessage(results);
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

const initialCenter = { lat: -25.2744, lng: 133.7751 };
const initialZoom = 4;

const ServiceList = () => {
  const mapRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker>();
  const virtuosoRef = useRef<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [radius, setRadius] = useState(10);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [visibleStores, setVisibleStores] = useState<Store[]>([]);
  const [nearestStores, setNearestStores] = useState<Store[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [noStoresFound, setNoStoresFound] = useState(false);
  const [searchMode, setSearchMode] = useState<'autocomplete' | 'keyword'>('autocomplete');
  const [selectedStore, setSelectedStore] = useState(-1);
  const [isListOpen, setIsListOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [programTypeFilter, setProgramTypeFilter] = useState<ProgramTypeFilter>('all');
  const [radiusAnchorEl, setRadiusAnchorEl] = useState<null | HTMLElement>(null);
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [currentMapZoom, setCurrentMapZoom] = useState(initialZoom);

  // Filter dropdown menu states
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const filterMenuOpen = Boolean(filterAnchorEl);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { isLoaded, loadError } = useJsApiLoader(googleMapsConfig);

  // Function to handle bounds changes from map
  const handleBoundsChanged = useCallback((bounds: google.maps.LatLngBounds | null, zoom: number) => {
    setMapBounds(bounds);
    setCurrentMapZoom(zoom);
  }, []);

  // Function to determine if a store is within the current map bounds
  const isStoreInBounds = useCallback((store: Store, bounds: google.maps.LatLngBounds | null) => {
    if (!bounds) return true;
    
    const lat = parseFloat(store.lat);
    const lng = parseFloat(store.lng);
    
    if (isNaN(lat) || isNaN(lng)) return false;
    
    const position = new google.maps.LatLng(lat, lng);
    return bounds.contains(position);
  }, []);

  // Update visible stores whenever filtered stores or map bounds change
  useEffect(() => {
    if (!mapBounds) {
      setVisibleStores(filteredStores);
      return;
    }
    
    const storesInView = filteredStores.filter(store => 
      isStoreInBounds(store, mapBounds)
    );
    
    setVisibleStores(storesInView);
  }, [filteredStores, mapBounds, isStoreInBounds]);

  // Initialize worker
  useEffect(() => {
    workerRef.current = createWorker();
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Fetch stores data with streaming
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch('/api/directory/stores', {
          headers: {
            'Accept-Encoding': 'gzip',
            'Cache-Control': 'max-age=3600'
          }
        });

        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const reader = response.body?.getReader();
        if (reader) {
          let result = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += new TextDecoder().decode(value);
          }
          const data = JSON.parse(result);
          setAllStores(data);
          setFilteredStores(data);
          setVisibleStores(data);
          setDataLoaded(true);
          // The animation will handle hiding itself through onComplete
        }
      } catch (error) {
        console.error('Error fetching store data:', error);
        setShowLoading(false); // Hide loading screen on error
      }
    };

    fetchStores();
  }, []);

  // Apply filters function
  const applyFilters = useCallback((stores: Store[]) => {
    if (programTypeFilter === 'all') {
      return stores;
    }

    return stores.filter(store =>
      programTypeFilter === 'public'
        ? store.program_type === 'Public'
        : store.program_type === 'Private'
    );
  }, [programTypeFilter]);

  // Handle program type filter change
  const handleProgramTypeChange = (newValue: ProgramTypeFilter) => {
    setProgramTypeFilter(newValue);
    setFilterAnchorEl(null); // Close the menu

    // Apply filter to current stores
    if (searchMode === 'autocomplete' && autocomplete) {
      const place = autocomplete.getPlace();
      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        filterStoresByRadius(lat, lng, radius, newValue);
      } else {
        // If no place selected, apply filter to all stores
        const programFiltered = newValue === 'all'
          ? allStores
          : allStores.filter(store =>
              newValue === 'public'
                ? store.program_type === 'Public'
                : store.program_type === 'Private'
            );

        setFilteredStores(programFiltered);
        setNoStoresFound(programFiltered.length === 0);
      }
    } else if (searchMode === 'keyword') {
      const lowerTerm = searchTerm.toLowerCase();
      const keywordFiltered = allStores
        .filter(store =>
          store.service_name.toLowerCase().includes(lowerTerm) ||
          store.street_address.toLowerCase().includes(lowerTerm)
        );

      // Apply program type filter
      const finalFiltered = newValue === 'all'
        ? keywordFiltered
        : keywordFiltered.filter(store =>
            newValue === 'public'
              ? store.program_type === 'Public'
              : store.program_type === 'Private'
          );

      setFilteredStores(finalFiltered);
      setNoStoresFound(finalFiltered.length === 0);
    } else {
      // If no search, apply filter to all stores
      const programFiltered = newValue === 'all'
        ? allStores
        : allStores.filter(store =>
            newValue === 'public'
              ? store.program_type === 'Public'
              : store.program_type === 'Private'
          );

      setFilteredStores(programFiltered);
      setNoStoresFound(programFiltered.length === 0);
    }
  };

  // Open filter menu
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  // Close filter menu
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  // Optimized filter function with Web Worker
  const filterStoresByRadius = useCallback(async (lat: number, lng: number, radius: number, programType: ProgramTypeFilter = programTypeFilter) => {
    if (!workerRef.current) return;

    const promise = new Promise<Store[]>((resolve) => {
      workerRef.current!.onmessage = (e) => resolve(e.data);
      workerRef.current!.postMessage({ lat1: lat, lon1: lng, stores: allStores });
    });

    const storesWithDistance = await promise;

    const bounds = new google.maps.LatLngBounds();

    // First filter by radius
    const radiusFiltered = storesWithDistance
      .filter(store => store.distance! <= radius);

    // Then apply program type filter if needed
    const finalFiltered = programType === 'all'
      ? radiusFiltered
      : radiusFiltered.filter(store =>
          programType === 'public'
            ? store.program_type === 'Public'
            : store.program_type === 'Private'
        );

    // Sort by distance
    const sortedFiltered = [...finalFiltered].sort((a, b) => (a.distance || 0) - (b.distance || 0));

    // Add locations to bounds for map
    if (sortedFiltered.length > 0) {
      sortedFiltered.forEach(store => {
        bounds.extend(new google.maps.LatLng(parseFloat(store.lat) || 0, parseFloat(store.lng) || 0));
      });
    }

    setFilteredStores(sortedFiltered);

    // Get nearest stores for when no stores are in radius
    // Apply program filter to nearest stores as well
    const nearestFiltered = programType === 'all'
      ? [...storesWithDistance].sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 5)
      : [...storesWithDistance]
        .filter(store =>
          programType === 'public'
            ? store.program_type === 'Public'
            : store.program_type === 'Private'
        )
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 5);

    setNearestStores(nearestFiltered);
    setNoStoresFound(sortedFiltered.length === 0);

    if (sortedFiltered.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current.fitBounds(bounds);
      }, 50);
    }
  }, [allStores, programTypeFilter]);

  // Debounced keyword search
  const debouncedKeywordSearch = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout>;

    return (term: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (searchMode === 'keyword') {
          const lowerTerm = term.toLowerCase();

          // First filter by keyword
          const keywordFiltered = allStores
            .filter(store =>
              store.service_name.toLowerCase().includes(lowerTerm) ||
              store.street_address.toLowerCase().includes(lowerTerm)
            );

          // Then apply program type filter if needed
          const finalFiltered = programTypeFilter === 'all'
            ? keywordFiltered
            : keywordFiltered.filter(store =>
                programTypeFilter === 'public'
                  ? store.program_type === 'Public'
                  : store.program_type === 'Private'
              );

          setFilteredStores(finalFiltered);
          setNoStoresFound(finalFiltered.length === 0);

          // Auto-adjust map to show search results when in keyword search mode
          if (finalFiltered.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            let hasValidCoordinates = false;

            finalFiltered.forEach(store => {
              const lat = parseFloat(store.lat);
              const lng = parseFloat(store.lng);
              
              if (!isNaN(lat) && !isNaN(lng)) {
                bounds.extend(new google.maps.LatLng(lat, lng));
                hasValidCoordinates = true;
              }
            });

            // Only adjust the map if we have valid coordinates
            if (hasValidCoordinates) {
              const needsAdjustment = !mapBounds || finalFiltered.every(store => {
                const lat = parseFloat(store.lat);
                const lng = parseFloat(store.lng);
                if (isNaN(lat) || isNaN(lng)) return true;
                
                const position = new google.maps.LatLng(lat, lng);
                return !mapBounds.contains(position);
              });

              if (needsAdjustment && mapRef.current) {
                setTimeout(() => {
                  mapRef.current.fitBounds(bounds);
                }, 50);
              }
            }
          }
        }
      }, 300);
    };
  }, [allStores, searchMode, programTypeFilter, mapBounds]);

  // Handle autocomplete place selection
  useEffect(() => {
    if (autocomplete) {
      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          filterStoresByRadius(lat, lng, radius);
          setMapCenter({ lat, lng });
          setZoom(12);
        }
      });

      return () => {
        google.maps.event.removeListener(listener);
      };
    }
  }, [autocomplete, radius, filterStoresByRadius]);

  // Update search results
  useEffect(() => {
    debouncedKeywordSearch(searchTerm);
  }, [searchTerm, debouncedKeywordSearch]);

  // Memoized event handlers
  const handleStoreClick = useCallback((store: Store, index: number) => {
    if (mapRef.current) {
      mapRef.current.handleStoreClick(store);
      setMapCenter({
        lat: parseFloat(store.lat),
        lng: parseFloat(store.lng)
      });
      setZoom(15);
      setSelectedStore(index);
    }
  }, []);

  const handleMapMarkerClick = useCallback((store: Store, index: number) => {
    setSelectedStore(index);

    if (!isListOpen) {
      setIsListOpen(true);
    }

    setTimeout(() => {
      let storeIndex = -1;

      if (noStoresFound && searchMode === 'autocomplete') {
        storeIndex = nearestStores.findIndex(
          s => s.lat === store.lat && s.lng === store.lng
        );
      } else {
        storeIndex = visibleStores.findIndex(
          s => s.lat === store.lat && s.lng === store.lng
        );
        
        if (storeIndex === -1) {
          storeIndex = filteredStores.findIndex(
            s => s.lat === store.lat && s.lng === store.lng
          );
        }
      }

      if (storeIndex !== -1 && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index: storeIndex,
          align: 'center',
          behavior: 'smooth'
        });
      }
    }, 300);
  }, [isListOpen, filteredStores, visibleStores, nearestStores, noStoresFound, searchMode]);

  const handleInfoWindowClose = useCallback(() => {
    setSelectedStore(-1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');

    const programFiltered = programTypeFilter === 'all'
      ? allStores
      : allStores.filter(store =>
          programTypeFilter === 'public'
            ? store.program_type === 'Public'
            : store.program_type === 'Private'
        );

    setFilteredStores(programFiltered);
    setMapCenter(initialCenter);
    setZoom(initialZoom);
    setNoStoresFound(false);
    setSelectedStore(-1);
  }, [allStores, programTypeFilter]);

  const handleLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  }, []);

  const handleRadiusSelect = useCallback(async (newRadius: number) => {
    setRadius(newRadius);
    setRadiusAnchorEl(null);
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        await filterStoresByRadius(lat, lng, newRadius);
      }
    } else {
      const programFiltered = programTypeFilter === 'all'
        ? allStores
        : allStores.filter(store =>
            programTypeFilter === 'public'
              ? store.program_type === 'Public'
              : store.program_type === 'Private'
          );
      setFilteredStores(programFiltered);
      setNoStoresFound(programFiltered.length === 0);
    }
  }, [autocomplete, filterStoresByRadius, programTypeFilter, allStores]);

  const handleSearchModeChange = useCallback(() => {
    setSearchMode(prev => prev === 'autocomplete' ? 'keyword' : 'autocomplete');
    setSearchTerm('');
  }, []);

  const toggleList = useCallback(() => {
    setIsListOpen(prev => !prev);
  }, []);

  // Get filter button text based on current filter
  const getFilterButtonText = () => {
    switch(programTypeFilter) {
      case 'public': return 'Public';
      case 'private': return 'Private';
      default: return 'All';
    }
  };

  // Optimized list renderer
  const renderList = () => {
    if (noStoresFound) {
      return searchMode === 'autocomplete' ? (
        <>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" color="textSecondary" align="center" sx={{ mb: 2 }}>
              No services found within the selected radius.
            </Typography>
            <Typography variant="h6" color="textSecondary" align="center" sx={{ mb: 2 }}>
              Nearest services:
            </Typography>
          </Box>

          <Box sx={{
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: isMobile ? 'calc(100vh - 300px)' : 'calc(100vh - 310px)',
            backgroundColor: 'rgba(249, 250, 251, 0.8)'
          }}>
            <Box sx={{ height: '16px', flexShrink: 0 }} />
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Virtuoso
                ref={virtuosoRef}
                style={{ height: '100%' }}
                totalCount={nearestStores.length}
                initialTopMostItemIndex={selectedStore >= 0 ? selectedStore : 0}
                itemContent={index => (
                  <div style={{
                    padding: '8px 16px',
                    opacity: 1,
                  }}>
                    <ServiceCard
                      store={nearestStores[index]}
                      onClick={() => handleStoreClick(nearestStores[index], index)}
                      isSelected={selectedStore === index}
                      showDistance={true}
                    />
                  </div>
                )}
              />
            </Box>
          </Box>
        </>
      ) : (
        <Box sx={{ p: 2, backgroundColor: 'rgba(249, 250, 251, 0.8)' }}>
          <Typography variant="h6" color="textSecondary" align="center">
            No services found with that name.
          </Typography>
        </Box>
      );
    }

    const showStores = mapBounds ? visibleStores : filteredStores;
    const visibleCount = showStores.length;
    const totalCount = filteredStores.length;

    return (
      <Box sx={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 210px)',
        backgroundColor: 'rgba(249, 250, 251, 0.8)'
      }}>
        {mapBounds && visibleCount !== totalCount && (
          <Box sx={{ p: 1, borderBottom: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'white' }}>
            <Typography variant="body2" sx={{ color: '#555', textAlign: 'center' }}>
              Showing {visibleCount} of {totalCount} services in current map view
            </Typography>
          </Box>
        )}
        
        <Box sx={{ height: '16px', flexShrink: 0 }} />
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%' }}
            totalCount={showStores.length}
            initialTopMostItemIndex={selectedStore >= 0 ? selectedStore : 0}
            itemContent={index => (
              <div style={{
                padding: '8px 16px',
                opacity: 1,
              }}>
                <ServiceCard
                  store={showStores[index]}
                  onClick={() => handleStoreClick(showStores[index], index)}
                  isSelected={selectedStore === index}
                  showDistance={searchMode === 'autocomplete'}
                />
              </div>
            )}
          />
        </Box>
      </Box>
    );
  };

  // Render filter menu
  const renderFilterMenu = () => (
    <Menu
      anchorEl={filterAnchorEl}
      open={filterMenuOpen}
      onClose={handleFilterClose}
      TransitionComponent={Fade}
      PaperProps={{
        elevation: 3,
        sx: {
          borderRadius: 2,
          minWidth: 180,
          overflow: 'visible',
          mt: 1.5,
        }
      }}
    >
      <MenuItem
        onClick={() => handleProgramTypeChange('all')}
        sx={{
          py: 1,
          position: 'relative',
          fontWeight: programTypeFilter === 'all' ? 500 : 400
        }}
      >
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          All Services
          {programTypeFilter === 'all' && <CheckIcon fontSize="small" sx={{ color: '#C8102E', ml: 1 }} />}
        </Box>
      </MenuItem>

      <MenuItem
        onClick={() => handleProgramTypeChange('public')}
        sx={{
          py: 1,
          position: 'relative',
          fontWeight: programTypeFilter === 'public' ? 500 : 400
        }}
      >
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              component="span"
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#1976d2',
                display: 'inline-block',
                mr: 1
              }}
            />
            Public Services
          </Box>
          {programTypeFilter === 'public' && <CheckIcon fontSize="small" sx={{ color: '#1976d2', ml: 1 }} />}
        </Box>
      </MenuItem>

      <MenuItem
        onClick={() => handleProgramTypeChange('private')}
        sx={{
          py: 1,
          position: 'relative',
          fontWeight: programTypeFilter === 'private' ? 500 : 400
        }}
      >
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              component="span"
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#C8102E',
                display: 'inline-block',
                mr: 1
              }}
            />
            Private Services
          </Box>
          {programTypeFilter === 'private' && <CheckIcon fontSize="small" sx={{ color: '#C8102E', ml: 1 }} />}
        </Box>
      </MenuItem>
    </Menu>
  );

  if (!dataLoaded || showLoading) {
    return <LoadingAnimation onComplete={() => setShowLoading(false)} />;
  }

  return (
    <Box sx={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Map container */}
      <Box sx={{
        position: 'absolute',
        top: isMobile ? 140 : 0,
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <ServiceMap 
          ref={mapRef} 
          stores={filteredStores}
          nearestStores={nearestStores}
          center={mapCenter}
          zoom={zoom}
          showNearestMarkers={noStoresFound && searchMode === 'autocomplete'}
          onMarkerClick={(store: Store, index: number) => {
            setSelectedStore(index);
            if (!isListOpen) {
              setIsListOpen(true);
            }
          }}
          onInfoWindowClose={() => setSelectedStore(-1)}
          onBoundsChanged={handleBoundsChanged}
        />
      </Box>
      
      {/* Search controls */}
      <Box sx={{
        position: isMobile ? 'static' : 'absolute',
        top: isMobile ? 0 : 20,
        left: isMobile ? 0 : '50%',
        transform: isMobile ? 'none' : 'translateX(-50%)',
        width: isMobile ? '100%' : '70%',
        zIndex: 10
      }}>
        {/* Mobile search UI */}
        {isMobile ? (
          <Box sx={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
            borderRadius: '0 0 16px 16px',
            boxShadow: 3,
            overflow: 'hidden',
            zIndex: 10
          }}>
            {/* Search mode toggle */}
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', p: 1, backgroundColor: 'rgba(249, 250, 251, 0.8)' }}>
              <Box sx={{ display: 'flex', borderRadius: 10, overflow: 'hidden', bgcolor: '#e0e0e0', p: '2px', width: '100%' }}>
                <Button
                  size="small"
                  variant={searchMode === 'autocomplete' ? 'contained' : 'text'}
                  onClick={handleSearchModeChange}
                  sx={{
                    borderRadius: 10,
                    py: 0.5,
                    width: '50%',
                    fontSize: '0.85rem',
                    textTransform: 'none',
                    color: searchMode === 'autocomplete' ? 'white' : 'rgba(0, 0, 0, 0.6)',
                    bgcolor: searchMode === 'autocomplete' ? '#C8102E' : 'transparent',
                    '&:hover': { bgcolor: searchMode === 'autocomplete' ? '#C8102E' : 'rgba(0, 0, 0, 0.08)' }
                  }}
                >
                  Postcode
                </Button>
                <Button
                  size="small"
                  variant={searchMode === 'keyword' ? 'contained' : 'text'}
                  onClick={handleSearchModeChange}
                  sx={{
                    borderRadius: 10,
                    py: 0.5,
                    width: '50%',
                    fontSize: '0.85rem',
                    textTransform: 'none',
                    color: searchMode === 'keyword' ? 'white' : 'rgba(0, 0, 0, 0.6)',
                    bgcolor: searchMode === 'keyword' ? '#C8102E' : 'transparent',
                    '&:hover': { bgcolor: searchMode === 'keyword' ? '#C8102E' : 'rgba(0, 0, 0, 0.08)' }
                  }}
                >
                  Service
                </Button>
              </Box>
            </Box>

            {/* Search row with filter button */}
            <Box sx={{ width: '100%', p: 1, display: 'flex', gap: 1, backgroundColor: 'rgba(249, 250, 251, 0.8)' }}>
              {/* Search input */}
              <Box sx={{ flex: 1 }}>
                {searchMode === 'autocomplete' ? (
                  <Autocomplete
                    onLoad={handleLoad}
                    options={{
                      types: ['geocode'],
                      componentRestrictions: { country: 'au' },
                      fields: ['formatted_address', 'geometry']
                    }}
                  >
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="Search by suburb or postcode"
                      inputRef={searchInputRef}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        sx: {
                          borderRadius: '20px',
                          border: '1px solid rgba(0,0,0,0.2)',
                          backgroundColor: 'white',
                          '&:hover': {
                            borderColor: '#C8102E'
                          },
                          '&.Mui-focused': {
                            borderColor: '#C8102E',
                            boxShadow: '0 0 0 2px rgba(200, 16, 46, 0.2)'
                          }
                        },
                        endAdornment: (
                          <InputAdornment position="end">
                            {searchTerm && (
                              <IconButton onClick={handleClearSearch} edge="end" size="small">
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            )}
                            {isMobile && searchMode === 'autocomplete' && (
                              <>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={(e) => setRadiusAnchorEl(e.currentTarget)}
                                  sx={{
                                    borderColor: 'rgba(0,0,0,0.2)',
                                    color: '#333',
                                    textTransform: 'none',
                                    borderRadius: '20px',
                                    px: 2,
                                    height: '32px',
                                    fontSize: '0.9rem',
                                    '&:hover': {
                                      borderColor: '#C8102E',
                                      backgroundColor: 'rgba(200, 16, 46, 0.04)'
                                    }
                                  }}
                                >
                                  {radius} km
                                </Button>
                                <Menu
                                  anchorEl={radiusAnchorEl}
                                  open={Boolean(radiusAnchorEl)}
                                  onClose={() => setRadiusAnchorEl(null)}
                                  MenuListProps={{
                                    sx: {
                                      py: 0,
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }
                                  }}
                                >
                                  {[5, 10, 20, 50].map((value) => (
                                    <MenuItem
                                      key={value}
                                      onClick={() => handleRadiusSelect(value)}
                                      sx={{
                                        fontSize: '0.9rem',
                                        fontWeight: radius === value ? 600 : 400,
                                        bgcolor: radius === value ? 'rgba(200, 16, 46, 0.08)' : 'transparent',
                                        '&:hover': {
                                          bgcolor: 'rgba(0, 0, 0, 0.04)'
                                        }
                                      }}
                                    >
                                      {value} km
                                      {radius === value && <CheckIcon fontSize="small" sx={{ color: '#C8102E', ml: 1 }} />}
                                    </MenuItem>
                                  ))}
                                </Menu>
                              </>
                            )}
                            <IconButton color="primary" sx={{ mr: 0.5 }} size="small">
                              <SearchIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Autocomplete>
                ) : (
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Search by service name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      sx: { borderRadius: 3, height: '40px', fontSize: '1rem', backgroundColor: 'white' },
                      endAdornment: (
                        <InputAdornment position="end">
                          {searchTerm && (
                            <IconButton onClick={handleClearSearch} edge="end" size="small">
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton color="primary" sx={{ mr: 0.5 }} size="small">
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              </Box>

              {/* Filter button */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={handleFilterClick}
                aria-haspopup="true"
                aria-expanded={filterMenuOpen ? 'true' : undefined}
                sx={{
                  borderColor: 'rgba(0,0,0,0.2)',
                  color: programTypeFilter !== 'all' ? '#C8102E' : '#333',
                  bgcolor: 'white',
                  textTransform: 'none',
                  borderRadius: 20,
                  px: 2,
                  height: 40,
                  fontSize: '0.8rem',
                  fontWeight: programTypeFilter !== 'all' ? 500 : 400,
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                    borderColor: programTypeFilter !== 'all' ? '#C8102E' : 'rgba(0,0,0,0.3)'
                  },
                  width: 'auto',
                  whiteSpace: 'nowrap',
                  minWidth: '110px',
                  ...(programTypeFilter !== 'all' && {
                    borderColor: '#C8102E',
                    borderWidth: '1px'
                  })
                }}
              >
                {getFilterButtonText()}
              </Button>
            </Box>

            {/* Render the filter menu */}
            {renderFilterMenu()}

            {/* Show List button */}
            <Box sx={{ width: '100%', p: 1, backgroundColor: 'rgba(249, 250, 251, 0.8)', display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<FormatListBulletedIcon />}
                onClick={toggleList}
                sx={{
                  bgcolor: 'white',
                  color: '#333',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  py: 1.2,
                  '&:hover': { bgcolor: 'white' },
                  display: isListOpen ? 'none' : 'flex',
                  width: '100%',
                  height: '40px',
                  border: '1px solid rgba(0,0,0,0.08)'
                }}
              >
                View Service List
              </Button>
            </Box>
          </Box>
        ) : (
          /* Desktop search UI */
          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', display: 'flex', height: '50px', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
            {/* Search mode toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(0, 0, 0, 0.05)', p: 1, borderRight: '1px solid rgba(0, 0, 0, 0.1)' }}>
              <Box sx={{ display: 'flex', borderRadius: 10, overflow: 'hidden', bgcolor: 'rgba(0, 0, 0, 0.06)', p: '2px' }}>
                <Button
                  size="small"
                  variant={searchMode === 'autocomplete' ? 'contained' : 'text'}
                  onClick={handleSearchModeChange}
                  sx={{
                    borderRadius: 10,
                    px: 1.5,
                    py: 0.5,
                    minWidth: 'auto',
                    fontSize: '0.85rem',
                    textTransform: 'none',
                    color: searchMode === 'autocomplete' ? 'white' : 'rgba(0, 0, 0, 0.6)',
                    bgcolor: searchMode === 'autocomplete' ? '#C8102E' : 'transparent',
                    '&:hover': { bgcolor: searchMode === 'autocomplete' ? '#C8102E' : 'rgba(0, 0, 0, 0.08)' }
                  }}
                >
                  Postcode
                </Button>
                <Button
                  size="small"
                  variant={searchMode === 'keyword' ? 'contained' : 'text'}
                  onClick={handleSearchModeChange}
                  sx={{
                    borderRadius: 10,
                    px: 1.5,
                    py: 0.5,
                    minWidth: 'auto',
                    fontSize: '0.85rem',
                    textTransform: 'none',
                    color: searchMode === 'keyword' ? 'white' : 'rgba(0, 0, 0, 0.6)',
                    bgcolor: searchMode === 'keyword' ? '#C8102E' : 'transparent',
                    '&:hover': { bgcolor: searchMode === 'keyword' ? '#C8102E' : 'rgba(0, 0, 0, 0.08)' }
                  }}
                >
                  Service
                </Button>
              </Box>
            </Box>

            {/* Search input */}
            <Box sx={{ position: 'relative', flex: 1 }}>
              {searchMode === 'autocomplete' ? (
                <Autocomplete
                  onLoad={handleLoad}
                  options={{
                    types: ['geocode'],
                    componentRestrictions: { country: 'au' },
                    fields: ['formatted_address', 'geometry']
                  }}
                >
                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Search by suburb or postcode"
                    inputRef={searchInputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      disableUnderline: true,
                      sx: { height: '50px', pl: 2, '& input': { padding: 0, fontSize: '1rem' } },
                      endAdornment: (
                        <InputAdornment position="end">
                          {searchTerm && (
                            <IconButton onClick={handleClearSearch} edge="end" size="small">
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          )}
                          {!isMobile && searchMode === 'autocomplete' && (
                            <>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={(e) => setRadiusAnchorEl(e.currentTarget)}
                                sx={{
                                  borderColor: 'rgba(0,0,0,0.2)',
                                  color: '#333',
                                  textTransform: 'none',
                                  borderRadius: '20px',
                                  px: 2,
                                  mx: 1,
                                  height: '32px',
                                  fontSize: '0.9rem',
                                  '&:hover': {
                                    borderColor: '#C8102E',
                                    backgroundColor: 'rgba(200, 16, 46, 0.04)'
                                  }
                                }}
                              >
                                {radius} km
                              </Button>
                              <Menu
                                anchorEl={radiusAnchorEl}
                                open={Boolean(radiusAnchorEl)}
                                onClose={() => setRadiusAnchorEl(null)}
                                MenuListProps={{
                                  sx: {
                                    py: 0,
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                  }
                                }}
                              >
                                {[5, 10, 20, 50].map((value) => (
                                  <MenuItem
                                    key={value}
                                    onClick={() => handleRadiusSelect(value)}
                                    sx={{
                                      fontSize: '0.9rem',
                                      fontWeight: radius === value ? 600 : 400,
                                      bgcolor: radius === value ? 'rgba(200, 16, 46, 0.08)' : 'transparent',
                                      '&:hover': {
                                        bgcolor: 'rgba(0, 0, 0, 0.04)'
                                      }
                                    }}
                                  >
                                    {value} km
                                    {radius === value && <CheckIcon fontSize="small" sx={{ color: '#C8102E', ml: 1 }} />}
                                  </MenuItem>
                                ))}
                              </Menu>
                            </>
                          )}
                          <IconButton color="primary" sx={{ mr: 0.5 }} size="small">
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Autocomplete>
              ) : (
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder="Search by service name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    disableUnderline: true,
                    sx: { height: '50px', pl: 2, '& input': { padding: 0, fontSize: '1rem' } },
                    endAdornment: (
                      <InputAdornment position="end">
                        {searchTerm && (
                          <IconButton onClick={handleClearSearch} edge="end" size="small">
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton color="primary" sx={{ mr: 0.5 }} size="small">
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              )}
            </Box>

            {/* Filter button */}
            <Button
              variant="text"
              startIcon={<FilterListIcon />}
              onClick={handleFilterClick}
              aria-haspopup="true"
              aria-expanded={filterMenuOpen ? 'true' : undefined}
              sx={{
                color: programTypeFilter !== 'all' ? '#C8102E' : 'rgba(0,0,0,0.7)',
                textTransform: 'none',
                fontWeight: programTypeFilter !== 'all' ? 500 : 400,
                borderLeft: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 0,
                px: 2,
                height: '100%',
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.04)'
                }
              }}
            >
              {getFilterButtonText()}
            </Button>

            {/* Render the filter menu */}
            {renderFilterMenu()}
          </Paper>
        )}

        {/* Show List button - desktop */}
        {!isMobile && (
          <Box sx={{ position: 'absolute', left: 0, top: '60px', zIndex: 10 }}>
            <Button
              variant="contained"
              startIcon={<FormatListBulletedIcon />}
              onClick={toggleList}
              sx={{
                bgcolor: 'white',
                color: '#333',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                borderRadius: '8px',
                textTransform: 'none',
                px: 2,
                py: 1.2,
                fontSize: '0.9rem',
                fontWeight: 500,
                '&:hover': {
                  bgcolor: 'white',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.2)',
                },
                display: isListOpen ? 'none' : 'flex',
                width: '178px',
                height: '40px'
              }}
            >
              Show Services
            </Button>
          </Box>
        )}
      </Box>

      {/* Store list */}
      <Box sx={{
        position: 'absolute',
        top: isMobile ? (isListOpen ? 140 : '100%') : 85,
        left: isMobile ? 0 : '15%',
        width: isMobile ? '100%' : 375,
        height: isMobile && isListOpen ? 'calc(100vh - 140px)' : 'auto',
        zIndex: isMobile ? 15 : 5,
        opacity: isListOpen ? 1 : 0,
        visibility: isListOpen ? 'visible' : 'hidden',
        transform: isListOpen
          ? 'translateY(0)'
          : (isMobile ? 'translateY(20px)' : 'translateX(-20px)'),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&::after': isListOpen ? {
          content: '""',
          position: 'absolute',
          inset: 0,
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          borderRadius: isMobile ? '20px 20px 0 0' : '12px',
          zIndex: -1
        } : {}
      }}>
        <Paper
          elevation={3}
          sx={{
            borderRadius: isMobile ? '20px 20px 0 0' : '12px',
            width: '100%',
            height: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 150px)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
          }}
        >
          {/* List header */}
          <Box sx={{
            p: 2,
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'white'
          }}>
            <Typography variant="h6" sx={{
              fontWeight: 600,
              color: '#333',
              fontSize: '1.1rem'
            }}>
              {noStoresFound ? 'Nearest Services' : 
                `Services ${
                  mapBounds && visibleStores.length !== filteredStores.length 
                    ? `(${visibleStores.length}/${filteredStores.length})` 
                    : filteredStores.length > 0 ? `(${filteredStores.length})` : ''
                }`
              }
            </Typography>

            <IconButton
              size="small"
              onClick={toggleList}
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.03)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.08)'
                },
                width: 32,
                height: 32
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* List content */}
          <Box sx={{
            flex: 1,
            overflow: 'hidden',
            backgroundColor: 'rgba(249, 250, 251, 0.8)'
          }}>
            {renderList()}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default React.memo(ServiceList);