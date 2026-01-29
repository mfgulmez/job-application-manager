import React from 'react';
import { 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
    Typography, Chip, IconButton, Box 
} from '@mui/material';
import { Delete as DeleteIcon, Link as LinkIcon, LinkedIn as LinkedInIcon, Language as WebIcon } from '@mui/icons-material';

const STATUS_COLORS = {
    'DRAFT': 'default',
    'APPLIED': 'info',
    'INTERVIEWING': 'warning',
    'OFFER': 'success',
    'REJECTED': 'error',
    'WITHDRAWN': 'default'
};

const ApplicationTable = ({ applications, onDelete }) => {
    if (!applications || applications.length === 0) return null;

    return (
        <TableContainer 
            component={Paper} 
            elevation={1} 
            sx={{ 
                borderRadius: 2, 
                mb: 3,
                maxHeight: 500, // 🛠️ FIX: Fixed height for scrolling
                border: '1px solid #e0e0e0',
                // Optional: Custom scrollbar for Webkit browsers
                '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: '#bdbdbd', borderRadius: '4px' }
            }}
        >
            <Table sx={{ minWidth: 650 }} stickyHeader aria-label="sticky table"> {/* 🛠️ FIX: stickyHeader enabled */}
                <TableHead>
                    <TableRow>
                        {/* 🛠️ FIX: Background color moved to Cell level for sticky opacity */}
                        <TableCell sx={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', zIndex: 10 }}>Company</TableCell>
                        <TableCell sx={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', zIndex: 10 }}>Position</TableCell>
                        <TableCell sx={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', zIndex: 10 }}>Status</TableCell>
                        <TableCell sx={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', zIndex: 10 }}>Applied Date</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', zIndex: 10 }}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {applications.map((app) => (
                        <TableRow key={app.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {app.platform?.name === 'LinkedIn' ? <LinkedInIcon color="primary" /> : <WebIcon color="action" />}
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        {app.company?.name || "Unknown"}
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2">{app.jobTitle}</Typography>
                                {app.jobUrl && (
                                <a 
                                    href={app.jobUrl} 
                                    onClick={(e) => {
                                        e.preventDefault(); 
                                        window.open(app.jobUrl, "jm_landing_tab");
                                    }}
                                    style={{ 
                                        fontSize: '12px', 
                                        color: '#1976d2', 
                                        textDecoration: 'none', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '4px',
                                        cursor: 'pointer' 
                                    }}
                                >
                                    View Listing <LinkIcon fontSize="inherit"/>
                                </a>
                                )}
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={app.status} 
                                    color={STATUS_COLORS[app.status] || 'default'} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ fontWeight: 'bold' }}
                                />
                            </TableCell>
                            <TableCell>
                                {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell align="right">
                                <IconButton size="small" color="error" onClick={() => onDelete(app.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ApplicationTable;