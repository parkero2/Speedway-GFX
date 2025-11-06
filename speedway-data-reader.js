// Excel Data Reader for Speedway-GFX
// This module reads data from speedway-data.xlsx and provides it to HTML components

class SpeedwayDataReader {
    constructor() {
        this.data = null;
        this.eventInfo = {};
        this.lowerThirdData = {};
        this.scheduleData = [];
    }

    // Load Excel file and parse data
    async loadExcelData(filePath = 'speedway-data.xlsx') {
        try {
            console.log('Loading Excel data from:', filePath);
            
            // Fetch the Excel file
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load Excel file: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            // Parse Excel file using SheetJS
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Parse different sheets
            this.data = {
                eventInfo: {},
                lowerThirds: {},
                schedule: []
            };
            
            this.parseEventInfoSheet(workbook);
            this.parseScheduleSheet(workbook);
            
            console.log('Excel data loaded successfully:', this.data);
            return this.data;
            
        } catch (error) {
            console.error('Error loading Excel data:', error);
            // Return fallback data
            return this.getFallbackData();
        }
    }

    // Parse the Excel data into structured format
    parseExcelData(rawData) {
        this.data = {
            eventInfo: {},
            lowerThirds: {},
            schedule: []
        };

        let currentSection = null;
        let scheduleStartRow = -1;

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const firstCell = row[0]?.toString().trim();

            // Identify sections
            if (firstCell === 'Event Information') {
                currentSection = 'event';
                continue;
            } else if (firstCell === 'Lower Third Templates') {
                currentSection = 'lowerThirds';
                continue;
            } else if (firstCell === 'Schedule') {
                currentSection = 'schedule';
                scheduleStartRow = i + 1; // Header row is next
                continue;
            }

            // Parse event information
            if (currentSection === 'event' && firstCell === 'Venue Name') {
                this.data.eventInfo.venueName = row[0];
                this.data.eventInfo.eventName = row[1];
            } else if (currentSection === 'event' && row[0] && row[1] && firstCell !== 'Venue Name') {
                this.data.eventInfo.venueName = row[0];
                this.data.eventInfo.eventName = row[1];
            }

            // Parse lower third templates
            if (currentSection === 'lowerThirds' && firstCell && firstCell.startsWith('Lower Third')) {
                const templateName = firstCell.toLowerCase().replace('lower third ', '').replace(' ', '');
                this.data.lowerThirds[templateName] = {
                    title: row[1] || '',
                    subtitle: row[2] || ''
                };
            }

            // Parse schedule data
            if (currentSection === 'schedule' && i > scheduleStartRow && firstCell) {
                const scheduleItem = {
                    time: row[0] || '',
                    event: row[1] || '',
                    description: row[2] || '',
                    duration: row[3] || '',
                    status: row[4] || '',
                    notes: row[5] || '',
                    featureRace: row[6] || '' // New column for feature race flag
                };
                
                console.log(`Excel row ${i}: featureRace column (index 6) = "${row[6]}" (type: ${typeof row[6]})`);
                this.data.schedule.push(scheduleItem);
            }
        }

