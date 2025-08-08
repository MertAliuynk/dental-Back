const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: 'postgresql://postgres:123mert123@localhost:5000/deneme'
});

async function addFeedbackIntervals() {
    try {
        console.log('Adding feedback intervals to treatment types...');
        
        // Update some common treatment types with feedback intervals
        const updates = [
            {
                name: 'Implant',
                intervals: ['1_week', '1_month', '3_months', '6_months']
            },
            {
                name: 'Kanal Tedavisi',
                intervals: ['1_week', '1_month', '6_months']
            },
            {
                name: 'Dolgu',
                intervals: ['1_month', '6_months']
            },
            {
                name: 'Çekim',
                intervals: ['1_week', '1_month']
            },
            {
                name: 'Protez',
                intervals: ['1_week', '1_month', '3_months']
            },
            {
                name: 'Ortodonti',
                intervals: ['1_month', '3_months', '6_months']
            }
        ];
        
        for (const update of updates) {
            await pool.query(
                'UPDATE treatment_types SET feedback_intervals = $1 WHERE name ILIKE $2',
                [update.intervals, `%${update.name}%`]
            );
            console.log(`Updated ${update.name} with intervals: ${update.intervals.join(', ')}`);
        }
        
        console.log('Feedback intervals added successfully!');
        
    } catch (error) {
        console.error('Failed to add feedback intervals:', error.message);
    } finally {
        await pool.end();
    }
}

addFeedbackIntervals();
