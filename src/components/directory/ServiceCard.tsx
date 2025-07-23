import React from 'react';
import { Card, CardContent, Typography, Box, Button } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import { SxProps, Theme } from '@mui/material';
import { Store } from '@/types/directory';
 
interface ServiceCardProps {
  store: Store;
  onClick: () => void;
  showDistance?: boolean;
  isSelected?: boolean;
  sx?: SxProps<Theme>;
}
 
const ServiceCard: React.FC<ServiceCardProps> = React.memo(({
    store,
    onClick,
    showDistance,
    isSelected,
    sx = {}
  }) => {

  // Early return if store is undefined or missing required properties
  if (!store || !store.service_name || !store.program_type) {
    console.warn('ServiceCard received invalid store data:', store);
    return null;
  }
 
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Additional safety check
    if (!store?.website) {
      console.warn('Store missing website property:', store);
      return;
    }
    // Open service page in new tab
    window.open(`/service/${store.website}`, '_blank');
  };
 
  return (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: '10px',
        cursor: 'pointer',
        mb: 0,
        border: isSelected ? '2px solid #C8102E' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: isSelected ? '0 4px 12px rgba(200, 16, 46, 0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
        width: '100%',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)'
        },
        '&:active': {
          transform: 'translateY(0px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'all 0.1s ease-in-out',
        },
        position: 'relative',
        overflow: 'visible',
        backgroundColor: isSelected ? 'rgba(255, 248, 248, 0.6)' : 'white',
        ...sx
      }}
    >
      {/* Program type badge - positioned at top right corner */}
      <Box
        sx={{
          position: 'absolute',
          top: -8,
          right: 12,
          borderRadius: '12px',
          padding: '2px 8px',
          backgroundColor: store.program_type === 'Public' ? '#1976d2' : '#C8102E',
          color: 'white',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
        }}
      >
        {store.program_type}
      </Box>
 
      <CardContent sx={{
        padding: 2.5,
        paddingTop: 3,
        '&:last-child': { pb: 2 },
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Typography variant="subtitle1" component="h3" sx={{
          fontWeight: 600,
          mb: 2,
          color: '#333',
          fontSize: '1rem',
          lineHeight: 1.3
        }}>
          {store.service_name || 'Unknown Service'}
        </Typography>
 
        <Box display="flex" alignItems="flex-start" mb={1.5}>
          <LocationOnIcon sx={{
            mr: 1.5,
            color: '#C8102E',
            fontSize: '1.2rem',
            mt: 0.3,
            flexShrink: 0
          }} />
          <Typography variant="body2" sx={{
            lineHeight: 1.4,
            color: '#555',
            fontSize: '0.85rem'
          }}>
            {store.street_address || 'Address not available'}
          </Typography>
        </Box>
 
        <Box display="flex" alignItems="center" mb={1.5}>
          <PhoneIcon sx={{
            mr: 1.5,
            color: '#C8102E',
            fontSize: '1.2rem',
            flexShrink: 0
          }} />
          <Typography variant="body2" sx={{
            color: '#555',
            fontSize: '0.85rem'
          }}>
            {store.phone_number || 'Phone not available'}
          </Typography>
        </Box>
 
        <Box display="flex" alignItems="flex-start" mb={1.5}>
          <EmailIcon sx={{
            mr: 1.5,
            color: '#C8102E',
            fontSize: '1.2rem',
            mt: 0.3,
            flexShrink: 0
          }} />
          <Typography
            variant="body2"
            sx={{
              lineHeight: 1.4,
              maxWidth: 'calc(100% - 32px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#555',
              fontSize: '0.85rem'
            }}
          >
            {store.email || 'Email not available'}
          </Typography>
        </Box>
 
        {store.distance !== undefined && !isNaN(store.distance) && showDistance && (
          <Typography variant="body2" sx={{
            mb: 1.5,
            color: '#666',
            fontSize: '0.85rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Box component="span" sx={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#C8102E',
              mr: 1
            }} />
            {(store.distance || 0).toFixed(1)} km away
          </Typography>
        )}
 
        <Box display="flex" justifyContent="flex-end" mt={1}>
          <Button
            variant="outlined"
            size="small"
            sx={{
              borderColor: '#C8102E',
              color: '#C8102E',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '6px',
              py: 0.5,
              px: 2,
              '&:hover': {
                backgroundColor: 'rgba(200, 16, 46, 0.04)',
                borderColor: '#C8102E'
              },
            }}
            onClick={handleButtonClick}
          >
            View Service
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
});
 
ServiceCard.displayName = 'ServiceCard';
 
export default ServiceCard;