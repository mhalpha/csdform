import React, { useState, useEffect } from 'react';
import { Box, Typography, Fade } from '@mui/material';

interface LoadingAnimationProps {
  onComplete: () => void;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ onComplete }) => {
  const [counter, setCounter] = useState(0);
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (counter < 100) {
      interval = setInterval(() => {
        setCounter(prev => {
          // Simple linear counter
          const newValue = Math.min(100, prev + 1);
          return newValue;
        });
      }, 10); // 30ms for a total of ~3 seconds to count to 100
    } else {
      // When counter reaches 100, fade out then call onComplete
      setTimeout(() => {
        setShowContent(false);
        setTimeout(onComplete, 400); // Wait for fade out animation
      }, 300);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [counter, onComplete]);

  return (
    <Fade in={showContent} timeout={400}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'white',
          zIndex: 9999
        }}
      >
        <Typography
          variant="h1"
          component="div"
          sx={{
            fontWeight: 'bold',
            color: '#C8102E',
            fontSize: '5rem',
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            letterSpacing: '-2px'
          }}
        >
          {counter}%
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{
            mt: 2,
            color: '#555',
            fontWeight: 400
          }}
        >
          Loading all services
        </Typography>
      </Box>
    </Fade>
  );
};

export default LoadingAnimation;