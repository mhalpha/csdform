'use client';

import { NextPage } from 'next';
import ServiceList from '@/components/directory/ServiceList';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
// Import directory-specific styles
import '@/components/directory/directory.css';

// Create MUI theme to work alongside Tailwind
const theme = createTheme({
  palette: {
    primary: {
      main: '#C8102E', // Heart Foundation red
    },
  },
});

const DirectoryPage: NextPage = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="w-full h-screen" data-page="directory">
        <ServiceList />
      </div>
    </ThemeProvider>
  );
};

export default DirectoryPage;