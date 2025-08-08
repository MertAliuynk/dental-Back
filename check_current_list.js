const fetch = require('node-fetch');

fetch('http://localhost:8000/api/feedback/pending')
  .then(res => res.json())
  .then(data => {
    console.log('Current patients in pending list:');
    data.data.forEach(patient => {
      console.log(`- ${patient.patient_name} (ID: ${patient.patient_id})`);
      patient.feedback_items.forEach(item => {
        console.log(`  * Treatment ${item.treatment_id}: ${item.interval_display} - ${new Date(item.planned_date).toLocaleDateString()}`);
      });
    });
  })
  .catch(console.error);
