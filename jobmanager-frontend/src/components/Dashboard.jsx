import React, { useState } from 'react';
import axios from 'axios';
import { Grid, Card, CardContent, Typography, Box, TextField, Button, Paper, InputAdornment } from '@mui/material';
import { 
    Description as FileIcon, 
    HourglassEmpty as ProgressIcon, 
    Event as InterviewIcon, 
    CheckCircle as OfferIcon, 
    Cancel as RejectIcon,
    AutoFixHigh as MagicIcon 
} from '@mui/icons-material';

function Dashboard({ refreshTrigger }) {
    const apps = refreshTrigger || [];
    
    const stats = {
        total: apps.length,
        applied: apps.filter(a => a.status === 'APPLIED').length,
        interview: apps.filter(a => a.status === 'INTERVIEWING').length,
        offer: apps.filter(a => a.status === 'OFFER').length,
        rejected: apps.filter(a => a.status === 'REJECTED').length,
    };

    const [importUrl, setImportUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleImport = () => {
        if (!importUrl) return;
        setLoading(true);
        let platform = "Company Website";
        if (importUrl.includes("linkedin")) platform = "LinkedIn";
        if (importUrl.includes("indeed")) platform = "Indeed";

        axios.post('/api/applications', {
            jobUrl: importUrl,
            platformName: platform,
            status: 'APPLIED',
            jobTitle: 'Imported Job', 
            companyName: 'Pending...' 
        }).then(() => {
            setImportUrl('');
            setLoading(false);
            window.location.reload(); 
        }).catch(() => {
            alert("Import failed. Check console.");
            setLoading(false);
        });
    };

    return (
        <Box sx={{ mb: 4 }}>
            {/* Stats Row */}
            <Grid container spacing={3} sx={{ mb: 4 }} justifyContent="center">
                <StatCard title="Total" value={stats.total} icon={<FileIcon />} color="#607d8b" />
                <StatCard title="Applied" value={stats.applied} icon={<ProgressIcon />} color="#2196f3" />
                <StatCard title="Interviews" value={stats.interview} icon={<InterviewIcon />} color="#ff9800" />
                <StatCard title="Offers" value={stats.offer} icon={<OfferIcon />} color="#4caf50" />
                <StatCard title="Rejections" value={stats.rejected} icon={<RejectIcon />} color="#f44336" />
            </Grid>

            {/* Smart Import Section (The missing part!) */}
            <Paper elevation={0} sx={{ p: 3, backgroundColor: 'white', borderRadius: 2, border: '1px solid #e0e0e0', maxWidth: '800px', mx: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField 
                        fullWidth 
                        size="small" 
                        placeholder="Paste LinkedIn or Indeed job URL to import..."
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <MagicIcon color="primary" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Button 
                        variant="contained" 
                        disableElevation 
                        onClick={handleImport}
                        disabled={loading}
                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                        {loading ? 'Importing...' : '✨ Import Job'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

function StatCard({ title, value, icon, color }) {
    return (
        <Grid item xs={12} sm={6} md={2.4}>
            <Card elevation={0} sx={{ borderTop: `4px solid ${color}`, backgroundColor: 'white', height: '100%' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: color, mb: 1 }}>{icon}</Box>
                    <Typography variant="h4" fontWeight="bold" color="#333">
                        {value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {title}
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
    );
}

export default Dashboard;