        // Store parsed data in instance variables for easy access
        this.eventInfo = this.data.eventInfo;
        this.lowerThirdData = this.data.lowerThirds;
        this.scheduleData = this.data.schedule;
    }

    // Parse Event Information sheet (or first sheet)
    parseEventInfoSheet(workbook) {
        const sheetName = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('event') || 
            name.toLowerCase().includes('info')
        ) || workbook.SheetNames[0];
        
        console.log('Parsing event info from sheet:', sheetName);
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        this.data.eventInfo = {};
        this.data.lowerThirds = {};
        
        let currentSection = null;
        
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;
            
            const firstCell = row[0]?.toString().trim();
            
            // Identify sections
            if (firstCell === 'Event Information') {
                currentSection = 'event';
                continue;
            } else if (firstCell === 'Lower Third Templates') {
                currentSection = 'lowerThirds';
                continue;
            }
            
            // Parse event information
            if (currentSection === 'event' && firstCell === 'Venue Name') {
                this.data.eventInfo.venueName = row[0];
                this.data.eventInfo.eventName = row[1];
                this.data.eventInfo.hashtag = row[2] || ''; // Add hashtag from third column
            } else if (currentSection === 'event' && row[0] && row[1] && firstCell !== 'Venue Name') {
                this.data.eventInfo.venueName = row[0];
                this.data.eventInfo.eventName = row[1];
                this.data.eventInfo.hashtag = row[2] || ''; // Add hashtag from third column
            }
            
            // Parse lower third templates
            if (currentSection === 'lowerThirds' && firstCell && firstCell.startsWith('Lower Third')) {
                const templateName = firstCell.toLowerCase().replace('lower third ', '').replace(' ', '');
                this.data.lowerThirds[templateName] = {
                    title: row[1] || '',
                    subtitle: row[2] || ''
                };
            }
        }
        
        // Store parsed data
        this.eventInfo = this.data.eventInfo;
        this.lowerThirdData = this.data.lowerThirds;
    }

    // Parse Schedule sheet
    parseScheduleSheet(workbook) {
        console.log('=== PARSING SCHEDULE SHEET ===');
        console.log('Available sheets:', workbook.SheetNames);
        
        const sheetName = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('schedule') || 
            name.toLowerCase().includes('timetable')
        );
        
        if (!sheetName) {
            console.log('No Schedule sheet found, using existing parseExcelData method');
            // Use the original parsing method as fallback
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            this.parseExcelData(rawData);
            return;
        }
        
        console.log('Parsing schedule from dedicated sheet:', sheetName);
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('Raw sheet data:', rawData);
        console.log('Number of rows in sheet:', rawData.length);
        
        this.data.schedule = [];
        
        // Find header row (should contain Time, Event, etc.)
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row[0] && (
                row[0].toString().toLowerCase().includes('time') ||
                row[0].toString().toLowerCase() === 'time'
            )) {
                headerRowIndex = i;
                console.log('Found schedule header at row:', i, 'Header:', row);
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            console.log('No header row found, assuming first row is header');
            headerRowIndex = 0;
        }
        
        // Parse data rows
        let rowsProcessed = 0;
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];
            
            console.log(`Processing row ${i}:`, row);
            
            if (!row || !row[0] || row[0].toString().trim() === '') {
                console.log(`Skipping empty row ${i}`);
                continue; // Skip empty rows
            }
            
            const scheduleItem = {
                time: (row[0] || '').toString(),
                event: (row[1] || '').toString(),
                description: (row[2] || '').toString(),
                duration: (row[3] || '').toString(),
                status: (row[4] || '').toString(),
                notes: (row[5] || '').toString(),
                featureRace: (row[6] || '').toString()
            };
            
            console.log(`Schedule row ${i}: time="${scheduleItem.time}", event="${scheduleItem.event}", featureRace="${scheduleItem.featureRace}" (type: ${typeof scheduleItem.featureRace})`);
            this.data.schedule.push(scheduleItem);
            rowsProcessed++;
        }
        
        console.log(`=== SCHEDULE PARSING COMPLETE ===`);
        console.log(`Processed ${rowsProcessed} data rows from ${rawData.length} total rows`);
        console.log('Final schedule array:', this.data.schedule);
        
        this.scheduleData = this.data.schedule;
    }

    // Get fallback data if Excel loading fails
    getFallbackData() {
        return {
            eventInfo: {
                venueName: 'ERR - Excel Not Loaded',
                eventName: 'ERR - Excel Not Loaded',
                hashtag: 'ERR - Excel Not Loaded'
            },
            lowerThirds: {
                left: { title: 'ERR - Excel Not Loaded', subtitle: 'ERR - Excel Not Loaded' },
                centre: { title: 'ERR - Excel Not Loaded', subtitle: 'ERR - Excel Not Loaded' },
                right: { title: 'ERR - Excel Not Loaded', subtitle: 'ERR - Excel Not Loaded' }
            },
            schedule: [
                { time: 'ERR', event: 'ERR - Excel Not Loaded', description: 'ERR - Excel Not Loaded', duration: 'ERR', status: 'ERR', notes: 'ERR', featureRace: false },
                { time: 'ERR', event: 'ERR - Excel Not Loaded', description: 'ERR - Excel Not Loaded', duration: 'ERR', status: 'ERR', notes: 'ERR', featureRace: false },
                { time: 'ERR', event: 'ERR - Excel Not Loaded', description: 'ERR - Excel Not Loaded', duration: 'ERR', status: 'ERR', notes: 'ERR', featureRace: false }
            ]
        };
    }

    // Get data for specific lower third template
    getLowerThirdData(template) {
        const templateKey = template.toLowerCase();
        return this.lowerThirdData[templateKey] || { title: 'DEFAULT TITLE', subtitle: 'Default Subtitle' };
    }

    // Get event information
    getEventInfo() {
        return this.eventInfo;
    }

    // Get schedule data
    getScheduleData() {
        return this.scheduleData;
    }

    // Refresh data from Excel file
    async refreshData() {
        return await this.loadExcelData();
    }
}

// Global instance
window.speedwayData = new SpeedwayDataReader();

// Auto-load data when script loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.speedwayData.loadExcelData();
        console.log('Speedway data loaded automatically');
        
        // Trigger custom event for other components to listen to
        document.dispatchEvent(new CustomEvent('speedwayDataLoaded', { 
            detail: window.speedwayData.data 
        }));
    } catch (error) {
        console.warn('Auto-load of speedway data failed:', error);
    }
});