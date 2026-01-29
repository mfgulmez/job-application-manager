import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import WorkIcon from '@mui/icons-material/WorkOutline';

function Navbar({ onAddClick }) {
  return (
    <AppBar position="static" elevation={0} sx={{ backgroundColor: '#2c3e50' }}>
      <Toolbar>
        <WorkIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Job Manager
        </Typography>
        <Button 
            color="inherit" 
            variant="outlined" 
            onClick={onAddClick}
            sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          + Add Manual Job
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;